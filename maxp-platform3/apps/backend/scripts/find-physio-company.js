const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'swan@h2m.com';
const PASSWORD = '0165676135';

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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // Step 1: Login
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (!loginRes.body?.success) { console.error('Login failed:', loginRes.body); return; }
  const token = loginRes.body.data.token;
  const user = loginRes.body.data.user;
  console.log('Login OK:', user.email, 'Role:', user.role, 'CompanyId:', user.companyId);

  // Step 2: Try super-admin quick-list
  console.log('\n--- Trying /super-admin/companies/quick-list ---');
  const saRes = await apiRequest('GET', '/api/v1/super-admin/companies/quick-list', null, token);
  if (saRes.body?.success) {
    const companies = saRes.body.companies || [];
    console.log(`Found ${companies.length} companies`);
    const physio = companies.find(c => c.name && (c.name.includes('علاج') || c.name.includes('طبيعي') || c.name.includes('طبيعى')));
    if (physio) {
      console.log('PHYSIO MATCH:', JSON.stringify(physio, null, 2));
    } else {
      console.log('No physio match. All companies:');
      companies.forEach(c => console.log(`  - ${c.id}: ${c.name}`));
    }
  } else {
    console.log('Super admin endpoint not accessible:', saRes.body?.message || saRes.status);
  }

  // Step 3: Try user's own companies
  console.log('\n--- Trying /auth/companies ---');
  const compRes = await apiRequest('GET', '/api/v1/auth/companies', null, token);
  if (compRes.body?.success || Array.isArray(compRes.body?.data)) {
    console.log('User companies:', JSON.stringify(compRes.body?.data || compRes.body, null, 2));
  } else {
    console.log('Companies endpoint:', compRes.body?.message || compRes.status);
  }

  // Step 4: Try the debug-resolve endpoint (no auth needed)
  console.log('\n--- Trying /auth/debug-resolve ---');
  const debugRes = await apiRequest('GET', '/api/v1/auth/debug-resolve', null, token);
  if (debugRes.body?.success) {
    console.log('AI Keys:', JSON.stringify(debugRes.body.aiKeys?.map(k => ({
      id: k.id, name: k.name, provider: k.provider, isActive: k.isActive
    })), null, 2));
    console.log('Model Configs:', JSON.stringify(debugRes.body.modelConfigs?.map(c => ({
      id: c.id, modelName: c.modelName, keyId: c.keyId, isEnabled: c.isEnabled
    })), null, 2));
  } else {
    console.log('Debug-resolve not yet deployed:', debugRes.status);
  }
}

main().catch(console.error);
