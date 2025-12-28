# Email Reply - mailto: Client Handoff Feature

## Overview

This feature allows users to open their default email client with AI-generated reply text pre-filled, instead of sending emails directly from TradeTrackr. This approach:

- ✅ Works with **all email providers** (Gmail, Microsoft 365, IMAP, etc.)
- ✅ Uses the user's **own email client** and credentials
- ✅ Avoids complex OAuth and SMTP configuration
- ✅ Provides **full control** to the user before sending
- ✅ Handles **long emails** gracefully with clipboard fallback

---

## User Flow

### 1. Generate AI Reply
1. User clicks **"AI Antwort erstellen"** on an email
2. AI generates a professional German reply
3. Reply composer opens with editable fields

### 2. Review and Edit
- User can edit To, Cc, Bcc, Subject, and Body
- Changes are saved to Firestore
- Full history is tracked

### 3. Open in Email Client
- User clicks **"Im E-Mail-Client öffnen"**
- System builds a `mailto:` URL with all fields
- **If body is short (<1800 chars):**
  - Opens email client with full text
- **If body is long (>1800 chars):**
  - Copies full text to clipboard
  - Opens email client with placeholder text
  - Shows toast: "Antwort wurde in die Zwischenablage kopiert"
- User's default email client opens (Outlook, Thunderbird, Apple Mail, etc.)
- User reviews and sends from their own client

### 4. Alternative: Copy to Clipboard
- User can click **"Antwort kopieren"** to copy text only
- Useful for pasting into any application

---

## Technical Implementation

### Core Utility: `src/utils/mailto.ts`

```typescript
buildMailtoUrl({
  to: string | string[],
  subject: string,
  body: string,
  cc?: string | string[],
  bcc?: string | string[]
}) => {
  url: string,
  bodyTruncated: boolean,
  fullBody: string
}
```

**Features:**
- ✅ Proper UTF-8 encoding (umlauts, emoji, special chars)
- ✅ CRLF line break normalization
- ✅ Automatic "Re:" prefix handling
- ✅ HTML tag sanitization
- ✅ Null byte removal
- ✅ Length limit handling (1800 chars)

### UI Integration: `EmailReplyComposer.tsx`

**New Buttons:**

1. **"Im E-Mail-Client öffnen"** (Primary)
   - Green gradient button
   - Opens mailto: URL
   - Handles long body with clipboard fallback
   - Shows appropriate toasts

2. **"Antwort kopieren"** (Secondary)
   - Outline button
   - Copies body text to clipboard
   - Useful for manual pasting

3. **"Direkt senden"** (Gmail/M365 only)
   - Blue button
   - Backend sending (existing feature)
   - Only visible for OAuth accounts

---

## Length Handling

### Problem
Most email clients truncate `mailto:` URLs beyond ~2000 characters. Long reply bodies would be cut off.

### Solution
**Constant:** `MAX_MAILTO_BODY_LEN = 1800`

**When body > 1800 chars:**
1. Replace mailto body with: `"Antworttext ist zu lang. Bitte im TradeTrackr-Editor kopieren und einfügen."`
2. Automatically copy full body to clipboard
3. Show toast: `"📋 Antwort wurde in die Zwischenablage kopiert"`
4. User pastes full text into their email client

**Fallback:**
If clipboard copy fails, show: `"⚠️ Kopieren fehlgeschlagen - Bitte kopieren Sie den Text manuell"`

---

## Encoding Details

### UTF-8 Support
- All text is properly encoded with `encodeURIComponent()`
- Handles German umlauts: ä, ö, ü, ß, Ä, Ö, Ü
- Handles emoji: 🎉, 👋, 🌍
- Handles special chars: &, $, €, %, #

### Line Break Normalization
- Converts all line breaks to CRLF (`\r\n`)
- Email standard requires CRLF
- Handles mixed LF/CR/CRLF input

### Sanitization
- Removes null bytes (`\0`)
- Strips HTML tags (basic XSS protection)
- Trims whitespace
- Keeps plain text only

---

## Browser Compatibility

### `mailto:` URL Support
✅ **All modern browsers:**
- Chrome, Firefox, Safari, Edge
- Windows, macOS, Linux
- Mobile browsers (iOS Safari, Chrome Mobile)

### Clipboard API
✅ **Modern browsers (HTTPS required):**
- `navigator.clipboard.writeText()`

✅ **Fallback for older browsers:**
- `document.execCommand('copy')`
- Works in HTTP and HTTPS

---

## Limitations

### Known Limitations

1. **No Attachments**
   - `mailto:` protocol does not support attachments
   - User must add attachments manually in their email client

2. **No HTML Formatting**
   - Only plain text is supported
   - HTML emails must be composed in user's client

3. **Client-Dependent Behavior**
   - Each email client handles `mailto:` differently
   - Some clients may have different length limits
   - Some clients may not support all fields (Bcc, etc.)

4. **No Send Confirmation**
   - TradeTrackr doesn't know if user actually sent the email
   - No tracking or delivery confirmation

5. **Requires Default Email Client**
   - User must have an email client configured
   - Web-only email users (Gmail web) may see browser prompts

### Workarounds

**For attachments:**
- User can manually attach files in their email client
- Future: Add file upload to reply composer, save to Firestore, provide download links

**For HTML formatting:**
- User can format in their email client
- Future: Add rich text editor to reply composer

**For web-only users:**
- Use "Antwort kopieren" button
- Paste into Gmail/Outlook web interface

---

## Testing

### Unit Tests
Located in: `src/utils/mailto.test.ts`

**Coverage:**
- ✅ Basic mailto URL construction
- ✅ Multiple recipients (To, Cc, Bcc)
- ✅ Re: prefix logic
- ✅ UTF-8 encoding (umlauts, emoji, special chars)
- ✅ Line break normalization (LF, CR, CRLF)
- ✅ Length handling and truncation
- ✅ Sanitization (null bytes, HTML tags)
- ✅ Validation (required fields)
- ✅ Edge cases (empty fields, whitespace, very long text)

**Run tests:**
```bash
npm test src/utils/mailto.test.ts
```

### Manual Testing Checklist

**Test Case 1: Short Reply**
- [ ] Generate reply with <1800 char body
- [ ] Click "Im E-Mail-Client öffnen"
- [ ] Verify email client opens
- [ ] Verify To, Subject, Body are pre-filled
- [ ] Verify no clipboard toast

**Test Case 2: Long Reply**
- [ ] Generate reply with >1800 char body
- [ ] Click "Im E-Mail-Client öffnen"
- [ ] Verify clipboard toast appears
- [ ] Verify email client opens with placeholder
- [ ] Paste from clipboard into email client
- [ ] Verify full text is present

**Test Case 3: German Umlauts**
- [ ] Edit body to include: ä, ö, ü, ß, Ä, Ö, Ü
- [ ] Click "Im E-Mail-Client öffnen"
- [ ] Verify umlauts display correctly in email client

**Test Case 4: Multiple Recipients**
- [ ] Add multiple To addresses (comma-separated)
- [ ] Add Cc and Bcc addresses
- [ ] Click "Im E-Mail-Client öffnen"
- [ ] Verify all recipients are pre-filled

**Test Case 5: Copy to Clipboard**
- [ ] Click "Antwort kopieren"
- [ ] Verify success toast
- [ ] Paste into any text editor
- [ ] Verify full text is present

**Test Case 6: IMAP Account**
- [ ] Generate reply for IMAP email
- [ ] Verify "Direkt senden" button is hidden
- [ ] Verify "Im E-Mail-Client öffnen" is primary action
- [ ] Verify mailto works correctly

**Test Case 7: Gmail/M365 Account**
- [ ] Generate reply for Gmail/M365 email
- [ ] Verify both "Im E-Mail-Client öffnen" and "Direkt senden" are visible
- [ ] Test both sending methods

---

## Configuration

### Constants
Located in: `src/utils/mailto.ts`

```typescript
// Maximum safe length for mailto body
export const MAX_MAILTO_BODY_LEN = 1800;

// Placeholder text when body is too long
export const LONG_BODY_PLACEHOLDER = 
  'Antworttext ist zu lang. Bitte im TradeTrackr-Editor kopieren und einfügen.';
```

**Adjusting the limit:**
- Increase if your users' email clients support longer URLs
- Decrease if you encounter truncation issues
- Test with your specific email clients

---

## Future Enhancements

### Priority 1 (High Value)
1. **Attachment Support**
   - Upload files to Firestore Storage
   - Include download links in email body
   - Or: Save attachments, allow user to download and attach manually

2. **Rich Text Editor**
   - WYSIWYG editor for HTML emails
   - Export as HTML for email clients that support it
   - Fallback to plain text for mailto

3. **Template Library**
   - Save frequently used replies as templates
   - Quick insert of common phrases
   - Personalization variables

### Priority 2 (Nice to Have)
4. **Email Signature Management**
   - Configure per-user signatures
   - Auto-append to all replies
   - Support HTML signatures

5. **Send Tracking (Optional)**
   - Ask user to confirm send after using mailto
   - Track reply status in Firestore
   - Analytics on reply rates

6. **Mobile Optimization**
   - Detect mobile browsers
   - Optimize mailto for mobile email apps
   - Better clipboard handling on iOS/Android

---

## Troubleshooting

### Issue: Email client doesn't open
**Cause:** No default email client configured  
**Solution:** User needs to set default email client in OS settings

### Issue: Body is truncated
**Cause:** Email client has shorter URL limit than 1800 chars  
**Solution:** Reduce `MAX_MAILTO_BODY_LEN` or use clipboard copy

### Issue: Umlauts display as �
**Cause:** Email client doesn't support UTF-8  
**Solution:** Rare issue; user should update email client

### Issue: Clipboard copy fails
**Cause:** Browser doesn't support Clipboard API or user denied permission  
**Solution:** Fallback to `execCommand` is automatic; if both fail, user copies manually

### Issue: "Re: Re: Re:" in subject
**Cause:** Original email already had "Re:" prefix  
**Solution:** Code checks for existing "Re:" and doesn't double-add

---

## Security Considerations

### XSS Protection
- All user input is sanitized
- HTML tags are stripped
- Special characters are properly encoded

### Data Privacy
- No email content is sent to third-party services
- All processing happens client-side or in your Firebase backend
- User's email credentials never touch TradeTrackr servers

### Clipboard Access
- Requires user interaction (button click)
- Browser may prompt for clipboard permission
- Fallback method doesn't require permission

---

## Comparison: mailto vs Backend Sending

| Feature | mailto (This Feature) | Backend Sending |
|---------|----------------------|-----------------|
| **Setup** | ✅ No setup required | ❌ OAuth configuration needed |
| **Email Providers** | ✅ Works with all | ⚠️ Gmail/M365 only |
| **User Control** | ✅ Full control before send | ⚠️ Sent immediately |
| **Attachments** | ❌ Not supported | ✅ Supported |
| **HTML Formatting** | ⚠️ Limited | ✅ Full support |
| **Send Confirmation** | ❌ No tracking | ✅ Tracked in Firestore |
| **Credentials** | ✅ User's own | ⚠️ Stored OAuth tokens |
| **Mobile Support** | ✅ Excellent | ⚠️ Requires mobile OAuth |

**Recommendation:** Offer both options!
- **mailto** as primary for IMAP and user preference
- **Backend sending** as secondary for Gmail/M365 power users

---

## Deployment Date
**December 19, 2025**

## Version
**1.0.0**

## Status
✅ **Production Ready**




