// All prices in $ per 1 million tokens (industry standard)
// For sandbox use (per 1K tokens):  divide by 1000
// For budget ledger (per token):    divide by 1,000,000
const MODEL_COSTS_PER_M = {
  'gpt-4o': { input: 2.50, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 0.625, output: 2.50 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'deepseek-v4-flash': { input: 0.14, output: 0.28 },
  'deepseek-v4-pro': { input: 0.435, output: 0.87 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.60 },
  'openai/gpt-oss-20b': { input: 0.075, output: 0.30 },
  'llama-3.3-70b': { input: 0.59, output: 0.79 },
  'llama-3.1-70b': { input: 0.59, output: 0.79 },
  'mistral-large': { input: 2.0, output: 6.0 },
  'mistral-7b': { input: 0.10, output: 0.30 },
};

function getModelCost(modelName) {
  const c = MODEL_COSTS_PER_M[modelName] || MODEL_COSTS_PER_M['gpt-4o'];
  return { input: c.input / 1000, output: c.output / 1000 };
}

function getModelCostPerToken(modelName) {
  const c = MODEL_COSTS_PER_M[modelName] || MODEL_COSTS_PER_M['gpt-4o'];
  return { input: c.input / 1000000, output: c.output / 1000000 };
}

function calculateCost(modelName, inputTokens, outputTokens) {
  const costs = getModelCost(modelName);
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

const FALLBACK_COST = getModelCostPerToken('gpt-4o');

module.exports = { MODEL_COSTS_PER_M, getModelCost, getModelCostPerToken, calculateCost, FALLBACK_COST };
