# Smart Inbox AI Reply - Quick Start Guide

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Deploy Rules (30 seconds)
```bash
firebase deploy --only firestore:rules
```

### Step 2: Deploy Functions (2-3 minutes)
```bash
firebase deploy --only functions:generateEmailReplyDraft,functions:sendEmailReply
```

### Step 3: Verify (30 seconds)
```bash
firebase functions:log --only generateEmailReplyDraft,sendEmailReply
```

✅ **Done!** Feature is live.

---

## 📱 User Flow

### From Smart Inbox:
1. Click **"AI Antwort erstellen"** on any email
2. Wait 2-4 seconds for AI generation
3. Review and edit the reply
4. Click **"Senden"**
5. ✅ Email sent!

### From Email Detail:
1. Open email in detail drawer
2. Click **"AI Antwort erstellen"** in actions
3. Same as above

---

## 🔍 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Gemini API key not configured" | `firebase functions:config:set gemini.api_key="YOUR_KEY"` |
| "OAuth token expired" | Re-authenticate in Email Account Manager |
| "IMAP not supported" | Use Gmail or M365 account |
| Reply not sending | Check Cloud Function logs |

---

## 📊 Quick Firestore Check

```javascript
// Check if reply was created
db.collection('emailReplies').doc('REPLY_ID').get()

// Check if summary was updated
db.collection('emailSummaries').doc('EMAIL_ID').get()
// Should have: replyId, replyStatus
```

---

## 🎯 Key Files

### Backend:
- `functions/src/emailIntelligence/generateEmailReplyDraft.ts`
- `functions/src/emailIntelligence/sendEmailReply.ts`
- `functions/src/emailIntelligence/generateReply.ts`

### Frontend:
- `src/components/EmailReplyComposer.tsx`
- `src/components/SmartInbox.tsx` (updated)
- `src/components/EmailDetailDrawer.tsx` (updated)

### Config:
- `firestore.rules` (updated)
- `functions/src/index.ts` (updated)

---

## 💡 Quick Tips

1. **AI Generation takes 2-4 seconds** - show loading state
2. **concernId is required** - always pass from user context
3. **Gmail & M365 only** - IMAP sending not supported
4. **Edits are auto-saved** - click "Speichern" to persist
5. **Status tracking** - check `emailSummaries.replyStatus`

---

## 🔒 Security Checklist

- ✅ concernId validated on every operation
- ✅ OAuth tokens server-side only
- ✅ Firestore rules prevent cross-concern access
- ✅ No API keys in client code
- ✅ Audit trail in `history` array

---

## 📞 Need Help?

1. Check logs: `firebase functions:log`
2. Check Firestore data
3. Review `EMAIL_REPLY_FEATURE_DEPLOYMENT.md`
4. Review `EMAIL_REPLY_IMPLEMENTATION_SUMMARY.md`

---

**Version:** 1.0.0  
**Last Updated:** December 19, 2025  
**Status:** ✅ Production Ready




