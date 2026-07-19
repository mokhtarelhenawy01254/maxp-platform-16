const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'mokhtar2@elhenawy.com';
const PASSWORD = '0165676135';

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
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.body.data.token;

  console.log('Seeding medical-center-agent template...');
  const seedRes = await apiRequest('POST', '/api/v1/proxy/ai-service/seed-template', { slug: 'medical-center-agent' }, token);
  console.log('Seed result:', seedRes.body);

  const agentsRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  const agents = agentsRes.body.agents || [];
  const existingMedicalAgents = agents.filter(a => a.role === 'MEDICAL_CENTER' || a.templateSlug === 'medical-center-agent');
  for (const a of existingMedicalAgents) {
    await apiRequest('DELETE', `/api/v1/agent/agents/${a.id}`, null, token);
  }

  const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
    name: 'آية - موظفة استقبال المركز الطبي',
    role: 'MEDICAL_CENTER',
    templateSlug: 'medical-center-agent',
    model: 'deepseek-v4-flash'
  }, token);
  const agent = spawnRes.body;

  const sessionRes = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', { agentId: agent.id }, token);
  const sessionId = sessionRes.body.session?.id || sessionRes.body.id || `session_${Date.now()}`;

  console.log('\n--- Testing Informal Greeting Matching ---');
  console.log('المريض: "ازيك يا فندم اخبارك ايه؟"');
  
  const chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
    agentId: agent.id,
    sessionId: sessionId,
    message: 'ازيك يا فندم اخبارك ايه؟'
  }, token);

  console.log('الوكيل:\n' + (chatRes.body.reply || chatRes.body.message));
  console.log('\n--- Full Response Payload (Model Verification) ---');
  console.log(JSON.stringify(chatRes.body, null, 2));
}

main().catch(console.error);
