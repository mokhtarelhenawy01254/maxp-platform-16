/**
 * @module policyEnforcementEngine
 * @description Phase 13: Policy Engine Guardrails - deterministic policy enforcement
 * outside the LLM to prevent policy violations. Loads company-specific overrides
 * from AiSetting database table.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

const DEFAULT_POLICIES = {
  maxDiscountPercent: 20,
  maxRefundAmount: 500,
  minProductPrice: 1,
  maxPriceChangePercent: 30,
  blockedActions: ['DELETE_PRODUCT', 'DELETE_ORDER', 'MODIFY_PAYMENT'],
  requireApprovalAbove: 100,
  maxDailyTransactions: 50,
};

class PolicyEnforcementEngine {
  constructor() {
    /** @type {Map<string, Object>} companyId -> policy overrides */
    this._companyPolicies = new Map();
    /** @type {Map<string, number>} companyId:date -> daily count */
    this._dailyCounts = new Map();
  }

  /**
   * Loads company-specific policies from the AiSetting table into cache.
   */
  async loadCompanyPolicies(companyId) {
    try {
      const prisma = getSharedPrismaClient();
      const settings = await prisma.aiSetting.findUnique({ where: { companyId } });
      if (settings) {
        const overrides = {};
        // Map DB settings to policy values
        if (!settings.humanApprovalRequiredForWrite) {
          overrides.requireApprovalAbove = Infinity;
        }
        if (settings.maxRepliesPerCustomer) {
          overrides.maxDailyTransactions = settings.maxRepliesPerCustomer * 10;
        }
        if (settings.writeToolScopes) {
          try {
            const scopes = JSON.parse(settings.writeToolScopes);
            if (scopes.blockedActions) overrides.blockedActions = scopes.blockedActions;
            if (scopes.maxDiscountPercent) overrides.maxDiscountPercent = scopes.maxDiscountPercent;
            if (scopes.maxRefundAmount) overrides.maxRefundAmount = scopes.maxRefundAmount;
            if (scopes.maxPriceChangePercent) overrides.maxPriceChangePercent = scopes.maxPriceChangePercent;
          } catch (_) {}
        }
        this._companyPolicies.set(companyId, overrides);
      }
    } catch (error) {
      console.warn(`[PolicyEngine] Failed to load policies for ${companyId}:`, error.message);
    }
  }

  getCompanyPolicies(companyId) {
    const overrides = this._companyPolicies.get(companyId) || {};
    return { ...DEFAULT_POLICIES, ...overrides };
  }

  setCompanyPolicy(companyId, policyOverrides) {
    const existing = this._companyPolicies.get(companyId) || {};
    this._companyPolicies.set(companyId, { ...existing, ...policyOverrides });
  }

  /**
   * Main validation function.
   * @returns {{ allowed: boolean, violations: Array, warnings: Array, enforcedLimits: Object }}
   */
  validateAction(companyId, action) {
    const policies = this.getCompanyPolicies(companyId);
    const violations = [];
    const warnings = [];

    // Check blocked actions
    if (action.type && policies.blockedActions.includes(action.type)) {
      violations.push({ rule: 'BLOCKED_ACTION', message: `Action "${action.type}" is permanently blocked by policy`, severity: 'CRITICAL' });
    }

    // Check discount
    if (action.params?.discountPercent !== undefined) {
      const v = this.validateDiscount(companyId, action.params.discountPercent);
      if (v.violation) violations.push(v.violation);
    }

    // Check price change
    if (action.params?.originalPrice !== undefined && action.params?.newPrice !== undefined) {
      const v = this.validatePriceChange(companyId, action.params.originalPrice, action.params.newPrice);
      if (v.violations) violations.push(...v.violations);
    }

    // Check refund
    if (action.params?.refundAmount !== undefined) {
      const v = this.validateRefund(companyId, action.params.refundAmount);
      if (v.violation) violations.push(v.violation);
    }

    // Check daily transaction limit
    const dailyCount = this.getDailyTransactionCount(companyId);
    if (dailyCount >= policies.maxDailyTransactions) {
      violations.push({ rule: 'DAILY_LIMIT_EXCEEDED', message: `Daily transaction limit (${policies.maxDailyTransactions}) reached`, severity: 'HIGH' });
    }

    // Check approval threshold
    const txValue = action.params?.value || action.params?.amount || 0;
    if (txValue > policies.requireApprovalAbove) {
      warnings.push({ rule: 'REQUIRES_APPROVAL', message: `Transaction value ${txValue} exceeds auto-approval threshold ${policies.requireApprovalAbove}` });
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
      enforcedLimits: policies,
    };
  }

  validateDiscount(companyId, discountPercent) {
    const policies = this.getCompanyPolicies(companyId);
    if (discountPercent > policies.maxDiscountPercent) {
      return {
        valid: false,
        violation: { rule: 'MAX_DISCOUNT_EXCEEDED', message: `Discount ${discountPercent}% exceeds max ${policies.maxDiscountPercent}%`, severity: 'HIGH', requested: discountPercent, limit: policies.maxDiscountPercent },
      };
    }
    return { valid: true, violation: null };
  }

  validatePriceChange(companyId, originalPrice, newPrice) {
    const policies = this.getCompanyPolicies(companyId);
    const violations = [];

    if (newPrice < policies.minProductPrice) {
      violations.push({ rule: 'BELOW_PRICE_FLOOR', message: `Price ${newPrice} below minimum ${policies.minProductPrice}`, severity: 'HIGH' });
    }

    const changePercent = Math.abs((newPrice - originalPrice) / originalPrice) * 100;
    if (changePercent > policies.maxPriceChangePercent) {
      violations.push({ rule: 'MAX_PRICE_CHANGE_EXCEEDED', message: `Price change ${changePercent.toFixed(1)}% exceeds max ${policies.maxPriceChangePercent}%`, severity: 'HIGH' });
    }

    return { valid: violations.length === 0, violations };
  }

  validateRefund(companyId, refundAmount) {
    const policies = this.getCompanyPolicies(companyId);
    if (refundAmount > policies.maxRefundAmount) {
      return {
        valid: false,
        violation: { rule: 'MAX_REFUND_EXCEEDED', message: `Refund ${refundAmount} exceeds max ${policies.maxRefundAmount}`, severity: 'HIGH' },
      };
    }
    return { valid: true, violation: null };
  }

  isBlockedAction(actionType) {
    return DEFAULT_POLICIES.blockedActions.includes(actionType);
  }

  _dailyKey(companyId) {
    return `${companyId}:${new Date().toISOString().slice(0, 10)}`;
  }

  getDailyTransactionCount(companyId) {
    return this._dailyCounts.get(this._dailyKey(companyId)) || 0;
  }

  incrementTransactionCount(companyId) {
    const key = this._dailyKey(companyId);
    const current = this._dailyCounts.get(key) || 0;
    this._dailyCounts.set(key, current + 1);
    return current + 1;
  }

  _reset() { this._companyPolicies.clear(); this._dailyCounts.clear(); }
}

module.exports = new PolicyEnforcementEngine();
