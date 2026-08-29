const { getSharedPrismaClient } = require('./sharedDatabase');
const { parseSettingValue } = require('../utils/dentalLabHelpers');

const BILLING_MODES = ['AUTO_ON_RECEIPT', 'AUTO_ON_DELIVERY', 'MANUAL'];

const DEFAULT_BILLING_POLICY = {
  invoiceMode: 'AUTO_ON_DELIVERY',
  requireInvoiceBeforeDelivery: true,
  requireFullPaymentBeforeDelivery: false,
  enforceCreditLimit: false,
};

const sanitizeBillingPolicy = (policy) => {
  const src = policy && typeof policy === 'object' ? policy : {};
  const invoiceMode = BILLING_MODES.includes(src.invoiceMode) ? src.invoiceMode : DEFAULT_BILLING_POLICY.invoiceMode;
  return {
    invoiceMode,
    requireInvoiceBeforeDelivery: src.requireInvoiceBeforeDelivery !== false,
    requireFullPaymentBeforeDelivery: src.requireFullPaymentBeforeDelivery === true,
    enforceCreditLimit: src.enforceCreditLimit === true,
  };
};

/**
 * يقرأ السياسة المالية للمعمل من إعدادات الشركة.
 * الالتزام المالي على الطبيب (العميل)، وفريق العمل (الفنيون) مسؤول عن الإنتاج وليس عن السداد.
 */
const getBillingPolicy = async (prisma, companyId) => {
  const db = prisma || getSharedPrismaClient();
  const rows = await db.dentalSetting.findMany({ where: { companyId } });
  const row = Array.isArray(rows) ? rows.find((r) => r && r.key === 'billingPolicy') : null;
  const value = row ? parseSettingValue(row) : {};
  return sanitizeBillingPolicy(value);
};

/**
 * يتحقق من حد الائتمان للطبيب قبل قبول التزام مالي جديد (عند تفعيل السياسة).
 * يرجع null إذا كان مسموحاً، أو كائن يوضح التجاوز.
 */
const assertCreditLimit = async (prisma, companyId, doctorId, additionalTotal) => {
  if (!doctorId) return null;
  const db = prisma || getSharedPrismaClient();
  const doctor = await db.dentalLabDoctor.findFirst({
    where: { id: doctorId, companyId },
    select: { id: true, creditLimit: true },
  });
  if (!doctor) return null;
  const creditLimit = Number(doctor.creditLimit) || 0;
  if (creditLimit <= 0) return null;

  const agg = await db.dentalInvoice.aggregate({
    where: { companyId, doctorId, status: { not: 'VOID' } },
    _sum: { remaining: true },
  });
  const currentOutstanding = Number(agg._sum.remaining) || 0;
  const after = Math.round((currentOutstanding + (Number(additionalTotal) || 0)) * 100) / 100;
  if (after > creditLimit) {
    return { blocked: true, creditLimit, currentOutstanding, after };
  }
  return null;
};

module.exports = {
  DEFAULT_BILLING_POLICY,
  BILLING_MODES,
  sanitizeBillingPolicy,
  getBillingPolicy,
  assertCreditLimit,
};