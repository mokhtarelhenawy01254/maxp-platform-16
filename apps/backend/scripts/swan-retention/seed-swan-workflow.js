/**
 * Seed — تنفيذ Workflow احتفاظ Swan (المرجع: H:\swan loop groth\shoe-retention-workflow.md)
 * البذرة: رحلة ما بعد الاستلام + المناسبات + قوالب Utility + إعدادات الولاء + المخزون
 * التشغيل: node scripts/swan-retention/seed-swan-workflow.js [--dry-run]
 */
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const DRY = process.argv.includes('--dry-run');
const log = (...a) => console.log(...a);
const ok = (msg) => log(`  [OK] ${msg}`);
const err = (msg) => log(`  [!!] ${msg}`);

// ─── رحلة ما بعد الاستلام (Workflow v5: فحص مقاس Day0+4س) ───
const JOURNEY_FLOW_NAME = 'رحلة ما بعد الاستلام — Swan';
const JOURNEY_STEPS = [
  { name: 'فحص مقاس Day0+4س', delayUnit: 'HOURS', delayHours: 4, delayDays: 0, expectReply: true,
    replyKeywords: JSON.stringify(['تمام', 'مظبوط', 'كويس', 'مناسب', 'ضبط', 'حلو', 'ممتاز', 'تمامه']), timeoutHours: 48,
    content: 'تم تسليم طلبكم من Swan 🎉 يمكنكم تجربة الحذاء على سجادة لدقيقتين، وفي حال عدم مناسبة المقاس يمكنكم الرد خلال 7 أيام للاستبدال المجاني.' },
  { name: 'تذكير الكود Day2', delayUnit: 'DAYS', delayHours: null, delayDays: 2, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تذكير: كود الخصم الخاص بكم صالح لفترة محدودة — تستخدمونه في طلبكم القادم، ولو انتهى هيتم تحويله كاش باك في محفظتكم تلقائياً.' },
  { name: 'تحويل كاش باك Day3', delayUnit: 'DAYS', delayHours: null, delayDays: 3, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تم تحويل كود الخصم المنتهي إلى كاش باك في محفظتكم — يُخصم تلقائياً من طلبكم القادم.' },
  { name: 'تقييم وريفيو Day7', delayUnit: 'DAYS', delayHours: null, delayDays: 7, expectReply: true,
    replyKeywords: JSON.stringify(['حبيت', 'تمام', 'ممتاز', 'شكرا', 'كويس', 'رائع']), timeoutHours: null,
    content: 'شكراً لثقتكم في Swan 💛 لو حابين نساعدكم، تقييمكم للطلب بصورة أو فيديو بيكسبكم نقاط ولاء في حسابكم.' },
  { name: 'Cross-sell Day14', delayUnit: 'DAYS', delayHours: null, delayDays: 14, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'عشان تكملوا إطلالتكم — عندنا قطع بتكمل نفس الخط البصري لطلبكم، ولو حابين نساعدكم في اختيار المقاس المناسب.' },
  { name: 'نقاط وتير Day30', delayUnit: 'DAYS', delayHours: null, delayDays: 30, expectReply: false,
    replyKeywords: null, timeoutHours: null,
    content: 'تحديث حسابكم في Swan: نقاطكم وكاش باككم جاهزين في محفظتكم لطلبكم الجاي.' },
];

// ─── المناسبات العامة الثابتة (17) — تواريخ 2026/2027 + تكرار سنوي ───
// الهجري تقديري (±يوم) وقابل للتعديل من صفحة المناسبات. عيد الميلاد وذكرى أول طلب ليهم أنظمة مخصصة.
const OCCASIONS = [
  { name: 'رأس السنة الهجرية', date: '2027-06-05T10:00:00+02:00', text: 'تحديث: بمناسبة رأس السنة الهجرية — كتالوج الموسم الجديد محدث. Swan' },
  { name: 'عاشوراء', date: '2026-09-06T10:00:00+02:00', text: 'تحديث حساب: بمناسبة عاشوراء — رصيد نقاطكم متاح للاستبدال. Swan' },
  { name: 'المولد النبوي', date: '2027-08-13T10:00:00+02:00', text: 'تذكير حساب: بمناسبة المولد النبوي — حسابكم نشط ومزاياكم في انتظاركم. Swan' },
  { name: 'الإسراء والمعراج', date: '2026-12-06T10:00:00+02:00', text: 'تحديث حساب: بمناسبة الإسراء والمعراج — رصيد نقاطكم الحالي متاح. Swan' },
  { name: 'ليلة النصف من شعبان', date: '2027-01-22T10:00:00+02:00', text: 'تحديث: بمناسبة ليلة النصف من شعبان — تشكيلة رمضان قيد التجهيز. Swan' },
  { name: 'بداية رمضان', date: '2027-02-08T10:00:00+02:00', text: 'تحديث: بمناسبة حلول رمضان — تشكيلة رمضان متوفرة بمقاسات كاملة. Swan' },
  { name: 'ليلة القدر', date: '2027-03-06T10:00:00+02:00', text: 'تنبيه: مع اقتراب العيد — المقاسات متوفرة لتشكيلة العيد. Swan' },
  { name: 'عيد الفطر', date: '2027-03-09T10:00:00+02:00', text: 'تحديث: تشكيلة عيد الفطر متوفرة بكل المقاسات. Swan' },
  { name: 'وقفة عرفات وعيد الأضحى', date: '2027-05-15T10:00:00+02:00', text: 'تنبيه: بمناسبة عيد الأضحى — تشكيلة العيد متوفرة. Swan' },
  { name: 'رأس السنة الميلادية', date: '2027-01-01T10:00:00+02:00', text: 'تنبيه توفر: كوليكشن رأس السنة — مقاسات كاملة. Swan' },
  { name: 'عيد الأم', date: '2027-03-21T10:00:00+02:00', text: 'تحديث: بمناسبة عيد الأم — تشكيلة هدايا متوفرة بكل المقاسات. Swan' },
  { name: 'عيد الحب', date: '2027-02-14T10:00:00+02:00', text: 'تنبيه: بمناسبة عيد الحب — تشكيلة السهرة متوفرة. Swan' },
  { name: 'شم النسيم', date: '2027-04-26T10:00:00+02:00', text: 'تحديث: كوليكشن شم النسيم — صندل مفتوح بمقاسات كاملة. Swan' },
  { name: 'العودة للمدارس', date: '2027-09-01T10:00:00+02:00', text: 'تنبيه: تشكيلة العودة للمدارس — شوز مدرسة وجامعة متوفر. Swan' },
  { name: 'الجمعة البيضاء', date: '2027-11-26T10:00:00+02:00', text: 'تحديث حساب: الجمعة البيضاء — رصيد كاش باككم جاهز. Swan' },
  { name: 'انطلاق الموسم الصيفي', date: '2027-06-01T10:00:00+02:00', text: 'تنبيه: كوليكشن الصيف وصل — مقاسات كاملة. Swan' },
  { name: 'انطلاق الموسم الشتوي', date: '2027-10-01T10:00:00+02:00', text: 'تنبيه: كوليكشن الشتاء وصل — بوت ومقاسات كاملة. Swan' },
];

// ─── قوالب Utility للأحداث (نصوص Workflow بصيغة محايدة) ───
const EVENT_TEMPLATES = [
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

async function main() {
  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findFirst({ where: { slug: 'swan' } });
  if (!company) { err('شركة Swan غير موجودة (slug=swan)'); process.exit(1); }
  log(`\n🎯 Swan company: ${company.id} — ${company.name}`);
  if (DRY) log('⚠️  وضع التجربة (--dry-run): لا تغييرات فعلية\n');

  // 1) رحلة ما بعد الاستلام
  log('\n📦 [1/5] رحلة ما بعد الاستلام:');
  let flow = await prisma.whatsAppFollowUpFlow.findFirst({ where: { companyId: company.id, name: JOURNEY_FLOW_NAME } });
  if (flow) {
    if (!DRY) await prisma.whatsAppFollowUpStep.deleteMany({ where: { flowId: flow.id } });
    ok(`الرحلة موجودة — إعادة بناء الخطوات (${JOURNEY_STEPS.length})`);
  } else {
    if (!DRY) flow = await prisma.whatsAppFollowUpFlow.create({
      data: { companyId: company.id, name: JOURNEY_FLOW_NAME, isEnabled: true, isGeneral: true, channels: JSON.stringify(['WHATSAPP']) }
    });
    ok(`تم إنشاء الرحلة العامة`);
  }
  if (!DRY && flow) {
    for (let i = 0; i < JOURNEY_STEPS.length; i++) {
      const s = JOURNEY_STEPS[i];
      await prisma.whatsAppFollowUpStep.create({
        data: { flowId: flow.id, stepOrder: i + 1, delayDays: s.delayDays, delayHours: s.delayHours, delayUnit: s.delayUnit, content: s.content, expectReply: s.expectReply, replyKeywords: s.replyKeywords, timeoutHours: s.timeoutHours }
      });
    }
  }
  for (const s of JOURNEY_STEPS) ok(`  خطوة: ${s.name}`);

  // 2) المناسبات
  log('\n🎉 [2/5] المناسبات (17 مناسبة سنوية):');
  for (const occ of OCCASIONS) {
    const when = new Date(occ.date);
    const existing = await prisma.occasion.findFirst({ where: { companyId: company.id, name: occ.name } });
    const data = {
      companyId: company.id, name: occ.name, message: occ.text, scheduledAt: when,
      recurrence: 'yearly', customerListIds: JSON.stringify(['all']), status: 'scheduled', nextRunAt: when,
      sendLimit: 0, throttlePerRun: 0
    };
    if (existing) {
      if (!DRY) await prisma.occasion.update({ where: { id: existing.id }, data: { message: occ.text, scheduledAt: when, recurrence: 'yearly', customerListIds: JSON.stringify(['all']), status: 'scheduled', nextRunAt: when } });
      ok(`  محدثة: ${occ.name} (${when.toISOString().slice(0, 10)})`);
    } else {
      if (!DRY) await prisma.occasion.create({ data });
      ok(`  جديدة: ${occ.name} (${when.toISOString().slice(0, 10)})`);
    }
  }

  // 3) قوالب Utility
  log('\n💬 [3/5] قوالب Utility للأحداث:');
  for (const tpl of EVENT_TEMPLATES) {
    const existing = await prisma.whatsAppNotificationTemplate.findFirst({ where: { companyId: company.id, eventType: tpl.eventType, name: tpl.name } });
    if (existing) {
      if (!DRY) await prisma.whatsAppNotificationTemplate.update({ where: { id: existing.id }, data: { content: tpl.content, isActive: true, channel: 'AUTO' } });
      ok(`  محدث: ${tpl.eventType} — ${tpl.name}`);
    } else {
      if (!DRY) await prisma.whatsAppNotificationTemplate.create({
        data: { companyId: company.id, name: tpl.name, category: 'MARKETING', eventType: tpl.eventType, content: tpl.content, channel: 'AUTO', isActive: true, isDefault: false }
      });
      ok(`  جديد: ${tpl.eventType} — ${tpl.name}`);
    }
  }

  // 4) إعدادات الولاء — reEngagement 90 يوم + تشغيل اللوبات
  log('\n⚙️  [4/5] إعدادات الولاء (re-engagement):');
  let ls = {};
  try { ls = JSON.parse(company.loyaltySettings || '{}'); } catch { ls = {}; }
  ls.reEngagement = { inactiveDays: 90, loops: { occasion: true, inactive: true, points: true } };
  if (!DRY) await prisma.company.update({ where: { id: company.id }, data: { loyaltySettings: JSON.stringify(ls) } });
  ok(`inactiveDays=90 + loops مفعلة`);

  // 5) تتبع المخزون
  log('\n📊 [5/5] تفعيل تتبع المخزون للمنتجات:');
  const prod = await prisma.product.findMany({ where: { companyId: company.id }, select: { id: true, trackInventory: true } });
  const off = prod.filter((p) => !p.trackInventory);
  if (!DRY && off.length) await prisma.product.updateMany({ where: { companyId: company.id, trackInventory: false }, data: { trackInventory: true } });
  ok(`${prod.length} منتج — تم تفعيل ${off.length} (كانت معطلة)`);

  log('\n✅ انتهت البذرة بنجاح' + (DRY ? ' (تجربة)' : ''));
}

main().catch((e) => { console.error(e); process.exit(1); });