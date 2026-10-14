const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const { processPendingUsageCharges } = require('./pendingBillingService');

const TRIAL_APP_STATUSES = ['TRIAL', 'ACTIVE'];

/**
 * هل الشركة حالياً داخل فترة تجربة مجانية فعّالة (تفعيل تجريبي)؟
 */
async function isCompanyTrialActive(prisma, companyId) {
  if (!companyId) return false;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { trialModeEnabled: true, trialEndsAt: true },
  });
  return Boolean(company?.trialModeEnabled && company?.trialEndsAt && new Date(company.trialEndsAt) > new Date());
}

/**
 * تنفيذ انتهاء الفترة التجريبية لشركة (تفعيل تجريبي):
 * 1) إيقاف وضع التجربة (trialModeEnabled = false).
 * 2) تجميد كل التطبيقات التي اُثبّتت أثناء التجربة (status → EXPIRED) بحيث يغلق
 *    الوصول إليها فوراً عبر checkAppAccess.
 * 3) فوترة «حسب الاستهلاك»: تحصيل مجموع appUsageLog.totalCost الذي تحقق أثناء
 *    التجربة كفاتورة مؤجلة (billingHistory APP_USAGE PENDING) — بدون سحب إجباري،
 *    وتُحصّل تلقائياً عند شحن المحفظة عبر processPendingUsageCharges.
 * @param {string} companyId
 * @returns {Promise<{frozen:number,billed:number,totalConsumption:number}>}
 */
async function expireCompanyTrial(companyId) {
  const prisma = getSharedPrismaClient();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { trialModeEnabled: true, trialStartedAt: true, trialEndsAt: true },
  });

  if (!company) {
    return { frozen: 0, billed: 0, totalConsumption: 0 };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { trialModeEnabled: false },
  });

  const trialApps = await prisma.companyApp.findMany({
    where: {
      companyId,
      installedInTrial: true,
      status: { in: TRIAL_APP_STATUSES },
    },
    select: {
      id: true,
      appId: true,
      activePricingModel: true,
      validUntil: true,
      app: { select: { name: true, pricingModel: true } }
    },
  });

  if (trialApps.length === 0) {
    return { frozen: 0, billed: 0, totalConsumption: 0 };
  }

  const companyAppIds = trialApps.map((entry) => entry.id);

  const windowStart = company.trialStartedAt || new Date(0);
  const windowEnd = company.trialEndsAt && new Date(company.trialEndsAt) > new Date()
    ? new Date()
    : company.trialEndsAt || new Date();

  const consumption = await prisma.appUsageLog.aggregate({
    where: {
      companyAppId: { in: companyAppIds },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    _sum: { totalCost: true },
  });

  const totalConsumption = Number(consumption._sum?.totalCost || 0);

  // 🛡️ تجميد التطبيقات غير المشتركة فقط:
  // - التطبيقات ذات الاشتراك المدفوع المستقبلي (validUntil > now) تظل ACTIVE مع مسح علامة التجربة
  // - التطبيقات بنظام الدفع بالاستهلاك (PAY_PER_USE) تظل ACTIVE لمواصلة الخصم بالطلب مع مسح علامة التجربة
  // - التطبيقات الأخرى بدون اشتراك مدفوع تتحول إلى EXPIRED
  const now = new Date();
  const toExpireIds = [];
  const toKeepActiveIds = [];

  for (const ca of trialApps) {
    const isPpu = ca.activePricingModel === 'PAY_PER_USE' || ca.app?.pricingModel === 'PAY_PER_USE';
    const hasValidSubscription = Boolean(ca.validUntil && new Date(ca.validUntil) > now);

    if (hasValidSubscription || isPpu) {
      toKeepActiveIds.push(ca.id);
    } else {
      toExpireIds.push(ca.id);
    }
  }

  await executeWithRetry(async () => {
    if (toExpireIds.length > 0) {
      await prisma.companyApp.updateMany({
        where: { id: { in: toExpireIds } },
        data: { status: 'EXPIRED', installedInTrial: false },
      });
    }
    if (toKeepActiveIds.length > 0) {
      await prisma.companyApp.updateMany({
        where: { id: { in: toKeepActiveIds } },
        data: { status: 'ACTIVE', installedInTrial: false, trialEndsAt: null },
      });
    }
  });

  let billed = 0;

  if (totalConsumption > 0) {
    const appNames = trialApps.map((entry) => entry.app?.name).filter(Boolean).join('، ');
    const charge = await executeWithRetry(async () => {
      return await prisma.billingHistory.create({
        data: {
          companyId,
          type: 'APP_USAGE',
          amount: totalConsumption,
          status: 'PENDING',
          description: `تحصيل استخدام الفترة التجريبية (${appNames || 'أدوات'})`,
          referenceId: `TRIAL_EXPIRY_${companyId}`,
        },
      });
    });
    billed = 1;

    // محاولة التحصيل الفوري إن كان الرصيد يكفي؛ إن لم يكفِ تبقى PENDING وتُحصَّل عند الشحن
    try {
      await processPendingUsageCharges(companyId);
    } catch (collectError) {
      console.warn(`[TRIAL-EXPIRY] Collection deferred for company ${companyId}: ${collectError.message}`);
    }
  }

  console.warn(`⏸️ [TRIAL-EXPIRY] Company ${companyId}: frozen ${toExpireIds.length} app(s), kept active ${toKeepActiveIds.length} app(s), consumption ${totalConsumption}, billed ${billed}`);

  return { frozen: toExpireIds.length, billed, totalConsumption };
}

module.exports = { expireCompanyTrial, isCompanyTrialActive };
