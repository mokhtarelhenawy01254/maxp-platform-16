const crypto = require('crypto');
const redisCacheService = require('../../services/redisCacheService');

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const MULTIMODAL_TTL_SECONDS = 6 * 60 * 60;
const KEY_PREFIX = 'embed:v1';

function _hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function _hashImage(imageBytes) {
  if (!imageBytes) return '';
  const buf = Buffer.isBuffer(imageBytes)
    ? imageBytes
    : Buffer.from(String(imageBytes), 'base64');
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
}

function buildKey({ text, model, dimension, imageBytes = null, mimeType = null }) {
  const textHash = _hashText(text || '');
  const imageHash = imageBytes ? _hashImage(imageBytes) : '';
  const mime = imageBytes ? String(mimeType || 'image/jpeg') : '';
  return `${KEY_PREFIX}:${model}:${dimension}:${textHash}:${imageHash}:${mime}`;
}

async function get({ text, model, dimension, imageBytes = null, mimeType = null }) {
  try {
    const key = buildKey({ text, model, dimension, imageBytes, mimeType });
    const cached = await redisCacheService.get(key);
    if (!cached) return null;

    if (Array.isArray(cached) && cached.length === dimension) {
      return { vector: cached, provider: 'gemini', cached: true };
    }
    if (cached && Array.isArray(cached.vector) && cached.vector.length === dimension) {
      return {
        vector: cached.vector,
        provider: cached.provider || 'gemini',
        model: cached.model || model,
        dimension: cached.dimension || dimension,
        cached: true,
      };
    }
    return null;
  } catch (err) {
    console.warn('[EMBEDDING-CACHE] get failed:', err.message);
    return null;
  }
}

async function set({ text, model, dimension, imageBytes = null, mimeType = null, vector, provider = 'gemini' }) {
  if (provider !== 'gemini') return false;
  if (!Array.isArray(vector) || vector.length !== dimension) return false;
  try {
    const key = buildKey({ text, model, dimension, imageBytes, mimeType });
    const ttl = imageBytes ? MULTIMODAL_TTL_SECONDS : DEFAULT_TTL_SECONDS;
    await redisCacheService.set(
      key,
      { vector, provider, model, dimension, cachedAt: Date.now() },
      ttl
    );
    return true;
  } catch (err) {
    console.warn('[EMBEDDING-CACHE] set failed:', err.message);
    return false;
  }
}

async function invalidate({ text, model, dimension, imageBytes = null, mimeType = null }) {
  try {
    const key = buildKey({ text, model, dimension, imageBytes, mimeType });
    await redisCacheService.del(key);
    return true;
  } catch (err) {
    console.warn('[EMBEDDING-CACHE] invalidate failed:', err.message);
    return false;
  }
}

module.exports = {
  buildKey,
  get,
  set,
  invalidate,
  DEFAULT_TTL_SECONDS,
  MULTIMODAL_TTL_SECONDS,
};
