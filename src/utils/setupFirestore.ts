import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Firestore-Setup für Messaging-System
export class FirestoreSetup {
  
  // Initialisiere die Datenbank mit Standard-Daten
  static async initializeDatabase(concernID: string, adminUserId: string) {
    try {
      console.log('🚀 Initialisiere Firestore-Datenbank...');
      
      // 1. Admin-User erstellen
      await this.createUser(adminUserId, {
        uid: adminUserId,
        email: 'admin@concern.com',
        displayName: 'Admin User',
        status: 'online',
        lastSeen: serverTimestamp(),
        concernID: concernID,
        role: 'admin'
      });
      
      // 2. Standard-Chats erstellen
      await this.createDefaultChats(concernID, adminUserId);
      
      // 3. Standard-Nachrichten erstellen
      await this.createDefaultMessages(concernID, adminUserId);
      
      console.log('✅ Firestore-Datenbank erfolgreich initialisiert!');
      
    } catch (error) {
      console.error('❌ Fehler beim Initialisieren der Datenbank:', error);
      throw error;
    }
  }
  
  // User erstellen
  private static async createUser(userId: string, userData: any) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, userData);
    console.log(`👤 User ${userId} erstellt`);
  }
  
  // Standard-Chats erstellen
  private static async createDefaultChats(concernID: string, adminUserId: string) {
    const chats = [
      {
        type: 'group',
        name: '🏢 Gesamtteam',
        participants: [adminUserId],
        unreadCount: { [adminUserId]: 0 },
        metadata: {
          createdBy: adminUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          concernID: concernID
        },
        groupInfo: {
          description: 'Hauptkanal für alle Mitarbeiter',
          admins: [adminUserId]
        }
      },
      {
        type: 'controlling',
        name: '🎯 Controlling',
        participants: [adminUserId],
        unreadCount: { [adminUserId]: 0 },
        metadata: {
          createdBy: adminUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          concernID: concernID
        },
        controllingInfo: {
          requiresAction: true,
          priority: 'high',
          category: 'project'
        }
      }
    ];
    
    for (const chatData of chats) {
      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      console.log(`💬 Chat "${chatData.name}" erstellt mit ID: ${chatRef.id}`);
      
      // Chat-Participants erstellen
      await this.createChatParticipants(chatRef.id, [adminUserId], adminUserId);
    }
  }
  
  // Chat-Participants erstellen
  private static async createChatParticipants(chatId: string, userIds: string[], adminUserId: string) {
    for (const userId of userIds) {
      const participantData = {
        chatId: chatId,
        userId: userId,
        joinedAt: serverTimestamp(),
        role: userId === adminUserId ? 'admin' : 'member',
        isActive: true,
        lastReadAt: serverTimestamp(),
        unreadCount: 0
      };
      
      await addDoc(collection(db, 'chat_participants'), participantData);
    }
    console.log(`👥 Chat-Participants für Chat ${chatId} erstellt`);
  }
  
  // Standard-Nachrichten erstellen
  private static async createDefaultMessages(concernID: string, adminUserId: string) {
    // Gesamtteam-Chat finden
    const teamChatQuery = query(
      collection(db, 'chats'),
      where('name', '==', '🏢 Gesamtteam'),
      where('metadata.concernID', '==', concernID)
    );
    
    const teamChatSnap = await getDocs(teamChatQuery);
    if (!teamChatSnap.empty) {
      const teamChatId = teamChatSnap.docs[0].id;
      
      const welcomeMessage = {
        chatId: teamChatId,
        text: 'Willkommen im Gesamtteam! Hier können alle Mitarbeiter kommunizieren.',
        senderId: adminUserId,
        timestamp: serverTimestamp(),
        status: 'read',
        readBy: [adminUserId],
        deliveredTo: [adminUserId]
      };
      
      await addDoc(collection(db, 'messages'), welcomeMessage);
      console.log(`💬 Willkommensnachricht im Gesamtteam erstellt`);
    }
    
    // Controlling-Chat finden
    const controllingChatQuery = query(
      collection(db, 'chats'),
      where('name', '==', '🎯 Controlling'),
      where('metadata.concernID', '==', concernID)
    );
    
    const controllingChatSnap = await getDocs(controllingChatQuery);
    if (!controllingChatSnap.empty) {
      const controllingChatId = controllingChatSnap.docs[0].id;
      
      const controllingMessage = {
        chatId: controllingChatId,
        text: 'Controlling-Kanal aktiviert. Hier werden wichtige Nachrichten mit Handlungsbedarf gepostet.',
        senderId: adminUserId,
        timestamp: serverTimestamp(),
        status: 'read',
        readBy: [adminUserId],
        deliveredTo: [adminUserId],
        controllingData: {
          requiresAction: true,
          actionTaken: false,
          acceptedBy: [],
          priority: 'high',
          deadline: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24 Stunden
        }
      };
      
      await addDoc(collection(db, 'messages'), controllingMessage);
      console.log(`🎯 Controlling-Nachricht erstellt`);
    }
  }
  
  // Mitarbeiter zu Chats hinzufügen
  static async addEmployeeToChats(employeeId: string, employeeName: string, concernID: string) {
    try {
      // 1. User erstellen
      await this.createUser(employeeId, {
        uid: employeeId,
        email: `${employeeId}@concern.com`,
        displayName: employeeName,
        status: 'offline',
        lastSeen: serverTimestamp(),
        concernID: concernID,
        role: 'user'
      });
      
      // 2. Alle bestehenden Chats finden
      const chatsQuery = query(
        collection(db, 'chats'),
        where('metadata.concernID', '==', concernID)
      );
      
      const chatsSnap = await getDocs(chatsQuery);
      
      for (const chatDoc of chatsSnap.docs) {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        
        // 3. Mitarbeiter zu Chat-Teilnehmern hinzufügen
        await this.addParticipantToChat(chatId, employeeId, 'member');
        
        // 4. Unread-Count für neuen Mitarbeiter auf 0 setzen
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
          [`unreadCount.${employeeId}`]: 0
        }, { merge: true });
        
        console.log(`👤 Mitarbeiter ${employeeName} zu Chat "${chatData.name}" hinzugefügt`);
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen des Mitarbeiters:', error);
      throw error;
    }
  }
  
  // Teilnehmer zu Chat hinzufügen
  private static async addParticipantToChat(chatId: string, userId: string, role: 'admin' | 'member') {
    const participantData = {
      chatId: chatId,
      userId: userId,
      joinedAt: serverTimestamp(),
      role: role,
      isActive: true,
      lastReadAt: serverTimestamp(),
      unreadCount: 0
    };
    
    await addDoc(collection(db, 'chat_participants'), participantData);
  }
  
  // Datenbank zurücksetzen (nur für Entwicklung)
  static async resetDatabase(concernID: string) {
    try {
      console.log('🗑️ Setze Datenbank zurück...');
      
      // Alle Collections löschen
      const collections = ['users', 'chats', 'messages', 'chat_participants'];
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = querySnapshot.docs.map(doc => 
          setDoc(doc.ref, {}, { merge: false })
        );
        await Promise.all(deletePromises);
      }
      
      console.log('✅ Datenbank zurückgesetzt');
      
    } catch (error) {
      console.error('❌ Fehler beim Zurücksetzen der Datenbank:', error);
      throw error;
    }
  }
  
  // Datenbank-Status prüfen
  static async checkDatabaseStatus(concernID: string) {
    try {
      console.log('🔍 Prüfe Datenbank-Status...');
      
      const collections = ['users', 'chats', 'messages', 'chat_participants'];
      const status: any = {};
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        status[collectionName] = querySnapshot.size;
      }
      
      console.log('📊 Datenbank-Status:', status);
      return status;
      
    } catch (error) {
      console.error('❌ Fehler beim Prüfen des Datenbank-Status:', error);
      throw error;
    }
  }
}

// Hook für die Verwendung des Firestore-Setups
export const useFirestoreSetup = () => {
  return {
    initializeDatabase: FirestoreSetup.initializeDatabase,
    addEmployeeToChats: FirestoreSetup.addEmployeeToChats,
    resetDatabase: FirestoreSetup.resetDatabase,
    checkDatabaseStatus: FirestoreSetup.checkDatabaseStatus
  };
};


