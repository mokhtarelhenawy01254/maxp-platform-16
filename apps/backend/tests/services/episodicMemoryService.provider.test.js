jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isConnected: false,
  client: null,
}));

const mockAgenticMemoryFactCreate = jest.fn();
const mockAgenticMemoryFactFindMany = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    globalAiConfig: { findFirst: jest.fn().mockResolvedValue(null) },
    aiKey: {
      findFirst: jest.fn().mockResolvedValue({ apiKey: 'google-embedding-key', isActive: true }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    agenticMemoryFact: {
      create: mockAgenticMemoryFactCreate,
      findMany: mockAgenticMemoryFactFindMany,
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
    },
  })),
}));

jest.mock('../../services/aiAgent/agentAiServiceClient', () => ({
  isAiServicePrimary: () => false,
  generateEmbedding: jest.fn(),
  generateMultimodalEmbedding: jest.fn(),
}));

const redisCacheService = require('../../services/redisCacheService');
const episodicMemoryService = require('../../services/aiAgent/episodicMemoryService');
const embeddingCache = require('../../services/aiAgent/embeddingCacheService');

describe('episodicMemoryService - provider metadata & cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisCacheService.get.mockResolvedValue(null);
    redisCacheService.set.mockResolvedValue(true);
    episodicMemoryService.invalidateConfigCache();
    episodicMemoryService.prisma = null;
  });

  describe('generateEmbeddingWithProvider', () => {
    test('returns pseudo provider when no API key configured (after config reload)', async () => {
      episodicMemoryService.invalidateConfigCache();
      const r = await episodicMemoryService.generateEmbeddingWithProvider('hello world');
      expect(r.provider).toBe('pseudo');
      expect(r.model).toBe('gemini-embedding-2');
      expect(r.dimension).toBe(768);
      expect(r.cached).toBe(false);
      expect(r.vector).toHaveLength(768);
    });

    test('marks cached=true on cache hit', async () => {
      const fake = Array.from({ length: 768 }, (_, i) => i * 0.001);
      const cachedPayload = { vector: fake, provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cachedAt: Date.now() };
      redisCacheService.get.mockResolvedValue(cachedPayload);
      const r = await episodicMemoryService.generateEmbeddingWithProvider('cached');
      expect(r.provider).toBe('gemini');
      expect(r.cached).toBe(true);
      expect(r.vector).toEqual(fake);
    });
  });

  describe('searchSimilar', () => {
    test('filters out pseudo embeddings by default', async () => {
      const geminiVec = Array.from({ length: 768 }, (_, i) => Math.sin(i) * 0.1);
      const cachedPayload = { vector: geminiVec, provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, cachedAt: Date.now() };
      redisCacheService.get.mockResolvedValue(cachedPayload);

      const facts = [
        {
          id: 'g1', companyId: 'co1', customerId: 'cu1', type: 'EPISODIC',
          content: 'real', createdAt: new Date(),
          metadata: JSON.stringify({
            _embedding: geminiVec,
            _embeddingMeta: { provider: 'gemini', model: 'gemini-embedding-2', dimension: 768, generatedAt: 'now' },
            channel: 'WHATSAPP',
          }),
        },
        {
          id: 'p1', companyId: 'co1', customerId: 'cu1', type: 'EPISODIC',
          content: 'fake', createdAt: new Date(),
          metadata: JSON.stringify({
            _embedding: Array.from({ length: 768 }, () => 0.01),
            _embeddingMeta: { provider: 'pseudo', model: 'gemini-embedding-2', dimension: 768, generatedAt: 'now' },
            channel: 'WHATSAPP',
          }),
        },
      ];
      mockAgenticMemoryFactFindMany.mockResolvedValue(facts);

      const results = await episodicMemoryService.searchSimilar('co1', 'cu1', 'query', 5);
      expect(results.map((r) => r.id)).toEqual(['g1']);

      const resultsWithPseudo = await episodicMemoryService.searchSimilar('co1', 'cu1', 'query', 5, { includePseudo: true });
      expect(resultsWithPseudo.map((r) => r.id).sort()).toEqual(['g1', 'p1']);
    });
  });

  describe('storeEpisode', () => {
    test('writes _embeddingMeta inside metadata JSON', async () => {
      const client = require('../../services/aiAgent/agentAiServiceClient');
      client.isEnabled = () => false;

      const created = {
        id: 'ep1', companyId: 'co1', customerId: 'cu1', type: 'EPISODIC',
        content: 'something', createdAt: new Date(),
      };
      mockAgenticMemoryFactCreate.mockResolvedValue(created);

      const result = await episodicMemoryService.storeEpisode('co1', 'cu1', 'something', { channel: 'WHATSAPP' });
      expect(result.embeddingProvider).toBe('pseudo');
      expect(mockAgenticMemoryFactCreate).toHaveBeenCalledTimes(1);
      const call = mockAgenticMemoryFactCreate.mock.calls[0][0];
      const parsed = JSON.parse(call.data.metadata);
      expect(parsed).toEqual(expect.objectContaining({
        channel: 'WHATSAPP',
        _embeddingMeta: expect.objectContaining({
          provider: 'pseudo',
          model: 'gemini-embedding-2',
          dimension: 768,
          generatedAt: expect.any(String),
        }),
      }));
    });

    test('writes embeddingProvider column when available, falls back when missing', async () => {
      const client = require('../../services/aiAgent/agentAiServiceClient');
      client.isEnabled = () => false;

      const created = {
        id: 'ep2', companyId: 'co1', customerId: 'cu1', type: 'EPISODIC',
        content: 'x', createdAt: new Date(),
      };
      mockAgenticMemoryFactCreate
        .mockImplementationOnce(() => {
          const err = new Error('Unknown field `embeddingProvider` for model `agentic_memory_fact`');
          throw err;
        })
        .mockResolvedValueOnce(created);

      const result = await episodicMemoryService.storeEpisode('co1', 'cu1', 'x');
      expect(result.embeddingProvider).toBe('pseudo');
      expect(mockAgenticMemoryFactCreate).toHaveBeenCalledTimes(2);

      const firstCallData = mockAgenticMemoryFactCreate.mock.calls[0][0].data;
      const secondCallData = mockAgenticMemoryFactCreate.mock.calls[1][0].data;
      expect(firstCallData).toHaveProperty('embeddingProvider', 'pseudo');
      expect(secondCallData).not.toHaveProperty('embeddingProvider');
    });
  });
});
