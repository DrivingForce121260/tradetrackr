/**
 * Email Intelligence Agent - Test Data Seeder
 * Creates demo email data for testing
 * 
 * NOTE: This function is no longer used in the UI (removed from SmartInbox)
 * The system now uses real IMAP email data
 * 
 * @deprecated - Only kept for manual testing purposes
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Seed test email data for an organization
 */
export const seedTestEmailData = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { orgId, count = 5 } = data;

    if (!orgId) {
      throw new functions.https.HttpsError('invalid-argument', 'orgId required');
    }

    try {
      const testEmails = generateTestEmails(orgId, count);
      
      // Create email summaries
      const batch = db.batch();
      
      for (const email of testEmails) {
        const emailId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const summaryRef = db.collection('emailSummaries').doc(emailId);
        
        batch.set(summaryRef, {
          ...email,
          emailId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Also create the full email record
        const emailRef = db.collection('incomingEmails').doc(emailId);
        batch.set(emailRef, {
          orgId: email.orgId,
          accountId: 'test_account',
          provider: 'test',
          providerMessageId: emailId,
          threadId: emailId,
          from: email.summaryBullets[0].includes('Lieferant') 
            ? 'lieferant@beispiel.de' 
            : 'kunde@beispiel.de',
          to: ['empfaenger@firma.de'],
          cc: [],
          subject: email.summaryBullets[0],
          bodyText: email.summaryBullets.join('\n'),
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          hasAttachments: Math.random() > 0.5,
          category: email.category,
          categoryConfidence: 0.95,
          processed: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      functions.logger.info(`Created ${testEmails.length} test emails for org ${orgId}`);
      
      return {
        success: true,
        count: testEmails.length,
        message: `${testEmails.length} Test-E-Mails wurden erstellt`,
      };
    } catch (error) {
      functions.logger.error('Error seeding test data:', error);
      throw new functions.https.HttpsError('internal', 'Failed to seed test data');
    }
  });

/**
 * Generate test email data
 */
function generateTestEmails(orgId: string, count: number) {
  const categories = ['INVOICE', 'ORDER', 'SHIPPING', 'CLAIM', 'COMPLAINT', 'KYC', 'GENERAL'];
  const priorities = ['high', 'normal', 'low'];
  const statuses = ['open', 'in_progress', 'done'];
  
  const templates = {
    INVOICE: [
      ['Rechnung RE-2025-001 über 2.450€ erhalten', 'Zahlungsfrist: 14 Tage', 'Lieferant: Elektro Schmidt GmbH'],
      ['Monatsrechnung Dezember - 1.890€', 'Fällig bis: 15.01.2025', 'Lieferant: Baustoff AG'],
      ['Rechnung für Material - 3.200€', 'Skonto möglich: 2%', 'Zahlung innerhalb 10 Tagen'],
    ],
    ORDER: [
      ['Neue Bestellung eingegangen: #BE-5432', 'Kunde: Müller Bau GmbH', 'Volumen: 15.000€'],
      ['Bestellung bestätigt - Lieferung in 3 Tagen', 'Artikel: Kabel und Leitungen', 'Menge: 500m'],
      ['Expressbestellung erhalten', 'Dringend: Morgen benötigt', 'Kunde: Stadtwerke München'],
    ],
    SHIPPING: [
      ['Lieferung unterwegs - Sendungsnummer: 12345678', 'Ankunft: Morgen 10-12 Uhr', 'Paketdienst: DHL'],
      ['Versandbestätigung: Ihre Ware wurde verschickt', 'Tracking-Link verfügbar', 'Zustellung in 2 Tagen'],
      ['Lieferung erfolgreich zugestellt', 'Unterschrift: M. Mustermann', 'Empfangen um 14:30 Uhr'],
    ],
    CLAIM: [
      ['Reklamation: Defekte Ware', 'Artikel: Schalter Serie A', 'Rücksendenummer angefordert'],
      ['Garantiefall gemeldet', 'Produkt: LED-Panel 60x60', 'Garantieende: 12.2025'],
    ],
    COMPLAINT: [
      ['Beschwerde über verspätete Lieferung', 'Kunde: Bauer Immobilien', 'Projektverzögerung von 3 Tagen'],
      ['Reklamation Servicequalität', 'Kundenzufriedenheit: Niedrig', 'Dringende Rückmeldung erforderlich'],
    ],
    KYC: [
      ['Handelsregisterauszug hochgeladen', 'Dokument: HR-Auszug 2025', 'Gültigkeit: 3 Monate'],
      ['Versicherungsnachweis erhalten', 'Betriebshaftpflicht aktualisiert', 'Deckungssumme: 5 Mio€'],
    ],
    GENERAL: [
      ['Terminbestätigung: Meeting nächste Woche', 'Datum: 15.01.2025, 14:00 Uhr', 'Ort: Hauptsitz München'],
      ['Newsletter: Neue Produkte verfügbar', 'Winter-Aktion: 15% Rabatt', 'Gültig bis Monatsende'],
    ],
  };
  
  const emails = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)] as any;
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
    const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
    
    const categoryTemplates = templates[category] || templates.GENERAL;
    const summaryBullets = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
    
    emails.push({
      orgId,
      category,
      summaryBullets,
      priority,
      status,
      assignedTo: null,
    });
  }
  
  return emails;
}

/**
 * Delete all test email data
 */
export const deleteTestEmailData = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { orgId } = data;

    if (!orgId) {
      throw new functions.https.HttpsError('invalid-argument', 'orgId required');
    }

    try {
      // Delete test email summaries
      const summariesQuery = db.collection('emailSummaries')
        .where('orgId', '==', orgId)
        .where('emailId', '>=', 'test_')
        .where('emailId', '<=', 'test_\uf8ff');
      
      const summariesSnapshot = await summariesQuery.get();
      const batch = db.batch();
      
      summariesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        // Also delete the corresponding email
        batch.delete(db.collection('incomingEmails').doc(doc.id));
      });
      
      await batch.commit();
      
      return {
        success: true,
        count: summariesSnapshot.size,
        message: `${summariesSnapshot.size} Test-E-Mails wurden gelöscht`,
      };
    } catch (error) {
      functions.logger.error('Error deleting test data:', error);
      throw new functions.https.HttpsError('internal', 'Failed to delete test data');
    }
  });


