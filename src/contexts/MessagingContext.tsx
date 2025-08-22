import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessagingService, FirebaseChat, FirebaseMessage } from '@/services/messagingService';

// Vereinfachte Interfaces för die Komponenten
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
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
  openMessaging: () => void;
  closeMessaging: () => void;
  toggleMinimizeMessaging: () => void;
  setUnreadCount: (count: number) => void;
  sendMessage: (chatId: string, text: string, media?: any) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  selectChat: (chatId: string) => void;
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
  // File upload functions
  uploadFile: (file: File, chatId: string, onProgress?: (progress: number) => void) => Promise<any>;
  deleteFile: (messageId: string, fileUrl: string) => Promise<void>;
  getFileDownloadUrl: (fileUrl: string) => Promise<string>;
  // Emoji functions
  trackEmojiUsage: (emoji: string) => Promise<void>;
  getEmojiStats: () => Promise<any[]>;
  toggleEmojiFavorite: (emoji: string) => Promise<void>;
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
  const [messagingService, setMessagingService] = useState<MessagingService | null>(null);

  // MessagingService initialisieren
  useEffect(() => {



    
    if (!user?.concernID) {

      return;
    }


    
    const service = new MessagingService(user, user.concernID);

    setMessagingService(service);
    
    // User-Status auf online setzen
    try {
      service.updateUserStatus('online');

    } catch (error) {

    }
    
    // Cleanup beim Verlassen
    return () => {
      try {
        service.updateUserStatus('offline');

      } catch (error) {

      }
    };
  }, [user]);

  // Concern-Mitglieder laden (nach MessagingService Initialisierung)
  useEffect(() => {



    
    if (!messagingService || !user?.concernID) {

      return;
    }



    // Concern-Mitglieder direkt laden
    const loadConcernMembers = async () => {
      try {

        const members = await messagingService.getConcernMembers();

        
        const memberChats: Chat[] = members
          .filter(member => member.uid !== user?.uid) // Nicht den aktuellen Benutzer
          .map(member => ({
            id: `direct_${member.uid}`,
            name: member.displayName || member.email || 'Unbekannter Benutzer',
            type: 'direct' as const,
            participants: [user?.uid || '', member.uid],
            lastMessage: undefined,
            unreadCount: 0,
            isOnline: member.status === 'online'
          }));




        // Wenn keine anderen Benutzer gefunden wurden, zeige eine Info-Nachricht
        if (memberChats.length === 0) {

          const infoChat: Chat = {
            id: 'info_no_users',
            name: 'Keine anderen Benutzer verfögbar',
            type: 'direct',
            participants: [user?.uid || ''],
            lastMessage: undefined,
            unreadCount: 0,
            isOnline: false
          };
          memberChats.push(infoChat);

        }

        // Member-Chats in den State setzen
        setChats(prevChats => {
          const existingMemberChats = prevChats.filter(chat => chat.id.startsWith('direct_'));
          const newMemberChats = memberChats.filter(newChat => 
            !existingMemberChats.some(existing => existing.id === newChat.id)
          );
          const updatedChats = [...prevChats, ...newMemberChats];

          return updatedChats;
        });
        setUnreadCount(0); // Keine unread messages für Member-Chats
      } catch (error) {

        
        // Bei Berechtigungsfehlern trotzdem einen Info-Chat anzeigen
        if (error.message && error.message.includes('permissions')) {

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

  // Real-time Chats abonnieren (optional, für bestehende Chats)
  useEffect(() => {
    if (!messagingService || !user?.concernID) return;

    const unsubscribe = messagingService.subscribeToChats((firebaseChats: FirebaseChat[]) => {

      
      const convertedChats: Chat[] = firebaseChats.map(fbChat => {
        // Generiere einen Namen für den Chat
        let chatName = fbChat.name;
        if (!chatName || chatName.trim() === '') {
          if (fbChat.type === 'direct' && fbChat.participants.length === 2) {
            // Für direkte Chats: Name des anderen Teilnehmers
            const otherParticipantId = fbChat.participants.find(pid => pid !== user?.uid);
            if (otherParticipantId) {
              chatName = `Chat mit ${otherParticipantId.substring(0, 8)}...`;
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
        const firebaseChatsMap = new Map(convertedChats.map(chat => [chat.id, chat]));
        const existingFirebaseChats = prevChats.filter(chat => !chat.id.startsWith('direct_'));
        
        // Neue Firebase-Chats hinzufügen oder bestehende aktualisieren
        const updatedFirebaseChats = existingFirebaseChats.map(existingChat => 
          firebaseChatsMap.get(existingChat.id) || existingChat
        );
        
        // Neue Firebase-Chats hinzufügen, die noch nicht existieren
        const newFirebaseChats = convertedChats.filter(newChat => 
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

  // Real-time Messages für ausgewö¤hlten Chat abonnieren
  useEffect(() => {
    if (!messagingService || !selectedChat) return;

    const unsubscribe = messagingService.subscribeToMessages(selectedChat, (firebaseMessages: FirebaseMessage[]) => {
      const convertedMessages: Message[] = firebaseMessages.map(fbMsg => ({
        id: fbMsg.messageId,
        text: fbMsg.text,
        senderId: fbMsg.senderId,
        senderName: '', // Wird spö¤ter gefüllt
        timestamp: fbMsg.timestamp?.toDate() || new Date(),
        isRead: fbMsg.readBy.includes(user?.uid || ''),
        status: fbMsg.status,
        media: fbMsg.media,
        isControllingMessage: fbMsg.controllingData?.requiresAction,
        readBy: fbMsg.readBy,
        acceptedBy: fbMsg.controllingData?.acceptedBy,
        requiresAction: fbMsg.controllingData?.requiresAction,
        priority: fbMsg.controllingData?.priority,
        deadline: fbMsg.controllingData?.deadline?.toDate() || undefined
      }));

      setMessages(prev => ({
        ...prev,
        [selectedChat]: convertedMessages
      }));
    });

    return unsubscribe;
  }, [messagingService, selectedChat, user]);

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
    
    // Füge Firebase-Chats hinzu, aber nur wenn kein Member-Chat existiert
    firebaseChats.forEach(chat => {
      if (chat.type === 'direct') {
        // Finde den anderen Teilnehmer
        const otherParticipant = chat.participants.find(uid => uid !== user?.uid);
        
        if (otherParticipant && !userChatMap.has(otherParticipant)) {
          // Kein Member-Chat für diesen Benutzer, also Firebase-Chat hinzufügen
          cleanedChats.push(chat);
          userChatMap.set(otherParticipant, chat);
        } else if (otherParticipant && userChatMap.has(otherParticipant)) {

        }
      } else {
        // Nicht-direkte Chats (Gruppen, Controlling) immer hinzufügen
        cleanedChats.push(chat);
      }
    });
    

    return cleanedChats;
  };

  // ===== CONTEXT FUNCTIONS =====

  const openMessaging = () => setIsMessagingOpen(true);
  const closeMessaging = () => setIsMessagingOpen(false);
  const toggleMinimizeMessaging = () => setIsMessagingMinimized(prev => !prev);

  const selectChat = async (chatId: string) => {
    setSelectedChat(chatId);
    
    // Messages für den ausgewö¤hlten Chat laden
    if (messagingService) {
      try {
        // Versuche Messages zu laden, aber falle auf leeren Array zurück bei Fehlern
        let existingMessages: Message[] = [];
        
        try {
          const firebaseMessages = await messagingService.getMessages(chatId, 50);
          existingMessages = firebaseMessages.map(fbMsg => ({
            id: fbMsg.messageId,
            text: fbMsg.text,
            senderId: fbMsg.senderId,
            senderName: '', // Wird spö¤ter gefüllt
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
        } catch (error) {

          existingMessages = [];
        }

        setMessages(prev => ({
          ...prev,
          [chatId]: existingMessages
        }));
        
        // Kein markMessageAsDelivered Aufruf mehr - verursacht Fehler mit temporö¤ren IDs
      } catch (error) {

        // Bei Fehlern trotzdem leeren Chat anzeigen
        setMessages(prev => ({
          ...prev,
          [chatId]: []
        }));
      }
    }
  };

  const sendMessage = async (chatId: string, text: string, media?: any): Promise<void> => {
    if (!messagingService || !text.trim()) return;
    
    // Validiere media Parameter
    const hasValidMedia = media && typeof media === 'object' && Object.keys(media).length > 0;
    
    try {
      let actualChatId = chatId;
      
      // Wenn es ein direkter Chat mit einem Concern-Mitglied ist, prüfe ob bereits ein Firebase-Chat existiert
      if (chatId.startsWith('direct_')) {
        const otherUserId = chatId.replace('direct_', '');
        
        // Prüfe ob bereits ein Firebase-Chat mit diesem Benutzer existiert
        const existingChat = chats.find(chat => 
          chat.type === 'direct' && 
          chat.participants.includes(otherUserId) &&
          !chat.id.startsWith('direct_') // Nur Firebase-Chats, nicht Member-Chats
        );
        
        if (existingChat) {
          // Verwende den bestehenden Firebase-Chat
          actualChatId = existingChat.id;

        } else {
          // Erstelle einen neuen Firebase-Chat nur wenn keiner existiert
          actualChatId = await messagingService.createDirectChat(otherUserId);

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
      if (hasValidMedia) {
        await messagingService.sendMessage(actualChatId, text, media);
      } else {
        await messagingService.sendMessage(actualChatId, text);
      }
      
      // Temporö¤re Nachricht entfernen (wird durch Firestore-Listener ersetzt)
      setTimeout(() => {
        setMessages(prev => ({
          ...prev,
          [actualChatId]: (prev[actualChatId] || []).filter(msg => msg.id !== tempMessage.id)
        }));
      }, 1000);
      
    } catch (error) {

      
      // Bei Fehler die temporö¤re Nachricht entfernen
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
      // Emoji-Tracking-Fehler sind nicht kritisch für die Messaging-Funktionalitö¤t
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

  const contextValue: MessagingContextType = {
    isMessagingOpen,
    isMessagingMinimized,
    unreadCount,
    chats,
    messages,
    selectedChat,
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
    uploadFile,
    deleteFile,
    getFileDownloadUrl,
    trackEmojiUsage,
    getEmojiStats,
    toggleEmojiFavorite
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
