#!/usr/bin/env node

/**
 * AI Gateway Smoke Test
 * 
 * Tests all gateway endpoints with synthetic fixture data.
 * 
 * Usage:
 *   node scripts/sovereignty/smoke-ai-gateway.js
 * 
 * Environment:
 *   AI_GATEWAY_URL (default: http://localhost:8787)
 *   AI_GATEWAY_TOKEN (default: dev-token)
 */

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8787';
const GATEWAY_TOKEN = process.env.AI_GATEWAY_TOKEN || 'dev-token';

// ============================================================================
// Test Data (from fixtures/synthetic)
// ============================================================================

const TEST_SUMMARIZE_EMAIL = {
  subject: 'Angebot für Elektroinstallation - Neubau Musterstraße 42',
  bodyText: `Sehr geehrte Damen und Herren,

wir benötigen ein Angebot für die komplette Elektroinstallation in unserem Neubau.

Objekt: Einfamilienhaus
Adresse: Musterstraße 42, 12345 Musterstadt
Wohnfläche: ca. 180 m²

Gewünschte Leistungen:
- Komplette Elektroinstallation nach DIN VDE
- 25 Steckdosen
- 15 Lichtschalter
- Smart-Home Vorbereitung

Bitte senden Sie uns ein unverbindliches Angebot.

Mit freundlichen Grüßen
Max Mustermann`,
  language: 'de',
};

const TEST_DRAFT_REPLY = {
  originalSubject: 'Anfrage Elektroinstallation',
  originalFrom: 'kunde@example.local',
  originalTo: ['info@tradetrackr.example.local'],
  originalBodyText: 'Wir benötigen ein Angebot für Elektroinstallation...',
  tone: 'friendly',
  language: 'de',
};

const TEST_CLASSIFY_DOCUMENT = {
  text: `LIEFERSCHEIN

Lieferschein-Nr.:     LS-2025-4567
Datum:                28.12.2025

Pos  Artikel-Nr.   Bezeichnung                    Menge  ME
1    EL-NYM-315    NYM-J 3x1,5mm² Kabel           100    m
2    EL-SD-UP      Schalterdose UP Ø68mm           25    Stk`,
  filename: 'lieferschein.pdf',
};

// ============================================================================
// Utilities
// ============================================================================

function log(icon, message) {
  console.log(`${icon} ${message}`);
}

function logPass(testName) {
  log('✅', `PASS: ${testName}`);
}

function logFail(testName, error) {
  log('❌', `FAIL: ${testName}`);
  console.log(`   Error: ${error}`);
}

async function fetchJson(endpoint, body = null) {
  const options = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${GATEWAY_URL}${endpoint}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// ============================================================================
// Tests
// ============================================================================

async function testHealthz() {
  const testName = 'GET /healthz';
  
  try {
    const { status, data } = await fetchJson('/healthz');
    
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}`);
    }
    
    if (!data.ok) {
      throw new Error('Expected ok=true');
    }
    
    if (!data.mode) {
      throw new Error('Missing mode field');
    }
    
    if (!data.version) {
      throw new Error('Missing version field');
    }
    
    logPass(testName);
    log('  ', `Mode: ${data.mode}, Version: ${data.version}`);
    return true;
    
  } catch (error) {
    logFail(testName, error.message);
    return false;
  }
}

async function testSummarizeEmail() {
  const testName = 'POST /ai/summarizeEmail';
  
  try {
    const { status, data } = await fetchJson('/ai/summarizeEmail', TEST_SUMMARIZE_EMAIL);
    
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}. Error: ${data.error || 'unknown'}`);
    }
    
    if (!data.category) {
      throw new Error('Missing category field');
    }
    
    if (typeof data.confidence !== 'number') {
      throw new Error('Missing or invalid confidence field');
    }
    
    if (!Array.isArray(data.summaryBullets)) {
      throw new Error('Missing or invalid summaryBullets field');
    }
    
    if (!data.priority) {
      throw new Error('Missing priority field');
    }
    
    logPass(testName);
    log('  ', `Category: ${data.category}, Priority: ${data.priority}, Confidence: ${data.confidence}`);
    return true;
    
  } catch (error) {
    logFail(testName, error.message);
    return false;
  }
}

async function testDraftReply() {
  const testName = 'POST /ai/draftReply';
  
  try {
    const { status, data } = await fetchJson('/ai/draftReply', TEST_DRAFT_REPLY);
    
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}. Error: ${data.error || 'unknown'}`);
    }
    
    if (!data.subject) {
      throw new Error('Missing subject field');
    }
    
    if (!data.bodyText) {
      throw new Error('Missing bodyText field');
    }
    
    if (!Array.isArray(data.to)) {
      throw new Error('Missing or invalid to field');
    }
    
    logPass(testName);
    log('  ', `Subject: ${data.subject.substring(0, 50)}...`);
    return true;
    
  } catch (error) {
    logFail(testName, error.message);
    return false;
  }
}

async function testClassifyDocument() {
  const testName = 'POST /ai/classifyDocument';
  
  try {
    const { status, data } = await fetchJson('/ai/classifyDocument', TEST_CLASSIFY_DOCUMENT);
    
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}. Error: ${data.error || 'unknown'}`);
    }
    
    if (typeof data.confidence !== 'number') {
      throw new Error('Missing or invalid confidence field');
    }
    
    if (!data.reason) {
      throw new Error('Missing reason field');
    }
    
    if (!data.model) {
      throw new Error('Missing model field');
    }
    
    logPass(testName);
    log('  ', `Type: ${data.type || 'unknown'}, Confidence: ${data.confidence}`);
    return true;
    
  } catch (error) {
    logFail(testName, error.message);
    return false;
  }
}

async function testAuthRequired() {
  const testName = 'Auth required (401)';
  
  try {
    const response = await fetch(`${GATEWAY_URL}/ai/summarizeEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify(TEST_SUMMARIZE_EMAIL),
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.error) {
      throw new Error('Expected error message');
    }
    
    logPass(testName);
    log('  ', `Error: ${data.error}`);
    return true;
    
  } catch (error) {
    logFail(testName, error.message);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  TradeTrackr AI Gateway Smoke Test');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Gateway URL: ${GATEWAY_URL}`);
  console.log(`  Token: ${GATEWAY_TOKEN.substring(0, 4)}***`);
  console.log('');
  
  const results = [];
  
  // Run tests
  results.push(await testHealthz());
  results.push(await testAuthRequired());
  results.push(await testSummarizeEmail());
  results.push(await testDraftReply());
  results.push(await testClassifyDocument());
  
  // Summary
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  if (failed === 0) {
    console.log(`✅ ALL TESTS PASSED (${passed}/${results.length})`);
    console.log('═══════════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.log(`❌ TESTS FAILED: ${failed}/${results.length}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Check gateway is reachable first
async function checkGateway() {
  try {
    await fetch(`${GATEWAY_URL}/healthz`, { method: 'GET' });
    return true;
  } catch (error) {
    console.error(`\n❌ Cannot reach gateway at ${GATEWAY_URL}`);
    console.error(`   Make sure the gateway is running: cd services/ai-gateway && npm run dev\n`);
    return false;
  }
}

checkGateway().then(reachable => {
  if (reachable) {
    main().catch(err => {
      console.error('Smoke test error:', err);
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

