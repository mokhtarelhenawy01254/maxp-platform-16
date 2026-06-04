const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const semanticCacheService = require('../../services/aiAgent/semanticCacheService');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const mockEmbed = jest.fn();
jest.mock('../../services/aiAgent/episodicMemoryService', () => ({
  generateEmbeddingWithProvider: (...args) => mockEmbed(...args),
  EMBEDDING_PROVIDER_GEMINI: 'gemini',
  EMBEDDING_PROVIDER_PSEUDO: 'pseudo',
}));

const makePrisma = () => ({
  faq: { findFirst: jest.fn().mockResolvedValue(null) },
  policy: { findFirst: jest.fn().mockResolvedValue(null) },
});

describe('semanticCacheService - real embeddings + provider filtering', () => {
  const companyId = 'co-1';
  let prisma;

  function fakeVector(seed = 0) {
    const v = new Array(768).fill(0);
    for (let i = 0; i < v.length; i++) v[i] = ((i + seed) % 7) * 0.01;
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / mag);
  }

  beforeEach(() => {
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    semanticCacheService.clear(companyId);
    mockEmbed.mockReset();
  });

  test('caches only when real (gemini) embedding is available', async () => {
    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(1), provider: 'pseudo', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    await semanticCacheService.set(companyId, 'q1', { answer: 'a1' });
    const stats = semanticCacheService.stats(companyId);
    expect(stats.total).toBe(0);

    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(2), provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    await semanticCacheService.set(companyId, 'q2', 'a2');
    const stats2 = semanticCacheService.stats(companyId);
    expect(stats2.total).toBe(1);
    expect(stats2.gemini).toBe(1);
  });

  test('get returns null when query embedding is pseudo and includePseudo=false', async () => {
    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(3), provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    await semanticCacheService.set(companyId, 'q-real', 'cached answer');

    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(3), provider: 'pseudo', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    const hit = await semanticCacheService.get(companyId, 'q-real');
    expect(hit).toBeNull();
  });

  test('get matches identical query with similarity=1.0', async () => {
    const vec = fakeVector(5);
    mockEmbed.mockResolvedValueOnce({
      vector: vec, provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    await semanticCacheService.set(companyId, 'exact', 'cached');

    mockEmbed.mockResolvedValueOnce({
      vector: vec, provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    prisma.faq.findFirst.mockResolvedValue({ updatedAt: new Date(Date.now() - 60_000) });
    prisma.policy.findFirst.mockResolvedValue({ updatedAt: new Date(Date.now() - 60_000) });

    const hit = await semanticCacheService.get(companyId, 'exact');
    expect(hit).not.toBeNull();
    expect(hit.similarity).toBeCloseTo(1.0, 5);
    expect(hit.answer).toBe('cached');
  });

  test('get ignores pseudo entries even when includePseudo=false (default)', async () => {
    semanticCacheService._cache.set(companyId, [
      {
        query: 'old',
        vector: fakeVector(1),
        provider: 'pseudo',
        answer: 'stale',
        createdAt: Date.now() - 1000,
      },
    ]);
    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(1), provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    prisma.faq.findFirst.mockResolvedValue({ updatedAt: new Date(Date.now() - 60_000) });
    prisma.policy.findFirst.mockResolvedValue({ updatedAt: new Date(Date.now() - 60_000) });

    const hit = await semanticCacheService.get(companyId, 'q');
    expect(hit).toBeNull();
  });

  test('get returns pseudo entries when includePseudo=true', async () => {
    const vec = fakeVector(1);
    semanticCacheService._cache.set(companyId, [
      {
        query: 'pse',
        vector: vec,
        provider: 'pseudo',
        answer: 'old',
        createdAt: Date.now() - 1000,
      },
    ]);
    mockEmbed.mockResolvedValueOnce({
      vector: vec, provider: 'pseudo', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });

    const hit = await semanticCacheService.get(companyId, 'pse', { includePseudo: true });
    expect(hit).not.toBeNull();
    expect(hit.answer).toBe('old');
  });

  test('get skips entries with mismatched vector dimension', async () => {
    semanticCacheService._cache.set(companyId, [
      {
        query: 'x',
        vector: new Array(1536).fill(0.01),
        provider: 'gemini',
        answer: 'wrong dim',
        createdAt: Date.now(),
      },
    ]);
    mockEmbed.mockResolvedValueOnce({
      vector: fakeVector(1), provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cached: false,
    });
    const hit = await semanticCacheService.get(companyId, 'x');
    expect(hit).toBeNull();
  });
});
