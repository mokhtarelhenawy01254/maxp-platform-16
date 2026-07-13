const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3007';
const EMAIL = 'swan@h2m.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const clientModule = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    const req = clientModule.request(options, (res) => {
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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function login() {
  console.log(`${CYAN}▶ تسجيل الدخول إلى متجر Swan (محلي)...${RESET}`);
  const res = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.body?.success) {
    console.log(`${GREEN}✓${RESET} تم تسجيل الدخول بنجاح لحساب: ${res.body.data.user.email}`);
    return res.body.data.token;
  }
  throw new Error(`فشل تسجيل الدخول: ${JSON.stringify(res.body)}`);
}

async function getOrCreateYasmineAgent(token) {
  console.log(`\n${CYAN}▶ التحقق من الوكلاء في الـ Sandbox لـ Swan...${RESET}`);
  const listRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
  if (!listRes.body?.success) {
    throw new Error(`فشل جلب الوكلاء: ${JSON.stringify(listRes.body)}`);
  }

  const agents = listRes.body.agents || [];
  let yasmine = agents.find(a => a.templateSlug === 'sales-rep-v2-agent' && a.name.includes('ياسمين'));

  if (yasmine) {
    console.log(`${GREEN}✓${RESET} تم العثور على الوكيل "ياسمين" نشط بالفعل: ID = ${yasmine.id}`);
    return yasmine.id;
  }

  console.log(`${YELLOW}⚠ الوكيل ياسمين غير موجود في Sandbox. جاري تفعيلها الآن...${RESET}`);
  const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
    name: 'ياسمين - خبيرة المبيعات وتنسيق المنتجات',
    role: 'SALES_REPRESENTATIVE',
    templateSlug: 'sales-rep-v2-agent',
    description: 'مستشارة مبيعات وستايل شخصية تحاكي البشر بالكامل',
    model: 'gemini-2.5-flash', // Using gemini locally to ensure it is supported and fast
    config: {
      tone: 'friendly',
      persona: 'ياسمين - مستشارة المبيعات الشخصية في المتجر',
      goal: 'مساعدة العميل في اختيار المنتجات والملابس المناسبة وحل حيرته لإنشاء الطلب فوراً بذكاء ولطف.',
      welcome: 'يا هلا بحضرتك! 😊 منور المتجر النهاردة.. معاك ياسمين من المبيعات. قولي، بتدور على حاجة معينة أساعدك تنسقها وتختارها؟ عيوني ليك.',
      boundaries: 'لا تتحدث أبداً كبرنامج أو بوت. يمنع منعاً باتاً استخدام جمل آلية مثل "أنا المساعد الذكي" أو "كيف يمكنني مساعدتك اليوم؟" كآلة. إذا سألها العميل "أنت بوت؟" ترد بضحكة عفوية وتؤكد أنها ياسمين من فريق المبيعات. لا تعطي خصومات لم يصرح بها التاجر.',
      customPrompt: 'أنتِ ياسمين، فتاة مصرية ذكية ولطيفة تعمل في المبيعات وتتحدث بعامية مصرية راقية ومهذبة للغاية (يا فندم، يا ذوق، منورنا، تحت أمرك). كلامكِ يجب أن يكون عفوياً وقصيراً ولا يحتوي على أي مظهر من مظاهر الذكاء الاصطناعي أو القوائم الطويلة. تعاملي مع حيرة العميل بصبر ودعم كامل.'
    }
  }, token);

  if (spawnRes.status !== 201 || !spawnRes.body?.id) {
    throw new Error(`فشل إنشاء الوكيل ياسمين: ${JSON.stringify(spawnRes.body)}`);
  }

  console.log(`${GREEN}✓${RESET} تم إنشاء وتفعيل الوكيل "ياسمين" بنجاح: ID = ${spawnRes.body.id}`);
  return spawnRes.body.id;
}

async function createChatSession(token, agentId) {
  console.log(`\n${CYAN}▶ إنشاء جلسة محادثة تجريبية (Sandbox Session)...${RESET}`);
  const res = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', {
    agentId,
    title: `Swan Test - ${new Date().toLocaleTimeString()}`
  }, token);

  if (!res.body?.success || !res.body?.session?.id) {
    throw new Error(`فشل إنشاء الجلسة: ${JSON.stringify(res.body)}`);
  }

  console.log(`${GREEN}✓${RESET} تم إنشاء الجلسة بنجاح: ID = ${res.body.session.id}`);
  return res.body.session.id;
}

async function sendChatMessage(token, sessionId, agentId, senderName, message) {
  console.log(`\n${CYAN}${BOLD}👤 ${senderName}:${RESET} "${message}"`);
  const start = Date.now();
  const res = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
    sessionId,
    agentId,
    message
  }, token);
  const ms = Date.now() - start;

  if (!res.body?.success) {
    console.log(`${RED}✗ فشل إرسال الرسالة: ${res.body?.error || 'خطأ غير معروف'}${RESET}`);
    if (res.body?.taskResult) {
      console.log('Task Result Details:', JSON.stringify(res.body.taskResult, null, 2));
    }
    return null;
  }

  const reply = res.body?.reply || '';
  console.log(`${GREEN}${BOLD}👩 ياسمين (${ms}ms):${RESET} ${reply}`);
  return reply;
}

async function main() {
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);
  console.log(`${BOLD}           مختبر وسيناريو اختبار الوكيل البشري لـ Swan (محلي)${RESET}`);
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

  try {
    const token = await login();
    const agentId = await getOrCreateYasmineAgent(token);
    const sessionId = await createChatSession(token, agentId);

    console.log(`\n${YELLOW}🚀 بدء سيناريو المحادثة الفعلي...${RESET}`);

    // الخطوة 1: العميل يستفسر عن منتج
    await sendChatMessage(token, sessionId, agentId, 'العميل', 'السلام عليكم، كنت عايز أسأل عن كوتشي الاسكوتش المتاح عندكم، هل فيه منه مقاسات وألوان؟');

    // الخطوة 2: تحدي الكشف البشري (التستر)
    await sendChatMessage(token, sessionId, agentId, 'العميل', 'هو أنا بكلم بوت ذكاء اصطناعي ولا حد حقيقي بيرد عليا؟');

    // الخطوة 3: الاستفسار عن السعر والشحن
    await sendChatMessage(token, sessionId, agentId, 'العميل', 'تمام.. هو كوتشي الاسكوتش بكام؟ والتوصيل للجيزة بياخد قد إيه؟');

    console.log(`\n${GREEN}${BOLD}🎉 انتهى السيناريو بنجاح!${RESET}`);

  } catch (error) {
    console.error(`\n${RED}✗ حدث خطأ أثناء تشغيل السيناريو:${RESET}`, error);
  }
}

main();
