const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'mokhtar2@elhenawy.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m', B = '\x1b[1m';

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: null, raw: data }); } });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`${B}${'='.repeat(70)}${X}`);
  console.log(`${B}  Testing Physio-Coordinator Agent — Skills & Tools${X}`);
  console.log(`${B}${'='.repeat(70)}${X}`);

  // 1. Login
  console.log(`\n${C}▶ Login...${X}`);
  const login = await api('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (!login.body?.success) { console.error(`${R}✗ Login failed:${X}`, login.body); return; }
  const token = login.body.data.token;
  console.log(`${G}✓${X} User: ${login.body.data.user.email} | CompanyId: ${login.body.data.user.companyId}`);

  // 2. List existing agents, delete old PHYSIOTHERAPY ones
  console.log(`\n${C}▶ Listing & cleaning old PHYSIOTHERAPY agents...${X}`);
  const list = await api('GET', '/api/v1/ai-sandbox/agents', null, token);
  if (!list.body?.success) { console.error(`${R}✗ Failed to list agents${X}`); return; }
  const agents = list.body.agents || [];
  const oldPhysio = agents.filter(a => a.role === 'PHYSIOTHERAPY' || a.templateSlug === 'physio-coordinator');
  for (const a of oldPhysio) {
    console.log(`${Y}⚠ Deleting old: ${a.id} (${a.name})${X}`);
    await api('DELETE', `/api/v1/agent/agents/${a.id}?permanent=true`, null, token);
  }

  // 3. Spawn fresh physio-coordinator
  console.log(`\n${C}▶ Spawning physio-coordinator agent...${X}`);
  const spawn = await api('POST', '/api/v1/agent/agents', {
    name: 'أحمد — منسق العلاج الطبيعي (اختبار)',
    role: 'PHYSIOTHERAPY',
    templateSlug: 'physio-coordinator',
    description: 'وكيل اختبار لمهارات العلاج الطبيعي والتأهيل',
    model: 'deepseek-v4-flash'
  }, token);
  if (spawn.status !== 201 || !spawn.body?.id) {
    console.error(`${R}✗ Spawn failed:${X}`, JSON.stringify(spawn.body));
    return;
  }
  const agentId = spawn.body.id;
  console.log(`${G}✓${X} Spawned: ID = ${agentId}`);

  // 4. Create chat session
  console.log(`\n${C}▶ Creating chat session...${X}`);
  const sess = await api('POST', '/api/v1/ai-sandbox/sessions', { agentId, title: `Physio Test ${Date.now()}` }, token);
  if (!sess.body?.success || !sess.body?.session?.id) { console.error(`${R}✗ Session failed${X}`); return; }
  const sessionId = sess.body.session.id;
  console.log(`${G}✓${X} Session: ${sessionId}`);

  // Helper
  const chat = async (msg, label) => {
    console.log(`\n${Y}${label || 'User'}:${X} "${msg}"`);
    const start = Date.now();
    const res = await api('POST', '/api/v1/ai-sandbox/chat', { sessionId, agentId, message: msg, provider: 'DEEPSEEK', model: 'deepseek-v4-flash' }, token);
    const ms = Date.now() - start;
    if (!res.body?.success) {
      console.log(`${R}✗ (${ms}ms): ${res.body?.error || 'No response'}${X}`);
      console.log(JSON.stringify(res.body || res.raw, null, 2));
      return;
    }
    console.log(`${G}Agent (${ms}ms):${X} ${res.body.reply}`);
    if (res.body.toolCalls?.length) {
      console.log(`  ${C}Tools:${X} ${res.body.toolCalls.map(t => `${t.name}(${JSON.stringify(t.args)})`).join(', ')}`);
    }
    if (res.body.pipelineTrace?.activeSkill) {
      console.log(`  ${C}Skill:${X} ${res.body.pipelineTrace.activeSkill}`);
    }
  };

  // === SCENARIO 1: Booking ===
  console.log(`\n${B}--- Scenario 1: Booking (medical-center-booking) ---${X}`);
  await chat('مرحبا أحمد، عايز أحجز جلسة علاج طبيعي', 'Patient');
  await chat('اسمي محمد وتليفوني 01234567890 وذكر', 'Patient');

  // === SCENARIO 2: FAQ / Insurance (clinic-knowledge-resolver) ===
  console.log(`\n${B}--- Scenario 2: FAQ / Insurance (clinic-knowledge-resolver) ---${X}`);
  await chat('هل بتقبلوا تأمين بوبا؟', 'Patient');

  // === SCENARIO 3: Package upsell (booking-upsell-packages) ===
  console.log(`\n${B}--- Scenario 3: Package Upsell (booking-upsell-packages) ---${X}`);
  await chat('سعر الجلسة كام؟ وهل في باقات موفرة؟', 'Patient');

  // === SCENARIO 4: Knowledge search ===
  console.log(`\n${B}--- Scenario 4: Knowledge / Preparation (clinic-knowledge-resolver) ---${X}`);
  await chat('أي التحضيرات اللي محتاج أعملها قبل جلسة العلاج الطبيعي؟', 'Patient');

  // === SCENARIO 5: Handoff ===
  console.log(`\n${B}--- Scenario 5: Handoff to Human (handoff-to-human) ---${X}`);
  await chat('أنا عايز أتكلم مع مسئول بشري ضروري', 'Patient');

  console.log(`\n${B}${'='.repeat(70)}${X}`);
  console.log(`${B}  Test Complete${X}`);
}

main().catch(console.error);
