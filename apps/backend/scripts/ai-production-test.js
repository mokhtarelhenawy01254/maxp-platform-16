/**
 * اختبار شامل للذكاء الاصطناعي على الإنتاج
 * AI Production Readiness Test — Multi-turn conversation scenarios
 *
 * Usage: node scripts/ai-production-test.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'swan@h2m.com';
const PASSWORD = '0165676135';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const results = { passed: 0, failed: 0, total: 0 };
const sessions = {};

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
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function login() {
  const res = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.body?.success) {
    console.log(`${GREEN}✓${RESET} تسجيل الدخول: ${res.body.data.user.email} (${res.body.data.user.role})`);
    return res.body.data.token;
  }
  throw new Error(`فشل تسجيل الدخول: ${JSON.stringify(res.body)}`);
}

function logResult(name, success, detail = '') {
  results.total++;
  if (success) { results.passed++; console.log(`  ${GREEN}✓${RESET} ${name} ${detail ? `— ${detail}` : ''}`); }
  else { results.failed++; console.log(`  ${RED}✗${RESET} ${name} ${detail ? `— ${detail}` : ''}`); }
}

function logStep(msg) {
  console.log(`\n${CYAN}${BOLD}▶ ${msg}${RESET}`);
}

async function chat(token, message, scenario, sessionKey = null) {
  const body = { message };
  if (sessionKey && sessions[sessionKey]) {
    body.sessionId = sessions[sessionKey];
  }
  const start = Date.now();
  const res = await apiRequest('POST', '/api/v1/ai/chat/message', body, token);
  const ms = Date.now() - start;
  const success = res.body?.success === true;
  const reply = res.body?.reply || '';
  const replyPreview = reply.slice(0, 80).replace(/\n/g, ' ');

  if (success && !sessions[scenario]) {
    sessions[scenario] = res.body?.session?.id || res.body?.conversationId;
  }

  logResult(scenario ? `${scenario}: ${message.slice(0, 50)}...` : message.slice(0, 50), success,
    success ? `${ms}ms — "${replyPreview}..."` : res.body?.error || 'فشل');
  return { success, reply, ms, sessionId: res.body?.session?.id, raw: res.body };
}

// ─── السيناريوهات ────────────────────────────────────────────

async function run(token) {
  logStep('السيناريو 1: بحث عن منتجات');
  await chat(token, 'عايز أشوف منتجات أحذية عندك', 'search1');
  await chat(token, 'عندك Luna Sneaker؟', 'search1');
  await chat(token, 'كم سعره وكم المقاسات المتوفرة؟', 'search1');

  logStep('السيناريو 2: إنشاء طلب (تدفق كامل)');
  await chat(token, 'عايز أطلب Luna Sneaker أبيض مقاس 40', 'order1');
  await chat(token, 'السعر كام مع الشحن للقاهرة؟', 'order1');
  await chat(token, 'تمام، العنوان: القاهرة، مدينة نصر، شارع النصر، عمارة 5', 'order1');
  await chat(token, 'الدفع كاش عند الاستلام. كمل الطلب', 'order1');

  logStep('السيناريو 3: استعلام عن طلب');
  await chat(token, 'عايز أتابع طلبي، رقم الطلب كام؟', 'order1');
  await chat(token, 'ممكن تفاصيل الشحن والتوصيل؟', 'order1');

  logStep('السيناريو 4: بحث عن عميل');
  await chat(token, 'دور على عميل اسمه أحمد', 'customer1');
  await chat(token, 'عندك عميل تليفونه 01001234567؟', 'customer1');

  logStep('السيناريو 5: شكوى واسترجاع');
  await chat(token, 'عميل شاكي إن المنتج وصل مكسور، عايز يعمل مرتجع', 'complaint1');
  await chat(token, 'إيه سياسة الاسترجاع عندكم؟', 'complaint1');

  logStep('السيناريو 6: تقارير وتحليلات');
  await chat(token, 'عايز تقرير مبيعات النهارده', 'report1');
  await chat(token, 'أفضل 5 منتجات مبيعاً الشهر ده', 'report1');
  await chat(token, 'إيه المنتجات اللي مخزونها قليل؟', 'report1');

  logStep('السيناريو 7: لغات مختلفة');
  await chat(token, 'Hello, I want to buy shoes', 'lang1');
  await chat(token, 'كم سعر هذا الحذاء؟', 'lang1');
  await chat(token, 'شكراً جزيلاً', 'lang1');

  logStep('السيناريو 8: محادثة طويلة (10+ turns)');
  await chat(token, 'عايز منتجات جديدة في المتجر', 'long1');
  await chat(token, 'عندك تخفيضات؟', 'long1');
  await chat(token, 'إيه اللي نزل النهارده؟', 'long1');
  await chat(token, 'عندك أحذية رياضية؟', 'long1');
  await chat(token, 'عايز حاجة للأطفال', 'long1');
  await chat(token, 'طيب عايز حاجة للبنات', 'long1');
  await chat(token, 'سعرها كام؟', 'long1');
  await chat(token, 'هل متوفر مقاسات كبيرة؟', 'long1');
  await chat(token, 'ممكن تشوفلي مقاس 44؟', 'long1');
  await chat(token, 'تمام كده شكراً', 'long1');

  logStep('السيناريو 9: اختبار الحافة — مدخلات غريبة');
  await chat(token, '', 'edge1');
  await chat(token, 'a'.repeat(5000), 'edge1');
  await chat(token, '!@#$%^&*()_+', 'edge1');
  await chat(token, JSON.stringify({ test: 'object' }), 'edge1');

  logStep('السيناريو 10: تقييم عام');
  await chat(token, 'أد إيه نسبة رضا العملاء؟', 'eval1');
  await chat(token, 'إيه اللي ممكن نطوره في المتجر؟', 'eval1');
}

// ─── التشغيل ─────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}  اختبار الذكاء الاصطناعي الشامل — AI Production Readiness Test${RESET}`);
  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`  البيئة: ${BASE_URL}`);
  console.log(`  التاريخ: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  const overallStart = Date.now();

  try {
    const token = await login();
    await run(token);
  } catch (err) {
    console.error(`\n${RED}${BOLD}خطأ:${RESET} ${err.message}`);
  }

  const overallMs = Date.now() - overallStart;

  console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}  النتائج النهائية${RESET}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${GREEN}نجح: ${results.passed}${RESET}`);
  console.log(`  ${RED}فشل: ${results.failed}${RESET}`);
  console.log(`  ${YELLOW}الإجمالي: ${results.total}${RESET}`);
  console.log(`  المدة: ${(overallMs / 1000).toFixed(1)} ثانية`);
  console.log(`  متوسط الوقت: ${(overallMs / results.total).toFixed(0)}ms لكل رسالة`);
  const pct = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  console.log(`  ${pct >= 80 ? GREEN : RED}نسبة النجاح: ${pct}%${RESET}`);
  console.log(`${'='.repeat(60)}\n`);

  if (results.failed === 0) {
    console.log(`${GREEN}${BOLD}✅ الذكاء الاصطناعي جاهز للإنتاج!${RESET}`);
  } else {
    console.log(`${YELLOW}${BOLD}⚠️  يحتاج تحسين — ${results.failed} اختبار فشل${RESET}`);
  }
}

main().catch(console.error);
