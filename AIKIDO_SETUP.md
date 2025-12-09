# Aikido Security Setup für TradeTrackr

Dieses Dokument beschreibt die Aikido Security Integration für beide TradeTrackr-Projekte (Portal und Mobile App).

## 📋 Übersicht

Aikido Security bietet:
- ✅ Dependency Scanning (npm/yarn Pakete)
- ✅ Code Scanning (TypeScript/JavaScript)
- ✅ Secret Scanning (API Keys, Tokens)
- ✅ Infrastructure as Code Scanning (Firebase Rules)
- ✅ CI/CD Integration (GitHub Actions)

## 🚀 Setup für TradeTrackr Portal

### 1. Aikido Account erstellen

1. Gehen Sie zu [aikido.dev](https://www.aikido.dev)
2. Registrieren Sie sich mit Ihrer E-Mail
3. Erstellen Sie ein neues Projekt: "TradeTrackr Portal"
4. Generieren Sie einen API Key unter Settings → API Keys

### 2. GitHub Secrets konfigurieren

Fügen Sie folgende Secrets in GitHub hinzu (Settings → Secrets and variables → Actions):

```
AIKIDO_API_KEY=<Ihr-Aikido-API-Key>
```

### 3. Lokale Installation

```bash
# Aikido CLI installieren
npm install -g @aikidosec/cli

# Authentifizieren
aikido login

# Ersten Scan durchführen
aikido scan
```

### 4. Pre-commit Hook (Optional)

Fügen Sie zu `package.json` hinzu:

```json
{
  "scripts": {
    "security:scan": "aikido scan --fail-on-severity high",
    "security:fix": "aikido fix --auto"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run security:scan"
    }
  }
}
```

## 📱 Setup für TradeTrackr Mobile App

### Konfigurationsdatei für Mobile App

Erstellen Sie `.aikido.yml` im Mobile-App-Verzeichnis:

```yaml
# Aikido Security Configuration for TradeTrackr Mobile App
project:
  name: "TradeTrackr Mobile"
  language: "dart"  # Falls Flutter/Dart
  
scan:
  dependencies: true
  code: true
  secrets: true
  
  include:
    - "lib/**"
    - "android/**"
    - "ios/**"
    - "*.dart"
    
  exclude:
    - "build/**"
    - ".dart_tool/**"
    - "*.g.dart"  # Generated files
    - "*.freezed.dart"
    
dependencies:
  package_managers:
    - pub  # Dart/Flutter
    - gradle  # Android
    - cocoapods  # iOS
  
  manifests:
    - "pubspec.yaml"
    - "android/build.gradle"
    - "ios/Podfile"
    
code:
  dart:
    enabled: true
    
  kotlin:
    enabled: true
    
  swift:
    enabled: true
    
secrets:
  enabled: true
  patterns:
    - "firebase"
    - "google-services"
    - "google-api-key"
    - "mapbox-token"
```

### GitHub Actions für Mobile App

`.github/workflows/aikido-mobile.yml`:

```yaml
name: Aikido Mobile Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          
      - name: Install dependencies
        run: flutter pub get
        
      - name: Install Aikido CLI
        run: npm install -g @aikidosec/cli
        
      - name: Run Aikido Scan
        env:
          AIKIDO_API_KEY: ${{ secrets.AIKIDO_API_KEY }}
        run: aikido scan --fail-on-severity high
```

## 🔧 Konfiguration

### Portal-spezifische Anpassungen

Die Datei `.aikido.yml` ist bereits konfiguriert für:
- TypeScript/React Code
- Firebase Functions
- Firebase Security Rules
- NPM Dependencies (Root + Functions)

### Wichtige Einstellungen

```yaml
# Schweregrad-Schwellenwert
fail_on_severity: "high"  # Stoppt bei High/Critical

# Auto-Fix (für Dependencies)
auto_fix:
  enabled: false  # Setzen Sie auf true für automatische Updates

# Custom Rules
custom_rules:
  - id: "firebase-auth-required"
    severity: "high"
    pattern: "firebase\.(firestore|database)\(\)\..*\.get\(\)"
```

## 📊 Berichte und Dashboards

### Lokale Berichte

```bash
# JSON Report
aikido scan --format json --output report.json

# HTML Report
aikido scan --format html --output report.html

# SARIF (für GitHub Code Scanning)
aikido scan --format sarif --output results.sarif
```

### GitHub Security Tab

Nach dem ersten Scan sehen Sie Ergebnisse unter:
- Repository → Security → Code scanning alerts
- Pull Requests zeigen Aikido-Kommentare mit Zusammenfassung

### Aikido Dashboard

Unter [app.aikido.dev](https://app.aikido.dev):
- Übersicht aller Projekte
- Trend-Analyse
- Compliance-Status (OWASP, CWE, GDPR)
- Team-Benachrichtigungen

## 🔔 Benachrichtigungen

### E-Mail

Konfigurieren Sie in Aikido Dashboard → Notifications:
- Bei Critical/High Findings
- Bei neuen Vulnerabilities
- Wöchentliche Zusammenfassung

### Slack Integration

1. Erstellen Sie einen Slack Webhook
2. Fügen Sie in Aikido Dashboard hinzu: Settings → Integrations → Slack
3. Wählen Sie Channel und Severity-Level

## 🛠️ Lokale Nutzung

### Täglicher Workflow

```bash
# Vor dem Commit
npm run security:scan

# Vor dem Deployment
aikido scan --fail-on-severity critical

# Dependency Updates prüfen
aikido fix --dry-run
```

### In Cursor's Terminal

Aikido läuft perfekt im integrierten Terminal von Cursor:

```bash
# Öffnen Sie Terminal in Cursor (Ctrl+`)
aikido scan

# Oder als npm script
npm run security:scan
```

## 📝 Whitelist / False Positives

Wenn Aikido False Positives meldet:

1. **In `.aikido.yml`**:
```yaml
secrets:
  allowlist:
    - "EXAMPLE_API_KEY"
    - "DEMO_TOKEN"
```

2. **In `.aikidoignore`**:
```
src/demo/
*.test.ts
```

3. **Im Aikido Dashboard**:
   - Finden Sie das Issue
   - Klicken Sie "Mark as False Positive"
   - Kommentar hinzufügen für Team

## 🚨 Bei Security-Findings

### Critical/High Severity

1. **Sofort beheben** - nicht deployen
2. In Aikido Dashboard Details prüfen
3. Fix anwenden (Aikido zeigt oft Lösungsvorschläge)
4. Neuen Scan durchführen: `aikido scan`
5. Commit + Push

### Medium/Low Severity

1. Issue in Backlog aufnehmen
2. In nächstem Sprint beheben
3. Bei Bedarf als "Accepted Risk" markieren (mit Begründung)

## 📈 Best Practices

1. **Wöchentliche Scans** (automatisch via Cron in GitHub Actions)
2. **Pre-commit Hooks** für lokale Checks
3. **Dependency Updates** monatlich prüfen
4. **Team-Training** zu häufigen Vulnerabilities
5. **Compliance-Reports** vierteljährlich für Kunden

## 🔗 Nützliche Links

- [Aikido Dokumentation](https://docs.aikido.dev)
- [Aikido CLI Reference](https://docs.aikido.dev/docs/cli)
- [GitHub Integration Guide](https://docs.aikido.dev/docs/github-integration)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## ⚙️ Troubleshooting

### "Aikido API Key not found"

```bash
# Setzen Sie die Umgebungsvariable
export AIKIDO_API_KEY=<Ihr-Key>

# Oder in .env (nicht committen!)
echo "AIKIDO_API_KEY=<Ihr-Key>" >> .env
```

### "Scan timeout"

Erhöhen Sie in `.aikido.yml`:
```yaml
ci:
  timeout: 600  # 10 Minuten
```

### "Too many findings"

Start mit höherem Schwellenwert:
```yaml
fail_on_severity: "critical"  # Nur Critical blockiert
```

Nach und nach auf "high" oder "medium" senken.

## 📞 Support

- Aikido Support: support@aikido.dev
- Community: [Aikido Slack](https://aikido-community.slack.com)
- GitHub Issues: Dieses Repository

---

**Status**: ✅ Konfiguriert für TradeTrackr Portal  
**Nächster Schritt**: API Key in GitHub Secrets hinzufügen und ersten Scan ausführen













