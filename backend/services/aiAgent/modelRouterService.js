/**
 * @module modelRouterService
 * @description Phase 4: Dynamic Model Router - intelligently routes AI tasks
 * to the optimal model based on task complexity, cost, and availability.
 */

const MODEL_REGISTRY = {
  'gemini-2.5-flash': {
    provider: 'GOOGLE', speed: 'FAST', costPer1MTokens: 0.15,
    capabilities: ['GREETING', 'SIMPLE_QUERY', 'PRODUCT_INQUIRY', 'SUMMARIZATION'],
    maxTokens: 8192, tier: 'ECONOMY'
  },
  'gemini-2.5-pro': {
    provider: 'GOOGLE', speed: 'MEDIUM', costPer1MTokens: 3.50,
    capabilities: ['COMPLEX_REASONING', 'TASK_PLANNING', 'GOAL_DECOMPOSITION'],
    maxTokens: 32768, tier: 'PREMIUM'
  },
  'groq-llama-3': {
    provider: 'GROQ', speed: 'ULTRA_FAST', costPer1MTokens: 0.05,
    capabilities: ['CLASSIFICATION', 'SIMPLE_QUERY', 'GREETING'],
    maxTokens: 4096, tier: 'FREE'
  },
  'claude-sonnet': {
    provider: 'ANTHROPIC', speed: 'MEDIUM', costPer1MTokens: 3.00,
    capabilities: ['COMPLEX_REASONING', 'SUMMARIZATION', 'PRODUCT_INQUIRY'],
    maxTokens: 16384, tier: 'PREMIUM'
  }
};

const TASK_TYPE_ROUTING = {
  GREETING: 'gemini-2.5-flash',
  SIMPLE_QUERY: 'gemini-2.5-flash',
  PRODUCT_INQUIRY: 'gemini-2.5-flash',
  COMPLEX_REASONING: 'gemini-2.5-pro',
  TASK_PLANNING: 'gemini-2.5-pro',
  GOAL_DECOMPOSITION: 'gemini-2.5-pro',
  CLASSIFICATION: 'groq-llama-3',
  SUMMARIZATION: 'gemini-2.5-flash',
};

const FALLBACK_CHAIN = {
  'gemini-2.5-pro': 'claude-sonnet',
  'claude-sonnet': 'gemini-2.5-flash',
  'gemini-2.5-flash': 'groq-llama-3',
  'groq-llama-3': 'gemini-2.5-flash',
};

const GREETING_PATTERNS = /^(hi|hello|hey|مرحبا|اهلا|السلام|صباح|مساء|شكر)/i;
const PLANNING_PATTERNS = /(plan|خطة|steps|خطوات|goal|هدف|decompose|تقسيم|strategy|استراتيج)/i;
const PRODUCT_PATTERNS = /(product|منتج|price|سعر|بكام|كام|available|متاح|stock|مخزون)/i;

class ModelRouterService {
  constructor() {
    this._disabledModels = new Set();
  }

  /**
   * Routes a task to the optimal model.
   * @param {string} taskType - Task classification
   * @param {string} companyId - Tenant company ID
   * @param {Object} [options] - Additional options
   * @returns {{ model: string, provider: string, estimatedCost: number, reasoning: string }}
   */
  routeTask(taskType, companyId, options = {}) {
    const normalizedType = (taskType || 'SIMPLE_QUERY').toUpperCase();
    let modelName = TASK_TYPE_ROUTING[normalizedType] || 'gemini-2.5-flash';

    if (this._disabledModels.has(modelName)) {
      const fallback = this.getFallbackModel(modelName);
      if (fallback) {
        const fbMeta = MODEL_REGISTRY[fallback];
        return {
          model: fallback, provider: fbMeta.provider,
          estimatedCost: fbMeta.costPer1MTokens,
          reasoning: `Primary model ${modelName} unavailable, fell back to ${fallback}`
        };
      }
    }

    const meta = MODEL_REGISTRY[modelName];
    return {
      model: modelName, provider: meta.provider,
      estimatedCost: meta.costPer1MTokens,
      reasoning: `Task type ${normalizedType} routed to ${modelName} (${meta.tier} tier)`
    };
  }

  /**
   * Returns the fallback model for a given primary model.
   */
  getFallbackModel(primaryModel) {
    return FALLBACK_CHAIN[primaryModel] || null;
  }

  /**
   * Returns the full model registry for observability.
   */
  getModelRegistry() {
    return { ...MODEL_REGISTRY };
  }

  /**
   * Classifies the complexity of a message text.
   * @param {string} messageText
   * @returns {string} Task type classification
   */
  classifyTaskComplexity(messageText) {
    if (!messageText || typeof messageText !== 'string') return 'SIMPLE_QUERY';
    const text = messageText.trim();
    if (text.length < 20 || GREETING_PATTERNS.test(text)) return 'GREETING';
    if (PLANNING_PATTERNS.test(text)) return 'TASK_PLANNING';
    if (PRODUCT_PATTERNS.test(text)) return 'PRODUCT_INQUIRY';
    return 'SIMPLE_QUERY';
  }

  /** Mark a model as disabled (simulates 429/503). */
  disableModel(modelName) { this._disabledModels.add(modelName); }

  /** Re-enable a model. */
  enableModel(modelName) { this._disabledModels.delete(modelName); }
}

module.exports = new ModelRouterService();
