/**
 * Seed إنتاج Swan (maxp.online) — نفس محتوى البذرة المحلية لكن عبر API الإنتاج.
 * ينفذ: رحلة ما بعد الاستلام (فلو عام + 6 خطوات) + 17 مناسبة سنوية (منشورة/مجدولة) + 12 قالب Utility.
 * idempotent: لو موجود بيحدّث، لو لأ بيخلق.
 * التشغيل: node scripts/swan-retention/seed-swan-production.js
 */
const BASE = 'https://maxp.online/api/v1';
const LOGIN = 'https://maxp.online/api/auth/login';
const EMAIL = 'swan@h2m.com';
const PASSWORD = ps['process.env'].SWAN_PASSWORD;

const log = (...a) => console.log(...a);
const ok = (m) => log(`  [OK] ${m}`);
const err = (m) => log(`  [!!] ${m}`);

const FLOW_NAME = 'رحلة ما بعد الاستلام — Swan';
const STEPS = [
  { name: 'فحص مقاس Day0+4س', delayUnit: 'HOURS', delayHours: 4, delayDays: 0, stepOrder: 1, expectReply: true,
    replyKeywords: ['تمام', 'مظبوط', 'كويس', 'مناسب', 'ضبط', 'حلو', 'ممتاز', 'تمامه'], timeoutHours: 48,
    content: 'تم تسليم طلبكم من Swan 🎉 يمكنكم تجربة الحذاء على سجادة لدقيقتين، وفي حال عدم مناسبة المقاس يمكنكم الرد خلال 7 أيام للاستبدال المجاني.' },
  { name: 'تذكير الكود Day2', delayUnit: 'DAYS', delayHours: null, delayDays: 2, stepOrder: 2, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تذكير: كود الخصم الخاص بكم صالح لفترة محدودة — تستخدمونه في طلبكم القادم، ولو انتهى هيتم تحويله كاش باك في محفظتكم تلقائياً.' },
  { name: 'تحويل كاش باك Day3', delayUnit: 'DAYS', delayHours: null, delayDays: 3, stepOrder: 3, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تم تحويل كود الخصم المنتهي إلى كاش باك في محفظتكم — يُخصم تلقائياً من طلبكم القادم.' },
  { name: 'تقييم وريفيو Day7', delayUnit: 'DAYS', delayHours: null, delayDays: 7, stepOrder: 4, expectReply: true,
    replyKeywords: ['حبيت', 'تمام', 'ممتاز', 'شكرا', 'كويس', 'رائع'], timeoutHours: null,
    content: 'شكراً لثقتكم في Swan 💛 لو حابين نساعدكم، تقييمكم للطلب بصورة أو فيديو بيكسبكم نقاط ولاء في حسابكم.' },
  { name: 'Cross-sell Day14', delayUnit: 'DAYS', delayHours: null, delayDays: 14, stepOrder: 5, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'عشان تكملوا إطلالتكم — عندنا قطع بتكمل نفس الخط البصري لطلبكم، ولو حابين نساعدكم في اختيار المقاس المناسب.' },
  { name: 'نقاط وتير Day30', delayUnit: 'DAYS', delayHours: null, delayDays: 30, stepOrder: 6, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تحديث حسابكم في Swan: نقاطكم وكاش باككم جاهزين في محفظتكم لطلبكم الجاي.' },
];

const OCCASIONS = [
  { name: 'رأس السنة الهجرية', date: '2027-06-05T10:00:00+02:00', text: 'تحديث: بمناسبة رأس السنة الهجرية — كتالوج الموسم الجديد محدث. Swan', recurrence: "none" },
  { name: 'عاشوراء', date: '2026-09-06T10:00:00+02:00', text: 'تحديث حساب: بمناسبة عاشوراء — رصيد نقاطكم متاح للاستبدال. Swan', recurrence: "none" },
  { name: 'المولد النبوي', date: '2027-08-13T10:00:00+02:00', text: 'تذكير حساب: بمناسبة المولد النبوي — حسابكم نشط ومزاياكم في انتظاركم. Swan', recurrence: "none" },
  { name: 'الإسراء والمعراج', date: '2026-12-06T10:00:00+02:00', text: 'تحديث حساب: بمناسبة الإسراء والمعراج — رصيد نقاطكم الحالي متاح. Swan', recurrence: "none" },
  { name: 'ليلة النصف من شعبان', date: '2027-01-22T10:00:00+02:00', text: 'تحديث: بمناسبة ليلة النصف من شعبان — تشكيلة رمضان قيد التجهيز. Swan', recurrence: "none" },
  { name: 'بداية رمضان', date: '2027-02-08T10:00:00+02:00', text: 'تحديث: بمناسبة حلول رمضان — تشكيلة رمضان متوفرة بمقاسات كاملة. Swan', recurrence: "none" },
  { name: 'ليلة القدر', date: '2027-03-06T10:00:00+02:00', text: 'تنبيه: مع اقتراب العيد — المقاسات متوفرة لتشكيلة العيد. Swan', recurrence: "none" },
  { name: 'عيد الفطر', date: '2027-03-09T10:00:00+02:00', text: 'تحديث: تشكيلة عيد الفطر متوفرة بكل المقاسات. Swan', recurrence: "none" },
  { name: 'وقفة عرفات وعيد الأضحى', date: '2027-05-15T10:00:00+02:00', text: 'تنبيه: بمناسبة عيد الأضحى — تشكيلة العيد متوفرة. Swan', recurrence: "none" },
  { name: 'رأس السنة الميلادية', date: '2027-01-01T10:00:00+02:00', text: 'تنبيه توفر: كوليكشن رأس السنة — مقاسات كاملة. Swan' },
  { name: 'عيد الأم', date: '2027-03-21T10:00:00+02:00', text: 'تحديث: بمناسبة عيد الأم — تشكيلة هدايا متوفرة بكل المقاسات. Swan' },
  { name: 'عيد الحب', date: '2027-02-14T10:00:00+02:00', text: 'تنبيه: بمناسبة عيد الحب — تشكيلة السهرة متوفرة. Swan' },
  { name: 'شم النسيم', date: '2027-04-26T10:00:00+02:00', text: 'تحديث: كوليكشن شم النسيم — صندل مفتوح بمقاسات كاملة. Swan' },
  { name: 'العودة للمدارس', date: '2027-09-01T10:00:00+02:00', text: 'تنبيه: تشكيلة العودة للمدارس — شوز مدرسة وجامعة متوفر. Swan' },
  { name: 'الجمعة البيضاء', date: '2027-11-26T10:00:00+02:00', text: 'تحديث حساب: الجمعة البيضاء — رصيد كاش باككم جاهز. Swan' },
  { name: 'انطلاق الموسم الصيفي', date: '2027-06-01T10:00:00+02:00', text: 'تنبيه: كوليكشن الصيف وصل — مقاسات كاملة. Swan' },
  { name: 'انطلاق الموسم الشتوي', date: '2027-10-01T10:00:00+02:00', text: 'تنبيه: كوليكشن الشتاء وصل — بوت ومقاسات كاملة. Swan' },
];

const TEMPLATES = [
  { eventType: 'AUTO_DISCOUNT_COUPON_GRANTED', name: 'كود الخصم بعد أول طلب (Day0)', content: 'تم إنشاء كود خصم 10% مرتبط بطلبكم {{orderNumber}} صالح حتى {{expiryDate}} — Swan' },
  { eventType: 'AUTO_DISCOUNT_COUPON_EXPIRING', name: 'تذكير الكود (Day2)', content: 'تذكير: كود الخصم المرتبط بالطلب {{orderNumber}} ينتهي يوم {{expiryDate}}' },
  { eventType: 'AUTO_DISCOUNT_CASHBACK_CONVERTED', name: 'تحويل الكود لكاش باك (Day3)', content: 'تم تحويل الكود المنتهي إلى {{cashAmount}} كاش باك في محفظتكم — المرجع {{orderNumber}}' },
  { eventType: 'LOYALTY_POINTS_AWARDED', name: 'نقاط بعد التقييم (Day7)', content: 'تم إضافة {{points}} نقطة إلى حسابكم نتيجة تقييم الطلب {{orderNumber}}' },
  { eventType: 'LOYALTY_TIER_UPGRADED', name: 'ترقية مستوى', content: 'تهانينا! مستواكم أصبح {{tierName}} — الامتيازات النشطة: شحن مجاني + وصول مبكر + نقاط مضاعفة' },
  { eventType: 'LOYALTY_POINTS_EXPIRY_WARNING', name: 'تنبيه انتهاء النقاط', content: 'تنبيه: {{points}} نقطة في حسابكم تنتهي {{expiryDate}} — استبدلوها بخصم على طلبكم الجاي' },
  { eventType: 'LOYALTY_POINTS_EXPIRED', name: 'انتهاء صلاحية النقاط', content: 'تحديث حساب: النقاط المنتهية تمت إزالتها — رصيدكم الحالي {{currentPoints}} نقطة' },
  { eventType: 'LOYALTY_POINTS_REDEEMED', name: 'استبدال النقاط', content: 'تم استبدال {{points}} نقطة بخصم {{cashAmount}} على طلبكم — المرجع {{orderNumber}}' },
  { eventType: 'CASHBACK_CREDITED', name: 'إيداع كاش باك', content: 'تم إضافة {{cashAmount}} كاش باك إلى محفظتكم — الرصيد الحالي {{balance}}' },
  { eventType: 'CASHBACK_REVERSED', name: 'خصم كاش باك', content: 'تحديث حساب: تم خصم {{cashAmount}} من محفظتكم — الرصيد الحالي {{balance}}' },
  { eventType: 'CUSTOMER_QUALITY_UPGRADED', name: 'ارتفاع تصنيف الجودة', content: 'تحديث حساب: تصنيفكم أصبح {{qualityTier}} — شكراً لثقتكم' },
  { eventType: 'CUSTOMER_QUALITY_DOWNGRADED', name: 'انخفاض تصنيف الجودة', content: 'تحديث حساب: تصنيفكم الحالي {{qualityTier}} — يسعدنا مساعدتكم في أي استفسار' },
];

async function api(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function main() {
  log('🔐 تسجيل الدخول إلى maxp.online...');
  const loginRes = await fetch(LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const loginData = await loginRes.json();
  const token = loginData?.token || loginData?.accessToken || loginData?.data?.token;
  if (!token) { err('فشل تسجيل الدخول: ' + JSON.stringify(loginData).slice(0, 300)); process.exit(1); }
  ok('تم تسجيل الدخول');

  log('\n📦 [1/3] رحلة ما بعد الاستلام:');
  let flow = null;
  const flows = await api(token, 'GET', '/whatsapp-automation/flows');
  const list = flows?.data || [];
  flow = list.find((f) => f.isGeneral) || list.find((f) => f.name === FLOW_NAME);
  if (flow) {
    await api(token, 'PUT', `/whatsapp-automation/flows/${flow.id}`, { name: FLOW_NAME, isEnabled: true, isGeneral: true });
    ok(`الفلو موجود (${flow.id}) — تم التحديث`);
  } else {
    const created = await api(token, 'POST', '/whatsapp-automation/flows', { name: FLOW_NAME, isGeneral: true, channels: ['WHATSAPP'] });
    flow = created?.data;
    ok(`تم إنشاء الفلو العام (${flow?.id})`);
  }
  if (!flow) { err('مفيش flow'); process.exit(1); }

  const stepsRes = await api(token, 'GET', `/whatsapp-automation/flows/${flow.id}/steps`);
  const existingSteps = stepsRes?.data || [];
  for (const s of STEPS) {
    const match = existingSteps.find((st) => st.stepOrder === s.stepOrder);
    const body = { delayDays: s.delayDays, delayHours: s.delayHours, delayUnit: s.delayUnit, content: s.content, stepOrder: s.stepOrder, expectReply: s.expectReply, replyKeywords: s.replyKeywords, timeoutHours: s.timeoutHours, ...(match ? { id: match.id } : {}) };
    await api(token, 'POST', `/whatsapp-automation/flows/${flow.id}/steps`, body);
    ok(`  خطوة ${s.stepOrder}: ${s.name} (${match ? 'محدثة' : 'جديدة'})`);
  }

  log('\n🎉 [2/3] المناسبات (17):');
  const occRes = await api(token, 'GET', '/customers/whatsapp-notify/occasions');
  const occList = occRes?.data || [];
  for (const occ of OCCASIONS) {
    const when = new Date(occ.date);
    const match = occList.find((o) => o.name === occ.name);
    const body = { name: occ.name, message: occ.text, scheduledAt: when.toISOString(), recurrence: 'yearly', customerListIds: ['all'], sendLimit: 0, throttlePerRun: 0 };
    let occId = match ? match.id : null;
    if (match) {
      await api(token, 'PUT', `/customers/whatsapp-notify/occasions/${match.id}`, body);
    } else {
      const created = await api(token, 'POST', '/customers/whatsapp-notify/occasions', body);
      occId = created?.data?.id || null;
    }
    if (occId) {
      await api(token, 'POST', `/customers/whatsapp-notify/occasions/${occId}/publish`, { scheduledAt: when.toISOString() });
      ok(`  ${match ? 'محدثة ومجدولة' : 'جديدة ومجدولة'}: ${occ.name}`);
    } else {
      err(`  مفيش id للمناسبة: ${occ.name}`);
    }
  }

  log('\n💬 [3/3] قوالب Utility (12):');
  const tplRes = await api(token, 'GET', '/whatsapp-notifications/templates');
  const tplList = tplRes?.data || [];
  for (const t of TEMPLATES) {
    const match = tplList.find((x) => x.eventType === t.eventType && x.name === t.name);
    const body = { name: t.name, category: 'MARKETING', eventType: t.eventType, content: t.content, channel: 'AUTO', isActive: true };
    if (match) {
      await api(token, 'PUT', `/whatsapp-notifications/templates/${match.id}`, body);
      ok(`  محدث: ${t.eventType}`);
    } else {
      await api(token, 'POST', '/whatsapp-notifications/templates', body);
      ok(`  جديد: ${t.eventType}`);
    }
  }

  log('\n✅ اكتمل سكريبت إنتاج Swan بنجاح');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });