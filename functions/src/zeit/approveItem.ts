/**
 * TradeTrackr - Zeit-Tracking Cloud Function
 * approveItem: Genehmigt Stundenzettel, Urlaubsanträge oder einzelne Punches
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface ApproveRequest {
  targetType: 'punch' | 'timesheet' | 'leave';
  targetId: string;
  userId?: string; // Für timesheet
  periodId?: string; // Für timesheet
  status: 'approved' | 'rejected';
  comment: string;
}

export const approveItem = functions.https.onCall(async (data: ApproveRequest, context) => {
  // Authentifizierung prüfen
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
  }

  // Berechtigung prüfen (muss Supervisor oder Admin sein)
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  const isSupervisor = userData?.role === 'supervisor' || userData?.role === 'admin';

  if (!isSupervisor) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Keine Berechtigung zum Genehmigen'
    );
  }

  const { targetType, targetId, userId, periodId, status, comment } = data;

  try {
    let targetRef: FirebaseFirestore.DocumentReference;
    let targetPath: string;
    let concernId: string;

    // Ziel-Dokument basierend auf Typ
    switch (targetType) {
      case 'punch':
        targetRef = db.collection('punches').doc(targetId);
        targetPath = `punches/${targetId}`;
        const punchDoc = await targetRef.get();
        if (!punchDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Punch nicht gefunden');
        }
        concernId = punchDoc.data()!.ConcernID;  // ← KORRIGIERT
        break;

      case 'timesheet':
        if (!userId || !periodId) {
          throw new functions.https.HttpsError('invalid-argument', 'userId und periodId erforderlich');
        }
        targetRef = db.collection('timesheets').doc(userId).collection('periods').doc(periodId);
        targetPath = `timesheets/${userId}/periods/${periodId}`;
        const timesheetDoc = await targetRef.get();
        if (!timesheetDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Timesheet nicht gefunden');
        }
        concernId = timesheetDoc.data()!.concernId || userData!.concernID;
        break;

      case 'leave':
        targetRef = db.collection('leave').doc(targetId);
        targetPath = `leave/${targetId}`;
        const leaveDoc = await targetRef.get();
        if (!leaveDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Urlaubsantrag nicht gefunden');
        }
        concernId = leaveDoc.data()!.ConcernID;  // ← KORRIGIERT
        break;

      default:
        throw new functions.https.HttpsError('invalid-argument', 'Ungültiger targetType');
    }

    // Status aktualisieren
    await targetRef.update({
      status,
      [`${status}At`]: admin.firestore.FieldValue.serverTimestamp(),
      [`${status}By`]: context.auth.uid,
      supervisorNote: comment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Approval-Eintrag erstellen
    await db.collection('approvals').add({
      targetType,
      targetId: targetType === 'timesheet' ? periodId : targetId,
      targetPath,
      approverUid: context.auth.uid,
      status,
      comment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ConcernID: concernId,  // ← KORRIGIERT
    });

    // Audit Log
    await db.collection('auditLogs').add({
      actorUid: context.auth.uid,
      action: `approve_${targetType}`,
      targetPath,
      after: { status, comment },
      at: admin.firestore.FieldValue.serverTimestamp(),
      ConcernID: concernId,  // ← KORRIGIERT
    });

    console.log(`${targetType} ${targetId} wurde ${status} von ${context.auth.uid}`);

    return {
      success: true,
      message: `${targetType} erfolgreich ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`,
    };

  } catch (error) {
    console.error('Fehler beim Genehmigen:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Fehler beim Genehmigen');
  }
});

