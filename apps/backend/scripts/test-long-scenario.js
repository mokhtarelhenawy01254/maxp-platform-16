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
  console.log('======================================================================');
  console.log('  اختبار المحادثة الطويلة والتحقق من الشخصية والمهارات');
  console.log('======================================================================\n');

  // 1. Login
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.body.data.token;
  console.log('✓ تم تسجيل الدخول بنجاح');

  // 2. Fetch Agents
  const agentsRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  const agents = agentsRes.body.agents || [];
  let agent = agents.find(a => a.role === 'MEDICAL_CENTER');
  
  if (!agent) {
    console.log('▶ إنشاء وكيل جديد...');
    const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
      name: 'آية - موظفة استقبال المركز الطبي',
      role: 'MEDICAL_CENTER',
      templateSlug: 'medical-center-agent',
      model: 'deepseek-v4-flash'
    }, token);
    agent = spawnRes.body;
  }
  console.log(`✓ استخدام الوكيل: ${agent.name} (${agent.id})\n`);

  // 3. Create Sandbox Session
  const sessionRes = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', { agentId: agent.id }, token);
  const sessionId = sessionRes.body.session?.id || sessionRes.body.id || `session_${Date.now()}`;
  console.log(`✓ بدء جلسة المحادثة: ${sessionId}\n`);

  const turns = [
    { label: 'التحية والتكليف الأول', text: 'السلام عليكم، مسائكم خير' },
    { label: 'الاستفسار عن الفروع ومواعيد العمل', text: 'عايز اعرف فروعكم فين ومواعيد العمل بالظبط' },
    { label: 'الاستفسار عن مواعيد وخدمات الظهر', text: 'تمام، انا محتاج احجز جلسة علاج طبيعي لظهري بكرة، وعايز اعرف ايه الخدمات التانية المتوفرة عندكم؟' },
    { label: 'خدمة خاطئة غير متوفرة (أسنان)', text: 'طب وهل عندكم قسم لتركيبات الأسنان وتبييض الأسنان؟' },
    { label: 'حجز موعد محدد', text: 'تمام فاهمك. خلينا نحجز جلسة علاج طبيعي لظهري بكرة، اسمي أحمد محمود ورقمي 01012345678 والجنس ذكر وعايز فرع سند الساعة 5 مساءً' },
    { label: 'إلغاء الحجز', text: 'معلش يا فندم طرأ عندي ظرف طارئ جداً وعايز الغي الحجز ده لوسمحت' }
  ];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    console.log(`----------------------------------------------------------------------`);
    console.log(`Turn ${i + 1} [${turn.label}]`);
    console.log(`المريض: "${turn.text}"`);
    
    const start = Date.now();
    const chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      agentId: agent.id,
      sessionId: sessionId,
      message: turn.text
    }, token);
    const duration = Date.now() - start;

    const reply = chatRes.body.reply || chatRes.body.message || JSON.stringify(chatRes.body);
    const tools = chatRes.body.toolsInvoked || chatRes.body.toolCalls || [];
    
    console.log(`الوكيل (${duration}ms):\n${reply}`);
    if (tools.length > 0) {
      console.log(`🛠️ الأدوات المستدعاة: ${tools.map(t => t.name || t).join(', ')}`);
    }
    console.log(`----------------------------------------------------------------------\n`);
  }
}

main().catch(console.error);
