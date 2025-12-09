# Security Policy

## 🛡️ Security Scanning

TradeTrackr uses [Aikido Security](https://www.aikido.dev) for continuous security scanning:

- **Dependency Scanning**: Automated checks for vulnerable npm packages
- **Code Scanning**: Detection of security issues in TypeScript/JavaScript code
- **Secret Scanning**: Prevention of accidental credential commits
- **IaC Scanning**: Firebase security rules validation

## 📊 Security Reports

Security scans run automatically on:
- Every push to `main` and `develop` branches
- All pull requests
- Daily at 2 AM UTC (scheduled)

View latest scan results:
- GitHub Security Tab → Code scanning alerts
- [Aikido Dashboard](https://app.aikido.dev)

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in TradeTrackr, please:

1. **DO NOT** open a public GitHub issue
2. Email security details to: [INSERT YOUR SECURITY EMAIL]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and aim to fix critical issues within 7 days.

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Active support  |
| < 1.0   | ⚠️ Best effort     |

## 🛠️ Local Security Scanning

Developers can run security scans locally:

```bash
# Quick scan (high severity only)
npm run security:scan

# Full scan (all severities)
npm run security:scan:all

# Check for fixes
npm run security:fix

# Generate HTML report
npm run security:report
```

## 📝 Security Best Practices

When contributing to TradeTrackr:

1. **Never commit secrets** - Use environment variables
2. **Update dependencies** regularly - Run `npm audit fix`
3. **Run security scans** before pushing - `npm run security:scan`
4. **Review security alerts** in pull requests
5. **Follow OWASP guidelines** for web security

## 🔐 Data Protection

TradeTrackr complies with GDPR and implements:

- Encryption at rest (Firebase)
- Encryption in transit (HTTPS)
- Role-based access control
- Audit logging
- Data export/deletion capabilities

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Aikido Documentation](https://docs.aikido.dev)
- [GDPR Compliance Guide](./docs/GDPR.md)

---

Last updated: 2025-01-01













