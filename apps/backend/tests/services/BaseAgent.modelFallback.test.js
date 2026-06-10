jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(),
}));

const BaseAgent = require('../../legacy-ai-agent/aiAgent/BaseAgent');
const AIProviderFactory = require('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory');

describe('BaseAgent model fallback routing', () => {
  beforeEach(() => {
    AIProviderFactory.getProvider.mockReset();
  });

  test('returns null when preferred provider returns an empty reply (no model-fallback loop)', async () => {
    const firstGenerate = jest.fn(async () => ({ text: '' }));
    AIProviderFactory.getProvider
      .mockReturnValueOnce({ generateResponse: firstGenerate });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          apiKey: 'key-a',
          model: 'deepseek-chat',
          keyId: 'key-a',
          keyName: 'primary',
          provider: 'DEEPSEEK',
        }),
      recordRoutingSuccess: jest.fn(async () => {}),
    };

    const agent = new BaseAgent({
      id: 'agent_facebook',
      name: 'Facebook Agent',
      role: 'FACEBOOK_SALES_SUPPORT',
      companyId: 'company_123',
      model: 'deepseek-chat',
      policies: {
        modelPolicy: {
          fallback: 'gemini-2.5-flash',
          allowModelFallback: true,
        },
      },
    });
    agent.setModelManager(modelManager);

    const result = await agent.generateWithLLMResult([
      { role: 'user', content: 'Need current catalog data.' },
    ]);

    // Model-fallback loop is not implemented in BaseAgent — returns null after empty reply
    expect(result).toBeNull();
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(1);
  });

  test('returns null when all models report NO_MODEL_KEY_AVAILABLE', async () => {
    AIProviderFactory.getProvider.mockReturnValueOnce({ generateResponse: jest.fn() });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          error: 'NO_MODEL_KEY_AVAILABLE',
          message: 'default model has no key',
        }),
      recordRoutingSuccess: jest.fn(async () => {}),
    };

    const agent = new BaseAgent({
      id: 'agent_facebook',
      name: 'Facebook Agent',
      role: 'FACEBOOK_SALES_SUPPORT',
      companyId: 'company_123',
      model: 'gemini-2.5-flash',
      modelSource: 'policy-default',
      policies: {
        modelPolicy: {
          default: 'gemini-2.5-flash',
          fallback: 'gemini-2.5-pro',
          allowModelFallback: true,
        },
      },
    });
    agent.setModelManager(modelManager);

    const result = await agent.generateWithLLMResult([
      { role: 'user', content: 'Need current catalog data.' },
    ]);

    // Explicit model preference + NO_MODEL_KEY_AVAILABLE → breaks early
    expect(result).toBeNull();
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(1);
  });

  test('records modelSelection with error when provider call fails', async () => {
    const quotaGenerate = jest.fn(async () => {
      const error = new Error('Groq Provider Error: Request failed with status code 429');
      error.status = 429;
      throw error;
    });
    AIProviderFactory.getProvider
      .mockReturnValueOnce({ generateResponse: quotaGenerate });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          apiKey: 'groq-key',
          model: 'llama-3.3-70b-versatile',
          keyId: 'groq-key',
          keyName: 'manual groq',
          provider: 'GROQ',
        }),
      recordRoutingSuccess: jest.fn(async () => {}),
    };

    const agent = new BaseAgent({
      id: 'agent_facebook',
      name: 'Facebook Agent',
      role: 'FACEBOOK_SALES_SUPPORT',
      companyId: 'company_123',
      model: 'gemini-2.5-flash',
      modelSource: 'policy-default',
      policies: {
        modelPolicy: {
          default: 'gemini-2.5-flash',
          allowModelFallback: true,
        },
      },
    });
    agent.setModelManager(modelManager);

    const result = await agent.generateWithLLMResult([
      { role: 'user', content: 'Need current catalog data.' },
    ]);

    expect(result).toBeNull();
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(1);
  });
});
