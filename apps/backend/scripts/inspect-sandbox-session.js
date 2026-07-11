const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'mokhtar2@elhenawy.com';
const PASSWORD = process.env.PASSWORD || '0165676135';
const SESSION_ID = '1782724814887_niznw2';

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

async function main() {
  console.log('Logging in to production...');
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.body.data?.token;
  if (loginRes.status !== 200 || !token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }
  console.log('✓ Login successful');

  console.log(`Fetching session details for ID: ${SESSION_ID}...`);
  const sessionRes = await apiRequest('GET', `/api/v1/ai-sandbox/sessions/${SESSION_ID}`, null, token);
  
  if (sessionRes.status !== 200) {
    console.log(`Failed to fetch session. Status: ${sessionRes.status}`);
    console.log(JSON.stringify(sessionRes.body, null, 2));
    return;
  }

  const session = sessionRes.body.session;
  console.log(`=== Session ID: ${session.id} ===`);
  console.log(`Agent Name: ${session.agentName} | Role: ${session.agentRole}`);
  console.log(`Model: ${session.model} | Provider: ${session.provider}\n`);

  for (const m of session.messages) {
    console.log(`--- [${m.role.toUpperCase()}] ---`);
    console.log(`Content: ${m.content}`);
    if (m.toolCalls) {
      console.log(`Tool Calls: ${m.toolCalls}`);
    }
    if (m.metadata) {
      console.log(`Metadata: ${JSON.stringify(m.metadata, null, 2)}`);
    }
    console.log();
  }
}

main().catch(console.error);
