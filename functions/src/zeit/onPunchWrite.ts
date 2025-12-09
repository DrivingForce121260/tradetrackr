/**
 * TradeTrackr - Zeit-Tracking Cloud Function
 * onPunchWrite: Validiert und verarbeitet Zeit-Stempelungen
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onPunchWrite = functions.firestore
  .document('punches/{punchId}')
  .onWrite(async (change, context) => {
    const punchId = context.params.punchId;
    
    // Gelöschter Punch - keine Aktion erforderlich
    if (!change.after.exists) {
      console.log(`Punch ${punchId} gelöscht`);
      return null;
    }

    const punchData = change.after.data();
    const previousData = change.before.exists ? change.before.data() : null;

    if (!punchData) {
      console.error('No punch data found');
      return null;
    }

    try {
      // 1. Dauer berechnen (wenn endAt gesetzt wurde)
      if (punchData.endAt && (!previousData || !previousData.endAt)) {
        const startTime = punchData.startAt?.toDate();
        const endTime = punchData.endAt?.toDate();
        
        if (startTime && endTime) {
          const durationSec = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          
          await change.after.ref.update({
            durationSec,
            'audit.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
            'audit.updatedBy': 'system',
          });
        }
      }

      // 2. Überlappungen prüfen
      if (punchData.uid && punchData.startAt && punchData.ConcernID) {
        const overlaps = await db.collection('punches')
          .where('uid', '==', punchData.uid)
          .where('ConcernID', '==', punchData.ConcernID)  // ← KORRIGIERT: Großes D
          .get();

        const currentStart = punchData.startAt.toDate().getTime();
        const currentEnd = punchData.endAt ? punchData.endAt.toDate().getTime() : Date.now();

        for (const doc of overlaps.docs) {
          if (doc.id === punchId) continue;
          
          const otherPunch = doc.data();
          const otherStart = otherPunch.startAt.toDate().getTime();
          const otherEnd = otherPunch.endAt ? otherPunch.endAt.toDate().getTime() : Date.now();

          // Überlappung erkannt
          if (currentStart < otherEnd && currentEnd > otherStart) {
            console.warn(`Überlappung erkannt: Punch ${punchId} überschneidet sich mit ${doc.id}`);
            
            // Ausnahme erstellen
            if (punchData.uid && punchData.ConcernID) {
              await db.collection('exceptions').add({
                type: 'overlap',
                severity: 'high',
                punchId,
                relatedPunchId: doc.id,
                uid: punchData.uid,
                ConcernID: punchData.ConcernID,  // ← KORRIGIERT
                description: `Punch überschneidet sich mit einem anderen Eintrag`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }

      // 3. Geofence-Validierung
      if (punchData.siteId && punchData.locationStart && punchData.method === 'geofence') {
        const siteDoc = await db.collection('sites').doc(punchData.siteId).get();
        
        if (siteDoc.exists) {
          const site = siteDoc.data();
          
          if (site && site.geo && punchData.locationStart.lat && punchData.locationStart.lng) {
            const distance = calculateDistance(
              punchData.locationStart.lat,
              punchData.locationStart.lng,
              site.geo.lat,
              site.geo.lng
            );

            if (distance > site.radiusMeters && punchData.uid && punchData.ConcernID) {
              console.warn(`Geofence-Verstoß: Punch ${punchId} außerhalb des Radius`);
              
              await db.collection('exceptions').add({
                type: 'out_of_geofence',
                severity: 'medium',
                punchId,
                uid: punchData.uid,
                ConcernID: punchData.ConcernID,  // ← KORRIGIERT
                description: `Start-Position ${Math.round(distance)}m außerhalb des Geofence-Radius (${site.radiusMeters}m)`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }

      // 4. Timesheet aktualisieren
      if (punchData.periodId && punchData.durationSec && punchData.uid) {
        await updateTimesheetTotals(punchData.uid, punchData.periodId);
      }

      console.log(`Punch ${punchId} erfolgreich verarbeitet`);
      return null;

    } catch (error) {
      console.error(`Fehler bei der Verarbeitung von Punch ${punchId}:`, error);
      throw error;
    }
  });

/**
 * Berechnet die Distanz zwischen zwei Koordinaten (Haversine-Formel)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Erdradius in Metern
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Aktualisiert die Gesamtzeiten im Timesheet
 */
async function updateTimesheetTotals(uid: string, periodId: string): Promise<void> {
  const punchesSnapshot = await db.collection('punches')
    .where('uid', '==', uid)
    .where('periodId', '==', periodId)
    .where('endAt', '!=', null)
    .get();

  let totalSeconds = 0;
  let overtimeSeconds = 0;
  let billableSeconds = 0;

  for (const doc of punchesSnapshot.docs) {
    const punch = doc.data();
    if (punch.durationSec) {
      totalSeconds += punch.durationSec;
      
      // Billable hours (wenn Task billable ist)
      // TODO: Task-Abfrage für billable-Flag
      
      // Überstunden (vereinfacht: > 8h pro Tag)
      if (punch.durationSec > 8 * 3600) {
        overtimeSeconds += (punch.durationSec - 8 * 3600);
      }
    }
  }

  const hours = totalSeconds / 3600;
  const overtime = overtimeSeconds / 3600;
  const billableHours = billableSeconds / 3600;

  await db.collection('timesheets')
    .doc(uid)
    .collection('periods')
    .doc(periodId)
    .set({
      totals: {
        hours: parseFloat(hours.toFixed(2)),
        overtime: parseFloat(overtime.toFixed(2)),
        billableHours: parseFloat(billableHours.toFixed(2)),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

