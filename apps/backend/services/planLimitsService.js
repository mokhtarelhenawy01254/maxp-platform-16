class PlanLimitsService {
  async checkLimits() { return { allowed: true, plan: 'BASIC' }; }
  async getEffectiveLimits() { return { users: -1, customers: -1, products: -1, orders: -1, conversations: -1, storage: -1, features: [] }; }
  async getCurrentUsage() { return { plan: 'BASIC', users: 0, customers: 0, products: 0, orders: 0, conversations: 0, storage: 0 }; }
  async getUsageWarnings() { return []; }
  getUpgradeSuggestions() { return []; }
  async checkMultipleLimits() { return { allowed: true, results: [] }; }
}

module.exports = new PlanLimitsService();
