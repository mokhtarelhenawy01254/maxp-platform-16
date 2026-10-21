/**
 * Provider runtime facade.
 *
 * The customer-facing AI runtime was removed from the app. This small facade is
 * kept only for Super Admin AI provider/key management and diagnostics.
 */
class AIRuntimeService {
  constructor() {
    this._modelManager = null;
  }

  getModelManager() {
    if (!this._modelManager) {
      this._modelManager = {
        clearAllCaches: () => {},
        getCurrentActiveModel: async () => null,
        updateCurrentActiveModel: () => null,
        getActiveAIKeyWithModel: async () => null,
        findBestAvailableModelInActiveKey: async () => null,
        markModelAsExhaustedFrom429: async () => null,
        markModelAsExhausted: async () => null,
        updateModelUsage: async () => null,
        testModelHealth: async () => ({ ok: true }),
        findNextAvailableModel: async () => null,
        findNextModelInKey: async () => null,
        findNextAvailableKey: async () => null,
        findBestModelInKey: async () => null,
        findAndActivateFirstAvailableKey: async () => null,
        activateKey: async () => null,
      };
    }
    return this._modelManager;
  }

  async getCurrentActiveModel(companyId, predictedTokens = 0, options = {}) {
    return this.getModelManager().getCurrentActiveModel(companyId, predictedTokens, options);
  }

  updateCurrentActiveModel(newModel) {
    return this.getModelManager().updateCurrentActiveModel(newModel);
  }

  async getActiveAIKey(companyId, predictedTokens = 0) {
    return this.getModelManager().getActiveAIKeyWithModel(companyId, predictedTokens);
  }

  async findBestAvailableModelInActiveKey(keyId, forceRefresh = false) {
    return this.getModelManager().findBestAvailableModelInActiveKey(keyId, forceRefresh);
  }

  async markModelAsExhaustedFrom429(modelName, quotaValue, companyId = null, modelId = null, errorMessage = '', retryAfterMs = null) {
    return this.getModelManager().markModelAsExhaustedFrom429(modelName, quotaValue, companyId, modelId, errorMessage, retryAfterMs);
  }

  async markModelAsExhausted(modelId) {
    return this.getModelManager().markModelAsExhausted(modelId);
  }

  async updateModelUsage(modelId, tokenCount = 0) {
    return this.getModelManager().updateModelUsage(modelId, tokenCount);
  }

  async testModelHealth(apiKey, model) {
    return this.getModelManager().testModelHealth(apiKey, model);
  }

  async findNextAvailableModel(companyId) {
    return this.getModelManager().findNextAvailableModel(companyId);
  }

  async findNextModelInKey(keyId) {
    return this.getModelManager().findNextModelInKey(keyId);
  }

  async findNextAvailableKey(companyId) {
    return this.getModelManager().findNextAvailableKey(companyId);
  }

  async findBestModelInKey(keyId) {
    return this.getModelManager().findBestModelInKey(keyId);
  }

  async findAndActivateFirstAvailableKey(companyId) {
    return this.getModelManager().findAndActivateFirstAvailableKey(companyId);
  }

  async activateKey(keyId) {
    return this.getModelManager().activateKey(keyId);
  }

  stop() {
    if (this._modelManager) {
      this._modelManager.stop();
    }
  }
}

module.exports = new AIRuntimeService();
