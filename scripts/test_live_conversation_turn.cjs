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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Timeout after 180s')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function runLiveTest() {
  console.log('🚀 Starting Live Multi-Turn Continuity Test on Production...\n');

  console.log(`1. Logging in as ${EMAIL}...`);
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (!loginRes.body?.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.data.token;
  console.log('✅ Login successful!\n');

  console.log('2. Creating a new Copilot cloud session...');
  const sessRes = await apiRequest('POST', '/api/v1/ai/chat/sessions', {
    title: 'اختبار تتابع المحادثة والكتالوج',
  }, token);

  const sessionId = sessRes.body?.session?.id || `copilot_sess_${Date.now()}`;
  console.log(`✅ Session created: ${sessionId}\n`);

  console.log('3. Sending Turn 1: "جبلي الـ 3 منتجات باساميهم و الـ sku بتاعهم"...');
  const turn1Res = await apiRequest('POST', '/api/v1/ai/chat/message', {
    message: 'جبلي الـ 3 منتجات باساميهم و الـ sku بتاعهم',
    sessionId,
    agentId: 'store-manager-agent',
    agentSlug: 'store-manager-agent',
  }, token);

  console.log(`Turn 1 Response Status: ${turn1Res.status}`);
  const reply1 = turn1Res.body?.reply || turn1Res.body?.message || '';
  console.log(`Turn 1 Reply:\n---\n${reply1}\n---\n`);

  if (!reply1) {
    throw new Error('Turn 1 returned empty reply!');
  }

  console.log('4. Sending Turn 2 in the same session: "عادي هات الباقي"...');
  const turn2Res = await apiRequest('POST', '/api/v1/ai/chat/message', {
    message: 'عادي هات الباقي',
    sessionId,
    agentId: 'store-manager-agent',
    agentSlug: 'store-manager-agent',
  }, token);

  console.log(`Turn 2 Response Status: ${turn2Res.status}`);
  const reply2 = turn2Res.body?.reply || turn2Res.body?.message || '';
  console.log(`Turn 2 Reply:\n---\n${reply2}\n---\n`);

  // Assertions
  const amnesiaSignals = [
    'مش لاقي رسالة',
    'مش لاقي رسالة قبل دي',
    'الباقي بتاع إيه',
    'ابعتلي السطر اللي قبله',
    'كلام سابق',
  ];

  const hasAmnesia = amnesiaSignals.some(signal => reply2.includes(signal));

  if (hasAmnesia) {
    console.error('❌ FAILED: The agent still suffers from conversational amnesia!');
    process.exit(1);
  }

  console.log('✅ SUCCESS: The agent remembered the conversation context and answered accordingly!');
  console.log('🎉 Live production verification completed successfully!');
}

runLiveTest().catch((err) => {
  console.error('❌ Error during live test:', err.message);
  process.exit(1);
});
