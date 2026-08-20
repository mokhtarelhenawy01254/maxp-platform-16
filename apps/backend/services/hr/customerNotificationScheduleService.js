/**
 * 🎁 Customer Notification Schedule Service
 * جدول إشعارات العملاء (الولاء / الكاش باك / الجودة):
 * يحدد لكل حدث هل هو مفعّل، القناة النشطة (Auto/عادي/Meta)،
 * ومتى يُرسل (تأجيل). ويرسل الإشعارات عبر WhatsAppNotificationService.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 تعريف أحداث إشعارات العملاء + القيم الافتراضية للجدول
// ═══════════════════════════════════════════════════════════════════════════════

const CUSTOMER_NOTIFICATION_EVENTS = {
  LOYALTY_POINTS_AWARDED: {
    label: 'كسب نقاط ولاء',
    category: 'MARKETING',
    trigger: 'عند تسليم الطلب',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_TIER_UPGRADED: {
    label: 'الترقية لمستوى أعلى',
    category: 'MARKETING',
    trigger: 'عند ارتفاع مستوى العميل',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_TIER_DOWNGRADED: {
    label: 'انخفاض مستوى العميل',
    category: 'MARKETING',
    trigger: 'عند انخفاض مستوى العميل',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_POINTS_EXPIRY_WARNING: {
    label: 'تنبيه قرب انتهاء النقاط',
    category: 'MARKETING',
    trigger: 'قبل انتهاء صلاحية النقاط',
    defaultDelay: 7,
    defaultDelayUnit: 'DAYS'
  },
  LOYALTY_POINTS_EXPIRED: {
    label: 'انتهاء صلاحية النقاط',
    category: 'MARKETING',
    trigger: 'عند انتهاء صلاحية النقاط (cron يومي)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_POINTS_REDEEMED: {
    label: 'استبدال النقاط',
    category: 'MARKETING',
    trigger: 'عند استبدال النقاط',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CASHBACK_CREDITED: {
    label: 'ايداع كاش باك',
    category: 'MARKETING',
    trigger: 'عند ايداع الكاش باك (تسليم/دفع)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CASHBACK_REVERSED: {
    label: 'خصم/استرداد كاش باك',
    category: 'MARKETING',
    trigger: 'عند خصم الكاش باك (مرتجع/إلغاء)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CUSTOMER_QUALITY_UPGRADED: {
    label: 'ارتفاع تصنيف الجودة',
    category: 'MARKETING',
    trigger: 'عند ارتفاع تصنيف جودة العميل',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CUSTOMER_QUALITY_DOWNGRADED: {
    label: 'انخفاض تصنيف الجودة',
    category: 'MARKETING',
    trigger: 'عند انخفاض تصنيف جودة العميل',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  AUTO_DISCOUNT_COUPON_GRANTED: {
    label: 'منح كوبون الخصم التلقائي',
    category: 'MARKETING',
    trigger: 'عند تسليم الطلب وإصدار كوبون الخصم',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  AUTO_DISCOUNT_COUPON_EXPIRING: {
    label: 'تنبيه قرب انتهاء كوبون الخصم',
    category: 'MARKETING',
    trigger: 'قبل انتهاء صلاحية كوبون الخصم',
    defaultDelay: 1,
    defaultDelayUnit: 'DAYS'
  },
  AUTO_DISCOUNT_CASHBACK_CONVERTED: {
    label: 'تحويل الكوبون المنتهي إلى كاش باك',
    category: 'MARKETING',
    trigger: 'عند انتهاء صلاحية الكوبون وتحويله إلى كاش باك',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  }
};

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ترتيب مستويات الجودة (الأعلى أولاً) — نفس حدود تحليلات الجودة
const QUALITY_ORDER = ['VIP', 'عالي', 'متوسط', 'منخفض'];

/**
 * ⭐ كشف تغيير تصنيف جودة العملاء وإرسال إشعار (ارتفاع/انخفاض)
 * المستوى يُشتق من customer.successScore بنفس حدود تحليلات الجودة
 * (≥80 VIP / ≥60 عالي / ≥40 متوسط / غير كده منخفض).
 * لا يُرسل/يُسجّل "منخفض" إلا للعملاء المتابَعين سابقاً لتجنّب الضوضاء.
 */
async function processQualityChanges(companyId = null) {
  const prisma = getSharedPrismaClient();
  const where = companyId ? { companyId } : {};
  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      companyId: true,
      phone: true,
      firstName: true,
      lastName: true,
      successScore: true,
      lastNotifiedQualityTier: true
    }
  });

  const tierForScore = (score) => {
    if (score >= 80) return 'VIP';
    if (score >= 60) return 'عالي';
    if (score >= 40) return 'متوسط';
    return 'منخفض';
  };

  let totalChanged = 0;
  for (const customer of customers) {
    const score = Number(customer.successScore || 0);
    const tier = tierForScore(score);
    const previous = customer.lastNotifiedQualityTier;

    if (previous === tier) continue;
    if (!previous && tier === 'منخفض') continue; // لا نبعت للعملاء غير المتابَعين

    const isUpgrade = !previous || QUALITY_ORDER.indexOf(tier) < QUALITY_ORDER.indexOf(previous);
    const eventType = isUpgrade ? 'CUSTOMER_QUALITY_UPGRADED' : 'CUSTOMER_QUALITY_DOWNGRADED';

    try {
      const customerObj = {
        id: customer.id,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
      };
      await sendCustomerNotification({
        companyId: customer.companyId,
        eventType,
        customer: customerObj,
        customerId: customer.id,
        variables: {
          qualityTier: tier,
          score: String(score.toFixed(0))
        }
      });

      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastNotifiedQualityTier: tier }
      });

      totalChanged++;
      console.log(`⭐ [QUALITY-NOTIF] ${isUpgrade ? '↑' : '↓'} ${customer.firstName || ''} ${customer.lastName || ''} → ${tier}`);
    } catch (error) {
      console.warn(`⚠️ [QUALITY-NOTIF] Failed for customer ${customer.id}:`, error.message);
    }
  }

  return { success: true, totalChanged };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️ قراءة/كتابة الجدول
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * يضمن وجود صفوف جدول افتراضية لكل أحداث إشعارات العملاء.
 */
async function ensureSchedules(companyId) {
  const prisma = getSharedPrismaClient();
  const rows = [];
  for (const [eventType, meta] of Object.entries(CUSTOMER_NOTIFICATION_EVENTS)) {
    const row = await prisma.customerNotificationSchedule.upsert({
      where: {
        companyId_eventType: { companyId, eventType }
      },
      update: {},
      create: {
        companyId,
        eventType,
        enabled: true,
        activeChannel: 'AUTO',
        delayValue: meta.defaultDelay,
        delayUnit: meta.defaultDelayUnit
      }
    });
    rows.push(row);
  }
  return rows;
}

/**
 * جلب الجدول + بيانات الحدث + القوالب المرتبطة بكل حدث.
 */
async function getSchedules(companyId) {
  const prisma = getSharedPrismaClient();
  await ensureSchedules(companyId);

  const [schedules, templates] = await Promise.all([
    prisma.customerNotificationSchedule.findMany({
      where: { companyId },
      orderBy: { eventType: 'asc' }
    }),
    prisma.whatsAppNotificationTemplate.findMany({
      where: {
        companyId,
        eventType: { in: Object.keys(CUSTOMER_NOTIFICATION_EVENTS) },
        isActive: true
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    })
  ]);

  const templatesByEvent = {};
  for (const tpl of templates) {
    if (!templatesByEvent[tpl.eventType]) templatesByEvent[tpl.eventType] = [];
    templatesByEvent[tpl.eventType].push({
      id: tpl.id,
      name: tpl.name,
      content: tpl.content,
      channel: tpl.channel || 'AUTO',
      isActive: tpl.isActive,
      metaTemplateName: tpl.metaTemplateName,
      metaTemplateId: tpl.metaTemplateId,
      metaTemplateStatus: tpl.metaTemplateStatus
    });
  }

  return schedules.map((row) => {
    const meta = CUSTOMER_NOTIFICATION_EVENTS[row.eventType] || {
      label: row.eventType,
      category: 'MARKETING',
      trigger: '',
      defaultDelay: 0,
      defaultDelayUnit: 'HOURS'
    };
    return {
      ...row,
      label: meta.label,
      category: meta.category,
      trigger: meta.trigger,
      delayValue: row.delayValue,
      delayUnit: row.delayUnit,
      templates: templatesByEvent[row.eventType] || []
    };
  });
}

/**
 * تحديث صف من الجدول (تفعيل / قناة / تأجيل).
 */
async function updateSchedule(companyId, eventType, data) {
  const prisma = getSharedPrismaClient();
  if (!CUSTOMER_NOTIFICATION_EVENTS[eventType]) {
    throw new Error('حدث إشعار غير معروف');
  }

  const payload = {};
  if (data.enabled !== undefined) payload.enabled = Boolean(data.enabled);
  if (data.activeChannel !== undefined) {
    const channel = String(data.activeChannel).toUpperCase();
    if (!['AUTO', 'BAILEYS', 'META_CLOUD'].includes(channel)) {
      throw new Error('قناة غير صالحة');
    }
    payload.activeChannel = channel;
  }
  if (data.delayValue !== undefined) {
    const value = Number(data.delayValue);
    payload.delayValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }
  if (data.delayUnit !== undefined) {
    const unit = String(data.delayUnit).toUpperCase();
    payload.delayUnit = ['HOURS', 'DAYS'].includes(unit) ? unit : 'HOURS';
  }

  await ensureSchedules(companyId);

  return prisma.customerNotificationSchedule.update({
    where: {
      companyId_eventType: { companyId, eventType }
    },
    data: payload
  });
}

/**
 * جلب صف الجدول الفعّال لحدث ما (مع ضمان وجوده).
 */
async function getEffectiveSchedule(companyId, eventType) {
  const prisma = getSharedPrismaClient();
  await ensureSchedules(companyId);
  return prisma.customerNotificationSchedule.findUnique({
    where: {
      companyId_eventType: { companyId, eventType }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 إرسال إشعار عميل حسب الجدول
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * يحل القالب الصحيح حسب القناة النشطة في الجدول ثم يرسل.
 */
async function resolveTemplate(companyId, eventType, activeChannel) {
  const prisma = getSharedPrismaClient();
  const templates = await prisma.whatsAppNotificationTemplate.findMany({
    where: { companyId, eventType, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });

  const metaTpl = templates.find((t) => (t.channel || 'AUTO').toUpperCase() === 'META_CLOUD');
  const normalTpl =
    templates.find((t) => (t.channel || 'AUTO').toUpperCase() === 'BAILEYS') ||
    templates.find((t) => (t.channel || 'AUTO').toUpperCase() === 'AUTO') ||
    templates[0];

  if (activeChannel === 'META_CLOUD') {
    const metaReady = metaTpl && metaTpl.metaTemplateName && String(metaTpl.metaTemplateStatus || '').toUpperCase() === 'APPROVED';
    return metaReady ? metaTpl : null;
  }
  if (activeChannel === 'BAILEYS') {
    return normalTpl || null;
  }
  // AUTO: يفضّل ميتا لو معتمدة، وإلا القالب العادي
  const metaReady = metaTpl && metaTpl.metaTemplateName && String(metaTpl.metaTemplateStatus || '').toUpperCase() === 'APPROVED';
  return metaReady ? metaTpl : (normalTpl || null);
}

/**
 * إرسال إشعار عميل (ولاء / كاش باك / جودة) عبر جدول الإشعارات.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.eventType — من CUSTOMER_NOTIFICATION_EVENTS
 * @param {Object} [params.customer] — {id, phone, firstName, lastName, name}
 * @param {Object} [params.variables] — متغيرات القالب
 * @param {string} [params.orderId]
 * @param {string} [params.customerId]
 */
async function sendCustomerNotification({ companyId, eventType, customer, variables = {}, orderId = null, customerId = null }) {
  if (!companyId || !eventType) return { success: false, reason: 'missing_args' };
  if (!CUSTOMER_NOTIFICATION_EVENTS[eventType]) return { success: false, reason: 'unknown_event' };

  try {
    const schedule = await getEffectiveSchedule(companyId, eventType);
    if (!schedule || schedule.enabled === false) {
      return { success: false, reason: 'schedule_disabled' };
    }

    const phone = customer?.phone || variables.phone;
    if (!phone) return { success: false, reason: 'no_phone' };

    const activeChannel = (schedule.activeChannel || 'AUTO').toUpperCase();
    const template = await resolveTemplate(companyId, eventType, activeChannel);

    // لو مفيش قالب في DB نستخدم القالب الافتراضي (عبر sendNotification)
    if (!template && activeChannel === 'META_CLOUD') {
      return { success: false, reason: 'meta_template_not_ready' };
    }

    const recipientName =
      customer?.name ||
      `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
      variables.customerName ||
      'عميلنا العزيز';

    const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
    const options = {
      companyId,
      recipientPhone: phone,
      recipientName,
      recipientType: 'CUSTOMER',
      category: CUSTOMER_NOTIFICATION_EVENTS[eventType].category,
      eventType,
      variables: { customerName: recipientName, ...variables },
      orderId,
      customerId: customerId || customer?.id || null,
      priority: 3,
      channel: activeChannel === 'AUTO' ? null : activeChannel
    };
    if (template) options.preferredTemplateId = template.id;

    return WhatsAppNotificationService.sendNotification(options);
  } catch (error) {
    console.error(`❌ [CUSTOMER-NOTIF] Failed to send ${eventType}:`, error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

module.exports = {
  CUSTOMER_NOTIFICATION_EVENTS,
  ensureSchedules,
  getSchedules,
  updateSchedule,
  getEffectiveSchedule,
  resolveTemplate,
  sendCustomerNotification,
  processQualityChanges
};
