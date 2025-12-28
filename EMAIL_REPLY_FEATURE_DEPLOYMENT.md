# Email Reply Feature - Deployment & Testing Guide

## 📋 Overview

This document describes the new **Smart Inbox AI Reply** feature that allows users to:
1. Generate AI-powered draft replies to emails
2. Edit the draft reply (To, Cc, Bcc, Subject, Body)
3. Send the reply via the appropriate email provider (Gmail/M365)
4. Track reply status in Firestore

---

## 🏗️ Architecture

### Backend Components

#### 1. **Cloud Functions** (`functions/src/emailIntelligence/`)

- **`generateEmailReplyDraft.ts`** - Callable function to generate AI draft
  - Input: `{ concernId, emailId, tone?, language?, instructions? }`
  - Output: `{ replyId, status: 'generated' }`
  - Uses Gemini 2.5 Flash model
  - Temperature: 0.1 (deterministic)

- **`sendEmailReply.ts`** - Callable function to send reply
  - Input: `{ concernId, replyId }`
  - Output: `{ success, providerSentId? }`
  - Supports Gmail and Microsoft 365
  - Updates Firestore with sent status

- **`generateReply.ts`** - LLM integration for reply generation
  - Builds prompts with context from original email
  - Handles tone (neutral/friendly/formal) and language (de/en)
  - Validates and parses JSON responses

#### 2. **Firestore Collections**

- **`emailReplies/{replyId}`** - New collection for reply drafts and sent emails
  ```typescript
  {
    concernId: string,
    emailId: string,
    accountId: string,
    provider: 'gmail' | 'm365' | 'imap',
    to: string[],
    cc: string[],
    bcc: string[],
    subject: string,
    bodyText: string,
    bodyHtml?: string,
    status: 'draft' | 'generated' | 'edited' | 'sending' | 'sent' | 'send_failed',
    lastError?: string,
    generatedBy: { model, temperature } | null,
    createdBy: string,
    updatedBy: string,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    history: Array<{ at, by, action, note }>
  }
  ```

- **`emailSummaries/{emailId}`** - Updated with reply tracking
  ```typescript
  {
    // ... existing fields
    replyId?: string,
    replyStatus?: 'none' | 'draft' | 'sent' | 'failed'
  }
  ```

#### 3. **Firestore Security Rules**

- `emailReplies` collection scoped by `concernId`
- Users can read/create/update drafts in their concern
- Sending status (`sent`, `providerSentId`) can only be set by Cloud Functions
- No deletion allowed (audit trail)

### Frontend Components

#### 1. **EmailReplyComposer** (`src/components/EmailReplyComposer.tsx`)

- Full-screen modal for editing and sending replies
- Real-time Firestore sync for reply data
- Editable fields: To, Cc, Bcc, Subject, Body
- Status badges and history display
- Save and Send buttons with loading states

#### 2. **SmartInbox** (`src/components/SmartInbox.tsx`)

- New "AI Antwort erstellen" button on each email card
- Generates reply and opens composer
- Loading state during generation

#### 3. **EmailDetailDrawer** (`src/components/EmailDetailDrawer.tsx`)

- "AI Antwort erstellen" button in actions section
- Opens reply composer on generation
- Closes detail drawer after successful send

---

## 🚀 Deployment Steps

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**Verify:**
- Rules include `emailReplies` collection
- `concernId` scoping is enforced
- Client cannot set `providerSentId` or `sent` status

### 2. Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:generateEmailReplyDraft,functions:sendEmailReply
```

**Verify:**
- Functions deployed to `europe-west1`
- Check logs: `firebase functions:log --only generateEmailReplyDraft,sendEmailReply`

### 3. Deploy Frontend

```bash
npm run build
# Deploy to your hosting (Firebase Hosting, Vercel, etc.)
```

**Verify:**
- New components are included in build
- No TypeScript errors
- Bundle size is acceptable

---

## 🧪 Testing Checklist

### Manual Testing

#### Test 1: Generate AI Reply
1. ✅ Open Smart Inbox
2. ✅ Click "AI Antwort erstellen" on an email
3. ✅ Verify loading state shows
4. ✅ Verify reply composer opens with generated content
5. ✅ Check Firestore: `emailReplies/{replyId}` created with status `generated`
6. ✅ Check Firestore: `emailSummaries/{emailId}` updated with `replyId` and `replyStatus: 'draft'`

**Expected Result:**
- Reply composer opens with:
  - To: Original sender's email
  - Subject: "Re: [original subject]"
  - Body: German professional reply
  - Status badge: "KI-Generiert"

#### Test 2: Edit Reply
1. ✅ In reply composer, edit To/Cc/Subject/Body
2. ✅ Click "Speichern"
3. ✅ Verify toast: "Gespeichert"
4. ✅ Check Firestore: `emailReplies/{replyId}` updated with:
   - New field values
   - `status: 'edited'`
   - `updatedAt` timestamp
   - History entry added

**Expected Result:**
- Changes persisted to Firestore
- Status badge changes to "Bearbeitet"
- History shows edit entry

#### Test 3: Send Reply (Gmail)
1. ✅ Edit reply if needed
2. ✅ Click "Senden"
3. ✅ Verify loading state: "Wird gesendet..."
4. ✅ Wait for completion
5. ✅ Check Firestore: `emailReplies/{replyId}` updated with:
   - `status: 'sent'`
   - `providerSentId` (Gmail message ID)
   - History entry: "sent"
6. ✅ Check Firestore: `emailSummaries/{emailId}` updated with `replyStatus: 'sent'`
7. ✅ Check Gmail: Verify email was sent and appears in Sent folder

**Expected Result:**
- Email sent successfully
- Composer closes
- Toast: "E-Mail gesendet"
- Recipient receives email

#### Test 4: Send Reply (Microsoft 365)
1. ✅ Repeat Test 3 with M365 account
2. ✅ Verify email sent via Graph API
3. ✅ Check Outlook Sent Items

**Expected Result:**
- Same as Test 3, but via M365

#### Test 5: Error Handling - Send Failure
1. ✅ Disconnect internet or revoke OAuth token
2. ✅ Try to send reply
3. ✅ Verify error toast shows
4. ✅ Check Firestore: `emailReplies/{replyId}` updated with:
   - `status: 'send_failed'`
   - `lastError` contains error message
   - History entry: "failed"
5. ✅ Check Firestore: `emailSummaries/{emailId}` updated with `replyStatus: 'failed'`

**Expected Result:**
- Error message displayed
- Reply remains editable
- Can retry sending

#### Test 6: Multiple Replies to Same Email
1. ✅ Generate reply for email A
2. ✅ Close composer without sending
3. ✅ Generate another reply for email A
4. ✅ Verify new `replyId` created
5. ✅ Verify `emailSummaries` updated with latest `replyId`

**Expected Result:**
- Multiple reply drafts can exist
- Latest reply is tracked in summary

#### Test 7: ConcernId Security
1. ✅ Try to generate reply for email from different concern
2. ✅ Verify error: "permission-denied"
3. ✅ Try to send reply with wrong concernId
4. ✅ Verify error: "permission-denied"

**Expected Result:**
- Cross-concern access denied
- Security rules enforced

#### Test 8: Email Detail Drawer Integration
1. ✅ Open email in detail drawer
2. ✅ Click "AI Antwort erstellen" in actions section
3. ✅ Verify reply composer opens
4. ✅ Send reply
5. ✅ Verify detail drawer closes after send

**Expected Result:**
- Same functionality as Smart Inbox list
- Smooth UX flow

---

## 📊 Firestore Data Verification

### Query Examples

```javascript
// Get all replies for a concern
db.collection('emailReplies')
  .where('concernId', '==', 'YOUR_CONCERN_ID')
  .get()

// Get replies for specific email
db.collection('emailReplies')
  .where('emailId', '==', 'EMAIL_ID')
  .get()

// Get sent replies
db.collection('emailReplies')
  .where('status', '==', 'sent')
  .get()

// Get failed replies
db.collection('emailReplies')
  .where('status', '==', 'send_failed')
  .get()
```

---

## 🐛 Troubleshooting

### Issue: "Gemini API key not configured"
**Solution:** Set Firebase config:
```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
firebase deploy --only functions
```

### Issue: "OAuth token expired"
**Solution:** Re-authenticate email account in Email Account Manager

### Issue: "IMAP replies not supported"
**Solution:** This is expected. IMAP sending is not implemented. Use Gmail or M365.

### Issue: Reply composer shows old data
**Solution:** Firestore real-time listener should update automatically. Check browser console for errors.

### Issue: Email not sent but status shows "sent"
**Solution:** 
1. Check Cloud Function logs for errors
2. Verify OAuth token is valid
3. Check provider (Gmail/M365) API status

---

## 📈 Monitoring

### Cloud Function Metrics

Monitor in Firebase Console > Functions:
- **generateEmailReplyDraft**: Invocations, errors, execution time
- **sendEmailReply**: Invocations, errors, execution time

### Firestore Metrics

Monitor in Firebase Console > Firestore:
- **emailReplies** collection: Document count, read/write operations
- Watch for high error rates in `status: 'send_failed'`

### User Feedback

Monitor toast messages and user reports for:
- Generation failures
- Send failures
- UI/UX issues

---

## 🔒 Security Considerations

1. **ConcernId Scoping**: All operations are scoped by `concernId` to prevent cross-tenant access
2. **OAuth Tokens**: Stored encrypted in `emailOAuth` collection, never exposed to client
3. **Firestore Rules**: Prevent clients from forging sent status or provider IDs
4. **API Keys**: Gemini API key stored in Firebase Functions config, not in code
5. **Audit Trail**: All reply actions logged in `history` array

---

## 🎯 Success Criteria

- ✅ Users can generate AI replies from Smart Inbox and Email Detail Drawer
- ✅ Generated replies are contextual and professional
- ✅ Users can edit all reply fields before sending
- ✅ Replies are sent via correct provider (Gmail/M365)
- ✅ All operations are scoped by `concernId`
- ✅ Firestore data is consistent and secure
- ✅ Error handling is robust and user-friendly
- ✅ UI is responsive and provides clear feedback

---

## 📝 Future Enhancements

1. **IMAP Sending Support**: Implement SMTP sending for IMAP accounts
2. **Reply Templates**: Allow users to save and reuse reply templates
3. **Attachments**: Support adding attachments to replies
4. **Threading**: Better thread management for email conversations
5. **Scheduling**: Schedule replies to be sent later
6. **Analytics**: Track reply generation and send success rates
7. **Multi-language**: Support more languages beyond German and English
8. **Tone Customization**: Allow users to customize AI tone per reply

---

## 📞 Support

For issues or questions:
1. Check Cloud Function logs: `firebase functions:log`
2. Check Firestore data consistency
3. Verify OAuth tokens are valid
4. Review this deployment guide

---

**Deployment Date:** December 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production




