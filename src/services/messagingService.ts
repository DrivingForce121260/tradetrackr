import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Firebase Firestore Collections
const COLLECTIONS = {
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
  CHAT_PARTICIPANTS: 'chat_participants'
} as const;

// Interfaces für Firebase
export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
  concernID: string;
  role: 'admin' | 'user' | 'manager';
}

export interface FirebaseChat {
  chatId: string;
  type: 'direct' | 'group' | 'controlling';
  name: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
    messageId: string;
  };
  unreadCount: Record<string, number>;
  metadata: {
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    concernID: string;
  };
  groupInfo?: {
    description: string;
    avatar?: string;
    admins: string[];
  };
  controllingInfo?: {
    requiresAction: boolean;
    priority: 'high' | 'medium' | 'low';
    category: 'project' | 'quality' | 'safety';
  };
}

export interface FirebaseMessage {
  messageId: string;
  chatId: string;
  text: string;
  senderId: string;
  senderName?: string; // Fallback field for older messages
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read';
  readBy: string[];
  deliveredTo: string[];
  controllingData?: {
    requiresAction: boolean;
    actionTaken: boolean;
    acceptedBy: string[];
    priority: 'high' | 'medium' | 'low';
    deadline?: Timestamp;
  };
  media?: {
    type: 'image' | 'file' | 'voice' | 'document';
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string; // Für Bilder
    downloadCount?: number;
  };
}

// Neue Interface für Datei-Upload
export interface FileUpload {
  file: File;
  uploadProgress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

// Emoji-Statistiken Interface
export interface EmojiStats {
  emoji: string;
  count: number;
  lastUsed: Timestamp;
  isFavorite: boolean;
}

export interface ChatParticipant {
  chatId: string;
  userId: string;
  joinedAt: Timestamp;
  role: 'admin' | 'member';
  isActive: boolean;
  lastReadAt: Timestamp;
  unreadCount: number;
  concernID: string;  // Add concernID for multi-tenancy enforcement
}

// Messaging Service Class
export class MessagingService {
  private currentUser: FirebaseUser;
  private concernID: string;
  private storage: any;
  
  constructor(user: FirebaseUser, concernID: string) {
    this.currentUser = user;
    this.concernID = concernID;
    this.storage = storage;
    console.log('🏗️ [MessagingService] Constructor called with concernID:', concernID);
    console.log('🏗️ [MessagingService] User concernID:', (user as any).concernID);
  }
  

  // ===== USER MANAGEMENT =====
  
  async updateUserStatus(status: 'online' | 'offline' | 'away'): Promise<void> {
    if (!this.currentUser?.uid) return;
    
    const userRef = doc(db, COLLECTIONS.USERS, this.currentUser.uid);
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp() as any
    });
  }

  async getUserStatus(userId: string): Promise<string> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().status || 'offline';
    }
    return 'offline';
  }

  async getUserDisplayName(userId: string): Promise<string> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        // Versuche zuerst vorname + nachname, dann displayName, dann email
        const name = `${data.vorname || ''} ${data.nachname || ''}`.trim();
        if (name) {
          return name;
        }
        if (data.displayName) {
          return data.displayName;
        }
        if (data.email) {
          return data.email;
        }
      }
      // Fallback: Wenn kein Benutzer gefunden wird, verwende die UID
      return `Benutzer ${userId.substring(0, 8)}...`;
    } catch (error) {
      console.warn('⚠️ [MessagingService] Could not load user display name:', error);
      return `Benutzer ${userId.substring(0, 8)}...`;
    }
  }

  async getConcernMembers(): Promise<FirebaseUser[]> {
    if (!this.concernID) {
      console.warn('⚠️ No concernID provided');
      return [];
    }

    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(
        usersRef,
        where('concernID', '==', this.concernID)
      );

      const querySnapshot = await getDocs(q);
      const members: FirebaseUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const member: FirebaseUser = {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || `${data.vorname || ''} ${data.nachname || ''}`.trim() || data.email || 'Unbekannter Benutzer',
          photoURL: data.photoURL || data.photoUrl, // Support both photoURL and photoUrl
          status: data.status || 'offline',
          lastSeen: data.lastSeen || Timestamp.now() as Timestamp,
          concernID: data.concernID || this.concernID,
          role: data.role || 'user'
        };

        members.push(member);
      });

      return members;
    } catch (error) {
      console.error('❌ Error getting concern members:', error);
      return [];
    }
  }

  // ===== CHAT MANAGEMENT =====

  async createDirectChat(otherUserId: string): Promise<string> {
    try {
      console.log('🔍 [MessagingService] Creating direct chat with user:', otherUserId);
      console.log('🔍 [MessagingService] Current user:', this.currentUser.uid);
      console.log('🔍 [MessagingService] Concern ID:', this.concernID);

      // Use transaction for atomic chat creation
      const chatId = await runTransaction(db, async (transaction) => {
        // 1. Search for existing chat
        console.log('🔍 [MessagingService] Searching for existing chat...');
        const q = query(
          collection(db, COLLECTIONS.CHATS),
          where('type', '==', 'direct'),
          where('participants', 'array-contains', this.currentUser.uid)
        );

        const snapshot = await getDocs(q);
        console.log('🔍 [MessagingService] Found', snapshot.size, 'potential existing chats');

        let existingChatId: string | null = null;

        snapshot.forEach((doc) => {
          const chatData = doc.data();
          const participants = chatData.participants || [];
          
          // Check if this chat is with the target user AND same concernID
          if (participants.includes(otherUserId) && 
              chatData.metadata?.concernID === this.concernID) {
            existingChatId = doc.id;
            console.log('✅ [MessagingService] Found existing chat:', existingChatId);
          }
        });

        if (existingChatId) {
          console.log('✅ [MessagingService] Returning existing chat:', existingChatId);
          return existingChatId;
        }

        console.log('🆕 [MessagingService] No existing chat found, creating new one...');

        // 2. Create new chat document
        const chatRef = doc(collection(db, COLLECTIONS.CHATS));
        const chatData = {
          type: 'direct' as const,
          name: '',
          participants: [this.currentUser.uid, otherUserId],
          unreadCount: {
            [this.currentUser.uid]: 0,
            [otherUserId]: 0
          },
          metadata: {
            createdBy: this.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            concernID: this.concernID  // Critical for multi-tenancy
          }
        };

        console.log('📝 [MessagingService] Chat data to create:', chatData);

        // 3. Create chat participants in same transaction
        const participant1Ref = doc(collection(db, COLLECTIONS.CHAT_PARTICIPANTS));
        const participant2Ref = doc(collection(db, COLLECTIONS.CHAT_PARTICIPANTS));

        const participant1Data = {
          chatId: chatRef.id,
          userId: this.currentUser.uid,
          joinedAt: serverTimestamp(),
          role: 'admin' as const,
          isActive: true,
          lastReadAt: serverTimestamp(),
          unreadCount: 0,
          concernID: this.concernID  // Add concernID to participants
        };

        const participant2Data = {
          chatId: chatRef.id,
          userId: otherUserId,
          joinedAt: serverTimestamp(),
          role: 'member' as const,
          isActive: true,
          lastReadAt: serverTimestamp(),
          unreadCount: 0,
          concernID: this.concernID  // Add concernID to participants
        };

        // ATOMIC WRITES: Chat + both participants
        transaction.set(chatRef, chatData);
        transaction.set(participant1Ref, participant1Data);
        transaction.set(participant2Ref, participant2Data);

        console.log('✅ [MessagingService] Transaction prepared for chat:', chatRef.id);
        return chatRef.id;
      });

      console.log('✅ [MessagingService] Chat created successfully:', chatId);
      return chatId;

    } catch (error: any) {
      console.error('❌ [MessagingService] Transaction failed:', error);
      console.error('❌ [MessagingService] Error details:', {
        message: error?.message,
        code: error?.code,
        otherUserId,
        concernID: this.concernID
      });
      throw error;
    }
  }

  async createGroupChat(name: string, participants: string[], description?: string): Promise<string> {
    const chatData: Omit<FirebaseChat, 'chatId'> = {
      type: 'group',
      name,
      participants: [this.currentUser.uid, ...participants],
      unreadCount: {
        [this.currentUser.uid]: 0,
        ...participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
      },
      metadata: {
        createdBy: this.currentUser.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        concernID: this.concernID
      },
      groupInfo: {
        description: description || '',
        admins: [this.currentUser.uid]
      }
    };

    const chatRef = await addDoc(collection(db, COLLECTIONS.CHATS), chatData);
    
    // Chat-Participants erstellen
    await this.createChatParticipants(chatRef.id, [this.currentUser.uid, ...participants]);
    
    return chatRef.id;
  }

  async createControllingChat(name: string, participants: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    const chatData: Omit<FirebaseChat, 'chatId'> = {
      type: 'controlling',
      name,
      participants: [this.currentUser.uid, ...participants],
      unreadCount: {
        [this.currentUser.uid]: 0,
        ...participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
      },
      metadata: {
        createdBy: this.currentUser.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        concernID: this.concernID
      },
      controllingInfo: {
        requiresAction: true,
        priority,
        category: 'project'
      }
    };

    const chatRef = await addDoc(collection(db, COLLECTIONS.CHATS), chatData);
    
    // Chat-Participants erstellen
    await this.createChatParticipants(chatRef.id, [this.currentUser.uid, ...participants]);
    
    return chatRef.id;
  }

  private async createChatParticipants(chatId: string, userIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    
    userIds.forEach(userId => {
      const participantRef = doc(collection(db, COLLECTIONS.CHAT_PARTICIPANTS));
      const participantData: ChatParticipant = {
        chatId,
        userId,
        joinedAt: serverTimestamp() as any,
        role: userId === this.currentUser.uid ? 'admin' : 'member',
        isActive: true,
        lastReadAt: serverTimestamp() as any,
        unreadCount: 0
      };
      batch.set(participantRef, participantData);
    });
    
    await batch.commit();
  }

  // ===== MESSAGE OPERATIONS =====

  async sendMessage(chatId: string, text: string, media?: any): Promise<string> {
    try {
      console.log('📤 [MessagingService] Sending message to chat:', chatId);
      console.log('📤 [MessagingService] Current user:', this.currentUser.uid);
      console.log('📤 [MessagingService] Concern ID:', this.concernID);

      // Use Firestore Transaction for atomic writes
      const messageId = await runTransaction(db, async (transaction) => {
        // 1. Verify chat exists and user has access
        const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
        const chatSnap = await transaction.get(chatRef);

        if (!chatSnap.exists()) {
          throw new Error(`Chat ${chatId} does not exist`);
        }

        const chatData = chatSnap.data();
        
        // 2. Verify concernID matches (multi-tenancy)
        if (chatData.metadata?.concernID !== this.concernID) {
          console.error('❌ ConcernID mismatch:', {
            chatConcernID: chatData.metadata?.concernID,
            userConcernID: this.concernID
          });
          throw new Error('ConcernID mismatch - access denied');
        }

        // 3. Verify user is a participant
        if (!chatData.participants?.includes(this.currentUser.uid)) {
          throw new Error('User is not a participant of this chat');
        }

        // 4. Load sender display name
        let senderDisplayName = this.currentUser.displayName || this.currentUser.email;
        try {
          const userRef = doc(db, COLLECTIONS.USERS, this.currentUser.uid);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const fullName = `${userData.vorname || ''} ${userData.nachname || ''}`.trim();
            senderDisplayName = fullName || userData.displayName || userData.email || senderDisplayName;
          }
        } catch (error) {
          console.warn('⚠️ Could not load user display name:', error);
        }

        // 5. Create message document
        const messageRef = doc(collection(db, COLLECTIONS.MESSAGES));
        const messageData: any = {
          chatId,
          text: text.trim(),
          senderId: this.currentUser.uid,
          senderName: senderDisplayName,
          timestamp: serverTimestamp(),
          status: 'sent',
          readBy: [this.currentUser.uid],
          deliveredTo: [],
          concernID: this.concernID,  // Critical for security rules
          messageType: 'text'
        };

        // Add media if provided
        if (media && typeof media === 'object' && Object.keys(media).length > 0) {
          messageData.media = media;
          messageData.messageType = 'media';
        }

        // 6. ATOMIC WRITES: All or nothing
        transaction.set(messageRef, messageData);

        // 7. Update chat's lastMessage
        transaction.update(chatRef, {
          lastMessage: {
            text: text.trim(),
            senderId: this.currentUser.uid,
            timestamp: serverTimestamp(),
            messageId: messageRef.id
          },
          'metadata.updatedAt': serverTimestamp()
        });

        // 8. Increment unreadCount for other participants
        const unreadUpdates: Record<string, any> = {};
        chatData.participants.forEach((participantId: string) => {
          if (participantId !== this.currentUser.uid) {
            unreadUpdates[`unreadCount.${participantId}`] = increment(1);
          }
        });
        
        if (Object.keys(unreadUpdates).length > 0) {
          transaction.update(chatRef, unreadUpdates);
        }

        console.log('✅ [MessagingService] Transaction committed successfully');
        return messageRef.id;
      });

      console.log('✅ [MessagingService] Message sent with ID:', messageId);
      return messageId;

    } catch (error: any) {
      console.error('❌ [MessagingService] Transaction failed:', error);
      console.error('❌ [MessagingService] Error details:', {
        message: error?.message,
        code: error?.code,
        chatId,
        concernID: this.concernID
      });
      throw error;
    }
  }

  async sendControllingMessage(chatId: string, text: string, requiresAction: boolean = true, priority: 'high' | 'medium' | 'low' = 'medium', deadline?: Date): Promise<string> {
    const messageData: Omit<FirebaseMessage, 'messageId'> = {
      chatId,
      text,
      senderId: this.currentUser.uid,
      timestamp: serverTimestamp() as any,
      status: 'sent',
      readBy: [this.currentUser.uid],
      deliveredTo: [],
      controllingData: {
        requiresAction,
        actionTaken: false,
        acceptedBy: [],
        priority,
        deadline: deadline ? Timestamp.fromDate(deadline) : undefined
      }
    };

    const messageRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), messageData);
    
    try {
      // Chat aktualisieren
      await this.updateChatLastMessage(chatId, {
        text,
        senderId: this.currentUser.uid,
        timestamp: serverTimestamp() as any,
        messageId: messageRef.id
      });

      // Unread-Count für andere Teilnehmer erhöhen
      await this.incrementUnreadCount(chatId, this.currentUser.uid);
    } catch (error) {
      console.warn('⚠️ Could not update chat metadata for controlling message:', error);
      // Nachricht wurde trotzdem gesendet
    }
    
    return messageRef.id;
  }

  private async updateChatLastMessage(chatId: string, lastMessage: any): Promise<void> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        await updateDoc(chatRef, {
          lastMessage,
          'metadata.updatedAt': serverTimestamp() as any
        });
      } else {
        console.warn('⚠️ Chat document does not exist:', chatId);
      }
    } catch (error) {
      console.error('❌ Error updating chat last message:', error);
      throw error;
    }
  }

  private async incrementUnreadCount(chatId: string, excludeUserId: string): Promise<void> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const unreadCount = { ...chatData.unreadCount };
        
        // Für alle anderen Teilnehmer den Count erhöhen
        Object.keys(unreadCount).forEach(userId => {
          if (userId !== excludeUserId) {
            unreadCount[userId] = (unreadCount[userId] || 0) + 1;
          }
        });
        
        await updateDoc(chatRef, { unreadCount });
      } else {
        console.warn('⚠️ Chat document does not exist for unread count update:', chatId);
      }
    } catch (error) {
      console.warn('⚠️ Could not update unread count:', error);
      // Nicht kritisch, Nachricht wurde trotzdem gesendet
    }
  }

  // ===== MESSAGE STATUS =====

  async markMessageAsDelivered(chatId: string, messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      status: 'delivered',
      deliveredTo: arrayUnion(this.currentUser.uid)
    });
  }

  async markMessageAsRead(chatId: string, messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      status: 'read',
      readBy: arrayUnion(this.currentUser.uid)
    });

    // Unread-Count zurücksetzen
    await this.resetUnreadCount(chatId);
    
    // Chat-Participant aktualisieren
    await this.updateParticipantLastRead(chatId);
  }

  private async resetUnreadCount(chatId: string): Promise<void> {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${this.currentUser.uid}`]: 0
    });
  }

  private async updateParticipantLastRead(chatId: string): Promise<void> {
    const participantQuery = query(
      collection(db, COLLECTIONS.CHAT_PARTICIPANTS),
      where('chatId', '==', chatId),
      where('userId', '==', this.currentUser.uid)
    );
    
    const participantSnap = await getDocs(participantQuery);
    if (!participantSnap.empty) {
      const participantRef = doc(db, COLLECTIONS.CHAT_PARTICIPANTS, participantSnap.docs[0].id);
      await updateDoc(participantRef, {
        lastReadAt: serverTimestamp() as any,
        unreadCount: 0
      });
    }
  }

  // ===== CONTROLLING MESSAGE ACTIONS =====

  async acceptControllingMessage(messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      'controllingData.acceptedBy': arrayUnion(this.currentUser.uid),
      'controllingData.actionTaken': true
    });
  }

  async markControllingMessageAsRead(messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      readBy: arrayUnion(this.currentUser.uid)
    });
  }

  // ===== REAL-TIME LISTENERS =====

  subscribeToChats(callback: (chats: FirebaseChat[]) => void): () => void {
    console.log('🔍 [MessagingService] Subscribing to chats...');
    console.log('🔍 [MessagingService] ConcernID for subscription:', this.concernID);

    // Query chats with concernID filter and participant membership
    const q = query(
      collection(db, COLLECTIONS.CHATS),
      where('metadata.concernID', '==', this.concernID),
      where('participants', 'array-contains', this.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chats: FirebaseChat[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Double-check concernID matches (defense in depth)
        if (data.metadata?.concernID === this.concernID) {
          chats.push({ chatId: doc.id, ...data } as any);
        } else {
          console.warn('⚠️ Filtered chat with mismatched concernID:', doc.id);
        }
      });

      console.log(`📱 [MessagingService] Received ${chats.length} chats`);
      callback(chats);
    }, (error) => {
      console.error('❌ [MessagingService] Error in chat subscription:', error);
      callback([]);
    });

    return unsubscribe;
  }
  

  subscribeToMessages(chatId: string, callback: (messages: FirebaseMessage[]) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: FirebaseMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
      messages.push({ messageId: doc.id, ...data });
      });
      callback(messages);
    }, (error) => {
      console.error('❌ [MessagingService] Error subscribing to messages:', error);
      callback([]);
    });

    return unsubscribe;
  }

  subscribeToUserStatus(userId: string, callback: (status: string) => void): () => void {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        callback(userData.status || 'offline');
      }
    });
  }

  // ===== DEBUG & COMPATIBILITY FUNCTIONS =====
  
  // Debug-Funktion: Überprüfe alle verfügbaren Collections und Nachrichten
  async debugMessagingSystem(): Promise<{
    portalVersion: string;
    fallbackMode: boolean;
    currentUser: string;
    concernID: string;
    accessibleCollections: any[];
    recentMessages: any[];
    recentChats: any[];
  }> {
    console.log('🔍 [MessagingService] Debugging messaging system...');
    
    const debugInfo = {
      portalVersion: 'v2',
      fallbackMode: false,
      currentUser: this.currentUser.uid,
      concernID: this.concernID,
      accessibleCollections: [] as any[],
      recentMessages: [] as any[],
      recentChats: [] as any[]
    };
    
    // Teste alle möglichen Collections
    const testCollections = [
      'chats', 'chats_v1', 'chats_v2', 'direct_chats', 'user_chats',
      'messages', 'messages_v1', 'messages_v2', 'chat_messages',
      'users', 'chat_participants'
    ];
    
    for (const collectionName of testCollections) {
      try {
        const testQuery = query(collection(db, collectionName), limit(5));
        const snapshot = await getDocs(testQuery);
        debugInfo.accessibleCollections.push({
          name: collectionName,
          accessible: true,
          documentCount: snapshot.size,
          sampleDocuments: snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        });
      } catch (error) {
        const err = error as any;
        debugInfo.accessibleCollections.push({
          name: collectionName,
          accessible: false,
          error: err?.message || 'Unknown error'
        });
      }
    }
    
    // Versuche, aktuelle Nachrichten zu finden
    try {
      const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(10));
      const messagesSnapshot = await getDocs(messagesQuery);
      debugInfo.recentMessages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
    } catch (error) {
      console.warn('⚠️ [MessagingService] Could not fetch recent messages:', error);
    }
    
    // Versuche, aktuelle Chats zu finden
    try {
      const chatsQuery = query(collection(db, 'chats'), orderBy('metadata.updatedAt', 'desc'), limit(10));
      const chatsSnapshot = await getDocs(chatsQuery);
      debugInfo.recentChats = chatsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
    } catch (error) {
      console.warn('⚠️ [MessagingService] Could not fetch recent chats:', error);
    }
    
    console.log('🔍 [MessagingService] Debug info:', debugInfo);
    return debugInfo;
  }

  // ===== CHAT QUERIES =====

  async getChats(): Promise<FirebaseChat[]> {
    const chatsQuery = query(
      collection(db, COLLECTIONS.CHATS),
      where('participants', 'array-contains', this.currentUser.uid),
      where('metadata.concernID', '==', this.concernID),
      orderBy('metadata.updatedAt', 'desc')
    );

    const snapshot = await getDocs(chatsQuery);
    const chats: FirebaseChat[] = [];
    
    snapshot.forEach((doc) => {
      chats.push({ chatId: doc.id, ...doc.data() } as any);
    });
    
    return chats;
  }

  async getMessages(chatId: string, limitCount: number = 50): Promise<FirebaseMessage[]> {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const messages: FirebaseMessage[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      messages.push({ messageId: doc.id, ...data });
    });

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  }

  async getUnreadCount(): Promise<number> {
    const participantQuery = query(
      collection(db, COLLECTIONS.CHAT_PARTICIPANTS),
      where('userId', '==', this.currentUser.uid),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(participantQuery);
    let totalUnread = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalUnread += data.unreadCount || 0;
    });
    
    return totalUnread;
  }

  // ===== UTILITY FUNCTIONS =====

  async deleteMessage(messageId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.MESSAGES, messageId));
  }

  async leaveChat(chatId: string): Promise<void> {
    // Aus Chat-Participants entfernen
    const participantQuery = query(
      collection(db, COLLECTIONS.CHAT_PARTICIPANTS),
      where('chatId', '==', chatId),
      where('userId', '==', this.currentUser.uid)
    );
    
    const participantSnap = await getDocs(participantQuery);
    if (!participantSnap.empty) {
      await deleteDoc(doc(db, COLLECTIONS.CHAT_PARTICIPANTS, participantSnap.docs[0].id));
    }

    // Aus Chat-Teilnehmern entfernen
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      participants: arrayRemove(this.currentUser.uid)
    });
  }

  async searchMessages(queryText: string, chatId?: string): Promise<FirebaseMessage[]> {
    let messagesQueryRef: any = collection(db, COLLECTIONS.MESSAGES);
    
    if (chatId) {
      messagesQueryRef = query(
        messagesQueryRef,
        where('chatId', '==', chatId),
        where('text', '>=', queryText),
        where('text', '<=', queryText + '\uf8ff')
      );
    } else {
      messagesQueryRef = query(
        messagesQueryRef,
        where('text', '>=', queryText),
        where('text', '<=', queryText + '\uf8ff')
      );
    }

    const snapshot = await getDocs(messagesQueryRef);
    const messages: FirebaseMessage[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      messages.push({ messageId: doc.id, ...data });
    });
    
    return messages;
  }

  // ===== FILE UPLOAD FUNCTIONS =====

  async uploadFile(file: File, chatId: string, onProgress?: (progress: number) => void): Promise<FileUpload> {
    try {
      console.log('📁 Starting file upload:', file.name, 'for chat:', chatId);
      
      // Datei-Validierung
      if (file.size > 50 * 1024 * 1024) { // 50MB Limit
        throw new Error('Datei ist zu groß. Maximale Größe: 50MB');
      }

      // Erlaubte Dateitypen
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Dateityp nicht unterstützt');
      }

      // Datei in Firebase Storage hochladen
      const storageRef = ref(this.storage, `chats/${chatId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Upload-Fortschritt verfolgen
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('📁 Upload progress:', progress.toFixed(2) + '%');
            
            // Progress-Callback aufrufen, falls vorhanden
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            console.error('❌ Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              // Download-URL generieren
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Thumbnail für Bilder generieren
              let thumbnailURL: string | null = null;
              if (file.type.startsWith('image/')) {
                thumbnailURL = await this.generateThumbnail(file);
              }

              const fileUpload: FileUpload = {
                file,
                uploadProgress: 100,
                status: 'success',
                downloadUrl: downloadURL,
                thumbnailUrl: thumbnailURL || undefined
              };

              console.log('✅ File upload successful:', file.name);
              resolve(fileUpload);
            } catch (error) {
              console.error('❌ Error getting download URL:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ File upload failed:', error);
      const fileUpload: FileUpload = {
        file,
        uploadProgress: 0,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
      return fileUpload;
    }
  }

  async deleteFile(messageId: string, fileUrl: string): Promise<void> {
    try {
      console.log('🗑️ Deleting file:', fileUrl);
      
      // Datei aus Firebase Storage löschen
      const fileRef = ref(this.storage, fileUrl);
      await deleteObject(fileRef);
      
      console.log('✅ File deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  async getFileDownloadUrl(fileUrl: string): Promise<string> {
    try {
      // Download-URL generieren (mit Authentifizierung)
      const fileRef = ref(this.storage, fileUrl);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      throw error;
    }
  }

  async generateThumbnail(file: File): Promise<string | null> {
    try {
      if (!file.type.startsWith('image/')) {
        return null;
      }

      // Canvas für Thumbnail-Generierung
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Bild laden
      const img = new Image();
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);

      return new Promise((resolve) => {
        img.onload = () => {
          // Thumbnail-Größe (200x200)
          const maxSize = 200;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Bild zeichnen
          ctx.drawImage(img, 0, 0, width, height);

          // Thumbnail als Blob konvertieren
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                // Thumbnail in Firebase Storage hochladen
                const thumbnailRef = ref(this.storage, `thumbnails/${Date.now()}_thumb_${file.name}`);
                await uploadBytes(thumbnailRef, blob);
                const thumbnailURL = await getDownloadURL(thumbnailRef);
                resolve(thumbnailURL);
              } catch (error) {
                console.error('❌ Error uploading thumbnail:', error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.8);
        };

        img.src = url;
      });
    } catch (error) {
      console.error('❌ Error generating thumbnail:', error);
      return null;
    }
  }

  // ===== EMOJI STATISTICS =====

  async trackEmojiUsage(emoji: string): Promise<void> {
    try {
      const emojiRef = doc(db, 'emojiStats', `${this.currentUser.uid}_${emoji}`);
      const emojiSnap = await getDoc(emojiRef);
      
      if (emojiSnap.exists()) {
        // Bestehende Statistik aktualisieren
        await updateDoc(emojiRef, {
          count: increment(1),
          lastUsed: serverTimestamp() as any
        });
      } else {
        // Neue Statistik erstellen
        await setDoc(emojiRef, {
          emoji,
          count: 1,
          lastUsed: serverTimestamp() as any,
          isFavorite: false,
          userId: this.currentUser.uid
        });
      }
    } catch (error) {
      console.warn('⚠️ Emoji usage tracking skipped (permissions or rules):', error);
    }
  }

  async getEmojiStats(): Promise<EmojiStats[]> {
    try {
      const emojiQuery = query(
        collection(db, 'emojiStats'),
        where('userId', '==', this.currentUser.uid),
        orderBy('count', 'desc'),
        orderBy('lastUsed', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(emojiQuery);
      const stats: EmojiStats[] = [];
      
      snapshot.forEach((doc) => {
        stats.push(doc.data() as EmojiStats);
      });
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting emoji stats:', error);
      return [];
    }
  }

  async toggleEmojiFavorite(emoji: string): Promise<void> {
    try {
      const emojiRef = doc(db, 'emojiStats', `${this.currentUser.uid}_${emoji}`);
      const emojiSnap = await getDoc(emojiRef);
      
      if (emojiSnap.exists()) {
        const currentData = emojiSnap.data();
        await updateDoc(emojiRef, {
          isFavorite: !currentData.isFavorite
        });
      }
    } catch (error) {
      console.error('❌ Error toggling emoji favorite:', error);
    }
  }
}

// Hook für die Verwendung des Messaging-Service
export const useMessagingService = () => {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error('useMessagingService must be used within an authenticated user');
  }

  const concernID = (user as any).concernID || 'default';
  return new MessagingService(user as any, concernID);
};
