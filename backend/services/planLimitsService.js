const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const {
  applyServiceLimitBonuses,
} = require('./platformSignupCouponService');

const OPTIONAL_COMPANY_LIMIT_BONUS_FIELDS = Object.freeze([
  'signupBonusUsers',
  'signupBonusCustomers',
  'signupBonusProducts',
  'signupBonusOrdersPerMonth',
]);

const COMPANY_LIMITS_BASE_SELECT = Object.freeze({
  id: true,
  plan: true,
});

const COMPANY_LIMITS_OPTIONAL_SELECT = Object.freeze({
  ...COMPANY_LIMITS_BASE_SELECT,
  signupBonusUsers: true,
  signupBonusCustomers: true,
  signupBonusProducts: true,
  signupBonusOrdersPerMonth: true,
});

const EMPTY_COMPANY_LIMIT_BONUSES = Object.freeze({
  signupBonusUsers: 0,
  signupBonusCustomers: 0,
  signupBonusProducts: 0,
  signupBonusOrdersPerMonth: 0,
});

const withCompanyLimitBonusDefaults = (company) =>
  company ? { ...EMPTY_COMPANY_LIMIT_BONUSES, ...company } : company;

const isMissingOptionalCompanyLimitColumnError = (error) => {
  const message = String(error?.message || '');
  return OPTIONAL_COMPANY_LIMIT_BONUS_FIELDS.some((field) =>
    message.includes(field),
  );
};

const findCompanyWithOptionalLimitBonuses = async (prisma, companyId) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_LIMITS_OPTIONAL_SELECT,
    });

    return withCompanyLimitBonusDefaults(company);
  } catch (error) {
    if (!isMissingOptionalCompanyLimitColumnError(error)) {
      throw error;
    }

    console.warn(
      '[planLimitsService] Falling back to base company fields because signup bonus columns are missing:',
      error.message,
    );

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_LIMITS_BASE_SELECT,
    });

    return withCompanyLimitBonusDefaults(company);
  }
};

/**
 * Plan Limits Service
 * 
 * Manages and enforces plan limits for companies
 */

class PlanLimitsService {
  constructor() {
    // Define plan limits
    this.planLimits = {
      BASIC: {
        users: 5,
        customers: 1000,
        products: 100,
        orders: 500,
        conversations: 5000,
        storage: 1024, // MB
        features: ['basic_support', 'basic_analytics']
      },
      PRO: {
        users: 25,
        customers: 10000,
        products: 500,
        orders: 2000,
        conversations: 25000,
        storage: 5120, // MB
        features: ['priority_support', 'advanced_analytics', 'custom_branding']
      },
      ENTERPRISE: {
        users: -1, // unlimited
        customers: -1, // unlimited
        products: -1, // unlimited
        orders: -1, // unlimited
        conversations: -1, // unlimited
        storage: -1, // unlimited
        features: ['dedicated_support', 'advanced_analytics', 'custom_branding', 'api_access', 'white_label']
      }
    };
  }

  /**
   * Get plan limits for a company
   */
  getPlanLimits(plan) {
    return this.planLimits[plan] || this.planLimits.BASIC;
  }

  async getEffectiveLimits(companyId) {
    const prisma = getSharedPrismaClient();
    const company = await findCompanyWithOptionalLimitBonuses(prisma, companyId);

    if (!company) {
      throw new Error('Company not found');
    }

    const baseLimits = this.getPlanLimits(company.plan);
    const planLimit = await prisma.planLimit.findUnique({
      where: { plan: company.plan },
      select: {
        maxEmployees: true,
        maxProducts: true,
        maxOrdersPerMonth: true,
      },
    });

    return applyServiceLimitBonuses(
      {
        ...baseLimits,
        users: planLimit?.maxEmployees ?? baseLimits.users,
        products: planLimit?.maxProducts ?? baseLimits.products,
        orders: planLimit?.maxOrdersPerMonth ?? baseLimits.orders,
      },
      company,
    );
  }

  async getCompanyWithBonuses(companyId) {
    return findCompanyWithOptionalLimitBonuses(
      getSharedPrismaClient(),
      companyId,
    );
  }

  /**
   * Get current usage for a company
   */
  async getCurrentUsage(companyId) {
    try {
      // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
      const prisma = getSharedPrismaClient();
      const company = await this.getCompanyWithBonuses(companyId);

      if (!company) {
        throw new Error('Company not found');
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [users, customers, products, orders, conversations] =
        await Promise.all([
          prisma.user.count({ where: { companyId } }),
          prisma.customer.count({ where: { companyId } }),
          prisma.product.count({ where: { companyId } }),
          prisma.order.count({
            where: {
              companyId,
              createdAt: { gte: startOfMonth }
            }
          }),
          prisma.conversation.count({ where: { companyId } })
        ]);

      return {
        users,
        customers,
        products,
        orders,
        conversations,
        plan: company.plan
      };
    } catch (error) {
      console.error('❌ Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Check if adding new items would exceed limits
   */
  async checkLimits(companyId, type, count = 1) {
    try {
      const usage = await this.getCurrentUsage(companyId);
      const limits = await this.getEffectiveLimits(companyId);

      const currentCount = usage[type] || 0;
      const limit = limits[type];

      // Unlimited plan
      if (limit === -1) {
        return {
          allowed: true,
          current: currentCount,
          limit: -1,
          remaining: -1,
          percentage: 0
        };
      }

      const newTotal = currentCount + count;
      const allowed = newTotal <= limit;
      const remaining = Math.max(0, limit - currentCount);
      const percentage = Math.round((currentCount / limit) * 100);

      return {
        allowed,
        current: currentCount,
        limit,
        remaining,
        percentage,
        wouldExceed: !allowed,
        newTotal: allowed ? newTotal : currentCount
      };
    } catch (error) {
      console.error('❌ Error checking limits:', error);
      throw error;
    }
  }

  /**
   * Check multiple limits at once
   */
  async checkMultipleLimits(companyId, checks) {
    try {
      const results = {};

      for (const [type, count] of Object.entries(checks)) {
        results[type] = await this.checkLimits(companyId, type, count);
      }

      const allAllowed = Object.values(results).every(result => result.allowed);

      return {
        allowed: allAllowed,
        results
      };
    } catch (error) {
      console.error('❌ Error checking multiple limits:', error);
      throw error;
    }
  }

  /**
   * Get usage warnings (when approaching limits)
   */
  async getUsageWarnings(companyId, warningThreshold = 80) {
    try {
      const usage = await this.getCurrentUsage(companyId);
      const limits = await this.getEffectiveLimits(companyId);
      const warnings = [];

      for (const [type, currentCount] of Object.entries(usage)) {
        if (type === 'plan') continue;

        const limit = limits[type];
        if (limit === -1) continue; // Skip unlimited

        const percentage = Math.round((currentCount / limit) * 100);

        if (percentage >= warningThreshold) {
          warnings.push({
            type,
            current: currentCount,
            limit,
            percentage,
            severity: percentage >= 95 ? 'critical' : percentage >= 90 ? 'high' : 'medium'
          });
        }
      }

      return warnings;
    } catch (error) {
      console.error('❌ Error getting usage warnings:', error);
      throw error;
    }
  }

  /**
   * Get upgrade suggestions
   */
  getUpgradeSuggestions(currentPlan, exceededLimits = []) {
    const suggestions = [];

    if (currentPlan === 'BASIC') {
      suggestions.push({
        plan: 'PRO',
        benefits: [
          'زيادة عدد المستخدمين إلى 25',
          'زيادة عدد العملاء إلى 10,000',
          'زيادة عدد المحادثات إلى 25,000',
          'مساحة تخزين أكبر (5GB)',
          'دعم أولوية',
          'تحليلات متقدمة'
        ],
        price: '$29/month'
      });
    }

    if (currentPlan === 'BASIC' || currentPlan === 'PRO') {
      suggestions.push({
        plan: 'ENTERPRISE',
        benefits: [
          'مستخدمين غير محدودين',
          'عملاء غير محدودين',
          'محادثات غير محدودة',
          'مساحة تخزين غير محدودة',
          'دعم مخصص',
          'وصول للـ API',
          'علامة تجارية مخصصة'
        ],
        price: 'اتصل بنا'
      });
    }

    return suggestions;
  }

  /**
   * Format limit check result for API response
   */
  formatLimitError(type, checkResult) {
    const typeNames = {
      users: 'المستخدمين',
      customers: 'العملاء',
      conversations: 'المحادثات',
      storage: 'مساحة التخزين'
    };

    const typeName = typeNames[type] || type;

    return {
      error: 'LIMIT_EXCEEDED',
      message: `تم تجاوز حد ${typeName} المسموح به`,
      details: {
        type,
        current: checkResult.current,
        limit: checkResult.limit,
        remaining: checkResult.remaining,
        percentage: checkResult.percentage
      }
    };
  }
}

module.exports = new PlanLimitsService();

