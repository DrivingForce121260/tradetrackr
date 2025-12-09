import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const checkVacationConflicts = functions.firestore
  .document('personnel/{empId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() as any : null;
    if (!after) return;
    const empId = context.params.empId;
    const requests: any[] = after.vacationRequests || [];
    const approved = requests.filter(r=>r.status==='approved');
    if (!approved.length) return;

    // Load scheduleSlots to detect overlaps
    const slotsSnap = await db.collection('scheduleSlots')
      .where('assigneeIds','array-contains', empId)
      .get();
    const slots = slotsSnap.docs.map(d=>d.data());

    const conflicts: any[] = [];
    for (const r of approved) {
      const rs = (r.start.toDate ? r.start.toDate() : new Date(r.start));
      const re = (r.end.toDate ? r.end.toDate() : new Date(r.end));
      for (const s of slots) {
        const ss = s.start.toDate ? s.start.toDate() : new Date(s.start);
        const se = s.end.toDate ? s.end.toDate() : new Date(s.end);
        const overlap = ss <= re && se >= rs;
        if (overlap) {
          conflicts.push({ requestId: r.id, slotId: (s.id||''), projectId: s.projectId });
        }
      }
    }

    await change.after.ref.set({ vacationConflicts: conflicts, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });















