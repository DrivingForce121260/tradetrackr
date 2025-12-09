# Security Scan Report - TradeTrackr
**Scan Date:** 2025-01-01  
**Scanner:** npm audit + flutter pub outdated  
**Projects Scanned:** Portal (Web) + Functions (Backend) + Mobile App (Flutter)

---

## 📊 Executive Summary

### TradeTrackr Portal (Web App)
- ✅ **Status:** Low Risk
- 🟡 **Total Vulnerabilities:** 1 (Moderate)
- 📦 **Dependencies Scanned:** 827 packages

### TradeTrackr Functions (Backend)
- ⚠️ **Status:** High Risk - Action Required
- 🔴 **Total Vulnerabilities:** 6 (4 Critical, 1 High, 1 Moderate)
- 📦 **Dependencies Scanned:** 483 packages

### TradeTrackr Mobile App (Flutter)
- ✅ **Status:** Good
- 🟢 **Total Vulnerabilities:** 0 (No security advisories)
- 📦 **Dependencies Scanned:** 180 packages
- 📋 **Updates Available:** 78 packages (non-critical)

---

## 🚨 Critical Issues (Functions Backend)

### 1. protobufjs - Prototype Pollution (CRITICAL)
**CVE:** GHSA-h755-8qp9-cq85  
**CVSS Score:** 9.8/10  
**Affected:** protobufjs 7.0.0 - 7.2.4  
**Impact:** Remote code execution, data manipulation  
**Fix:** Update firebase-admin to v13.5.0 (breaking change)

```bash
cd functions
npm install firebase-admin@13.5.0
```

**Dependencies affected:**
- google-gax → @google-cloud/firestore → firebase-admin

---

### 2. firebase-admin - Transitive Vulnerability (CRITICAL)
**Affected:** firebase-admin 11.1.0 - 11.11.1  
**Impact:** Inherits protobufjs vulnerability  
**Fix:** Upgrade to firebase-admin@13.5.0

**⚠️ Breaking Change:** Major version upgrade (11.x → 13.x)
- Review [Migration Guide](https://firebase.google.com/support/release-notes/admin/node)
- Update Cloud Functions code if needed

---

### 3. xlsx - Prototype Pollution (HIGH)
**CVE:** GHSA-4r6h-8v6p-xvw6  
**CVSS Score:** 7.8/10  
**Affected:** All versions < 0.19.3  
**Impact:** Local code execution via malicious Excel files  
**Fix:** ⚠️ No fix available

**Mitigation:**
- Validate all Excel file inputs
- Sanitize user-uploaded files
- Consider alternative libraries (e.g., `exceljs`)

---

### 4. xlsx - Regular Expression DoS (HIGH)
**CVE:** GHSA-5pgg-2g8v-p4x9  
**CVSS Score:** 7.5/10  
**Affected:** All versions < 0.20.2  
**Impact:** Denial of Service via crafted Excel files  
**Fix:** ⚠️ No fix available

**Mitigation:**
- Limit file upload size
- Timeout processing
- Rate limiting on upload endpoints

---

### 5. nodemailer - Email Domain Confusion (MODERATE)
**CVE:** GHSA-mm7p-fcc7-pg87  
**Affected:** nodemailer < 7.0.7  
**Impact:** Email sent to unintended domain  
**Fix:** Update to nodemailer@7.0.10

```bash
cd functions
npm install nodemailer@7.0.10
```

---

## 🟡 Moderate Issues (Portal)

### 1. vite - Multiple Path Traversal Issues (MODERATE)
**Affected:** vite 7.1.0 - 7.1.10  
**Impact:** File system access bypass (development only)  
**Fix:** ✅ Automated fix available

```bash
npm audit fix
```

**Details:**
- **GHSA-g4jq-h2w9-997c:** Public directory file serving issue (Low)
- **GHSA-jqfw-vq24-v9c3:** HTML file fs settings bypass (Low)
- **GHSA-93m4-6634-74q7:** Backslash path bypass on Windows (Moderate)

---

## 🛠️ Recommended Actions

### Immediate (Critical - Do Before Next Deployment)

1. **Upgrade firebase-admin:**
   ```bash
   cd functions
   npm install firebase-admin@13.5.0
   npm test  # Verify no breaking changes
   ```

2. **Update nodemailer:**
   ```bash
   cd functions
   npm install nodemailer@7.0.10
   ```

3. **Fix Vite issues:**
   ```bash
   npm audit fix
   ```

### Short-term (Within 1 Week)

4. **Replace xlsx library:**
   ```bash
   cd functions
   npm uninstall xlsx
   npm install exceljs@latest
   ```
   
   Update code to use exceljs API instead.

5. **Add input validation:**
   - Validate Excel file uploads
   - Add file size limits (max 10MB)
   - Implement virus scanning (optional)

### Long-term (Within 1 Month)

6. **Set up automated scanning:**
   - Enable GitHub Dependabot alerts
   - Configure weekly dependency updates
   - Add pre-commit security hooks

7. **Security hardening:**
   - Review Firebase security rules
   - Implement rate limiting
   - Add request validation middleware

---

## 📋 Fix Commands Summary

```bash
# Portal fixes (quick)
npm audit fix

# Functions fixes (requires testing)
cd functions

# Critical fixes
npm install firebase-admin@13.5.0
npm install nodemailer@7.0.10

# Excel library replacement (recommended)
npm uninstall xlsx
npm install exceljs@4.4.0

# Verify all fixes
npm audit
npm test

# Deploy
cd ..
firebase deploy --only functions
```

---

## 🔍 Detailed Vulnerability Breakdown

### By Severity

| Severity | Portal | Functions | Total |
|----------|--------|-----------|-------|
| Critical | 0      | 4         | 4     |
| High     | 0      | 1         | 1     |
| Moderate | 1      | 1         | 2     |
| Low      | 0      | 0         | 0     |
| **Total**| **1**  | **6**     | **7** |

### By Category

| Category | Count | Examples |
|----------|-------|----------|
| Prototype Pollution | 2 | protobufjs, xlsx |
| Path Traversal | 3 | vite (multiple) |
| ReDoS | 1 | xlsx |
| Email Security | 1 | nodemailer |

### Dependency Tree Impact

```
Functions (Critical Path):
├─ firebase-admin@11.x (CRITICAL)
│  └─ @google-cloud/firestore@6.x (CRITICAL)
│     └─ google-gax@4.x (CRITICAL)
│        └─ protobufjs@7.2.4 (CRITICAL - CVE-2023-36665)
│
├─ xlsx@* (HIGH - No fix available)
│
└─ nodemailer@6.x (MODERATE)
```

---

## 🎯 Testing After Fixes

### Unit Tests
```bash
cd functions
npm test
```

### Integration Tests
```bash
# Test email sending
npm run test:email

# Test Excel export
npm run test:export

# Test Firestore operations
npm run test:firestore
```

### Manual Verification
1. Test offer PDF generation
2. Test DATEV CSV export
3. Test email notifications
4. Test Firebase Functions deployment

---

## 📚 References

- [protobufjs CVE-2023-36665](https://github.com/advisories/GHSA-h755-8qp9-cq85)
- [Firebase Admin Migration Guide](https://firebase.google.com/support/release-notes/admin/node)
- [Nodemailer Security Advisory](https://github.com/advisories/GHSA-mm7p-fcc7-pg87)
- [OWASP Prototype Pollution](https://owasp.org/www-community/vulnerabilities/Prototype_Pollution)

---

## 📞 Support

For questions about this security report:
- Open an issue in the repository
- Contact security team: [INSERT EMAIL]
- Review [SECURITY.md](.github/SECURITY.md)

---

**Next Scan:** Scheduled after fixes applied  
**Report Generated:** `npm audit --json` (Portal/Functions) + `flutter pub outdated --json` (Mobile)  
**Mobile App Report:** See [SECURITY_SCAN_MOBILE_REPORT.md](./SECURITY_SCAN_MOBILE_REPORT.md) for detailed Flutter analysis

