# 🔧 Manual Email Sync - Quick Fix

## 🎯 Problem

Emails haven't synced since November 27, 2025. The scheduled job is working but only runs every 2 hours during night time.

---

## ✅ Immediate Solution: Manual Sync

### Step 1: Find Your Email Account ID

**Go to Firebase Console:**
1. Open Firebase Console: https://console.firebase.google.com/
2. Select project: `reportingapp817`
3. Go to **Firestore Database**
4. Find collection: **`emailAccounts`**
5. Look for your email account document
6. **Copy the Document ID** (e.g., `abc123xyz`)

---

### Step 2: Trigger Manual Sync

**Open Smart Inbox in your browser:**
1. Go to Smart Inbox page
2. Press **F12** to open Developer Console
3. Go to **Console** tab
4. **Paste and run this code:**

```javascript
// Replace 'YOUR_ACCOUNT_ID_HERE' with the actual ID from Step 1
const accountId = 'YOUR_ACCOUNT_ID_HERE';

const functions = firebase.functions();
const syncEmailAccount = functions.httpsCallable('syncEmailAccount');

console.log('🔄 Starting manual email sync...');
console.log('Account ID:', accountId);

syncEmailAccount({ accountId: accountId })
  .then(result => {
    console.log('✅ Sync completed successfully!');
    console.log('Result:', result.data);
    console.log('Messages fetched:', result.data.messageCount);
    
    // Refresh the page to see new emails
    setTimeout(() => {
      console.log('🔄 Refreshing page...');
      window.location.reload();
    }, 2000);
  })
  .catch(error => {
    console.error('❌ Sync failed!');
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  });
```

---

### Step 3: Check Results

**In the console, you should see:**

**Success:**
```
🔄 Starting manual email sync...
Account ID: abc123xyz
✅ Sync completed successfully!
Result: {success: true, messageCount: 15}
Messages fetched: 15
🔄 Refreshing page...
```

**Then the page will refresh and show new emails!**

---

**Error (No Account Found):**
```
❌ Sync failed!
Error code: not-found
Error message: Email account not found
```
→ **Solution:** Check the account ID is correct

---

**Error (Account Inactive):**
```
❌ Sync failed!
Error code: failed-precondition
Error message: Email account is not active
```
→ **Solution:** Activate the account in Firestore

---

**Error (Invalid Credentials):**
```
❌ Sync failed!
Error code: internal
Error message: Authentication failed
```
→ **Solution:** Update email account credentials

---

## 🔍 Alternative: Check If Account Exists

**If you're not sure if you have an email account configured:**

```javascript
// Check for email accounts
const db = firebase.firestore();
const user = firebase.auth().currentUser;
const orgId = 'DE689E0F2D'; // Replace with your orgId

db.collection('emailAccounts')
  .where('orgId', '==', orgId)
  .get()
  .then(snapshot => {
    console.log('📧 Email accounts found:', snapshot.size);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('---');
      console.log('Account ID:', doc.id);
      console.log('Email:', data.emailAddress);
      console.log('Provider:', data.provider);
      console.log('Active:', data.active);
      console.log('Last Synced:', data.syncState?.lastSyncedAt?.toDate());
    });
    
    if (snapshot.empty) {
      console.log('❌ No email accounts configured!');
      console.log('💡 Click "E-Mail-Konto verbinden" to add one');
    }
  })
  .catch(error => {
    console.error('Error checking accounts:', error);
  });
```

---

## 📋 If No Email Account Exists

**You need to connect an email account first:**

1. In Smart Inbox, click **"E-Mail-Konto verbinden"**
2. Fill in the form:
   - **Email Address:** your-email@example.com
   - **Provider:** IMAP / Gmail / Microsoft 365
   - **IMAP Settings** (if using IMAP):
     - Host: imap.example.com
     - Port: 993
     - Username: your-email@example.com
     - Password: your-password
3. Click **Save**
4. Wait for confirmation
5. Then run manual sync (see Step 2 above)

---

## 🕐 Automatic Sync Schedule

**After manual sync, automatic syncing will continue:**

- **Business Hours (Mon-Fri 07:00-18:00):** Every 10 minutes
- **Nights (18:00-07:00):** Every 2 hours (00:00, 02:00, 04:00, 06:00, 18:00, 20:00, 22:00)
- **Weekends:** Every 2 hours

**Next automatic sync:** 
- If it's night time now: Next even hour (e.g., 04:00, 06:00)
- If it's business hours: Within 10 minutes

---

## ✅ Success Indicators

**After successful sync, you should see:**

1. ✅ Console shows "Sync completed successfully"
2. ✅ `messageCount` shows number of emails fetched
3. ✅ Page refreshes automatically
4. ✅ New emails appear in Smart Inbox
5. ✅ Each email has AI analysis (category, priority, etc.)

---

## 🎯 Quick Reference

**Manual Sync Command:**
```javascript
firebase.functions().httpsCallable('syncEmailAccount')({ accountId: 'YOUR_ID' })
```

**Check Accounts:**
```javascript
firebase.firestore().collection('emailAccounts').where('orgId', '==', 'YOUR_ORG_ID').get()
```

**Check Logs:**
```bash
firebase functions:log | grep -i "email\|sync\|imap"
```

---

**Status:** 🔧 **READY TO USE**

Copy the code from Step 2, replace the account ID, and run it in your browser console to trigger an immediate email sync!




