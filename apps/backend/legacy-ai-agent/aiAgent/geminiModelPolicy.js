const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2';
const GEMINI_EMBEDDING_MODELS = new Set([
  'gemini-embedding-001',
  'gemini-embedding-2',
  'gemini-embedding-2-preview',
]);
const GEMINI_EMBEDDING_DIMENSIONS = {
  'gemini-embedding-001': { default: 768, options: [768, 1536, 3072] },
  'gemini-embedding-2': { default: 768, options: [768, 1536, 3072] },
  'gemini-embedding-2-preview': { default: 768, options: [768, 1536, 3072] },
};

const RETIRED_GEMINI_MODEL_NAMES = new Set([
  'gemini-pro',
  'gemini-pro-vision',
  'gemini-1.5-pro',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
]);

const RETIRED_GEMINI_EMBEDDING_MODEL_NAMES = new Set([
  'text-embedding-004',
  'text-embedding-gecko',
  'text-embedding-gecko-001',
]);

const UNSTABLE_GEMINI_MODEL_ALIAS_NAMES = new Set([
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
]);

function normalizeModelToken(modelName) {
  return String(modelName || '').trim().replace(/^models\//i, '');
}

function isRetiredGeminiModelName(modelName) {
  const normalized = normalizeModelToken(modelName).toLowerCase();
  return RETIRED_GEMINI_MODEL_NAMES.has(normalized)
    || RETIRED_GEMINI_EMBEDDING_MODEL_NAMES.has(normalized);
}

function isUnstableGeminiAliasModelName(modelName) {
  const normalized = normalizeModelToken(modelName).toLowerCase();
  return normalized.startsWith('gemini-')
    && (UNSTABLE_GEMINI_MODEL_ALIAS_NAMES.has(normalized) || /-latest$/i.test(normalized));
}

function isProductionUnsafeGeminiModelName(modelName) {
  return isRetiredGeminiModelName(modelName) || isUnstableGeminiAliasModelName(modelName);
}

function normalizeGeminiTextModel(modelName, fallback = DEFAULT_GEMINI_TEXT_MODEL) {
  const normalized = normalizeModelToken(modelName);
  const fallbackCandidate = normalizeModelToken(fallback) || DEFAULT_GEMINI_TEXT_MODEL;
  const normalizedFallback = isProductionUnsafeGeminiModelName(fallbackCandidate)
    ? DEFAULT_GEMINI_TEXT_MODEL
    : fallbackCandidate;

  if (!normalized || isProductionUnsafeGeminiModelName(normalized)) {
    return normalizedFallback;
  }

  if (/embedding|image|imagen/i.test(normalized)) {
    return normalizedFallback;
  }

  return normalized;
}

function normalizeGeminiEmbeddingModel(modelName, fallback = DEFAULT_GEMINI_EMBEDDING_MODEL) {
  const normalized = normalizeModelToken(modelName);
  const fallbackCandidate = normalizeModelToken(fallback) || DEFAULT_GEMINI_EMBEDDING_MODEL;
  const normalizedFallback = isRetiredGeminiModelName(fallbackCandidate)
    ? DEFAULT_GEMINI_EMBEDDING_MODEL
    : fallbackCandidate;

  if (!normalized || isRetiredGeminiModelName(normalized)) {
    return normalizedFallback;
  }

  if (!/embedding/i.test(normalized)) {
    return normalizedFallback;
  }

  return normalized;
}

function filterRetiredGeminiModels(models = []) {
  return Array.from(new Set(
    models
      .map((model) => normalizeModelToken(model))
      .filter((model) => model && !isRetiredGeminiModelName(model))
  ));
}

function filterProductionGeminiModels(models = []) {
  return Array.from(new Set(
    models
      .map((model) => normalizeModelToken(model))
      .filter((model) => model && !isProductionUnsafeGeminiModelName(model))
  ));
}

module.exports = {
  DEFAULT_GEMINI_TEXT_MODEL,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  GEMINI_EMBEDDING_MODELS,
  GEMINI_EMBEDDING_DIMENSIONS,
  RETIRED_GEMINI_MODEL_NAMES,
  RETIRED_GEMINI_EMBEDDING_MODEL_NAMES,
  UNSTABLE_GEMINI_MODEL_ALIAS_NAMES,
  normalizeGeminiTextModel,
  normalizeGeminiEmbeddingModel,
  isRetiredGeminiModelName,
  isUnstableGeminiAliasModelName,
  isProductionUnsafeGeminiModelName,
  filterRetiredGeminiModels,
  filterProductionGeminiModels,
};
