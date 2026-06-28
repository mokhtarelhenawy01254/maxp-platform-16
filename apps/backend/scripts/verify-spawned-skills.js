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

  const agentsRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  const agents = agentsRes.body.agents || [];
  
  console.log('=== Active Agents with Skills ===');
  agents.forEach(a => {
    console.log(`Agent: ${a.name} (${a.id})`);
    console.log(`Role: ${a.role}`);
    console.log(`Template: ${a.templateSlug}`);
    console.log(`Model: ${a.model}`);
    console.log(`Allowed Tools:`, a.allowedTools || a.allowed_tools);
    console.log(`Allowed Skills:`, a.skills || a.allowedSkills || a.allowed_skills);
    console.log('--------------------------------');
  });
}

main().catch(console.error);
