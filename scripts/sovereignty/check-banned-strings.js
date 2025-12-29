#!/usr/bin/env node

/**
 * Sovereignty Banned-Domain Scanner
 * 
 * Scans repository source files for references to banned domains/providers
 * that would violate IONOS_ONLY data sovereignty requirements.
 * 
 * CRITICAL EXCEPTION:
 * Files in functions/src/emailIntelligence/** are ALLOWED to reference
 * Google/Microsoft endpoints because they connect to customer's upstream mailbox.
 * 
 * Usage:
 *   node scripts/sovereignty/check-banned-strings.js [options]
 * 
 * Options:
 *   --write-baseline    Regenerate baseline.json with current violations
 * 
 * Environment:
 *   SOVEREIGNTY_SCAN_MODE=warn|error (default: warn)
 *     - warn: print findings, exit 0 (even with new violations)
 *     - error: exit 1 if NEW violations found (vs baseline)
 *   SOVEREIGNTY_SCAN_BASELINE=on|off (default: on)
 *     - on: compare against baseline, report only NEW violations
 *     - off: report all violations (legacy behavior)
 * 
 * @see /docs/sovereignty/definition.md
 * @see /scripts/sovereignty/README.md
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const BASELINE_FILE = path.join(__dirname, 'baseline.json');

/**
 * Banned domain/string patterns.
 * These indicate non-IONOS infrastructure usage.
 */
const BANNED_PATTERNS = [
  // Firebase/Google infrastructure
  'firebaseio.com',
  'firebaseapp.com',
  'firebasestorage.googleapis.com',
  'firestore.googleapis.com',
  'cloudfunctions.net',
  'run.app',
  'appspot.com',
  'crashlytics',
  'google-analytics',
  'googletagmanager.com',
  
  // Google AI (direct calls)
  'generativelanguage.googleapis.com',
  'aiplatform.googleapis.com',
  
  // OpenAI (direct calls - not via gateway)
  'api.openai.com',
  
  // Anthropic (direct calls)
  'api.anthropic.com',
  
  // Azure OpenAI
  'openai.azure.com',
];

/**
 * Patterns that should be scanned more carefully (context-dependent).
 * These may be legitimate in some contexts.
 */
const CONTEXTUAL_PATTERNS = [
  'googleapis.com', // Generic - many services
  'firebase',       // May appear in comments/docs
  'openai.com',     // May appear in comments
  'anthropic.com',  // May appear in comments
];

/**
 * Direct AI provider imports that should NOT be used in frontend/src.
 * All AI operations should go through @/services/ai/aiClient.
 */
const DIRECT_AI_IMPORTS = [
  { pattern: '@google/generative-ai', provider: 'Gemini' },
  { pattern: 'openai', provider: 'OpenAI' },
  { pattern: 'anthropic', provider: 'Anthropic' },
  { pattern: 'openai.inference.de-txl.ionos.com', provider: 'IONOS (hardcoded)' },
  { pattern: '@anthropic-ai/sdk', provider: 'Anthropic' },
  { pattern: '@azure/openai', provider: 'Azure OpenAI' },
];

/**
 * Directories to exclude from scanning.
 */
const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.firebase',
  '.vite',
  '.cache',
  'android',
  'ios',
];

/**
 * File patterns to exclude.
 */
const EXCLUDED_FILES = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'check-banned-strings.js', // This file itself
  'baseline.json',           // Baseline file
];

/**
 * Paths that are ALLOWED to contain banned patterns (mailbox connector exception).
 */
const ALLOWED_EXCEPTION_PATHS = [
  'functions/src/emailIntelligence/',
  'functions\\src\\emailIntelligence\\', // Windows
];

/**
 * Paths where suppression annotations are allowed.
 */
const SUPPRESSION_ALLOWED_PATHS = [
  'functions/src/emailIntelligence/',
  'scripts/sovereignty/',
];

/**
 * File extensions to scan.
 */
const SCANNABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
  '.env',
  '.env.local',
  '.env.production',
];

/**
 * Regex for valid suppression annotation.
 * Format: // sovereignty:allow reason="..." ticket="TT-###"
 */
const SUPPRESSION_REGEX = /\/\/\s*sovereignty:allow\s+reason="[^"]+"\s+ticket="TT-\d+"/;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if a path is within the allowed exception (mailbox connector).
 */
function isAllowedExceptionPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWED_EXCEPTION_PATHS.some(allowed => {
    const normalizedAllowed = allowed.replace(/\\/g, '/');
    return normalized.includes(normalizedAllowed);
  });
}

/**
 * Check if a path allows suppression annotations.
 */
function isSuppressionAllowedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return SUPPRESSION_ALLOWED_PATHS.some(allowed => {
    const normalizedAllowed = allowed.replace(/\\/g, '/');
    return normalized.includes(normalizedAllowed);
  });
}

/**
 * Check if a path should be excluded from scanning.
 */
function isExcludedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  
  // Check excluded directories
  for (const part of parts) {
    if (EXCLUDED_DIRS.includes(part)) {
      return true;
    }
  }
  
  // Check if it's a markdown file in docs/ or root
  if (normalized.includes('/docs/') || !normalized.includes('/')) {
    if (filePath.endsWith('.md')) {
      return true;
    }
  }
  
  // Check root-level markdown files
  const fileName = path.basename(filePath);
  if (fileName.endsWith('.md') && !normalized.includes('/src/')) {
    return true;
  }
  
  // Check excluded files
  if (EXCLUDED_FILES.includes(fileName)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a file should be scanned based on extension.
 */
function isScannable(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  // Include .env files
  if (fileName.startsWith('.env')) {
    return true;
  }
  
  return SCANNABLE_EXTENSIONS.includes(ext);
}

/**
 * Recursively walk a directory and yield file paths.
 */
function* walkDir(dir, baseDir = dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`Warning: Cannot read directory ${dir}: ${err.message}`);
    return;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        yield* walkDir(fullPath, baseDir);
      }
    } else if (entry.isFile()) {
      yield { fullPath, relativePath };
    }
  }
}

/**
 * Check if a line has a valid suppression annotation.
 */
function hasValidSuppression(line, filePath) {
  // Check for old-style annotation (now invalid)
  const hasOldStyle = line.includes('// sovereignty:allowed') || 
                      line.includes('/* sovereignty:allowed') ||
                      line.includes('# sovereignty:allowed');
  
  // Check for new-style annotation
  const hasNewStyle = SUPPRESSION_REGEX.test(line);
  
  if (hasOldStyle && !hasNewStyle) {
    // Old style found but not new style - this is now an error
    return { valid: false, reason: 'old-style-annotation' };
  }
  
  if (hasNewStyle) {
    // New style found - check if path allows it
    if (!isSuppressionAllowedPath(filePath)) {
      return { valid: false, reason: 'suppression-not-allowed-here' };
    }
    return { valid: true };
  }
  
  return { valid: false, reason: 'no-suppression' };
}

/**
 * Scan a file for banned patterns.
 */
function scanFile(filePath, relativePath) {
  const findings = [];
  
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.warn(`Warning: Cannot read file ${filePath}: ${err.message}`);
    return findings;
  }
  
  const lines = content.split('\n');
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Check for invalid suppression annotations
    const suppression = hasValidSuppression(line, relativePath);
    if (suppression.reason === 'old-style-annotation') {
      findings.push({
        file: relativePath,
        line: lineNum + 1,
        pattern: 'INVALID_SUPPRESSION',
        match: 'sovereignty:allowed',
        content: line.trim().substring(0, 100),
        severity: 'error',
        message: 'Old-style suppression. Use: // sovereignty:allow reason="..." ticket="TT-###"',
      });
    } else if (suppression.reason === 'suppression-not-allowed-here') {
      findings.push({
        file: relativePath,
        line: lineNum + 1,
        pattern: 'INVALID_SUPPRESSION_LOCATION',
        match: 'sovereignty:allow',
        content: line.trim().substring(0, 100),
        severity: 'error',
        message: 'Suppression annotations only allowed in functions/src/emailIntelligence/ or scripts/sovereignty/',
      });
    }
    
    // Skip further checks if line has valid suppression
    if (suppression.valid) {
      continue;
    }
    
    // Check banned patterns
    for (const pattern of BANNED_PATTERNS) {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        findings.push({
          file: relativePath,
          line: lineNum + 1,
          pattern,
          match: pattern,
          content: line.trim().substring(0, 100),
          severity: 'error',
        });
      }
    }
    
    // Check contextual patterns (less strict)
    for (const pattern of CONTEXTUAL_PATTERNS) {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        // Skip if already caught by BANNED_PATTERNS
        const alreadyCaught = findings.some(f => 
          f.file === relativePath && 
          f.line === lineNum + 1 &&
          f.pattern !== 'INVALID_SUPPRESSION' &&
          f.pattern !== 'INVALID_SUPPRESSION_LOCATION'
        );
        if (alreadyCaught) continue;
        
        // Skip comments
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') || 
            line.trim().startsWith('/*') ||
            line.trim().startsWith('#')) {
          continue;
        }
        
        findings.push({
          file: relativePath,
          line: lineNum + 1,
          pattern,
          match: pattern,
          content: line.trim().substring(0, 100),
          severity: 'warning',
        });
      }
    }
    
    // Check for direct AI provider imports (only in src/** - frontend)
    if (relativePath.startsWith('src/') || relativePath.startsWith('src\\')) {
      for (const { pattern: aiPattern, provider } of DIRECT_AI_IMPORTS) {
        // Check for import statements
        if ((line.includes('from ') || line.includes('require(')) && 
            line.includes(aiPattern)) {
          
          // Skip comments
          if (line.trim().startsWith('//') || 
              line.trim().startsWith('*') || 
              line.trim().startsWith('/*')) {
            continue;
          }
          
          // Skip the AI client itself (it may document providers)
          if (relativePath.includes('services/ai/')) {
            continue;
          }
          
          findings.push({
            file: relativePath,
            line: lineNum + 1,
            pattern: 'DIRECT_AI_IMPORT',
            match: aiPattern,
            content: line.trim().substring(0, 100),
            severity: 'warning',
            message: `Direct ${provider} import found – must use @/services/ai/aiClient instead`,
          });
        }
      }
    }
  }
  
  return findings;
}

/**
 * Create a unique key for a finding (for baseline comparison).
 */
function findingKey(f) {
  return `${f.file}:${f.line}:${f.match}`;
}

/**
 * Load baseline from file.
 */
function loadBaseline() {
  try {
    if (fs.existsSync(BASELINE_FILE)) {
      const content = fs.readFileSync(BASELINE_FILE, 'utf-8');
      const data = JSON.parse(content);
      return new Set(data.findings.map(f => findingKey(f)));
    }
  } catch (err) {
    console.warn(`Warning: Could not load baseline: ${err.message}`);
  }
  return new Set();
}

/**
 * Save findings as baseline.
 */
function saveBaseline(findings) {
  const data = {
    generated: new Date().toISOString(),
    count: findings.length,
    findings: findings
      .map(f => ({ file: f.file, line: f.line, match: f.match }))
      .sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        if (fileCompare !== 0) return fileCompare;
        return a.line - b.line;
      }),
  };
  
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`✅ Baseline written to ${BASELINE_FILE}`);
  console.log(`   Total violations: ${findings.length}`);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const writeBaseline = args.includes('--write-baseline');
  const argError = args.includes('--error');
  const argNoBaseline = args.includes('--no-baseline');
  const argHelp = args.includes('--help') || args.includes('-h');
  
  if (argHelp) {
    console.log(`
Sovereignty Banned-Domain Scanner

Usage:
  node scripts/sovereignty/check-banned-strings.js [options]

Options:
  --write-baseline   Regenerate baseline.json with current violations
  --error            Exit 1 if NEW violations found (vs baseline)
  --no-baseline      Report all violations, not just new ones
  --help, -h         Show this help message

Environment:
  SOVEREIGNTY_SCAN_MODE=warn|error   (default: warn)
  SOVEREIGNTY_SCAN_BASELINE=on|off   (default: on)

npm scripts:
  npm run sovereignty:scan         Scan with baseline (WARN mode)
  npm run sovereignty:scan:error   Scan with baseline (ERROR mode)
  npm run sovereignty:scan:all     Scan all violations (no baseline)
  npm run sovereignty:baseline     Regenerate baseline
`);
    process.exit(0);
    return;
  }
  
  const scanMode = argError ? 'error' : (process.env.SOVEREIGNTY_SCAN_MODE || 'warn');
  const isErrorMode = scanMode.toLowerCase() === 'error';
  const useBaseline = argNoBaseline ? false : (process.env.SOVEREIGNTY_SCAN_BASELINE || 'on').toLowerCase() === 'on';
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  TradeTrackr Sovereignty Scanner');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Mode: ${scanMode.toUpperCase()}`);
  console.log(`Baseline: ${useBaseline ? 'ON' : 'OFF'}`);
  console.log(`Exception path: functions/src/emailIntelligence/**`);
  console.log('');
  
  const repoRoot = path.resolve(__dirname, '../..');
  const allFindings = [];
  const exceptionFindings = [];
  let filesScanned = 0;
  
  for (const { fullPath, relativePath } of walkDir(repoRoot)) {
    // Skip excluded paths
    if (isExcludedPath(relativePath)) {
      continue;
    }
    
    // Skip non-scannable files
    if (!isScannable(relativePath)) {
      continue;
    }
    
    filesScanned++;
    const findings = scanFile(fullPath, relativePath);
    
    if (findings.length > 0) {
      // Check if this file is in the allowed exception path
      if (isAllowedExceptionPath(relativePath)) {
        // Exception path - only report INVALID_SUPPRESSION errors
        const suppressionErrors = findings.filter(f => 
          f.pattern === 'INVALID_SUPPRESSION' || 
          f.pattern === 'INVALID_SUPPRESSION_LOCATION'
        );
        if (suppressionErrors.length > 0) {
          allFindings.push(...suppressionErrors);
        }
        exceptionFindings.push(...findings.filter(f => 
          f.pattern !== 'INVALID_SUPPRESSION' && 
          f.pattern !== 'INVALID_SUPPRESSION_LOCATION'
        ).map(f => ({ ...f, exception: true })));
      } else {
        allFindings.push(...findings);
      }
    }
  }
  
  // Handle --write-baseline
  if (writeBaseline) {
    saveBaseline(allFindings);
    process.exit(0);
    return;
  }
  
  // Baseline comparison
  let baseline = new Set();
  let newFindings = allFindings;
  let baselineCount = 0;
  
  if (useBaseline) {
    baseline = loadBaseline();
    baselineCount = baseline.size;
    newFindings = allFindings.filter(f => !baseline.has(findingKey(f)));
  }
  
  // Report
  console.log(`Files scanned: ${filesScanned}`);
  console.log('');
  
  // Report exception findings (informational)
  if (exceptionFindings.length > 0) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`📧 Mailbox Connector (ALLOWED - ${exceptionFindings.length} references):`);
    console.log('   These are legitimate upstream mailbox references.');
    console.log('───────────────────────────────────────────────────────────────────');
    
    // Group by file
    const byFile = {};
    for (const f of exceptionFindings) {
      if (!byFile[f.file]) byFile[f.file] = [];
      byFile[f.file].push(f);
    }
    
    for (const [file, findings] of Object.entries(byFile)) {
      console.log(`  ✓ ${file} (${findings.length} references)`);
    }
    console.log('');
  }
  
  // Baseline summary
  if (useBaseline) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('📊 Baseline Comparison:');
    console.log(`   Total current violations: ${allFindings.length}`);
    console.log(`   Baseline violations:      ${baselineCount}`);
    console.log(`   NEW violations:           ${newFindings.length}`);
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('');
  }
  
  // Report NEW violations (or all if baseline off)
  const displayFindings = useBaseline ? newFindings : allFindings;
  const displayLabel = useBaseline ? 'NEW VIOLATIONS' : 'VIOLATIONS';
  
  if (displayFindings.length > 0) {
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`❌ ${displayLabel} FOUND: ${displayFindings.length}`);
    console.log('───────────────────────────────────────────────────────────────────');
    
    // Group by file
    const byFile = {};
    for (const f of displayFindings) {
      if (!byFile[f.file]) byFile[f.file] = [];
      byFile[f.file].push(f);
    }
    
    for (const [file, findings] of Object.entries(byFile)) {
      console.log(`\n📄 ${file}:`);
      for (const f of findings) {
        const icon = f.severity === 'error' ? '🔴' : '🟡';
        console.log(`   ${icon} L${f.line}: [${f.pattern}]`);
        if (f.message) {
          console.log(`      ⚠️  ${f.message}`);
        }
        console.log(`      ${f.content}`);
      }
    }
    
    console.log('');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('To fix:');
    console.log('  1. Remove references to banned domains/providers');
    console.log('  2. Move mailbox-related code to functions/src/emailIntelligence/');
    console.log('  3. If intentional exception needed, use:');
    console.log('     // sovereignty:allow reason="..." ticket="TT-###"');
    console.log('     (only in functions/src/emailIntelligence/ or scripts/sovereignty/)');
    console.log('───────────────────────────────────────────────────────────────────');
  } else {
    console.log('───────────────────────────────────────────────────────────────────');
    if (useBaseline && allFindings.length > 0) {
      console.log(`✅ No NEW violations! (${allFindings.length} existing in baseline)`);
    } else {
      console.log('✅ No sovereignty violations found!');
    }
    console.log('───────────────────────────────────────────────────────────────────');
  }
  
  // Exit code logic
  const hasNewViolations = displayFindings.length > 0;
  
  if (isErrorMode && hasNewViolations) {
    console.log(`\n❌ FAIL: ${displayFindings.length} ${useBaseline ? 'NEW ' : ''}violation(s) in ERROR mode`);
    process.exit(1);
  } else if (hasNewViolations) {
    console.log(`\n⚠️  WARN: ${displayFindings.length} ${useBaseline ? 'NEW ' : ''}violation(s) (non-blocking)`);
    console.log('   To block: set SOVEREIGNTY_SCAN_MODE=error');
    process.exit(0);
  } else {
    console.log('\n✅ PASS: Sovereignty check complete');
    process.exit(0);
  }
}

// Run
main();
