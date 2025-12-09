/**
 * Test AI Analysis
 * Directly calls the Gemini API to verify it works
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyCxgzey06Ru1Z6vXi_E1lEu4bPfujTW3EY';

async function testAI() {
  try {
    console.log('🤖 Testing Gemini AI Analysis\n');
    console.log('API Key:', apiKey.substring(0, 20) + '...\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    const testPrompt = `You are an email intelligence assistant. Analyze this email and provide JSON:

EMAIL SUBJECT: Rechnung 2025-001

EMAIL BODY: 
Sehr geehrter Kunde,
anbei erhalten Sie unsere Rechnung 2025-001 über 1.500,00 EUR.
Zahlungsfrist: 14 Tage
Mit freundlichen Grüßen

OUTPUT FORMAT (strict JSON):
{
  "category": "INVOICE",
  "confidence": 0.95,
  "document_types": ["INVOICE"],
  "summary_bullets": [
    "Rechnung 2025-001 über 1.500€ erhalten",
    "Zahlungsfrist: 14 Tage"
  ],
  "priority": "high"
}

RESPOND ONLY WITH VALID JSON.`;

    console.log('📤 Sending test prompt to Gemini...\n');
    
    const result = await model.generateContent(testPrompt);
    const response = result.response;
    const text = response.text();

    console.log('✅ Gemini Response:\n');
    console.log(text);
    console.log('\n✅ AI is working correctly!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ AI Test Failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

testAI();








