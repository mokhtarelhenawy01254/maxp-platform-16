const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'mokhtar2@elhenawy.com';
const PASSWORD = '0165676135';

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);
  console.log(`${BOLD}  Diagnosing مركز العلاج الطبيعى${RESET}`);
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

  // 1. Login
  console.log(`\n${CYAN}▶ Logging in as ${EMAIL}...${RESET}`);
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (!loginRes.body?.success) { console.error(`${RED}Login failed:${RESET}`, loginRes.body); return; }
  const token = loginRes.body.data.token;
  const user = loginRes.body.data.user;
  console.log(`${GREEN}✓${RESET} Login OK | Role: ${user.role} | CompanyId: ${user.companyId}`);
  console.log(`  Company: ${user.company?.name || 'N/A'}`);

  // 2. List available models
  console.log(`\n${CYAN}▶ Fetching available models...${RESET}`);
  const modelsRes = await apiRequest('GET', '/api/v1/ai-sandbox/models', null, token);
  if (modelsRes.body?.success) {
    const providers = modelsRes.body.providers || [];
    providers.forEach(p => {
      console.log(`  Provider: ${p.name} (${p.models?.length || 0} models)`);
      (p.models || []).forEach(m => console.log(`    - ${m.id} [key: ${m.keyName}] ${m.isEnabled ? '✓' : '✗'}`));
    });
  } else {
    console.log(`${RED}Failed to fetch models:${RESET}`, modelsRes.body);
  }

  // 3. List existing agents and delete any MEDICAL_CENTER agent
  console.log(`\n${CYAN}▶ Fetching and cleaning up existing MEDICAL_CENTER agents...${RESET}`);
  const agentsRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  if (!agentsRes.body?.success) {
    throw new Error('Failed to list agents');
  }

  const agents = agentsRes.body.agents || [];
  const existingMedicalAgents = agents.filter(a => a.role === 'MEDICAL_CENTER' || a.templateSlug === 'medical-center-agent');

  for (const agent of existingMedicalAgents) {
    console.log(`${YELLOW}⚠ Deleting existing MEDICAL_CENTER agent: ID = ${agent.id}...${RESET}`);
    await apiRequest('DELETE', `/api/v1/agent/agents/${agent.id}?permanent=true`, null, token);
  }

  // 4. Spawn a fresh MEDICAL_CENTER agent to pick up the new templates (skills/tools)
  console.log(`\n${CYAN}▶ Spawning fresh MEDICAL_CENTER agent...${RESET}`);
  const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
    name: 'وكيل المركز الطبي (آية)',
    role: 'MEDICAL_CENTER',
    templateSlug: 'medical-center-agent',
    description: 'الوكيل الطبي المعتمد للمركز لاختبار المهارات والأدوات',
    model: 'deepseek-v4-flash'
  }, token);

  if (spawnRes.status !== 201 || !spawnRes.body?.id) {
    throw new Error(`Failed to spawn agent: ${JSON.stringify(spawnRes.body)}`);
  }

  const agentId = spawnRes.body.id;
  console.log(`${GREEN}✓${RESET} Spawned agent: ID = ${agentId}`);

  // 5. Create chat session
  console.log(`\n${CYAN}▶ Creating sandbox chat session...${RESET}`);
  const sessRes = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', {
    agentId,
    title: `Physio Test ${new Date().toISOString()}`
  }, token);

  if (!sessRes.body?.success || !sessRes.body?.session?.id) {
    throw new Error('Failed to create chat session');
  }

  const sessionId = sessRes.body.session.id;
  console.log(`${GREEN}✓${RESET} Session created: ID = ${sessionId}`);

  // Helper to send chat message
  const sendChat = async (message) => {
    console.log(`\n${CYAN}Patient: "${message}"${RESET}`);
    const start = Date.now();
    const chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      sessionId,
      agentId,
      message,
      provider: 'DEEPSEEK',
      model: 'deepseek-v4-flash'
    }, token);
    const ms = Date.now() - start;

    if (!chatRes.body?.success) {
      console.log(`${RED}✗ Chat failed: ${chatRes.body?.error || 'Unknown error'}${RESET}`);
      console.log('Body:', JSON.stringify(chatRes.body, null, 2));
      if (!chatRes.body) {
        console.log('Raw Response:', chatRes.raw);
      }
      return;
    }

    console.log(`${GREEN}Agent (${ms}ms):${RESET} ${chatRes.body.reply}`);
    if (chatRes.body.toolCalls?.length) {
      console.log(`  Tools invoked: ${chatRes.body.toolCalls.map(t => t.name).join(', ')}`);
    }
  };

  // 6. Test Scenario 1: Interactive Booking Slot-Filling
  console.log(`\n${BOLD}--- Scenario 1: Booking & Slot-Filling ---${RESET}`);
  await sendChat('مرحبا، عايز أحجز جلسة علاج طبيعي بكرة لوسمحت');
  await sendChat('اسمي أحمد وتليفوني 01023456789 والجنس ذكر');

  // Test Scenario 2: FAQs / Insurance (clinic-knowledge-resolver)
  console.log(`\n${BOLD}--- Scenario 2: FAQs & Insurance Lookup ---${RESET}`);
  await sendChat('هل بتقبلوا تأمين بوبا؟');

  // Test Scenario 3: Package Upselling (booking-upsell-packages)
  console.log(`\n${BOLD}--- Scenario 3: Package Upselling ---${RESET}`);
  await sendChat('سعر الكشف كام؟ وهل عندكم باقات علاجية؟');

  console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
}

main().catch(console.error);
