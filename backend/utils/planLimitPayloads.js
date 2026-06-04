const planLimitsService = require('../services/planLimitsService');

const LIMIT_EXCEEDED_MESSAGES = {
  users: 'تم تجاوز حد المستخدمين المسموح به في خطتك الحالية',
  customers: 'تم تجاوز حد العملاء المسموح به في خطتك الحالية',
  products: 'تم تجاوز حد المنتجات المسموح به في خطتك الحالية',
  orders: 'تم تجاوز حد الطلبات المسموح به في خطتك الحالية',
  conversations: 'تم تجاوز حد المحادثات المسموح به في خطتك الحالية',
};

async function buildLimitExceededPayload(companyId, type, limitCheck) {
  const usage = await planLimitsService.getCurrentUsage(companyId);
  const plan = usage.plan;

  return {
    success: false,
    message:
      LIMIT_EXCEEDED_MESSAGES[type] ||
      'تم تجاوز الحد المسموح به في خطتك الحالية',
    error: 'LIMIT_EXCEEDED',
    details: {
      current: limitCheck.current,
      limit: limitCheck.limit,
      plan,
    },
    upgradeSuggestions: planLimitsService.getUpgradeSuggestions(plan, [type]),
  };
}

async function ensureWithinPlanLimit(companyId, type, count = 1) {
  const limitCheck = await planLimitsService.checkLimits(companyId, type, count);

  if (limitCheck.allowed) {
    return {
      allowed: true,
      limitCheck,
    };
  }

  return {
    allowed: false,
    limitCheck,
    payload: await buildLimitExceededPayload(companyId, type, limitCheck),
  };
}

function createLimitExceededError(payload) {
  const error = new Error(payload?.message || 'LIMIT_EXCEEDED');
  error.statusCode = 400;
  error.code = 'LIMIT_EXCEEDED';
  error.payload = payload;
  return error;
}

module.exports = {
  buildLimitExceededPayload,
  ensureWithinPlanLimit,
  createLimitExceededError,
};
