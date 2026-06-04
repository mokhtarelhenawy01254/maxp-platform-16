const { t: i18n } = require('./i18n');
/**
 * Real LLM Test for Customer Channel AI Behavior
 * 
 * Tests actual AI responses with real customer messages
 * Uses the AI chat endpoint
 */

const http = require('http');

const BASE_URL = 'localhost:3007';
const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97';

async function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/v1/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function testScenario(message, channel = 'FACEBOOK') {
  console.log(`\n📤 Channel: ${channel}`);
  console.log(`📤 Message: "${message}"`);
  console.log('-'.repeat(60));
  
  try {
    const result = await makeRequest({
      companyId: COMPANY_ID,
      message: message,
      channel: channel
    });
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
      return { success: false, error: result.error };
    }
    
    if (result.reply) {
      console.log(`📥 Reply: ${result.reply.substring(0, 200)}${result.reply.length > 200 ? '...' : ''}`);
    }
    
    if (result.intent) {
      console.log(`🎯 Intent: ${result.intent}`);
    }
    
    console.log(`✅ Success`);
    return { success: true, result };
    
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 Real LLM Test - Customer Channel AI Behavior');
  console.log('='.repeat(80));
  console.log(`\nCompany ID: ${COMPANY_ID}`);
  console.log(`Backend: ${BASE_URL}\n`);
  
  const scenarios = [
    // Refund scenarios
    { msg: i18n.t('msg.8ebbc4cf'), expected: 'refund' },
    { msg: i18n.t('msg.50e2c71a'), expected: 'refund' },
    
    // Order status
    { msg: i18n.t('msg.f1788183'), expected: 'order.lookup' },
    { msg: i18n.t('msg.3dfabdc6'), expected: 'order' },
    
    // Product inquiry  
    { msg: i18n.t('msg.2ad13889'), expected: 'products' },
    { msg: i18n.t('msg.005a87ae'), expected: 'inventory' },
    
    // Complaint
    { msg: i18n.t('msg.af3a2e7a'), expected: 'complaint' },
    
    // Shipping
    { msg: i18n.t('msg.f6dd7934'), expected: 'shipping' },
    
    // Simple chat
    { msg: i18n.t('msg.3bbe6d74'), expected: 'chat' },
    { msg: i18n.t('msg.c96a6376'), expected: 'chat' },
    
    // New order
    { msg: i18n.t('msg.9fc84c2b'), expected: 'order' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  // Test each channel
  const channels = ['FACEBOOK', 'WHATSAPP', 'MESSENGER'];
  
  for (const channel of channels) {
    console.log('\n' + '='.repeat(80));
    console.log(`📋 Testing Channel: ${channel}`);
    console.log('='.repeat(80));
    
    // Test a subset of scenarios per channel
    const testSet = scenarios.slice(0, 4); // First 4 scenarios per channel
    
    for (const { msg } of testSet) {
      const result = await testScenario(msg, channel);
      if (result.success) passed++;
      else failed++;
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round(passed/(passed+failed)*100)}%`);
  console.log('='.repeat(80));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);