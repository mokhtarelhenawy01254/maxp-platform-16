/**
 * Run on production server. Usage:
 *  scp scripts/physio-check-and-sync.js root@153.92.223.119:/tmp/
 *  ssh root@153.92.223.119 "node /tmp/physio-check-and-sync.js"
 */
const http = require('http');

async function api(method, path, body, token, companyId) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1', port: 3007,
      path: '/api/v1' + path, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (companyId) opts.headers['x-company-id'] = companyId;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: null, raw: data }); } });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Logging in...');
  const login = await api('POST', '/auth/login', { email: 'admin@mokhtarelhenawy.com', password: '0165676135' });
  const token = login.body?.data?.token;
  if (!token) { console.log('Login failed:', login.body || login.error); return; }
  console.log('Logged in as super admin, company:', login.body.data.user.companyId);

  const PHYSIO = 'cmqpbuw3y3oq1ju40or3mr8it';

  // Check policies via HR endpoint
  console.log('\n--- Policies via HR (x-company-id) ---');
  const hrPols = await api('GET', '/hr/policies', null, token, PHYSIO);
  console.log('Count:', hrPols.body?.policies?.length || 0);
  if (hrPols.body?.policies?.length) {
    hrPols.body.policies.forEach(p => console.log('  -', p.title, '| embedded:', !!p.embedding));
  }

  // Check via RAG knowledge endpoint (uses JWT company)
  console.log('\n--- RAG knowledge policies (super admin own company) ---');
  const ragPols = await api('GET', '/ai/chat/rag-knowledge-policies', null, token);
  const items = ragPols.body?.data?.items || [];
  console.log('Count:', items.length);
  items.forEach(p => console.log('  -', p.title, '| hasEmbedding:', p.hasEmbedding));

  // Super admin status
  console.log('\n--- Super Admin Embedding Status ---');
  const st = await api('GET', '/super-admin/ai/knowledge-embeddings/status?company_id=' + PHYSIO, null, token);
  console.log(JSON.stringify(st.body?.data?.summary || st.body, null, 2));

  // If missing, sync
  const missing = st.body?.data?.summary?.missing_policies || 0;
  if (missing > 0) {
    console.log('\nTriggering sync...');
    const sync = await api('POST', '/super-admin/ai/knowledge-embeddings/sync', { company_id: PHYSIO }, token);
    console.log('Sync result:', JSON.stringify(sync.body?.data || sync.body, null, 2));

    console.log('\nWaiting 5s...');
    await new Promise(r => setTimeout(r, 5000));

    const st2 = await api('GET', '/super-admin/ai/knowledge-embeddings/status?company_id=' + PHYSIO, null, token);
    console.log('After sync:', JSON.stringify(st2.body?.data?.summary || st2.body, null, 2));
  }
  
  console.log('\nDone.');
}

main().catch(console.error);
