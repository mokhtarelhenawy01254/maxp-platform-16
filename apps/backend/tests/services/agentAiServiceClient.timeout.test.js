jest.useFakeTimers();

const agentAiServiceClient = require('../../legacy-ai-agent/aiAgent/agentAiServiceClient');

const ORIGINAL_URL = process.env.AI_SERVICE_URL;
const ORIGINAL_MODE = process.env.AI_SERVICE_MODE;

describe('agentAiServiceClient - fetch timeout', () => {
  beforeEach(() => {
    process.env.AI_SERVICE_URL = 'http://ai-service.test';
    process.env.AI_SERVICE_TOKEN = 'test-token';
    process.env.AI_SERVICE_MODE = 'primary';
  });

  afterAll(() => {
    if (ORIGINAL_URL === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = ORIGINAL_URL;
    if (ORIGINAL_MODE === undefined) delete process.env.AI_SERVICE_MODE;
    else process.env.AI_SERVICE_MODE = ORIGINAL_MODE;
  });

  test('aborts request that exceeds default timeout', async () => {
    process.env.AI_SERVICE_TIMEOUT_MS = '500';

    global.fetch = jest.fn(() => new Promise((_, reject) => {
      setTimeout(() => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), 600);
    }));

    const promise = agentAiServiceClient.listAgents('co1');
    jest.advanceTimersByTime(600);
    await expect(promise).rejects.toThrow(/timeout after 500ms/);
  });

  test('aborts embedding call when it exceeds embedding timeout', async () => {
    process.env.AI_SERVICE_EMBEDDING_TIMEOUT_MS = '300';

    global.fetch = jest.fn(() => new Promise((_, reject) => {
      setTimeout(() => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), 400);
    }));

    const promise = agentAiServiceClient.generateEmbedding('hi', 768, null, null);
    jest.advanceTimersByTime(400);
    await expect(promise).rejects.toThrow(/timeout after 300ms/);
  });

  test('uses default 10s timeout when env var not set', async () => {
    delete process.env.AI_SERVICE_TIMEOUT_MS;
    delete process.env.AI_SERVICE_EMBEDDING_TIMEOUT_MS;

    expect(agentAiServiceClient.getDefaultTimeoutMs()).toBe(10_000);
    expect(agentAiServiceClient.getEmbeddingTimeoutMs()).toBe(15_000);
  });

  test('passes AbortController signal to fetch', async () => {
    process.env.AI_SERVICE_TIMEOUT_MS = '2000';

    let capturedSignal = null;
    global.fetch = jest.fn((url, init) => {
      capturedSignal = init.signal;
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      });
    });

    await agentAiServiceClient.listAgents('co1');
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal.aborted).toBe(false);
  });

  test('surfaces non-AbortError errors unchanged', async () => {
    process.env.AI_SERVICE_TIMEOUT_MS = '5000';

    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(agentAiServiceClient.listAgents('co1')).rejects.toThrow('ECONNREFUSED');
  });

  test('surfaces 4xx/5xx errors as before', async () => {
    process.env.AI_SERVICE_TIMEOUT_MS = '5000';

    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    }));

    await expect(agentAiServiceClient.listAgents('co1')).rejects.toThrow(/AI service error 502/);
  });
});
