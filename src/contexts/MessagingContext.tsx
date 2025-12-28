import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessagingService, FirebaseChat, FirebaseMessage } from '@/services/messagingService';
import offlineQueue from '@/services/offlineQueueService';

// Vereinfachte Interfaces för die Komponenten
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  // Edit support
  isEdited?: boolean;
  editedAt?: Date;
  originalText?: string;
  // Media support
  media?: {
    type: 'image' | 'file' | 'voice' | 'document';
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
    downloadCount?: number;
  };
  // Controlling-specific fields
  isControllingMessage?: boolean;
  readBy?: string[];
  acceptedBy?: string[];
  requiresAction?: boolean;
  priority?: 'high' | 'medium' | 'low';
  deadline?: Date;
}

interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'controlling';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  photoURL?: string; // User profile photo
  // Controlling-specific fields
  controllingMembers?: string[];
  adminOnly?: boolean;
  priority?: 'high' | 'medium' | 'low';
  category?: 'project' | 'quality' | 'safety';
}

interface MessagingContextType {
  isMessagingOpen: boolean;
  isMessagingMinimized: boolean;
  unreadCount: number;
  chats: Chat[];
  messages: Record<string, Message[]>;
  selectedChat: string | null;
  isLoadingMessages: boolean;
  openMessaging: () => void;
  closeMessaging: () => void;
  toggleMinimizeMessaging: () => void;
  setUnreadCount: (count: number) => void;
  sendMessage: (chatId: string, text: string, media?: any) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  selectChat: (chatId: string | null) => Promise<void>;
  createDirectChat: (otherUserId: string) => Promise<string>;
  createGroupChat: (name: string, participants: string[], description?: string) => Promise<string>;
  createControllingChat: (name: string, participants: string[], priority?: 'high' | 'medium' | 'low') => Promise<string>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  // Controlling-specific functions
  markControllingMessageAsRead: (chatId: string, messageId: string) => Promise<void>;
  acceptControllingMessage: (chatId: string, messageId: string) => Promise<void>;
  sendControllingMessage: (chatId: string, text: string, requiresAction?: boolean, priority?: 'high' | 'medium' | 'low', deadline?: Date) => Promise<void>;
  // Utility functions
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>;
  leaveChat: (chatId: string) => Promise<void>;
  // Debug & compatibility functions
  debugMessagingSystem: () => Promise<any>;
  checkPortalCompatibility: () => Promise<boolean>;
  // File upload functions
  uploadFile: (file: File, chatId: string, onProgress?: (progress: number) => void) => Promise<any>;
  deleteFile: (messageId: string, fileUrl: string) => Promise<void>;
  getFileDownloadUrl: (fileUrl: string) => Promise<string>;
  // Emoji functions
  trackEmojiUsage: (emoji: string) => Promise<void>;
  getEmojiStats: () => Promise<any[]>;
  toggleEmojiFavorite: (emoji: string) => Promise<void>;
  // Refresh chats
  refreshChats?: () => Promise<void>;
}

export const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: ReactNode;
}

const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isMessagingMinimized, setIsMessagingMinimized] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagingService, setMessagingService] = useState<MessagingService | null>(null);

  // MessagingService initialisieren
  useEffect(() => {
    console.log('🔧 [MessagingContext] Initializing messaging service...');
    console.log('🔧 [MessagingContext] User:', user);
    console.log('🔧 [MessagingContext] ConcernID:', user?.concernID);
    
    if (!user?.concernID) {
      console.log('❌ [MessagingContext] No user or concernID, skipping initialization');
      return;
    }

    try {
      const concernID = (user as any).concernID || 'default';
      console.log('🔧 [MessagingContext] Creating MessagingService with concernID:', concernID);
      console.log('🔧 [MessagingContext] Full user object:', user);

      const service = new MessagingService(user as any, concernID);
      console.log('✅ [MessagingContext] MessagingService created successfully');
      setMessagingService(service);
      
      // User-Status auf online setzen
      service.updateUserStatus('online').then(() => {
        console.log('✅ [MessagingContext] User status set to online');
      }).catch((error: any) => {
        console.error('❌ [MessagingContext] Failed to set user status online:', error);
      });
      
      // Cleanup beim Verlassen
      return () => {
        try {
          service.updateUserStatus('offline').then(() => {
            console.log('✅ [MessagingContext] User status set to offline');
        }).catch((error: any) => {
            console.error('❌ [MessagingContext] Failed to set user status offline:', error);
          });
        } catch (error) {
          console.error('❌ [MessagingContext] Error in cleanup:', error);
        }
      };
    } catch (error) {
      console.error('❌ [MessagingContext] Failed to create MessagingService:', error);
    }
  }, [user]);

  // Concern-Mitglieder laden (nach MessagingService Initialisierung)
  useEffect(() => {



    
    if (!messagingService || !user?.concernID) {

      return;
    }



    // Concern-Mitglieder direkt laden
    const loadConcernMembers = async () => {
      try {
        console.log('👥 [MessagingContext] Loading concern members...');
        const members = await messagingService.getConcernMembers();
        console.log('👥 [MessagingContext] Loaded members:', members.length, members);
        
        const memberChats: Chat[] = members
          .filter(member => member.uid !== user?.uid) // Nicht den aktuellen Benutzer
          .map(member => {
            const chat = {
              id: `direct_${member.uid}`,
              name: member.displayName || member.email || 'Unbekannter Benutzer',
              type: 'direct' as const,
              participants: [user?.uid || '', member.uid],
              photoURL: member.photoURL, // Add user photo
              lastMessage: undefined,
              unreadCount: 0,
              isOnline: member.status === 'online'
            };
            console.log('💬 Created chat for member:', member.displayName, 'photoURL:', member.photoURL);
            return chat;
          });




        // Wenn keine anderen Benutzer gefunden wurden, zeige eine Info-Nachricht
        if (memberChats.length === 0) {

          const infoChat: Chat = {
            id: 'info_no_users',
            name: 'Keine anderen Benutzer verfügbar',
            type: 'direct',
            participants: [user?.uid || ''],
            lastMessage: undefined,
            unreadCount: 0,
            isOnline: false
          };
          memberChats.push(infoChat);

        }

        // Member-Chats (Kontaktliste) in den State setzen, aber NICHT für Nutzer,
        // zu denen bereits ein echter Firebase-Direct-Chat existiert.
        setChats(prevChats => {
          const existingMemberChats = prevChats.filter(chat => chat.id.startsWith('direct_'));

          const hasFirebaseDirectChatWith = (memberUid: string) => {
            return prevChats.some(c =>
              c.type === 'direct' &&
              !c.id.startsWith('direct_') &&
              (c.participants || []).length === 2 &&
              (c.participants || []).includes(memberUid) &&
              (c.participants || []).includes(user?.uid || '')
            );
          };

          const newMemberChats = memberChats.filter(newChat => {
            const other = newChat.participants.find(uid => uid !== (user?.uid || ''));
            if (!other) return false;
            if (hasFirebaseDirectChatWith(other)) return false;
            return !existingMemberChats.some(existing => existing.id === newChat.id);
          });

          return [...prevChats, ...newMemberChats];
        });
        setUnreadCount(0); // Keine unread messages für Member-Chats
      } catch (error) {

        
        // Bei Berechtigungsfehlern trotzdem einen Info-Chat anzeigen
        const errMsg = (error as any)?.message ?? '';
        if (typeof errMsg === 'string' && errMsg.includes('permissions')) {

          const fallbackChat: Chat = {
            id: 'info_permission_error',
            name: 'Berechtigungsfehler beim Laden der Benutzer',
            type: 'direct',
            participants: [user?.uid || ''],
            lastMessage: undefined,
            unreadCount: 0,
            isOnline: false
          };
          
          setChats(prevChats => {
            const existingMemberChats = prevChats.filter(chat => chat.id.startsWith('direct_'));
            const updatedChats = [...existingMemberChats, fallbackChat];

            return updatedChats;
          });
        } else {
          // Bei anderen Fehlern leere Member-Chats setzen
          setChats(prevChats => prevChats.filter(chat => !chat.id.startsWith('direct_')));
        }
        setUnreadCount(0);
      }
    };

    // Kurze Verzö¶gerung, um sicherzustellen, dass der Service vollstö¤ndig initialisiert ist
    const timer = setTimeout(() => {
      loadConcernMembers();
    }, 100);

    return () => clearTimeout(timer);
  }, [messagingService, user]);

  // Automatically flush offline queue when coming back online
  useEffect(() => {
    if (!messagingService) return;
    const onOnline = async () => {
      try {
        await offlineQueue.processQueue(async (item) => {
          switch (item.action) {
            case 'sendMessage':
              await messagingService.sendMessage(item.payload.chatId, item.payload.text, item.payload.media);
              return true;
            case 'createDirectChat':
              await messagingService.createDirectChat(item.payload.otherUserId);
              return true;
            default:
              return true;
          }
        });
        console.log('✅ [MessagingContext] Offline queue flushed on online');
      } catch (err) {
        console.error('❌ [MessagingContext] Failed to flush offline queue:', err);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [messagingService]);

  // Real-time Chats abonnieren (optional, für bestehende Chats)
  useEffect(() => {
    if (!messagingService || !user?.concernID) return;

      const unsubscribe = messagingService.subscribeToChats(async (firebaseChats: FirebaseChat[]) => {

      // Load all members to enrich chat names
      const members = await messagingService.getConcernMembers();
      const memberMap = new Map(members.map(m => [m.uid, m]));
      
      const convertedChats: (Chat | null)[] = firebaseChats.map(fbChat => {
        // Filter out broken chats that should never appear in the UI (e.g. "Fallback Chat")
        const participantCount = (fbChat.participants || []).length;
        if (fbChat.type === 'direct' && (participantCount < 2 || fbChat.name === 'Fallback Chat')) {
          return null;
        }

        // Generiere einen Namen für den Chat
        let chatName = fbChat.name;
        
        
        if (!chatName || chatName.trim() === '' || chatName.startsWith('Chat mit')) {
            if (fbChat.type === 'direct' && fbChat.participants.length === 2) {
            // Für direkte Chats: Name des anderen Teilnehmers
            const otherParticipantId = fbChat.participants.find(pid => pid !== user?.uid);
            if (otherParticipantId) {
              const member = memberMap.get(otherParticipantId);
              if (member) {
                chatName = member.displayName || member.email || 'Unbekannter Benutzer';
              } else {
                // Do not create a fallback person entry; skip this chat
                return null;
              }
            } else {
              // No other participant info; skip this chat
              return null;
            }
          } else if (fbChat.type === 'group') {
            chatName = fbChat.name || 'Gruppenchat';
          } else if (fbChat.type === 'controlling') {
            chatName = fbChat.name || 'Controlling Chat';
          } else {
            chatName = 'Unbenannter Chat';
          }
        }

        let chatPhotoURL: string | undefined = undefined;
        return {
          id: fbChat.chatId,
          name: chatName,
          type: fbChat.type,
          participants: fbChat.participants,
          photoURL: undefined,
          lastMessage: fbChat.lastMessage ? {
            id: fbChat.lastMessage.messageId,
            text: fbChat.lastMessage.text,
            senderId: fbChat.lastMessage.messageId,
            senderName: '', // Wird spö¤ter gefüllt
            timestamp: fbChat.lastMessage.timestamp?.toDate() || new Date(),
            isRead: false,
            status: 'sent'
          } : undefined,
          unreadCount: fbChat.unreadCount[user?.uid || ''] || 0,
          controllingMembers: fbChat.controllingInfo?.requiresAction ? fbChat.participants : undefined,
          adminOnly: fbChat.controllingInfo?.requiresAction || false,
          priority: fbChat.controllingInfo?.priority,
          category: fbChat.controllingInfo?.category
        };
      });

      // Bestehende Chats mit Member-Chats kombinieren
      setChats(prevChats => {
        // Alle Member-Chats beibehalten
        const memberChats = prevChats.filter(chat => chat.id.startsWith('direct_'));
        
      // Firebase-Chats hinzufügen, aber keine Duplikate
      const sanitizedConvertedChats: Chat[] = convertedChats.filter((c): c is Chat => c !== null);
      const firebaseChatsMap = new Map(sanitizedConvertedChats.map(chat => [chat.id, chat]));
        // Drop broken fallback chats from existing state so they don't linger forever
        const existingFirebaseChats = prevChats.filter(chat => {
          if (chat.id.startsWith('direct_')) return false;
          if (chat.type === 'direct' && ((chat.participants || []).length < 2 || chat.name === 'Fallback Chat')) {
            return false;
          }
          return true;
        });
        
        // Neue Firebase-Chats hinzufügen oder bestehende aktualisieren
        const updatedFirebaseChats = existingFirebaseChats.map(existingChat => 
          firebaseChatsMap.get(existingChat.id) || existingChat
        );
        
      // Neue Firebase-Chats hinzufügen, die noch nicht existieren
      const newFirebaseChats = sanitizedConvertedChats.filter(newChat => 
        !existingFirebaseChats.some(existing => existing.id === newChat.id)
      );
        
        const allChats = [...memberChats, ...updatedFirebaseChats, ...newFirebaseChats];
        console.log('ðŸ“± Total chats (Firebase + Members):', allChats.length, allChats);
        
        // Bereinige Duplikate und führe Chats zusammen
        const cleanedChats = cleanupDuplicateChats(allChats);
        
        // Unread-Count berechnen
        const totalUnread = cleanedChats.reduce((sum, chat) => {
          if (chat.id.startsWith('direct_')) {
            return sum; // Member chats haben immer 0 unread
          }
          return sum + chat.unreadCount;
        }, 0);
        setUnreadCount(totalUnread);
        
        return cleanedChats;
      });
    });

    return unsubscribe;
  }, [messagingService, user]);

  // Real-time Messages für ausgewählten Chat abonnieren
  useEffect(() => {
    if (!messagingService || !selectedChat) return;

    const unsubscribe = messagingService.subscribeToMessages(selectedChat, async (firebaseMessages: FirebaseMessage[]) => {
      console.log('📨 [MessagingContext] Received messages from Firestore:', firebaseMessages.length);
      firebaseMessages.forEach((msg, idx) => {
        console.log(`📨 [MessagingContext] Message ${idx}:`, {
          id: msg.messageId,
          text: msg.text.substring(0, 50),
          hasMedia: !!msg.media,
          media: msg.media
        });
      });
      
      const toDateSafe = (ts: any): Date => {
        try {
          if (!ts) return new Date();
          if (typeof ts?.toDate === 'function') return ts.toDate();
          if (ts instanceof Date) return ts;
          if (typeof ts === 'number') return new Date(ts);
          if (typeof ts === 'string') {
            const d = new Date(ts);
            return isNaN(d.getTime()) ? new Date() : d;
          }
          if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
          return new Date();
        } catch {
          return new Date();
        }
      };

      // Lade alle Absender-Namen parallel für bessere Performance
      const senderNames = await Promise.allSettled(
        firebaseMessages.map(msg => messagingService.getUserDisplayName(msg.senderId))
      );

      const convertedMessages: Message[] = firebaseMessages.map((fbMsg, index) => {
        // Verwende zuerst den geladenen Namen, dann Fallback aus der Nachricht, dann Standard-Fallback
        const senderNameResult = senderNames[index];
        let senderName = '';
        if (senderNameResult.status === 'fulfilled') {
          senderName = senderNameResult.value;
        } else {
          senderName = fbMsg.senderName || 'Unbekannter Benutzer';
        }

        return {
          id: fbMsg.messageId,
          text: fbMsg.text,
          senderId: fbMsg.senderId,
          senderName,
          timestamp: toDateSafe((fbMsg as any).timestamp),
          isRead: fbMsg.readBy.includes(user?.uid || ''),
          status: fbMsg.status,
          isEdited: (fbMsg as any).isEdited,
          editedAt: (fbMsg as any).editedAt ? toDateSafe((fbMsg as any).editedAt) : undefined,
          originalText: (fbMsg as any).originalText,
          media: fbMsg.media,
          isControllingMessage: fbMsg.controllingData?.requiresAction,
          readBy: fbMsg.readBy,
          acceptedBy: fbMsg.controllingData?.acceptedBy,
          requiresAction: fbMsg.controllingData?.requiresAction,
          priority: fbMsg.controllingData?.priority,
          deadline: fbMsg.controllingData?.deadline ? toDateSafe((fbMsg as any).controllingData?.deadline) : undefined
        };
      });

      setMessages(prev => ({
        ...prev,
        [selectedChat]: convertedMessages
      }));
    });

    return unsubscribe;
  }, [messagingService, selectedChat, user]);

  // Regelmäßig nach fehlenden Chats suchen - DEAKTIVIERT wegen Endlosschleife
  // useEffect(() => {
  //   if (!messagingService || !user?.concernID) return;
  //   
  //   // Sofort prüfen
  //   refreshChats();
  //   
  //   // Dann alle 30 Sekunden prüfen
  //   const interval = setInterval(refreshChats, 30000);
  //   
  //   return () => clearInterval(interval);
  // }, [messagingService, user]);

  // Rate-Limiting für Chat-Erstellung (Sicherheitsmaßnahme)
  let lastRefreshTime = 0;
  const REFRESH_COOLDOWN = 5000; // 5 Sekunden zwischen Refresh-Versuchen
  
  // Funktion zum manuellen Aktualisieren der Chats
  const refreshChats = async () => {
    if (!messagingService || !user?.concernID) return;
    
    // Rate-Limiting prüfen
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      console.log('⏳ [MessagingContext] Refresh rate limited, please wait...');
      return;
    }
    lastRefreshTime = now;
    
    try {
      console.log('🔄 [MessagingContext] Manually refreshing chats...');
      
      // Alle Chats neu laden
      const firebaseChats = (await messagingService.getChats()).filter(fbChat => {
        const participantCount = (fbChat.participants || []).length;
        if (fbChat.type === 'direct' && (participantCount < 2 || fbChat.name === 'Fallback Chat')) {
          return false;
        }
        return true;
      });
      console.log('📱 [MessagingContext] Loaded', firebaseChats.length, 'Firebase chats');
      
      // Concern-Mitglieder laden
      const members = await messagingService.getConcernMembers();
      console.log('👥 [MessagingContext] Loaded', members.length, 'concern members');
      
      // Member-Chats erstellen (nur wenn noch keine existieren UND kein echter Firebase-Direct-Chat existiert)
      const existingMemberChats = chats.filter(chat => chat.id.startsWith('direct_'));
      const hasFirebaseDirectChatWith = (memberUid: string) => {
        return chats.some(c =>
          c.type === 'direct' &&
          !c.id.startsWith('direct_') &&
          (c.participants || []).length === 2 &&
          (c.participants || []).includes(memberUid) &&
          (c.participants || []).includes(user?.uid || '')
        );
      };

      const memberChats: Chat[] = members
        .filter(member => member.uid !== user?.uid)
        .filter(member => !existingMemberChats.some(chat => chat.participants.includes(member.uid)))
        .filter(member => !hasFirebaseDirectChatWith(member.uid))
        .map(member => ({
          id: `direct_${member.uid}`,
          name: member.displayName || member.email || 'Unbekannter Benutzer',
          type: 'direct' as const,
          participants: [user?.uid || '', member.uid],
          lastMessage: undefined,
          unreadCount: 0,
          isOnline: member.status === 'online'
        }));
      
      // Firebase-Chats konvertieren
      const convertedFirebaseChats: Chat[] = firebaseChats.map(fbChat => {
        let chatName = fbChat.name;
        if (!chatName || chatName.trim() === '') {
          if (fbChat.type === 'direct' && fbChat.participants.length === 2) {
            const otherParticipantId = fbChat.participants.find(pid => pid !== user?.uid);
            if (otherParticipantId) {
              const member = members.find(m => m.uid === otherParticipantId);
              chatName = member?.displayName || `Chat mit ${otherParticipantId.substring(0, 8)}...`;
            } else {
              chatName = 'Direkter Chat';
            }
          } else if (fbChat.type === 'group') {
            chatName = 'Gruppenchat';
          } else if (fbChat.type === 'controlling') {
            chatName = 'Controlling Chat';
          } else {
            chatName = 'Unbenannter Chat';
          }
        }

        return {
          id: fbChat.chatId,
          name: chatName,
          type: fbChat.type,
          participants: fbChat.participants,
          photoURL: undefined,
          lastMessage: fbChat.lastMessage ? {
            id: fbChat.lastMessage.messageId,
            text: fbChat.lastMessage.text,
            senderId: fbChat.lastMessage.senderId,
            senderName: '',
            timestamp: fbChat.lastMessage.timestamp?.toDate() || new Date(),
            isRead: false,
            status: 'sent'
          } : undefined,
          unreadCount: fbChat.unreadCount[user?.uid || ''] || 0,
          controllingMembers: fbChat.controllingInfo?.requiresAction ? fbChat.participants : undefined,
          adminOnly: fbChat.controllingInfo?.requiresAction || false,
          priority: fbChat.controllingInfo?.priority,
          category: fbChat.controllingInfo?.category
        };
      });
      
      // Alle Chats zusammenführen (nur neue hinzufügen, bestehende beibehalten)
      const allChats = [...chats, ...memberChats, ...convertedFirebaseChats];
      const cleanedChats = cleanupDuplicateChats(allChats);
      
      console.log('✅ [MessagingContext] Refreshed chats:', cleanedChats.length, 'total');
      
      setChats(cleanedChats);
      
      // Unread-Count aktualisieren
      const totalUnread = cleanedChats.reduce((sum, chat) => {
        if (chat.id.startsWith('direct_')) {
          return sum;
        }
        return sum + chat.unreadCount;
      }, 0);
      setUnreadCount(totalUnread);
      
  } catch (err: any) {
      const msg = (err && (err as any).message) || err;
      console.error('❌ [MessagingContext] Error refreshing chats:', msg);
    }
  };

  // Bereinige Duplikate und führe Chats zusammen
  const cleanupDuplicateChats = (allChats: Chat[]): Chat[] => {
    const cleanedChats: Chat[] = [];
    const userChatMap = new Map<string, Chat>();
    
    // Sortiere Chats: Member-Chats zuerst, dann Firebase-Chats
    const memberChats = allChats.filter(chat => chat.id.startsWith('direct_'));
    const firebaseChats = allChats.filter(chat => !chat.id.startsWith('direct_'));
    
    // Füge alle Member-Chats hinzu
    memberChats.forEach(chat => {
      cleanedChats.push(chat);
      
      // Finde den anderen Teilnehmer (nicht den aktuellen Benutzer)
      const otherParticipant = chat.participants.find(uid => uid !== user?.uid);
      if (otherParticipant) {
        userChatMap.set(otherParticipant, chat);
      }
    });
    
    // Füge Firebase-Chats hinzu. Falls ein Member-Chat (Kontakt) existiert, ersetze ihn durch den echten Firebase-Chat,
    // damit die UI die korrekte Chat-ID verwendet (sonst sind Nachrichten für andere Nutzer unsichtbar).
    firebaseChats.forEach(chat => {
      if (chat.type === 'direct') {
        // Finde den anderen Teilnehmer
        const otherParticipant = chat.participants.find(uid => uid !== user?.uid);
        
        if (otherParticipant && !userChatMap.has(otherParticipant)) {
          // Kein Member-Chat für diesen Benutzer, also Firebase-Chat hinzufügen
          cleanedChats.push(chat);
          userChatMap.set(otherParticipant, chat);
        } else if (otherParticipant && userChatMap.has(otherParticipant)) {
          const memberChat = userChatMap.get(otherParticipant);
          if (memberChat) {
            const idx = cleanedChats.findIndex(c => c.id === memberChat.id);
            const mergedChat: Chat = {
              ...chat,
              name: memberChat.name || chat.name,
              photoURL: memberChat.photoURL || chat.photoURL,
              isOnline: memberChat.isOnline ?? chat.isOnline,
            };
            if (idx >= 0) {
              cleanedChats[idx] = mergedChat;
            } else {
              cleanedChats.push(mergedChat);
            }
            userChatMap.set(otherParticipant, mergedChat);
          }
        }
      } else {
        // Nicht-direkte Chats (Gruppen, Controlling) immer hinzufügen
        cleanedChats.push(chat);
      }
    });
    

    return cleanedChats;
  };

  // ===== CONTEXT FUNCTIONS =====

  const openMessaging = () => {
    setIsMessagingOpen(true);
    // Kein automatischer Chat-Check mehr - nur manuell über Refresh-Button
  };
  const closeMessaging = () => setIsMessagingOpen(false);
  const toggleMinimizeMessaging = () => setIsMessagingMinimized(prev => !prev);

  const selectChat = async (chatId: string | null) => {
    if (!chatId) {
      setSelectedChat(null);
      return;
    }

    let actualChatId = chatId;
    // If user clicked a contact placeholder chat (direct_<uid>), resolve to a real Firebase chat ID
    if (chatId.startsWith('direct_') && messagingService) {
      const otherUserId = chatId.replace('direct_', '');
      const existingFirebaseChat = chats.find(c =>
        c.type === 'direct' &&
        !c.id.startsWith('direct_') &&
        (c.participants || []).length === 2 &&
        (c.participants || []).includes(otherUserId) &&
        (c.participants || []).includes(user?.uid || '')
      );
      if (existingFirebaseChat) {
        actualChatId = existingFirebaseChat.id;
      } else {
        try {
          actualChatId = await messagingService.createDirectChat(otherUserId);
        } catch (e) {
          // keep placeholder if we can't resolve
          actualChatId = chatId;
        }
      }
    }

    setSelectedChat(actualChatId);

    // Messages für den ausgewählten Chat laden
    if (messagingService) {
      try {
        // Set loading state
        setIsLoadingMessages(true);

        // Versuche Messages zu laden, aber falle auf leeren Array zurück bei Fehlern
        let existingMessages: Message[] = [];

        try {
          const firebaseMessages = await messagingService.getMessages(actualChatId, 50);
          // Lade alle Absender-Namen parallel
          const senderNames = await Promise.all(
            firebaseMessages.map(msg =>
              messagingService.getUserDisplayName(msg.senderId)
            )
          );

        existingMessages = firebaseMessages.map((fbMsg, index) => ({
            id: fbMsg.messageId,
            text: fbMsg.text,
            senderId: fbMsg.senderId,
            senderName: senderNames[index] ?? fbMsg.senderName ?? 'Unbekannter Benutzer',
            timestamp: fbMsg.timestamp?.toDate() || new Date(),
            isRead: fbMsg.readBy.includes(user?.uid || ''),
            status: fbMsg.status,
            media: fbMsg.media,
            isControllingMessage: fbMsg.controllingData?.requiresAction,
            readBy: fbMsg.readBy,
            acceptedBy: fbMsg.controllingData?.acceptedBy,
            requiresAction: fbMsg.controllingData?.requiresAction,
            priority: fbMsg.controllingData?.priority,
            deadline: fbMsg.controllingData?.deadline?.toDate()
          }));
        } catch (err: any) {
          console.error('❌ [MessagingContext] Error loading messages:', err?.message ?? err);
          existingMessages = [];
        }

        setMessages(prev => ({
          ...prev,
          [actualChatId]: existingMessages
        }));

      } catch (error) {
        console.error('❌ [MessagingContext] Error in selectChat:', error);
        // Bei Fehlern trotzdem leeren Chat anzeigen
        setMessages(prev => ({
          ...prev,
          [actualChatId]: []
        }));
      } finally {
        setIsLoadingMessages(false);
      }
    }
  };

  const sendMessage = async (chatId: string, text: string, media?: any): Promise<void> => {
    console.log('📤 [MessagingContext] Attempting to send message...', { chatId, text, media });
    
    if (!messagingService) {
      console.error('❌ [MessagingContext] No messaging service available');
      return;
    }
    
    if (!text.trim()) {
      console.error('❌ [MessagingContext] No text to send');
      return;
    }
    
    // Validiere media Parameter
    const hasValidMedia = media && typeof media === 'object' && Object.keys(media).length > 0;
    // If offline, enqueue the write for later
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      const queuedItem = {
        id: `offline_${Date.now()}`,
        action: 'sendMessage',
        payload: { chatId, text, media },
        timestamp: Date.now(),
        status: 'queued'
      };
      offlineQueue.enqueue(queuedItem as any);
      console.log('🗄️ [MessagingContext] Offline - queued message for chat', chatId);
      return;
    }
    
    try {
      let actualChatId = chatId;
      
      // Wenn es ein direkter Chat mit einem Concern-Mitglied ist, prüfe ob bereits ein Firebase-Chat existiert
      if (chatId.startsWith('direct_')) {
        console.log('🔍 [MessagingContext] Processing direct chat:', chatId);
        const otherUserId = chatId.replace('direct_', '');
        console.log('🔍 [MessagingContext] Other user ID:', otherUserId);
        
        // Prüfe ob bereits ein Firebase-Chat mit diesem Benutzer existiert
        // Only reuse REAL Firebase chats here (never the `direct_<uid>` placeholder contact entries)
        const existingChat = chats.find(chat => 
          chat.type === 'direct' &&
          !chat.id.startsWith('direct_') &&
          chat.participants.length === 2 &&
          chat.participants.includes(otherUserId) &&
          chat.participants.includes(user?.uid || '')
        );
        
        if (existingChat) {
          // Verwende den bestehenden Firebase-Chat
          actualChatId = existingChat.id;
          console.log('✅ [MessagingContext] Using existing Firebase chat:', actualChatId);
        } else {
          // Erstelle einen neuen Firebase-Chat nur wenn keiner existiert
          console.log('🔧 [MessagingContext] Creating new Firebase chat for user:', otherUserId);
          try {
            actualChatId = await messagingService.createDirectChat(otherUserId);
            console.log('✅ [MessagingContext] Created new Firebase chat:', actualChatId);
          } catch (chatError: any) {
            console.error('❌ [MessagingContext] Failed to create chat:', chatError);
            console.error('❌ [MessagingContext] Chat creation error details:', {
              message: chatError?.message,
              code: chatError?.code,
              stack: chatError?.stack
            });
            // Don't send the message if chat creation fails
            throw new Error(`Chat creation failed: ${chatError?.message || 'Unknown error'}`);
          }
        }
        
        // Chat-ID aktualisieren
        setSelectedChat(actualChatId);
      }
      
      // Temporö¤re Nachricht sofort zum lokalen State hinzufügen (optimistic update)
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        text: text.trim(),
        senderId: user?.uid || '',
        senderName: user?.displayName || 'Du',
        timestamp: new Date(),
        isRead: true,
        status: 'sent',
        ...(hasValidMedia && { media }), // Nur media hinzufügen wenn es gültig ist
        isControllingMessage: false,
        readBy: [user?.uid || ''],
        acceptedBy: [],
        requiresAction: false,
        priority: 'medium',
        deadline: undefined
      };
      
      // Nachricht zum lokalen State hinzufügen
      setMessages(prev => ({
        ...prev,
        [actualChatId]: [...(prev[actualChatId] || []), tempMessage]
      }));
      
      // Nachricht an Firestore senden
      console.log('📤 [MessagingContext] Sending message to Firestore:', { actualChatId, text, hasValidMedia });
      
      let messageId: string;
      if (hasValidMedia) {
        messageId = await messagingService.sendMessage(actualChatId, text, media);
      } else {
        messageId = await messagingService.sendMessage(actualChatId, text);
      }
      
      console.log('✅ [MessagingContext] Message sent successfully with ID:', messageId);
      
      // Do not aggressively remove the optimistic message here; wait for server confirmation via Firestore listener
      
    } catch (error) {
      console.error('❌ [MessagingContext] Failed to send message:', error);
      
      // Bei Fehler die temporöre Nachricht entfernen
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(msg => !msg.id.startsWith('temp_'))
      }));
    }
  };

  const markChatAsRead = async (chatId: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      // Alle ungelesenen Nachrichten als gelesen markieren
      const chatMessages = messages[chatId] || [];
      const unreadMessages = chatMessages.filter(msg => !msg.isRead);
      
      for (const message of unreadMessages) {
        await messagingService.markMessageAsRead(chatId, message.id);
      }
    } catch (error) {

    }
  };

  const createDirectChat = async (otherUserId: string): Promise<string> => {
    if (!messagingService) throw new Error('Messaging service not available');
    return await messagingService.createDirectChat(otherUserId);
  };

  const createGroupChat = async (name: string, participants: string[], description?: string): Promise<string> => {
    if (!messagingService) throw new Error('Messaging service not available');
    return await messagingService.createGroupChat(name, participants, description);
  };

  const createControllingChat = async (name: string, participants: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> => {
    if (!messagingService) throw new Error('Messaging service not available');
    return await messagingService.createControllingChat(name, participants, priority);
  };

  const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      await messagingService.deleteMessage(messageId);
    } catch (error) {

    }
  };

  const markControllingMessageAsRead = async (chatId: string, messageId: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      await messagingService.markControllingMessageAsRead(messageId);
    } catch (error) {

    }
  };

  const acceptControllingMessage = async (chatId: string, messageId: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      await messagingService.acceptControllingMessage(messageId);
    } catch (error) {

    }
  };

  const sendControllingMessage = async (chatId: string, text: string, requiresAction: boolean = true, priority: 'high' | 'medium' | 'low' = 'medium', deadline?: Date): Promise<void> => {
    if (!messagingService || !text.trim()) return;
    
    try {
      await messagingService.sendControllingMessage(chatId, text, requiresAction, priority, deadline);
    } catch (error) {

    }
  };

  const searchMessages = async (query: string, chatId?: string): Promise<Message[]> => {
    if (!messagingService) return [];
    
    try {
      const firebaseMessages = await messagingService.searchMessages(query, chatId);
      return firebaseMessages.map(fbMsg => ({
        id: fbMsg.messageId,
        text: fbMsg.text,
        senderId: fbMsg.senderId,
        senderName: '', // Wird spö¤ter gefüllt
        timestamp: fbMsg.timestamp?.toDate() || new Date(),
        isRead: fbMsg.readBy.includes(user?.uid || ''),
        status: fbMsg.status
      }));
    } catch (error) {

      return [];
    }
  };

  const leaveChat = async (chatId: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      await messagingService.leaveChat(chatId);
      setSelectedChat(null);
    } catch (error) {

    }
  };

  // File upload functions
  const uploadFile = async (file: File, chatId: string, onProgress?: (progress: number) => void): Promise<any> => {
    if (!messagingService) throw new Error('Messaging service not initialized');
    try {
      return await messagingService.uploadFile(file, chatId, onProgress);
    } catch (error) {

      throw error;
    }
  };

  const deleteFile = async (messageId: string, fileUrl: string): Promise<void> => {
    if (!messagingService) return;
    try {
      await messagingService.deleteFile(messageId, fileUrl);
    } catch (error) {

      throw error;
    }
  };

  const getFileDownloadUrl = async (fileUrl: string): Promise<string> => {
    if (!messagingService) throw new Error('Messaging service not initialized');
    try {
      return await messagingService.getFileDownloadUrl(fileUrl);
    } catch (error) {

      throw error;
    }
  };

  // Emoji functions
  const trackEmojiUsage = async (emoji: string): Promise<void> => {
    if (!messagingService) return;
    
    try {
      await messagingService.trackEmojiUsage(emoji);
    } catch (error) {
      // Emoji-Tracking-Fehler sind nicht kritisch für die Messaging-Funktionalität
      console.warn('âš ï¸ Emoji usage tracking failed (non-critical):', error);
    }
  };

  const getEmojiStats = async (): Promise<any[]> => {
    if (!messagingService) return [];
    try {
      return await messagingService.getEmojiStats();
    } catch (error) {

      return [];
    }
  };

  const toggleEmojiFavorite = async (emoji: string): Promise<void> => {
    if (!messagingService) return;
    try {
      await messagingService.toggleEmojiFavorite(emoji);
    } catch (error) {

    }
  };

  // Debug & compatibility functions
  const debugMessagingSystem = async (): Promise<any> => {
    if (!messagingService) {
      console.error('❌ [MessagingContext] No messaging service available for debug');
      return null;
    }

    try {
      console.log('🔍 [MessagingContext] Debugging messaging system...');

      // Test chat creation directly
      console.log('🧪 [MessagingContext] Testing direct chat creation...');
      try {
        const testChatId = await messagingService.createDirectChat('test_user_123');
        console.log('✅ [MessagingContext] Test chat creation succeeded:', testChatId);
      } catch (testError: any) {
        console.error('❌ [MessagingContext] Test chat creation failed:', testError);
        console.error('❌ [MessagingContext] Test error details:', {
          message: testError?.message,
          code: testError?.code,
          stack: testError?.stack
        });
      }

      const debugInfo = await messagingService.debugMessagingSystem();
      console.log('✅ [MessagingContext] Debug completed:', debugInfo);
      return debugInfo;
    } catch (error) {
      console.error('❌ [MessagingContext] Debug failed:', error);
      return null;
    }
  };

  const checkPortalCompatibility = async (): Promise<boolean> => {
    if (!messagingService) {
      console.error('❌ [MessagingContext] No messaging service available for compatibility check');
      return false;
    }
    
    try {
      console.log('🔍 [MessagingContext] Checking portal compatibility...');
      const debugInfo = await messagingService.debugMessagingSystem();
      const isCompatible = debugInfo.accessibleCollections.filter((col: any) => col.accessible).length >= 2;
      console.log('✅ [MessagingContext] Portal compatibility:', isCompatible);
      return isCompatible;
    } catch (error) {
      console.error('❌ [MessagingContext] Compatibility check failed:', error);
      return false;
    }
  };

  const contextValue: MessagingContextType = {
    isMessagingOpen,
    isMessagingMinimized,
    unreadCount,
    chats,
    messages,
    selectedChat,
    isLoadingMessages,
    openMessaging,
    closeMessaging,
    toggleMinimizeMessaging,
    setUnreadCount,
    sendMessage,
    markChatAsRead,
    selectChat,
    createDirectChat,
    createGroupChat,
    createControllingChat,
    deleteMessage,
    markControllingMessageAsRead,
    acceptControllingMessage,
    sendControllingMessage,
    searchMessages,
    leaveChat,
    debugMessagingSystem,
    checkPortalCompatibility,
    uploadFile,
    deleteFile,
    getFileDownloadUrl,
    trackEmojiUsage,
    getEmojiStats,
    toggleEmojiFavorite,
    refreshChats
  };

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export { MessagingProvider };
