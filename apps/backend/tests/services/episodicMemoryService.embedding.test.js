const mockGlobalConfigFindFirst = jest.fn();
const mockAiKeyFindFirst = jest.fn();
const mockAiKeyFindUnique = jest.fn();
const mockAgenticMemoryDeleteMany = jest.fn().mockResolvedValue({ count: 0 });

const mockIsAiServicePrimary = jest.fn().mockReturnValue(false);
const mockGenerateEmbedding = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    globalAiConfig: {
      findFirst: mockGlobalConfigFindFirst,
    },
    aiKey: {
      findFirst: mockAiKeyFindFirst,
      findUnique: mockAiKeyFindUnique,
    },
    agenticMemoryFact: {
      deleteMany: mockAgenticMemoryDeleteMany,
    },
  })),
}));

jest.mock('../../services/aiAgent/agentAiServiceClient', () => ({
  isAiServicePrimary: () => mockIsAiServicePrimary(),
  generateEmbedding: (text, dimension, imageBytes, mimeType) => 
    mockGenerateEmbedding(text, dimension, imageBytes, mimeType),
}));

const episodicMemoryService = require('../../services/aiAgent/episodicMemoryService');

const buildVector = (seed) => Array.from({ length: 768 }, (_, index) => seed + (index / 1000));

describe('episodicMemoryService Python Centralized Embedding behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    episodicMemoryService.invalidateConfigCache();
    episodicMemoryService._embeddingFailureState = {};

    mockGlobalConfigFindFirst.mockResolvedValue(null);
    mockAiKeyFindFirst.mockResolvedValue({
      apiKey: 'google-embedding-key',
      isActive: true,
    });
    mockAiKeyFindUnique.mockResolvedValue(null);
    mockIsAiServicePrimary.mockReturnValue(false);
    mockGenerateEmbedding.mockReset();
  });

  test('delegates embedding generation to Python AI service when mode is primary', async () => {
    mockIsAiServicePrimary.mockReturnValue(true);
    const mockVector = buildVector(0.7);
    mockGenerateEmbedding.mockResolvedValue(mockVector);

    const result = await episodicMemoryService.generateEmbeddingAsync('test py routing', {
      allowPseudoFallback: false,
    });

    expect(result).toEqual(mockVector);
    expect(mockGenerateEmbedding).toHaveBeenCalledWith('test py routing', 768, undefined, undefined);
  });

  test('falls back to local pseudo-embeddings when Python AI service fails or is disabled', async () => {
    mockIsAiServicePrimary.mockReturnValue(true);
    mockGenerateEmbedding.mockRejectedValue(new Error('Python service offline'));

    const result = await episodicMemoryService.generateEmbeddingAsync('test query');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(768);
    expect(result.some(val => val !== 0)).toBe(true);
  });

  test('delegates multimodal embedding generation to Python AI service when mode is primary', async () => {
    mockIsAiServicePrimary.mockReturnValue(true);
    const mockVector = buildVector(0.9);
    mockGenerateEmbedding.mockResolvedValue(mockVector);

    const content = {
      text: 'blue shoes',
      imageBytes: Buffer.from('dummy_image_data'),
      mimeType: 'image/png'
    };

    const result = await episodicMemoryService.generateMultimodalEmbeddingAsync(content);

    expect(result).toEqual(mockVector);
    expect(mockGenerateEmbedding).toHaveBeenCalledWith(
      'blue shoes',
      768,
      Buffer.from('dummy_image_data').toString('base64'),
      'image/png'
    );
  });

  test('multimodal embedding falls back to local pseudo-embeddings when Python service is offline', async () => {
    mockIsAiServicePrimary.mockReturnValue(true);
    mockGenerateEmbedding.mockRejectedValue(new Error('Python service offline'));

    const content = {
      text: 'blue shoes',
      imageBytes: 'base64_data',
      mimeType: 'image/png'
    };

    const result = await episodicMemoryService.generateMultimodalEmbeddingAsync(content);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(768);
    expect(result.some(val => val !== 0)).toBe(true);
  });
});
