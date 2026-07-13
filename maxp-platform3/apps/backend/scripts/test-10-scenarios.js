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
      method: method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });

    req.on('error', (e) => { reject(e); });
    if (payload) { req.write(payload); }
    req.end();
  });
}

async function getOrSpawnAgent(token) {
  console.log(`${CYAN}▶ Checking for existing MEDICAL_CENTER agent...${RESET}`);
  const listRes = await apiRequest('GET', '/api/v1/agent/agents', null, token);
  if (listRes.status !== 200) {
    throw new Error(`Failed to list agents: ${JSON.stringify(listRes.body)}`);
  }
  const agents = listRes.body || [];
  const existing = agents.find(a => a.role === 'MEDICAL_CENTER' && !a.isArchived);

  if (existing) {
    console.log(`${GREEN}✓${RESET} Found existing agent: ID = ${existing.id}`);
    return existing.id;
  }

  console.log(`${YELLOW}⚠ No active medical agent found. Spawning a new one...${RESET}`);
  const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
    name: 'الوكيل الطبي للاختبارات الشاملة',
    role: 'MEDICAL_CENTER',
    templateSlug: 'medical-center-agent',
    description: 'وكيل طبي تجريبي لاختبار الـ 10 سيناريوهات',
    model: 'deepseek-v4-flash'
  }, token);

  if (spawnRes.status !== 201 || !spawnRes.body?.id) {
    throw new Error(`Failed to spawn medical agent: ${JSON.stringify(spawnRes.body)}`);
  }

  console.log(`${GREEN}✓${RESET} Successfully spawned new MEDICAL_CENTER agent: ID = ${spawnRes.body.id}`);
  return spawnRes.body.id;
}

async function runScenario(token, agentId, title, messages) {
  console.log(`\n======================================================================`);
  console.log(`${BOLD}${CYAN}🎬 [سيناريو]: ${title}${RESET}`);
  console.log(`======================================================================`);

  // Create fresh chat session for this scenario
  const sessionRes = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', {
    agentId,
    title: `Scenario Test: ${title}`
  }, token);

  if (!sessionRes.body?.success || !sessionRes.body?.session?.id) {
    throw new Error(`Failed to create chat session: ${JSON.stringify(sessionRes.body)}`);
  }
  const sessionId = sessionRes.body.session.id;

  for (const msg of messages) {
    console.log(`\n${YELLOW}Patient:${RESET} "${msg}"`);
    const start = Date.now();
    const res = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      sessionId,
      agentId,
      message: msg
    }, token);
    const ms = Date.now() - start;

    if (!res.body?.success) {
      console.log(`${RED}✗ Failed to send message: ${res.body?.error || 'Unknown error'}${RESET}`);
      continue;
    }

    const reply = res.body.reply;
    const trace = res.body.pipelineTrace || {};
    const skill = trace.activeSkill || 'None';
    const tools = (trace.toolExecutions || []).map(t => t.name).join(', ') || 'None';

    console.log(`${GREEN}Agent (${ms}ms):${RESET}\n${reply}`);
    console.log(`\x1b[90m[Active Skill: ${skill} | Tools Executed: ${tools}]\x1b[0m`);
  }
}

async function main() {
  console.log(`${BOLD}🚀 Starting 10-Scenario Automated Verification Suite on Production...${RESET}`);
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.body.data?.token;
  if (!token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }
  console.log(`${GREEN}✓ Login successful: ${EMAIL}${RESET}`);

  const agentId = await getOrSpawnAgent(token);

  // Define representative scenarios for automated check
  // Scenario 1: Dialect & Greeting Matching
  await runScenario(token, agentId, 'مطابقة التحية واللهجة (SOUL Rule)', [
    'ازيك يا فندم اخبارك ايه؟',
    'السلام عليكم'
  ]);

  // Scenario 2: Happy Path Booking (Complete Slot-filling)
  await runScenario(token, agentId, 'الحجز الطبيعي المتكامل (Happy Path Booking)', [
    'عايز أحجز كشف أو جلسة علاج طبيعي بكرة لوسمحت',
    'اسمي محمد وتليفوني 01234567890 والجنس ذكر',
    'فرع التجمع الخامس'
  ]);

  // Scenario 3: Out of Scope & FAQ Lookup
  await runScenario(token, agentId, 'الاستفسار عن خدمات خارج التخصص والأسئلة الشائعة', [
    'عندكم كشف عيون أو سنان؟',
    'طب هل بتقبلوا تأمين بوبا أو ميدنت في العيادة؟'
  ]);
}

main().catch(console.error);
