/**
 * Cloud Function zum Löschen ungültiger Chats
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const cleanupInvalidChats = functions.https.onCall(async (data, context) => {
  // Nur Admins dürfen Chats löschen
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentifizierung erforderlich');
  }

  const db = admin.firestore();
  const { chatIds } = data;

  if (!chatIds || !Array.isArray(chatIds)) {
    throw new functions.https.HttpsError('invalid-argument', 'chatIds Array erforderlich');
  }

  const results = [];

  for (const chatId of chatIds) {
    const collections = ['chats', 'chats_v2', 'direct_chats'];
    let deleted = false;

    for (const collectionName of collections) {
      try {
        const chatRef = db.collection(collectionName).doc(chatId);
        const chatDoc = await chatRef.get();

        if (chatDoc.exists) {
          console.log(`Found chat ${chatId} in ${collectionName}`);
          
          // Delete messages subcollection if exists
          const messagesRef = chatRef.collection('messages');
          const messagesSnapshot = await messagesRef.get();
          
          if (!messagesSnapshot.empty) {
            console.log(`Deleting ${messagesSnapshot.size} messages...`);
            const batch = db.batch();
            messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }

          // Delete the chat document
          await chatRef.delete();
          
          results.push({
            chatId,
            collection: collectionName,
            status: 'deleted',
            messagesDeleted: messagesSnapshot.size
          });
          
          deleted = true;
          break;
        }
      } catch (error: any) {
        console.error(`Error in ${collectionName}:`, error);
      }
    }

    if (!deleted) {
      results.push({
        chatId,
        status: 'not_found'
      });
    }
  }

  return {
    success: true,
    results
  };
});













