/**
 * 🕐 Retention Cadence Service — الرسائل الدورية الثابتة (Workflow احتفاظ Swan v6/v9)
 * منتج جديد كل 10 أيام / تحديث رصيد كل 15 يوم / إحالة كل 30 يوم / مستوى كل 30 يوم
 * مع Cap 3 رسائل/7 أيام لكل عميل + احترام Opt-out + العملاء المشترين فقط.
 *
 * الإعدادات بتتخزن في Company.loyaltySettings (JSON) تحت مفتاح cadence:
 * {
 *   enabled: true,
 *   throttlePerRun: 300,
 *   types: {
 *     CADENCE_PRODUCT:  { enabled: true, intervalDays: 10, message: '...' },
 *     CADENCE_BALANCE:  { enabled: true, intervalDays: 15, message: '...' },
 *     CADENCE_REFERRAL: { enabled: true, intervalDays: 30, message: '...' },
 *     CADENCE_TIER:     { enabled: true, intervalDays: 30, message: '...' }
 *   }
 * }
 */
const { getSharedPrismaClient } = require('../sharedDatabase');

const CADENCE_DEFAULTS = {
  CADENCE_PRODUCT: {
    label: 'منتج جديد',
    intervalDays: 10,
    message: 'تحديث: تشكيلة جديدة وصلت للموسم — اطّلعوا على القطع الجديدة. Swan'
  },
  CADENCE_BALANCE: {
    label: 'تحديث رصيد',
    intervalDays: 15,
    message: 'تحديث رصيد: نقاطكم الحالية {{points}} وكاش باككم {{balance}} جاهزين للاستخدام. Swan'
  },
  CADENCE_REFERRAL: {
    label: 'تذكير إحالة',
    intervalDays: 30,
    message: 'كارت العضوية {{tierName}} بتاعكم جاهز — شاركوا رابطكم مع صديقاتكم: خصم 10% ليهم وكاش باك ليكم. Swan'
  },
  CADENCE_TIER: {
    label: 'تذكير مستوى',
    intervalDays: 30,
    message: 'تحديث حساب: مستواكم الحالي {{tierName}} — الامتيازات: شحن مجاني + وصول مبكر + نقاط مضاعفة. Swan'
  }
};

const WEEK_CAP = 3;           // أقصى رسائل دورية لكل عميل في 7 أيام
const DEFAULT_THROTTLE = 300; // أقصى رسائل في الجولة الواحدة لكل نوع
const CADENCE_TYPES = Object.keys(CADENCE_DEFAULTS);

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function getRawSettings(prisma, companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { loyaltySettings: true }
  });
  const ls = parseJsonMaybe(company?.loyaltySettings, {});
  return parseJsonMaybe(ls.cadence, {});
}

function normalizeConfig(raw) {
  const config = {
    enabled: raw.enabled === true,
    throttlePerRun: Number(raw.throttlePerRun) > 0 ? Number(raw.throttlePerRun) : DEFAULT_THROTTLE,
    types: {}
  };
  for (const [type, def] of Object.entries(CADENCE_DEFAULTS)) {
    const t = raw.types?.[type] || {};
    config.types[type] = {
      enabled: t.enabled !== false,
      intervalDays: Number(t.intervalDays) > 0 ? Number(t.intervalDays) : def.intervalDays,
      message: (t.message && String(t.message).trim()) || def.message,
      label: def.label
    };
  }
  return config;
}

async function getConfig(companyId) {
  const prisma = getSharedPrismaClient();
  return normalizeConfig(await getRawSettings(prisma, companyId));
}

async function updateConfig(companyId, input = {}) {
  const prisma = getSharedPrismaClient();
  const current = parseJsonMaybe(await getRawSettings(prisma, companyId), {});
  const next = {
    enabled: input.enabled !== undefined ? Boolean(input.enabled) : current.enabled !== false,
    throttlePerRun: input.throttlePerRun !== undefined ? Number(input.throttlePerRun) : (current.throttlePerRun || DEFAULT_THROTTLE),
    types: { ...(current.types || {}) }
  };
  for (const [type, def] of Object.entries(CADENCE_DEFAULTS)) {
    const t = input.types?.[type] || current.types?.[type] || {};
    next.types[type] = {
      enabled: t.enabled !== undefined ? Boolean(t.enabled) : true,
      intervalDays: Number(t.intervalDays) > 0 ? Number(t.intervalDays) : def.intervalDays,
      message: (t.message && String(t.message).trim()) || def.message
    };
  }
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { loyaltySettings: true } });
  const ls = parseJsonMaybe(company?.loyaltySettings, {});
  ls.cadence = next;
  await prisma.company.update({ where: { id: companyId }, data: { loyaltySettings: JSON.stringify(ls) } });
  return normalizeConfig(next);
}

/**
 * لقطات bulk بدل استعلامات متتالية لكل عميل:
 * - lastSent map: (customerId -> آخر createdAt) لنوع معين
 * - weekCount map: (customerId -> عدد رسائل الدورية في آخر 7 أيام)
 */
async function buildCadenceHistory(prisma, companyId, type) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.whatsAppNotificationLog.findMany({
    where: {
      companyId,
      rawEventType: { in: CADENCE_TYPES },
      createdAt: { gte: weekAgo }
    },
    select: { customerId: true, rawEventType: true, createdAt: true }
  });
  const lastSent = new Map();
  const weekCount = new Map();
  for (const log of logs) {
    if (!log.customerId) continue;
    const cnt = (weekCount.get(log.customerId) || 0) + 1;
    weekCount.set(log.customerId, cnt);
    if (log.rawEventType === type) {
      const prev = lastSent.get(log.customerId);
      if (!prev || log.createdAt > prev) lastSent.set(log.customerId, log.createdAt);
    }
  }
  return { lastSent, weekCount };
}

/** متغيرات العميل: نقاط + كاش باك + مستوى — bulk لكل العملاء المعنيين */
async function buildLoyaltyVariables(prisma, companyId, customerIds) {
  const map = new Map();
  if (!customerIds.length) return map;
  const records = await prisma.customerLoyaltyRecord.findMany({
    where: { companyId, customerId: { in: customerIds } },
    select: {
      customerId: true,
      currentPoints: true,
      pendingCashback: true,
      tier: { select: { name: true } }
    }
  });
  for (const r of records) {
    map.set(r.customerId, {
      points: String(Number(r.currentPoints || 0)),
      balance: String(Number(r.pendingCashback || 0)),
      tierName: r.tier?.name || 'العادية'
    });
  }
  return map;
}

/** إرسال الرسائل المستحقة لشركة واحدة */
async function sendDueForCompany(companyId) {
  const prisma = getSharedPrismaClient();
  const config = await getConfig(companyId);
  if (!config.enabled) return { success: true, sent: 0, reason: 'cadence_disabled' };

  // 🛡️ opt-out: مين اللي طلب إيقاف (BotUnsubscribe) — استثناء صريح
  const unsubscribed = new Set(
    (await prisma.botUnsubscribe.findMany({
      where: { companyId, channel: 'WHATSAPP' },
      select: { customerId: true }
    })).map((u) => u.customerId)
  );

  // 🛡️ العملاء المشترين فقط: على الأقل طلب واحد متسلم — مش مجرد "نشط"
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      status: 'ACTIVE',
      phone: { not: null },
      orders: { some: { status: 'DELIVERED' } }
    },
    select: { id: true, phone: true, firstName: true, lastName: true }
  });

  const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
  let totalSent = 0;
  const summary = {};

  for (const [type, meta] of Object.entries(config.types)) {
    if (!meta.enabled) continue;
    const cutoff = new Date(Date.now() - meta.intervalDays * 24 * 60 * 60 * 1000);
    const { lastSent, weekCount } = await buildCadenceHistory(prisma, companyId, type);

    // المستحقون: فترة عدّت + مش unsubscribed + تحت الـ Cap الأسبوعي
    const due = customers.filter((c) => {
      if (unsubscribed.has(c.id)) return false;
      const last = lastSent.get(c.id);
      if (last && last > cutoff) return false;
      return (weekCount.get(c.id) || 0) < WEEK_CAP;
    });

    const batch = due.slice(0, config.throttlePerRun);
    // متغيرات الولاء bulk لكل الدفعة
    const vars = await buildLoyaltyVariables(prisma, companyId, batch.map((c) => c.id));
    let sent = 0;

    for (const customer of batch) {
      try {
        // رسائل الرصيد من غير معنى لو مفيش نقاط ولا كاش باك
        if (type === 'CADENCE_BALANCE') {
          const v = vars.get(customer.id);
          if (!v || (Number(v.points) <= 0 && Number(v.balance) <= 0)) continue;
        }
        const v = vars.get(customer.id) || { points: '0', balance: '0', tierName: 'العادية' };
        const content = meta.message
          .replace(/\{\{points\}\}/g, v.points)
          .replace(/\{\{balance\}\}/g, v.balance)
          .replace(/\{\{tierName\}\}/g, v.tierName)
          .replace(/\{\{customerName\}\}/g, customer.firstName || '');

        const result = await WhatsAppNotificationService.sendNotification({
          companyId,
          deliveryStrategy: 'platform-fallback',
          recipientPhone: customer.phone,
          recipientName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عميلنا العزيز',
          recipientType: 'CUSTOMER',
          category: 'MARKETING',
          eventType: 'PROMOTIONAL',
          rawEventType: type,
          persistedEventType: 'PROMOTIONAL',
          contentOverride: content,
          variables: { customerName: customer.firstName || '', points: v.points, balance: v.balance, tierName: v.tierName },
          customerId: customer.id,
          priority: 3
        });
        if (result?.success) { sent++; totalSent++; }
      } catch (e) {
        console.warn(`[CADENCE] send failed ${companyId}/${type}/${customer.id}:`, e.message);
      }
    }
    summary[type] = { due: due.length, sent };
    console.log(`[CADENCE] ${companyId} ${type}: due=${due.length} sent=${sent}`);
  }
  return { success: true, sent: totalSent, summary };
}

module.exports = { CADENCE_DEFAULTS, getConfig, updateConfig, sendDueForCompany, normalizeConfig };
