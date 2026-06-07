const mockCache = new Map();

jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(async key => mockCache.get(key) || null),
  set: jest.fn(async (key, value) => {
    mockCache.set(key, value);
    return true;
  }),
  del: jest.fn(async key => {
    mockCache.delete(key);
    return true;
  }),
}));

const workingMemoryService = require('../../legacy-ai-agent/aiAgent/workingMemoryService');

describe('workingMemoryService', () => {
  beforeEach(async () => {
    mockCache.clear();
    await workingMemoryService.clearSession('company_1', 'conversation_1');
  });

  test('preserves assistant model selection metadata', async () => {
    await workingMemoryService.initSession('company_1', 'conversation_1');
    await workingMemoryService.addMessage('company_1', 'conversation_1', {
      role: 'assistant',
      content: 'جاهز.',
      modelSelection: { provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7' },
    });

    const ctx = await workingMemoryService.getContext('company_1', 'conversation_1');

    expect(ctx.recentMessages[0]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        content: 'جاهز.',
        modelSelection: { provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7' },
      })
    );
  });
});
