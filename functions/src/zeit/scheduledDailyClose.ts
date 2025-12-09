/**
 * TradeTrackr - Zeit-Tracking Cloud Function
 * scheduledDailyClose: Beendet automatisch alle laufenden Punches um 23:59
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const scheduledDailyClose = functions.pubsub
  .schedule('59 23 * * *') // Täglich um 23:59
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    console.log('Starte täglichen Auto-Close...');

    try {
      // Alle offenen Punches finden (ohne endAt)
      const openPunchesSnapshot = await db.collection('punches')
        .where('endAt', '==', null)
        .get();

      if (openPunchesSnapshot.empty) {
        console.log('Keine offenen Punches gefunden');
        return null;
      }

      console.log(`Gefundene offene Punches: ${openPunchesSnapshot.size}`);

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      for (const doc of openPunchesSnapshot.docs) {
        const punchData = doc.data();
        const startTime = punchData.startAt.toDate();
        const endTime = now.toDate();
        const durationSec = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        // Punch beenden
        batch.update(doc.ref, {
          endAt: now,
          durationSec,
          notes: (punchData.notes || '') + ' [Automatisch beendet um 23:59]',
          'audit.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
          'audit.updatedBy': 'system',
        });

        // Audit Log
        batch.create(db.collection('auditLogs').doc(), {
          actorUid: 'system',
          action: 'auto_close_punch',
          targetPath: `punches/${doc.id}`,
          before: { endAt: null },
          after: { endAt: now, reason: 'Daily auto-close at 23:59' },
          at: admin.firestore.FieldValue.serverTimestamp(),
          ConcernID: punchData.ConcernID,  // ← KORRIGIERT
        });
      }

      await batch.commit();
      console.log(`Erfolgreich ${openPunchesSnapshot.size} Punches geschlossen`);

      return null;
    } catch (error) {
      console.error('Fehler beim automatischen Schließen:', error);
      throw error;
    }
  });

