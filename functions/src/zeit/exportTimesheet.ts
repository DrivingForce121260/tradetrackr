/**
 * TradeTrackr - Zeit-Tracking Cloud Function  
 * exportTimesheet: Exportiert Stundenzettel als CSV/PDF
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const db = admin.firestore();
const storage = admin.storage();

interface ExportRequest {
  uid: string;
  periodId: string;
  format: 'csv' | 'pdf' | 'datev';
  concernId: string;
}

export const exportTimesheet = functions.https.onCall(async (data: ExportRequest, context) => {
  // Authentifizierung prüfen
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
  }

  const { uid, periodId, format: exportFormat, concernId } = data;

  // Berechtigungen prüfen
  const isOwn = context.auth.uid === uid;
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  const isSupervisor = userData?.role === 'supervisor' || userData?.role === 'admin';

  if (!isOwn && !isSupervisor) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Keine Berechtigung zum Exportieren dieses Stundenzettels'
    );
  }

  try {
    // Daten abrufen
    const periodDoc = await db
      .collection('timesheets')
      .doc(uid)
      .collection('periods')
      .doc(periodId)
      .get();

    if (!periodDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Stundenzettel-Periode nicht gefunden');
    }

    const periodData = periodDoc.data();
    
    // Punches abrufen
    const punchesSnapshot = await db
      .collection('punches')
      .where('uid', '==', uid)
      .where('periodId', '==', periodId)
      .orderBy('startAt', 'asc')
      .get();

    const punches = punchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Benutzer-Daten
    const userSnapshot = await db.collection('users').doc(uid).get();
    const user = userSnapshot.data();

    // Format-spezifischer Export
    let fileContent: string;
    let fileName: string;
    let contentType: string;

    switch (exportFormat) {
      case 'csv':
        fileContent = generateCSV(punches, periodData, user);
        fileName = `timesheet_${uid}_${periodId}.csv`;
        contentType = 'text/csv';
        break;
      
      case 'datev':
        fileContent = generateDATEV(punches, periodData, user);
        fileName = `datev_${uid}_${periodId}.csv`;
        contentType = 'text/csv';
        break;
      
      case 'pdf':
        // PDF-Generierung würde zusätzliche Libraries benötigen (z.B. PDFKit)
        throw new functions.https.HttpsError('unimplemented', 'PDF-Export noch nicht implementiert');
      
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Ungültiges Export-Format');
    }

    // In Storage hochladen
    const bucket = storage.bucket();
    const filePath = `exports/${concernId}/${uid}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(fileContent, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    });

    // Signed URL generieren (24 Stunden gültig)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Audit-Log erstellen
    await db.collection('auditLogs').add({
      actorUid: context.auth.uid,
      action: 'export_timesheet',
      targetPath: `timesheets/${uid}/periods/${periodId}`,
      format: exportFormat,
      at: admin.firestore.FieldValue.serverTimestamp(),
      ConcernID: concernId,  // ← KORRIGIERT
    });

    return {
      url,
      fileName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

  } catch (error) {
    console.error('Fehler beim Export:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Fehler beim Generieren des Exports');
  }
});

/**
 * Generiert CSV-Datei
 */
function generateCSV(punches: any[], period: any, user: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Datum,Start,Ende,Dauer (h),Pause (min),Projekt,Aufgabe,Standort,Notizen');
  
  // Datenzeilen
  for (const punch of punches) {
    const startDate = punch.startAt.toDate();
    const endDate = punch.endAt ? punch.endAt.toDate() : null;
    const duration = punch.durationSec ? (punch.durationSec / 3600).toFixed(2) : '-';
    const breakMin = punch.breakSec ? Math.round(punch.breakSec / 60) : 0;
    
    lines.push([
      format(startDate, 'dd.MM.yyyy', { locale: de }),
      format(startDate, 'HH:mm'),
      endDate ? format(endDate, 'HH:mm') : '-',
      duration,
      breakMin,
      punch.projectId || '-',
      punch.taskId || '-',
      punch.siteId || '-',
      (punch.notes || '').replace(/,/g, ';'), // Kommas escapen
    ].join(','));
  }
  
  // Summenzeile
  const totalHours = period.totals?.hours || 0;
  lines.push('');
  lines.push(`Gesamt,,,${totalHours.toFixed(2)}`);
  
  return lines.join('\n');
}

/**
 * Generiert DATEV-kompatibles CSV
 */
function generateDATEV(punches: any[], period: any, user: any): string {
  const lines: string[] = [];
  
  // DATEV-spezifischer Header
  lines.push('"EXTF";"300";"21";"Zeiterfassung";"2.0"');
  lines.push('"Personalnummer";"Datum";"Von";"Bis";"Pause";"Stunden";"Art"');
  
  // Datenzeilen im DATEV-Format
  for (const punch of punches) {
    const startDate = punch.startAt.toDate();
    const endDate = punch.endAt ? punch.endAt.toDate() : null;
    
    if (!endDate) continue; // Nur abgeschlossene Punches
    
    const duration = (punch.durationSec / 3600).toFixed(2);
    const breakMin = punch.breakSec ? Math.round(punch.breakSec / 60) : 0;
    
    lines.push([
      `"${user?.mitarbeiterID || user?.uid}"`,
      `"${format(startDate, 'ddMMyyyy')}"`,
      `"${format(startDate, 'HHmm')}"`,
      `"${format(endDate, 'HHmm')}"`,
      `"${breakMin}"`,
      `"${duration}"`,
      '"Normal"',
    ].join(';'));
  }
  
  return lines.join('\n');
}
