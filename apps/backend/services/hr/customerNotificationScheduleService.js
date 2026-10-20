/**
 * ≡ƒÄü Customer Notification Schedule Service
 * ╪¼╪»┘ê┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í (╪º┘ä┘ê┘ä╪º╪í / ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â / ╪º┘ä╪¼┘ê╪»╪⌐):
 * ┘è╪¡╪»╪» ┘ä┘â┘ä ╪¡╪»╪½ ┘ç┘ä ┘ç┘ê ┘à┘ü╪╣┘æ┘ä╪î ╪º┘ä┘é┘å╪º╪⌐ ╪º┘ä┘å╪┤╪╖╪⌐ (Auto/╪╣╪º╪»┘è/Meta)╪î
 * ┘ê┘à╪¬┘ë ┘è┘Å╪▒╪│┘ä (╪¬╪ú╪¼┘è┘ä). ┘ê┘è╪▒╪│┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪╣╪¿╪▒ WhatsAppNotificationService.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒôï ╪¬╪╣╪▒┘è┘ü ╪ú╪¡╪»╪º╪½ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í + ╪º┘ä┘é┘è┘à ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä┘ä╪¼╪»┘ê┘ä
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

const CUSTOMER_NOTIFICATION_EVENTS = {
  LOYALTY_POINTS_AWARDED: {
    label: '┘â╪│╪¿ ┘å┘é╪º╪╖ ┘ê┘ä╪º╪í',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪¬╪│┘ä┘è┘à ╪º┘ä╪╖┘ä╪¿',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_TIER_UPGRADED: {
    label: '╪º┘ä╪¬╪▒┘é┘è╪⌐ ┘ä┘à╪│╪¬┘ê┘ë ╪ú╪╣┘ä┘ë',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º╪▒╪¬┘ü╪º╪╣ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_TIER_DOWNGRADED: {
    label: '╪º┘å╪«┘ü╪º╪╢ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º┘å╪«┘ü╪º╪╢ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_POINTS_EXPIRY_WARNING: {
    label: '╪¬┘å╪¿┘è┘ç ┘é╪▒╪¿ ╪º┘å╪¬┘ç╪º╪í ╪º┘ä┘å┘é╪º╪╖',
    category: 'MARKETING',
    trigger: '┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖',
    defaultDelay: 7,
    defaultDelayUnit: 'DAYS'
  },
  LOYALTY_POINTS_EXPIRED: {
    label: '╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖ (cron ┘è┘ê┘à┘è)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  LOYALTY_POINTS_REDEEMED: {
    label: '╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘å┘é╪º╪╖',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘å┘é╪º╪╖',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CASHBACK_CREDITED: {
    label: '╪º┘è╪»╪º╪╣ ┘â╪º╪┤ ╪¿╪º┘â',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º┘è╪»╪º╪╣ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â (╪¬╪│┘ä┘è┘à/╪»┘ü╪╣)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CASHBACK_REVERSED: {
    label: '╪«╪╡┘à/╪º╪│╪¬╪▒╪»╪º╪» ┘â╪º╪┤ ╪¿╪º┘â',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪«╪╡┘à ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â (┘à╪▒╪¬╪¼╪╣/╪Ñ┘ä╪║╪º╪í)',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CUSTOMER_QUALITY_UPGRADED: {
    label: '╪º╪▒╪¬┘ü╪º╪╣ ╪¬╪╡┘å┘è┘ü ╪º┘ä╪¼┘ê╪»╪⌐',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º╪▒╪¬┘ü╪º╪╣ ╪¬╪╡┘å┘è┘ü ╪¼┘ê╪»╪⌐ ╪º┘ä╪╣┘à┘è┘ä',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  CUSTOMER_QUALITY_DOWNGRADED: {
    label: '╪º┘å╪«┘ü╪º╪╢ ╪¬╪╡┘å┘è┘ü ╪º┘ä╪¼┘ê╪»╪⌐',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º┘å╪«┘ü╪º╪╢ ╪¬╪╡┘å┘è┘ü ╪¼┘ê╪»╪⌐ ╪º┘ä╪╣┘à┘è┘ä',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  AUTO_DISCOUNT_COUPON_GRANTED: {
    label: '┘à┘å╪¡ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪¬╪│┘ä┘è┘à ╪º┘ä╪╖┘ä╪¿ ┘ê╪Ñ╪╡╪»╪º╪▒ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à',
    defaultDelay: 0,
    defaultDelayUnit: 'HOURS'
  },
  AUTO_DISCOUNT_COUPON_EXPIRING: {
    label: '╪¬┘å╪¿┘è┘ç ┘é╪▒╪¿ ╪º┘å╪¬┘ç╪º╪í ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à',
    category: 'MARKETING',
    trigger: '┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à',
    defaultDelay: 1,
    defaultDelayUnit: 'DAYS'
  },
  AUTO_DISCOUNT_CASHBACK_CONVERTED: {
    label: '╪¬╪¡┘ê┘è┘ä ╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘à┘å╪¬┘ç┘è ╪Ñ┘ä┘ë ┘â╪º╪┤ ╪¿╪º┘â',
    category: 'MARKETING',
    trigger: '╪╣┘å╪» ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘â┘ê╪¿┘ê┘å ┘ê╪¬╪¡┘ê┘è┘ä┘ç ╪Ñ┘ä┘ë ┘â╪º╪┤ ╪¿╪º┘â',
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

// ╪¬╪▒╪¬┘è╪¿ ┘à╪│╪¬┘ê┘è╪º╪¬ ╪º┘ä╪¼┘ê╪»╪⌐ (╪º┘ä╪ú╪╣┘ä┘ë ╪ú┘ê┘ä╪º┘ï) ΓÇö ┘å┘ü╪│ ╪¡╪»┘ê╪» ╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪º┘ä╪¼┘ê╪»╪⌐
const QUALITY_ORDER = ['VIP', '╪╣╪º┘ä┘è', '┘à╪¬┘ê╪│╪╖', '┘à┘å╪«┘ü╪╢'];

/**
 * Γ¡É ┘â╪┤┘ü ╪¬╪║┘è┘è╪▒ ╪¬╪╡┘å┘è┘ü ╪¼┘ê╪»╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í ┘ê╪Ñ╪▒╪│╪º┘ä ╪Ñ╪┤╪╣╪º╪▒ (╪º╪▒╪¬┘ü╪º╪╣/╪º┘å╪«┘ü╪º╪╢)
 * ╪º┘ä┘à╪│╪¬┘ê┘ë ┘è┘Å╪┤╪¬┘é ┘à┘å customer.successScore ╪¿┘å┘ü╪│ ╪¡╪»┘ê╪» ╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪º┘ä╪¼┘ê╪»╪⌐
 * (ΓëÑ80 VIP / ΓëÑ60 ╪╣╪º┘ä┘è / ΓëÑ40 ┘à╪¬┘ê╪│╪╖ / ╪║┘è╪▒ ┘â╪»┘ç ┘à┘å╪«┘ü╪╢).
 * ┘ä╪º ┘è┘Å╪▒╪│┘ä/┘è┘Å╪│╪¼┘æ┘ä "┘à┘å╪«┘ü╪╢" ╪Ñ┘ä╪º ┘ä┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘à╪¬╪º╪¿┘Ä╪╣┘è┘å ╪│╪º╪¿┘é╪º┘ï ┘ä╪¬╪¼┘å┘æ╪¿ ╪º┘ä╪╢┘ê╪╢╪º╪í.
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
    if (score >= 60) return '╪╣╪º┘ä┘è';
    if (score >= 40) return '┘à╪¬┘ê╪│╪╖';
    return '┘à┘å╪«┘ü╪╢';
  };

  let totalChanged = 0;
  for (const customer of customers) {
    const score = Number(customer.successScore || 0);
    const tier = tierForScore(score);
    const previous = customer.lastNotifiedQualityTier;

    if (previous === tier) continue;
    if (!previous && tier === '┘à┘å╪«┘ü╪╢') continue; // ┘ä╪º ┘å╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘ä╪º╪í ╪║┘è╪▒ ╪º┘ä┘à╪¬╪º╪¿┘Ä╪╣┘è┘å

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
      console.log(`Γ¡É [QUALITY-NOTIF] ${isUpgrade ? 'Γåæ' : 'Γåô'} ${customer.firstName || ''} ${customer.lastName || ''} ΓåÆ ${tier}`);
    } catch (error) {
      console.warn(`ΓÜá∩╕Å [QUALITY-NOTIF] Failed for customer ${customer.id}:`, error.message);
    }
  }

  return { success: true, totalChanged };
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒùä∩╕Å ┘é╪▒╪º╪í╪⌐/┘â╪¬╪º╪¿╪⌐ ╪º┘ä╪¼╪»┘ê┘ä
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * ┘è╪╢┘à┘å ┘ê╪¼┘ê╪» ╪╡┘ü┘ê┘ü ╪¼╪»┘ê┘ä ╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä┘â┘ä ╪ú╪¡╪»╪º╪½ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í.
 */
async function ensureSchedules(companyId) {
  const prisma = getSharedPrismaClient();
  // قراءة واحدة + createMany للناقص فقط — بدل 13 upsert متتالي على كل طلب
  // (كانت بتشتغل على كل GET للجدول وكل PUT لصف واحد)
  const existing = await prisma.customerNotificationSchedule.findMany({
    where: { companyId },
    select: { eventType: true }
  });
  const have = new Set(existing.map((r) => r.eventType));
  const missing = Object.entries(CUSTOMER_NOTIFICATION_EVENTS)
    .filter(([eventType]) => !have.has(eventType))
    .map(([eventType, meta]) => ({
      companyId,
      eventType,
      enabled: true,
      activeChannel: 'AUTO',
      delayValue: meta.defaultDelay,
      delayUnit: meta.defaultDelayUnit
    }));
  if (missing.length > 0) {
    // skipDuplicates يحمي من سباق طلبين متوازيين بيكتبوا نفس الصفوف (unique: companyId_eventType)
    await prisma.customerNotificationSchedule.createMany({
      data: missing,
      skipDuplicates: true
    });
  }
}

/**
 * ╪¼┘ä╪¿ ╪º┘ä╪¼╪»┘ê┘ä + ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪¡╪»╪½ + ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘â┘ä ╪¡╪»╪½.
 */
async function getSchedules(companyId) {
  const prisma = getSharedPrismaClient();
  await ensureSchedules(companyId);

  // القوالب المدمجة اتشالت: الفرونت بيجيبها أصلاً من /whatsapp-notifications/templates
  // (محتاج OCCASION/PRODUCTS اللي مش ضمن أحداث الجدول) — فكانت query وpayload زيادة بلا قارئ
  const schedules = await prisma.customerNotificationSchedule.findMany({
    where: { companyId },
    orderBy: { eventType: 'asc' }
  });

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
      delayUnit: row.delayUnit
    };
  });
}

/**
 * ╪¬╪¡╪»┘è╪½ ╪╡┘ü ┘à┘å ╪º┘ä╪¼╪»┘ê┘ä (╪¬┘ü╪╣┘è┘ä / ┘é┘å╪º╪⌐ / ╪¬╪ú╪¼┘è┘ä).
 */
async function updateSchedule(companyId, eventType, data) {
  const prisma = getSharedPrismaClient();
  if (!CUSTOMER_NOTIFICATION_EVENTS[eventType]) {
    throw new Error('╪¡╪»╪½ ╪Ñ╪┤╪╣╪º╪▒ ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü');
  }

  const payload = {};
  if (data.enabled !== undefined) payload.enabled = Boolean(data.enabled);
  if (data.activeChannel !== undefined) {
    const channel = String(data.activeChannel).toUpperCase();
    if (!['AUTO', 'BAILEYS', 'META_CLOUD'].includes(channel)) {
      throw new Error('┘é┘å╪º╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐');
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
 * ╪¼┘ä╪¿ ╪╡┘ü ╪º┘ä╪¼╪»┘ê┘ä ╪º┘ä┘ü╪╣┘æ╪º┘ä ┘ä╪¡╪»╪½ ┘à╪º (┘à╪╣ ╪╢┘à╪º┘å ┘ê╪¼┘ê╪»┘ç).
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

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒôñ ╪Ñ╪▒╪│╪º┘ä ╪Ñ╪┤╪╣╪º╪▒ ╪╣┘à┘è┘ä ╪¡╪│╪¿ ╪º┘ä╪¼╪»┘ê┘ä
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * ┘è╪¡┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╡╪¡┘è╪¡ ╪¡╪│╪¿ ╪º┘ä┘é┘å╪º╪⌐ ╪º┘ä┘å╪┤╪╖╪⌐ ┘ü┘è ╪º┘ä╪¼╪»┘ê┘ä ╪½┘à ┘è╪▒╪│┘ä.
 */
async function resolveTemplate(companyId, eventType, activeChannel) {
  const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
  if (typeof WhatsAppNotificationService.findCanonicalNotificationTemplate === 'function') {
    return WhatsAppNotificationService.findCanonicalNotificationTemplate(
      companyId,
      eventType,
      activeChannel,
      getSharedPrismaClient(),
      { channel: activeChannel }
    );
  }
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
  // AUTO: ┘è┘ü╪╢┘æ┘ä ┘à┘è╪¬╪º ┘ä┘ê ┘à╪╣╪¬┘à╪»╪⌐╪î ┘ê╪Ñ┘ä╪º ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è
  const metaReady = metaTpl && metaTpl.metaTemplateName && String(metaTpl.metaTemplateStatus || '').toUpperCase() === 'APPROVED';
  return metaReady ? metaTpl : (normalTpl || null);
}

/**
 * ╪Ñ╪▒╪│╪º┘ä ╪Ñ╪┤╪╣╪º╪▒ ╪╣┘à┘è┘ä (┘ê┘ä╪º╪í / ┘â╪º╪┤ ╪¿╪º┘â / ╪¼┘ê╪»╪⌐) ╪╣╪¿╪▒ ╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.eventType ΓÇö ┘à┘å CUSTOMER_NOTIFICATION_EVENTS
 * @param {Object} [params.customer] ΓÇö {id, phone, firstName, lastName, name}
 * @param {Object} [params.variables] ΓÇö ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿
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

    // ┘ä┘ê ┘à┘ü┘è╪┤ ┘é╪º┘ä╪¿ ┘ü┘è DB ┘å╪│╪¬╪«╪»┘à ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è (╪╣╪¿╪▒ sendNotification)
    if (false) {
      // 🚨 PRODUCTION-FIX: Do not drop silently without log; proceed to sendNotification to log failure cleanly
    }

    const recipientName =
      customer?.name ||
      `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
      variables.customerName ||
      '╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓';

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
      channel: activeChannel === 'AUTO' ? null : activeChannel,
      // 🚨 PRODUCTION-FIX (platform-fallback-2026-08-24): كل إشعارات العملاء
      // (خصم تلقائي/كاش باك/ولاء/تقسيم) ممكن تتعمل من شركة فرعية مفيش ليها جلسة
      // Meta — نستخدم platform-fallback عشان نبعت من الشركة الأم (اللي عندها
      // META_CLOUD متصل، زي Swan).
      deliveryStrategy: 'platform-fallback'
    };
    if (template) options.preferredTemplateId = template.id;

    return WhatsAppNotificationService.sendNotification(options);
  } catch (error) {
    console.error(`Γ¥î [CUSTOMER-NOTIF] Failed to send ${eventType}:`, error.message);
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
