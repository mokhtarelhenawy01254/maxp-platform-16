describe('aiSdkClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.AI_SERVICE_TOKEN;
    delete process.env.MAXP_SERVICE_TOKEN;
    process.env.AI_SERVICE_URL = 'http://ai-service.local';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', thread_id: 'thread-1', reply: 'hello', draft_id: null }),
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AI_SERVICE_URL;
    delete process.env.AI_SERVICE_TOKEN;
    delete process.env.MAXP_SERVICE_TOKEN;
  });

  test('sendChatMessage refuses to call the AI service without a configured token', async () => {
    const { sendChatMessage } = require('../../services/aiSdkClient');

    await expect(sendChatMessage({
      companyId: 'company-1',
      customerId: 'customer-1',
      message: 'hello',
    })).rejects.toThrow('AI_SERVICE_TOKEN is required');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('sendChatMessage sends the configured bearer token', async () => {
    process.env.AI_SERVICE_TOKEN = 'shared-secret';
    const { sendChatMessage } = require('../../services/aiSdkClient');

    await sendChatMessage({
      companyId: 'company-1',
      customerId: 'customer-1',
      message: 'hello',
      threadId: 'thread-1',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://ai-service.local/chat',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer shared-secret',
          'X-Company-Id': 'company-1',
          'X-Customer-Id': 'customer-1',
        }),
      }),
    );
  });

  test('sendChatMessage normalizes snake_case AI service responses', async () => {
    process.env.AI_SERVICE_TOKEN = 'shared-secret';
    const { sendChatMessage } = require('../../services/aiSdkClient');

    const result = await sendChatMessage({
      companyId: 'company-1',
      customerId: 'customer-1',
      message: 'hello',
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'ok',
      threadId: 'thread-1',
      draftId: null,
      reply: 'hello',
    }));
  });

  test('resumeWorkflow can use MAXP_SERVICE_TOKEN as an explicit fallback', async () => {
    process.env.MAXP_SERVICE_TOKEN = 'maxp-secret';
    const { resumeWorkflow } = require('../../services/aiSdkClient');

    await resumeWorkflow({
      companyId: 'company-1',
      threadId: 'thread-1',
      draftId: 'draft-1',
      approved: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://ai-service.local/resume',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer maxp-secret',
          'X-Company-Id': 'company-1',
        }),
      }),
    );
  });
});
