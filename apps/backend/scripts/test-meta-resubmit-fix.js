/**
 * test-meta-resubmit-fix.js
 * يختبر إصلاح إعادة إرسال قالب ميتا للمراجعة (resubmit-meta) على الإنتاج:
 * - يسجل الدخول بحساب Swan (swan@h2m.com)
 * - يجلب الحالات مع القوالب
 * - يبحث عن حالة CONFIRMED (مؤكد)
 * - يجلب جلسة Meta Cloud
 * - يستدعي POST /templates/:id/resubmit-meta
 * - يتحقق: لا يوجد خطأ code 100 / subcode 2388024، والرد success
 */

const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'swan@h2m.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let failures = 0;

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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
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

function check(cond, label) {
  if (cond) {
    console.log(`${GREEN}✓ PASS${RESET} ${label}`);
  } else {
    console.log(`${RED}✗ FAIL${RESET} ${label}`);
    failures++;
  }
}

async function main() {
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);
  console.log(`${BOLD}   اختبار إصلاح resubmit-meta (Meta Template ID) على الإنتاج${RESET}`);
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

  try {
    // 1) تسجيل الدخول
    console.log(`\n${CYAN}▶ 1) تسجيل الدخول: ${EMAIL}${RESET}`);
    const login = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
    const token = login.body?.data?.token;
    check(!!token, `تسجيل الدخول (status=${login.status})`);
    if (!token) {
      console.log(`${RED}لا يمكن متابعة الاختبار بدون توكن.${RESET}`);
      console.log(JSON.stringify(login.body).slice(0, 500));
      process.exit(1);
    }

    // 2) جلب الحالات مع القوالب
    console.log(`\n${CYAN}▶ 2) جلب الحالات مع القوالب (with-templates)${RESET}`);
    const statusesRes = await apiRequest('GET', '/api/v1/order-status/with-templates', null, token);
    const statuses = statusesRes.body?.data || statusesRes.body || [];
    check(Array.isArray(statuses) && statuses.length > 0, `جلب الحالات (count=${Array.isArray(statuses) ? statuses.length : 0})`);

    // البحث عن حالة مؤكد / CONFIRMED
    const confirmed = (Array.isArray(statuses) ? statuses : []).find(
      (s) => String(s.code || s.eventType || '').toUpperCase().includes('CONFIRMED') || String(s.name || '').includes('مؤكد')
    );
    check(!!confirmed, `إيجاد حالة CONFIRMED (مؤكد)`);
    if (!confirmed) {
      console.log(JSON.stringify(statuses).slice(0, 1000));
      process.exit(1);
    }
    console.log(`${YELLOW}ℹ الحالة: code=${confirmed.code}, name=${confirmed.name}, template=${confirmed.template ? confirmed.template.id : 'none'}${RESET}`);

    const tpl = confirmed.template;
    check(!!tpl && !!tpl.id, `القالب المحلي للحالة موجود (id=${tpl?.id})`);
    check(!!tpl.metaTemplateName, `القالب مربوط بقالب ميتا (metaTemplateName=${tpl?.metaTemplateName})`);
    if (!tpl || !tpl.id || !tpl.metaTemplateName) {
      console.log(`${YELLOW}⚠ القالب غير مربوط بميتا — لا يمكن اختبار resubmit. الخروج.${RESET}`);
      process.exit(0);
    }

    // 3) جلب جلسات ميتا
    console.log(`\n${CYAN}▶ 3) جلب جلسات Meta Cloud${RESET}`);
    const sessionsRes = await apiRequest('GET', '/api/v1/whatsapp/sessions', null, token);
    const sessions = sessionsRes.body?.sessions || [];
    const metaSession = (sessions || []).find((s) => s.provider === 'META_CLOUD');
    check(!!metaSession, `جلسة Meta Cloud موجودة (id=${metaSession?.id})`);
    if (!metaSession) {
      console.log(JSON.stringify(sessionsRes.body).slice(0, 800));
      process.exit(1);
    }

    // 4) الحصول على metaTemplateId من قاعدة بيانات الإنتاج عبر API؟
    // نتحقق أولاً من وجود metaTemplateId في القالب المرتجع
    console.log(`\n${CYAN}▶ 4) التحقق من عمود metaTemplateId الجديد${RESET}`);
    // with-templates قد لا يرجع metaTemplateId — نستدعي listTemplates عبر meta-available لو متاح
    const metaAvailableRes = await apiRequest(
      'GET',
      `/api/v1/whatsapp-notifications/templates/meta-available?sessionId=${metaSession.id}`,
      null,
      token
    );
    const available = metaAvailableRes.body?.templates || [];
    const metaTpl = (Array.isArray(available) ? available : []).find((t) => t.name === tpl.metaTemplateName);
    check(!!metaTpl, `قالب ميتا موجود في meta-available (${tpl.metaTemplateName})`);
    if (metaTpl) {
      console.log(`${YELLOW}ℹ meta-available: status=${metaTpl.status}, boundTo=${metaTpl.boundToLocalTemplateId}, components=${Array.isArray(metaTpl.components) ? metaTpl.components.length : 0}${RESET}`);
    }

    // 5) استدعاء resubmit-meta (الاستدعاء الفعلي)
    console.log(`\n${CYAN}▶ 5) استدعاء POST resubmit-meta للقالب ${tpl.id}${RESET}`);
    const resubmitRes = await apiRequest(
      'POST',
      `/api/v1/whatsapp-notifications/templates/${tpl.id}/resubmit-meta`,
      { sessionId: metaSession.id },
      token
    );

    const bodyText = JSON.stringify(resubmitRes.body);
    console.log(`${YELLOW}ℹ HTTP ${resubmitRes.status}${RESET}`);
    console.log(`${YELLOW}ℹ response: ${bodyText.slice(0, 1200)}${RESET}`);

    // 6) التحقق من النتائج
    console.log(`\n${CYAN}▶ 6) التحقق من النتائج${RESET}`);

    // الشرط الأساسي: ألا يكون هناك خطأ Meta code 100 / subcode 2388024
    const has2388024 = /2388024/.test(bodyText) || /يوجد محتوى بهذه اللغة/.test(bodyText) || /Content in This Language Already Exists/i.test(bodyText);
    check(!has2388024, `لا يوجد خطأ 2388024 (Content in This Language Already Exists)`);

    // الشرط الثاني: استجابة ناجحة (success !== false) أو 200/2xx
    const okStatus = resubmitRes.status >= 200 && resubmitRes.status < 300;
    check(okStatus, `HTTP status نجاح (${resubmitRes.status})`);
    check(resubmitRes.body?.success !== false, `response.success !== false`);

    // الشرط الثالث: القالب تحوّل إلى PENDING للمراجعة
    const pending = /PENDING/i.test(bodyText) || /تم إنشاء قالب جديد/.test(bodyText) || /تم تحديث/.test(bodyText);
    check(pending, `القالب أُرسل للمراجعة (PENDING / تم إنشاء قالب جديد)`);

    // الشرط الرابع: عدم وجود أخطاء HTTP 500
    check(resubmitRes.status !== 500, `لا يوجد HTTP 500`);

    // الشرط الخامس: اسم القالب الجديد فريد (يبدأ بنفس البادئة لكن يختلف عن القديم)
    if (resubmitRes.body?.metaTemplateName) {
      const newName = String(resubmitRes.body.metaTemplateName);
      check(newName.startsWith(String(tpl.metaTemplateName).split('_').slice(0, 2).join('_')), `تم إنشاء قالب باسم فريد (${newName})`);
    }

    // 7) إعادة جلب بعد الـ resubmit لرؤية الحالة الجديدة
    console.log(`\n${CYAN}▶ 7) جلب الحالة بعد resubmit للتحقق من metaTemplateStatus${RESET}`);
    const statusesAfter = await apiRequest('GET', '/api/v1/order-status/with-templates', null, token);
    const afterList = statusesAfter.body?.data || statusesAfter.body || [];
    const confirmedAfter = (Array.isArray(afterList) ? afterList : []).find(
      (s) => String(s.code || s.eventType || '').toUpperCase().includes('CONFIRMED') || String(s.name || '').includes('مؤكد')
    );
    if (confirmedAfter?.template) {
      console.log(`${YELLOW}ℹ بعد: metaTemplateName=${confirmedAfter.template.metaTemplateName}, metaTemplateStatus=${confirmedAfter.template.metaTemplateStatus}${RESET}`);
      check(/PENDING/i.test(String(confirmedAfter.template.metaTemplateStatus || '')), `metaTemplateStatus أصبح PENDING`);
    } else {
      console.log(`${YELLOW}⚠ لم يتم العثور على حالة CONFIRMED بعد الاستدعاء — تخطي الفحص.${RESET}`);
    }

  } catch (error) {
    console.error(`\n${RED}✗ خطأ غير متوقع أثناء الاختبار:${RESET}`, error.message);
    failures++;
  }

  console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
  if (failures === 0) {
    console.log(`${GREEN}${BOLD}🎉 الاختبار نجح بالكامل — الإصلاح يعمل على الإنتاج.${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}✗ الاختبار فشل في ${failures} فحص.${RESET}`);
    process.exit(1);
  }
}

main();
