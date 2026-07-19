const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'admin@mokhtarelhenawy.com';
const PASSWORD = process.env.PASSWORD || 'SuperAdmin@123';

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
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`Attempting login for ${EMAIL}...`);
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (loginRes.status !== 200 || !loginRes.body?.success) {
    console.error('Login failed:', loginRes.body);
    return;
  }

  const token = loginRes.body.data.token;
  console.log('Login successful! Fetching company quick-list...');

  const companiesRes = await apiRequest('GET', '/api/v1/super-admin/companies/quick-list', null, token);
  if (!companiesRes.body?.success) {
    console.error('Failed to fetch companies:', companiesRes.body);
    return;
  }

  const companies = companiesRes.body.companies || [];
  console.log(`Found ${companies.length} companies.`);

  const physio = companies.find(c => c.name.includes('علاج') || c.name.includes('طبيعي') || c.name.includes('Physiotherapy'));
  if (physio) {
    console.log('Match found for Physio:', physio);
  } else {
    console.log('No exact match for Physio. Listing all companies:');
    console.log(JSON.stringify(companies, null, 2));
  }
}

main().catch(console.error);
