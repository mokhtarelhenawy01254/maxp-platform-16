jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isConnected: false,
  client: null,
}));

const redisCacheService = require('../../services/redisCacheService');
const embeddingCache = require('../../legacy-ai-agent/aiAgent/embeddingCacheService');

describe('embeddingCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisCacheService.get.mockResolvedValue(null);
    redisCacheService.set.mockResolvedValue(true);
    redisCacheService.del.mockResolvedValue(true);
  });

  describe('buildKey', () => {
    test('text-only key omits image hash and mime', () => {
      const k1 = embeddingCache.buildKey({ text: 'hello', model: 'gemini-embedding-2', dimension: 768 });
      expect(k1).toMatch(/^embed:v1:gemini-embedding-2:768:[a-f0-9]{64}::$/);
    });

    test('multimodal key includes image hash and mime', () => {
      const k2 = embeddingCache.buildKey({ text: 'hello', model: 'gemini-embedding-2', dimension: 768, imageBytes: 'abc', mimeType: 'image/png' });
      expect(k2).toMatch(/^embed:v1:gemini-embedding-2:768:[a-f0-9]{64}:[a-f0-9]{32}:image\/png$/);
    });

    test('different models produce different keys for same text', () => {
      const a = embeddingCache.buildKey({ text: 'x', model: 'gemini-embedding-2', dimension: 768 });
      const b = embeddingCache.buildKey({ text: 'x', model: 'text-embedding-005', dimension: 768 });
      expect(a).not.toBe(b);
    });

    test('different dimensions produce different keys', () => {
      const a = embeddingCache.buildKey({ text: 'x', model: 'gemini-embedding-2', dimension: 768 });
      const b = embeddingCache.buildKey({ text: 'x', model: 'gemini-embedding-2', dimension: 1536 });
      expect(a).not.toBe(b);
    });

    test('multimodal keys differ by image bytes', () => {
      const a = embeddingCache.buildKey({ text: 'q', model: 'gemini-embedding-2', dimension: 768, imageBytes: 'aaa', mimeType: 'image/jpeg' });
      const b = embeddingCache.buildKey({ text: 'q', model: 'gemini-embedding-2', dimension: 768, imageBytes: 'bbb', mimeType: 'image/jpeg' });
      expect(a).not.toBe(b);
    });
  });

  describe('get', () => {
    test('returns null on cache miss', async () => {
      const r = await embeddingCache.get({ text: 'miss', model: 'gemini-embedding-2', dimension: 768 });
      expect(r).toBeNull();
      expect(redisCacheService.get).toHaveBeenCalledTimes(1);
    });

    test('returns cached entry on cache hit (object form)', async () => {
      const vec = Array.from({ length: 768 }, (_, i) => i * 0.001);
      redisCacheService.get.mockResolvedValue({
        vector: vec, provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cachedAt: Date.now(),
      });
      const r = await embeddingCache.get({ text: 'cached', model: 'gemini-embedding-2', dimension: 768 });
      expect(r).not.toBeNull();
      expect(r.cached).toBe(true);
      expect(r.provider).toBe('gemini');
      expect(r.vector).toHaveLength(768);
      expect(r.dimension).toBe(768);
    });

    test('returns null on dimension mismatch (corrupt entry)', async () => {
      const vec = Array.from({ length: 768 }, () => 0.1);
      redisCacheService.get.mockResolvedValue({ vector: vec, provider: 'gemini', dimension: 768 });
      const r = await embeddingCache.get({ text: 'dim', model: 'gemini-embedding-2', dimension: 1536 });
      expect(r).toBeNull();
    });

    test('returns null when redis throws', async () => {
      redisCacheService.get.mockRejectedValue(new Error('boom'));
      const r = await embeddingCache.get({ text: 'x', model: 'gemini-embedding-2', dimension: 768 });
      expect(r).toBeNull();
    });
  });

  describe('set', () => {
    test('refuses to cache pseudo provider', async () => {
      const vec = Array.from({ length: 768 }, () => 0.1);
      const r = await embeddingCache.set({
        text: 'pseudo', model: 'gemini-embedding-2', dimension: 768, vector: vec, provider: 'pseudo',
      });
      expect(r).toBe(false);
      expect(redisCacheService.set).not.toHaveBeenCalled();
    });

    test('refuses wrong dimension', async () => {
      const vec = Array.from({ length: 100 }, () => 0.1);
      const r = await embeddingCache.set({
        text: 'wrong', model: 'gemini-embedding-2', dimension: 768, vector: vec, provider: 'gemini',
      });
      expect(r).toBe(false);
      expect(redisCacheService.set).not.toHaveBeenCalled();
    });

    test('caches gemini provider with TTL', async () => {
      const vec = Array.from({ length: 768 }, () => 0.1);
      const r = await embeddingCache.set({
        text: 'gem', model: 'gemini-embedding-2', dimension: 768, vector: vec, provider: 'gemini',
      });
      expect(r).toBe(true);
      expect(redisCacheService.set).toHaveBeenCalledTimes(1);
      const callArgs = redisCacheService.set.mock.calls[0];
      expect(callArgs[2]).toBe(24 * 60 * 60);
    });

    test('multimodal uses shorter TTL', async () => {
      const vec = Array.from({ length: 768 }, () => 0.1);
      const r = await embeddingCache.set({
        text: 'm', model: 'gemini-embedding-2', dimension: 768, vector: vec, provider: 'gemini',
        imageBytes: 'abc', mimeType: 'image/jpeg',
      });
      expect(r).toBe(true);
      expect(redisCacheService.set).toHaveBeenCalledTimes(1);
      const callArgs = redisCacheService.set.mock.calls[0];
      expect(callArgs[2]).toBe(6 * 60 * 60);
    });
  });
});
