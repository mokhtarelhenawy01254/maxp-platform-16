/**
 * Test script to verify the MEDICAL_CENTER agent's modular skills on production.
 * Run this script to test the deployed agent.
 *
 * Usage: node scripts/test-production-medical-agent.js
 */

const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'mokhtar2@elhenawy.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function login() {
  const res = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.body?.success) {
    console.log(`${GREEN}✓${RESET} Login successful: ${res.body.data.user.email}`);
    return res.body.data.token;
  }
  throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
}

async function getOrCreateMedicalAgent(token) {
  console.log(`\n${CYAN}▶ Fetching sandbox agents...${RESET}`);
  const listRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  if (!listRes.body?.success) {
    throw new Error(`Failed to list agents: ${JSON.stringify(listRes.body)}`);
  }

  const agents = listRes.body.agents || [];
  const existingAgents = agents.filter(a => a.role === 'MEDICAL_CENTER' || a.templateSlug === 'medical-center-agent');

  for (const agent of existingAgents) {
    console.log(`${YELLOW}⚠ Archiving/Deleting existing MEDICAL_CENTER agent: ID = ${agent.id}...${RESET}`);
    await apiRequest('DELETE', `/api/v1/agent/agents/${agent.id}?permanent=true`, null, token);
  }

  console.log(`${CYAN}▶ Spawning new MEDICAL_CENTER agent with gemini-2.5-pro...${RESET}`);
  const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
    name: 'الوكيل الطبي للتجارب',
    role: 'MEDICAL_CENTER',
    templateSlug: 'medical-center-agent',
    description: 'وكيل طبي تجريبي لاختبار المهارات المعيارية',
    model: 'deepseek-v4-flash'
  }, token);

  if (spawnRes.status !== 201 || !spawnRes.body?.id) {
    throw new Error(`Failed to spawn medical agent: ${JSON.stringify(spawnRes.body)}`);
  }

  console.log(`${GREEN}✓${RESET} Successfully spawned new MEDICAL_CENTER agent: ID = ${spawnRes.body.id}`);
  return spawnRes.body.id;
}

async function createChatSession(token, agentId) {
  console.log(`\n${CYAN}▶ Creating sandbox chat session...${RESET}`);
  const res = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', {
    agentId,
    title: `Medical Test ${new Date().toISOString()}`
  }, token);

  if (!res.body?.success || !res.body?.session?.id) {
    throw new Error(`Failed to create chat session: ${JSON.stringify(res.body)}`);
  }

  console.log(`${GREEN}✓${RESET} Session created: ID = ${res.body.session.id}`);
  return res.body.session.id;
}

async function sendChatMessage(token, sessionId, agentId, message) {
  console.log(`\n${CYAN}Patient: "${message}"${RESET}`);
  const start = Date.now();
  const res = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
    sessionId,
    agentId,
    message
  }, token);
  const ms = Date.now() - start;

  if (!res.body?.success) {
    console.log(`${RED}✗ Failed to send message: ${res.body?.error || 'Unknown error'}${RESET}`);
    console.log('Full Response:', JSON.stringify(res.body || res.raw, null, 2));
    return null;
  }

  const reply = res.body?.reply || '';
  console.log(`${GREEN}Agent (${ms}ms):${RESET} ${reply}`);
  return reply;
}

async function main() {
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);
  console.log(`${BOLD}  Testing MEDICAL_CENTER Skills & Tools on Production${RESET}`);
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

  try {
    const token = await login();
    const agentId = await getOrCreateMedicalAgent(token);
    const sessionId = await createChatSession(token, agentId);

    // Test Scenario 1: Interactive Booking Slot-Filling
    console.log(`\n${BOLD}--- Scenario 1: Booking & Slot-Filling ---${RESET}`);
    await sendChatMessage(token, sessionId, agentId, 'عايز أحجز كشف جلدية بكرة لوسمحت');
    await sendChatMessage(token, sessionId, agentId, 'اسمي محمد وتليفوني 01234567890');

    // Test Scenario 2: Knowledge Base FAQs Search (clinic-knowledge-resolver)
    console.log(`\n${BOLD}--- Scenario 2: FAQs & Insurance lookup ---${RESET}`);
    await sendChatMessage(token, sessionId, agentId, 'هل بتقبلوا تأمين بوبا؟');

    // Test Scenario 3: Package Upselling (booking-upsell-packages)
    console.log(`\n${BOLD}--- Scenario 3: Package Upselling ---${RESET}`);
    await sendChatMessage(token, sessionId, agentId, 'سعر جلسة ليزر إزالة الشعر كام؟ وعايز أحجز جلسة واحدة');

  } catch (err) {
    console.error(`\n${RED}${BOLD}Error during execution:${RESET} ${err.message}`);
  }
  console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
}

main().catch(console.error);
