jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(),
}));

const BaseAgent = require('../../legacy-ai-agent/aiAgent/BaseAgent');
const AIProviderFactory = require('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory');

describe('BaseAgent model fallback routing', () => {
  beforeEach(() => {
    AIProviderFactory.getProvider.mockReset();
  });

  test('tries a model fallback when the preferred provider returns an empty reply', async () => {
    const firstGenerate = jest.fn(async () => ({ text: '' }));
    const secondGenerate = jest.fn(async () => ({
      text: 'Dynamic customer reply from fallback model.',
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    }));
    AIProviderFactory.getProvider
      .mockReturnValueOnce({ generateResponse: firstGenerate })
      .mockReturnValueOnce({ generateResponse: secondGenerate });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          apiKey: 'key-a',
          model: 'deepseek-chat',
          keyId: 'key-a',
          keyName: 'primary',
          provider: 'DEEPSEEK',
          selectedPool: 'primary',
          activeProvider: 'DEEPSEEK',
        })
        .mockResolvedValueOnce({
          apiKey: 'key-b',
          model: 'gemini-2.5-flash',
          keyId: 'key-b',
          keyName: 'fallback',
          provider: 'GOOGLE',
          selectedPool: 'failover',
          activeProvider: 'DEEPSEEK',
        }),
      markKeyFailed: jest.fn(async () => {}),
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

    expect(result.text).toBe('Dynamic customer reply from fallback model.');
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(2);
    expect(modelManager.getNextKeySimple.mock.calls[0][1]).toEqual(expect.objectContaining({
      preferredModel: 'deepseek-chat',
    }));
    expect(modelManager.getNextKeySimple.mock.calls[1][1]).toEqual(expect.objectContaining({
      preferredModel: 'gemini-2.5-flash',
    }));
    expect(modelManager.markKeyFailed).toHaveBeenCalledWith('key-a', 'EMPTY_MODEL_RESPONSE', 30000);
    expect(modelManager.recordRoutingSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'key-b' }),
      expect.objectContaining({ companyId: 'company_123' }),
    );
    expect(result.modelSelection).toEqual(expect.objectContaining({
      provider: 'GOOGLE',
      fallbackAttempt: 'model-fallback',
    }));
  });

  test('can fail over from a policy default routing miss to a provider fallback', async () => {
    const fallbackGenerate = jest.fn(async () => ({
      text: 'Dynamic customer reply from provider failover.',
      provider: 'DEEPSEEK',
      model: 'deepseek-chat',
    }));
    AIProviderFactory.getProvider.mockReturnValueOnce({ generateResponse: fallbackGenerate });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          error: 'NO_MODEL_KEY_AVAILABLE',
          message: 'default model has no key',
        })
        .mockResolvedValueOnce({
          error: 'NO_MODEL_KEY_AVAILABLE',
          message: 'fallback model has no key',
        })
        .mockResolvedValueOnce({
          apiKey: 'key-c',
          model: 'deepseek-chat',
          keyId: 'key-c',
          keyName: 'provider fallback',
          provider: 'DEEPSEEK',
          selectedPool: 'failover',
          activeProvider: 'GOOGLE',
        }),
      markKeyFailed: jest.fn(async () => {}),
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

    expect(result.text).toBe('Dynamic customer reply from provider failover.');
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(3);
    expect(modelManager.getNextKeySimple.mock.calls[0][1]).toEqual(expect.objectContaining({
      preferredModel: 'gemini-2.5-flash',
      label: 'preferred',
    }));
    expect(modelManager.getNextKeySimple.mock.calls[1][1]).toEqual(expect.objectContaining({
      preferredModel: 'gemini-2.5-pro',
      label: 'model-fallback',
    }));
    expect(modelManager.getNextKeySimple.mock.calls[2][1]).toEqual(expect.objectContaining({
      preferredModel: null,
      label: 'provider-failover',
    }));
    expect(result.modelSelection).toEqual(expect.objectContaining({
      provider: 'DEEPSEEK',
      fallbackAttempt: 'provider-failover',
    }));
  });

  test('retries provider failover after a provider-level quota failure', async () => {
    const quotaGenerate = jest.fn(async () => {
      const error = new Error('Groq Provider Error: Request failed with status code 429');
      error.status = 429;
      throw error;
    });
    const retryGenerate = jest.fn(async () => ({
      text: 'Dynamic reply from second provider failover key.',
      provider: 'DEEPSEEK',
      model: 'deepseek-chat',
    }));
    AIProviderFactory.getProvider
      .mockReturnValueOnce({ generateResponse: quotaGenerate })
      .mockReturnValueOnce({ generateResponse: retryGenerate });

    const modelManager = {
      getNextKeySimple: jest.fn()
        .mockResolvedValueOnce({
          error: 'NO_MODEL_KEY_AVAILABLE',
          message: 'default model has no key',
        })
        .mockResolvedValueOnce({
          apiKey: 'groq-key',
          model: 'llama-3.3-70b-versatile',
          keyId: 'groq-key',
          keyName: 'manual groq',
          provider: 'GROQ',
          selectedPool: 'manual',
          activeProvider: 'GROQ',
          manualOverride: true,
        })
        .mockResolvedValueOnce({
          apiKey: 'deepseek-key',
          model: 'deepseek-chat',
          keyId: 'deepseek-key',
          keyName: 'provider retry',
          provider: 'DEEPSEEK',
          selectedPool: 'failover',
          activeProvider: 'GROQ',
        }),
      markKeyFailed: jest.fn(async () => {}),
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

    expect(result.text).toBe('Dynamic reply from second provider failover key.');
    expect(modelManager.getNextKeySimple).toHaveBeenCalledTimes(3);
    expect(modelManager.markKeyFailed).toHaveBeenCalledWith('groq-key', 429, 30000);
    expect(result.modelSelection).toEqual(expect.objectContaining({
      provider: 'DEEPSEEK',
      fallbackAttempt: 'provider-failover-retry-1',
    }));
  });
});
