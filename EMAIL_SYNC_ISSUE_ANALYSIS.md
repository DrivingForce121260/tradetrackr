# 🔍 Email Sync Issue - Analysis & Solution

## 🐛 Problem

**Symptoms:**
- Most recent email shown: November 27, 2025
- No newer emails appearing
- Email synchronization failing

**Current Time:** December 19, 2025, 02:30-02:40 (night time)

---

## 📊 Analysis from Logs

### What the Logs Show:

```
2025-12-19T02:30:02.273155Z I imapPollJob: IMAP polling job skipped (night time, hour: 2:30)
2025-12-19T02:40:02.390227Z I imapPollJob: IMAP polling job skipped (night time, hour: 2:40)
```

**Status:** ✅ `imapPollJob` is running on schedule (every 10 minutes)  
**Issue:** ❌ Job is **skipping execution** during night time

---

## 🕐 Schedule Logic

The `imapPollJob` has different frequencies based on time:

### Business Hours (Mon-Fri, 07:00-18:00)
- ✅ Runs **every 10 minutes**
- ✅ Full execution

### Night Time (18:00-07:00) & Weekends
- ⏰ Runs **every 2 hours**
- ⏰ Only on **even hours** (00:00, 02:00, 04:00, 06:00, 18:00, 20:00, 22:00)
- ⏰ Only within **first 10 minutes** of the hour

**Current time:** 02:30, 02:40
**Next execution:** 04:00-04:10 (in ~1.5 hours)

---

## 🔍 Root Cause

### Why No Emails Since November 27?

**Possible causes:**

1. **No Email Account Connected**
   - Check Firestore `emailAccounts` collection
   - Look for documents with `active: true`

2. **Email Account Inactive**
   - Account exists but `active: false`
   - Credentials expired or invalid

3. **Sync Errors During Business Hours**
   - Function runs but fails to fetch emails
   - Check logs from business hours (07:00-18:00)

4. **No New Emails**
   - Email account has no new emails since Nov 27
   - (Less likely if it's a business email)

---

## ✅ Solution Steps

### Step 1: Check Email Accounts in Firestore

**Go to Firebase Console → Firestore Database → `emailAccounts` collection**

**Look for:**
- Documents with your `orgId` (e.g., `DE689E0F2D`)
- Check `active` field (should be `true`)
- Check `provider` field (imap, gmail, microsoft365)
- Check `syncState.lastSyncedAt` (when was last successful sync?)

**Expected document:**
```javascript
{
  id: "account-123",
  orgId: "DE689E0F2D",
  emailAddress: "info@company.com",
  provider: "imap",
  active: true,  // ← Must be true!
  syncState: {
    lastSyncedAt: Timestamp(Nov 27, 2025),  // ← Last successful sync
    lastMessageId: "12345"
  },
  oauthRef: "credentials-ref",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### Step 2: Check Business Hours Logs

**The function skips during night time, so we need to check logs from business hours:**

```bash
firebase functions:log | grep -E "IMAP polling job started|Fetched.*messages|Error" | tail -50
```

**Look for:**
- ✅ "IMAP polling job started (business hours, hour: XX:XX)"
- ✅ "Found X active IMAP accounts"
- ✅ "Fetched X messages for email@example.com"
- ❌ Any error messages

---

### Step 3: Manual Sync (Immediate Fix)

**Trigger a manual sync right now (bypasses schedule):**

**Option A: Via Browser Console**

```javascript
// Open Smart Inbox page
// Open browser console (F12)
// Run this code:

const functions = firebase.functions();
const syncEmailAccount = functions.httpsCallable('syncEmailAccount');

// Replace 'account-123' with your actual account ID from Firestore
syncEmailAccount({ accountId: 'account-123' })
  .then(result => {
    console.log('✅ Sync successful:', result.data);
    console.log('Messages fetched:', result.data.messageCount);
  })
  .catch(error => {
    console.error('❌ Sync failed:', error);
    console.error('Error details:', error.message);
  });
```

**Option B: Via Firebase CLI**

```bash
# Get your account ID from Firestore first
# Then call the function:

firebase functions:shell
> syncEmailAccount({accountId: 'account-123'})
```

---

### Step 4: Fix Schedule (If Needed)

**If you want more frequent syncing during nights/weekends:**

**Edit:** `functions/src/emailIntelligence/handlers.ts` (lines ~165-180)

**Current logic:**
```typescript
// Weekends (Saturday=6, Sunday=0) and nights: Only run every 2 hours
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
const isNightTime = hour >= 18 || hour < 7;
const isReducedFrequency = isWeekend || isNightTime;

if (isReducedFrequency) {
  // Only run on even hours (0, 2, 4, 6, 18, 20, 22)
  const isEvenHour = hour % 2 === 0;
  const isNearHourMark = minute <= 10;
  
  if (!isEvenHour || !isNearHourMark) {
    // SKIP execution
    return null;
  }
}
```

**Option 1: Run every 10 minutes (24/7)**
```typescript
// Comment out the reduced frequency logic
// if (isReducedFrequency) {
//   ...skip logic...
// }

// Function will now run every 10 minutes, 24/7
```

**Option 2: Run every 30 minutes during nights**
```typescript
if (isReducedFrequency) {
  // Run every 30 minutes instead of every 2 hours
  const isHalfHour = minute <= 10 || (minute >= 30 && minute <= 40);
  
  if (!isHalfHour) {
    return null;
  }
}
```

**Then redeploy:**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:imapPollJob
```

---

## 🔧 Immediate Action Plan

### Right Now (Night Time):

1. **Check Firestore** for `emailAccounts` collection
   - Verify account exists and is active
   - Note the account ID

2. **Trigger Manual Sync** (see Step 3 above)
   - Use browser console method
   - Check if new emails appear

3. **Check Logs** for errors
   ```bash
   firebase functions:log | grep -i error | tail -20
   ```

---

### Tomorrow Morning (Business Hours):

1. **Wait for automatic sync** at 07:00-07:10
2. **Check logs** to see if it runs successfully
3. **Verify new emails** appear in Smart Inbox

---

### If Still No Emails:

1. **Check email account credentials**
   - IMAP password might have expired
   - OAuth token might need refresh
   - Server settings might have changed

2. **Test email account manually**
   - Try connecting with email client (Thunderbird, Outlook)
   - Verify IMAP is enabled on the server

3. **Check Firestore permissions**
   - Ensure Cloud Function has read access to `emailAccounts`
   - Ensure Cloud Function has write access to `emailSummaries`

---

## 📊 Expected Behavior

### Normal Operation:

**Business Hours (07:00-18:00):**
```
07:00 - ✅ Sync runs, fetches 5 new emails
07:10 - ✅ Sync runs, fetches 2 new emails
07:20 - ✅ Sync runs, no new emails
07:30 - ✅ Sync runs, fetches 1 new email
...every 10 minutes...
```

**Night Time (18:00-07:00):**
```
18:00 - ✅ Sync runs, fetches 3 new emails
20:00 - ✅ Sync runs, fetches 1 new email
22:00 - ✅ Sync runs, no new emails
00:00 - ✅ Sync runs, no new emails
02:00 - ✅ Sync runs, no new emails
04:00 - ✅ Sync runs, fetches 2 new emails
06:00 - ✅ Sync runs, no new emails
```

---

## 🎯 Quick Diagnostic Checklist

- [ ] Email account exists in Firestore `emailAccounts` collection
- [ ] Account has `active: true`
- [ ] Account has valid credentials in `oauthRef`
- [ ] `syncState.lastSyncedAt` shows recent timestamp
- [ ] No errors in Cloud Function logs
- [ ] IMAP server is accessible
- [ ] Email account has new emails to fetch
- [ ] Firestore permissions allow read/write

---

## 📝 Summary

**Current Status:**
- ✅ `imapPollJob` is deployed and running
- ✅ Schedule is working correctly
- ⏰ Currently in night mode (reduced frequency)
- ❓ No emails since Nov 27 (need to investigate)

**Next Steps:**
1. Check Firestore for email accounts
2. Trigger manual sync to test
3. Check logs for errors
4. Wait for next business hours sync (07:00)

---

**Date:** December 19, 2025, 02:30-02:40  
**Status:** 🔍 **INVESTIGATING - Manual sync recommended**




