const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'swan@h2m.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

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
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload || '');
    req.end();
  });
}

async function main() {
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.body.data.token;

  console.log('Fetching available models from sandbox...');
  const modelsRes = await apiRequest('GET', '/api/v1/ai-sandbox/models', null, token);
  console.log('Models Response:', JSON.stringify(modelsRes.body, null, 2));

  console.log('\nFetching spawned agents...');
  const agentsRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  console.log('Agents:', JSON.stringify(agentsRes.body?.agents, null, 2));
}

main().catch(console.error);
