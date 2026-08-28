/**
 * 🕐 Retention Cadence Service — الرسائل الدورية الثابتة (Workflow احتفاظ Swan v6/v9)
 * منتج جديد كل 10 أيام / تحديث رصيد كل 15 يوم / إحالة كل 30 يوم / مستوى كل 30 يوم
 * مع Cap 3 رسائل/7 أيام لكل عميل.
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

const WEEK_CAP = 3;          // أقصى رسائل دورية لكل عميل في 7 أيام
const DEFAULT_THROTTLE = 300; // أقصى رسائل في الجولة الواحدة لكل نوع

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

/** آخر إرسال لعميل لنوع معين (من سجل الإشعارات) */
async function lastSentAt(prisma, companyId, customerId, type) {
  const log = await prisma.whatsAppNotificationLog.findFirst({
    where: {
      companyId,
      customerId,
      OR: [{ rawEventType: type }, { eventType: type }]
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });
  return log?.createdAt || null;
}

/** عدد الرسائل الدورية المرسلة للعميل في آخر 7 أيام */
async function weeklyCadenceCount(prisma, companyId, customerId) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.whatsAppNotificationLog.findMany({
    where: {
      companyId,
      customerId,
      createdAt: { gte: weekAgo },
      OR: Object.keys(CADENCE_DEFAULTS).map((t) => ({ rawEventType: t }))
    },
    select: { id: true }
  });
  return logs.length;
}

/** متغيرات العميل: نقاط + كاش باك + مستوى */
async function customerVariables(prisma, companyId, customerId) {
  const record = await prisma.customerLoyaltyRecord.findFirst({
    where: { companyId, customerId },
    select: {
      currentPoints: true,
      pendingCashback: true,
      tier: { select: { name: true } }
    }
  });
  return {
    points: record ? String(Number(record.currentPoints || 0)) : '0',
    balance: record ? String(Number(record.pendingCashback || 0)) : '0',
    tierName: record?.tier?.name || 'العادية'
  };
}

/** إرسال الرسائل المستحقة لشركة واحدة */
async function sendDueForCompany(companyId) {
  const prisma = getSharedPrismaClient();
  const config = await getConfig(companyId);
  if (!config.enabled) return { success: true, sent: 0, reason: 'cadence_disabled' };

  const customers = await prisma.customer.findMany({
    where: { companyId, status: 'ACTIVE', phone: { not: null } },
    select: { id: true, phone: true, firstName: true, lastName: true }
  });

  let totalSent = 0;
  for (const [type, meta] of Object.entries(config.types)) {
    if (!meta.enabled) continue;
    const cutoff = new Date(Date.now() - meta.intervalDays * 24 * 60 * 60 * 1000);
    let batchSent = 0;

    for (const customer of customers) {
      if (batchSent >= config.throttlePerRun) {
        console.log(`[CADENCE] ${companyId} ${type} reached throttle (${config.throttlePerRun})`);
        break;
      }
      try {
        const last = await lastSentAt(prisma, companyId, customer.id, type);
        if (last && last > cutoff) continue;
        const weekCount = await weeklyCadenceCount(prisma, companyId, customer.id);
        if (weekCount >= WEEK_CAP) continue;

        const vars = await customerVariables(prisma, companyId, customer.id);
        const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
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
          contentOverride: meta.message,
          variables: { customerName: customer.firstName || '', points: vars.points, balance: vars.balance, tierName: vars.tierName },
          customerId: customer.id,
          priority: 3
        });
        if (result?.success) { batchSent++; totalSent++; }
      } catch (e) {
        console.warn(`[CADENCE] send failed ${companyId}/${type}/${customer.id}:`, e.message);
      }
    }
    console.log(`[CADENCE] ${companyId} ${type}: sent ${batchSent}`);
  }
  return { success: true, sent: totalSent };
}

module.exports = { CADENCE_DEFAULTS, getConfig, updateConfig, sendDueForCompany, normalizeConfig };