const mockSendChatMessage = jest.fn();

jest.mock('../../services/aiSdkClient', () => ({
  sendChatMessage: (...args) => mockSendChatMessage(...args),
}));

function loadRouter() {
  jest.resetModules();
  jest.doMock('../../services/aiSdkClient', () => ({
    sendChatMessage: (...args) => mockSendChatMessage(...args),
  }));
  return require('../../services/aiAgent/aiServiceRouter');
}

describe('aiServiceRouter feature flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_SERVICE_MODE;
    delete process.env.AI_SERVICE_ENABLED_COMPANIES;
  });

  test('keeps the AI service off when no rollout mode or companies are configured', () => {
    const router = loadRouter();

    expect(router.getAiServiceMode()).toBe('off');
    expect(router.isAiServiceEnabled('company-1')).toBe(false);
  });

  test('enables pilot mode only for explicitly listed companies', () => {
    process.env.AI_SERVICE_MODE = 'pilot';
    process.env.AI_SERVICE_ENABLED_COMPANIES = 'company-1, company-2';
    const router = loadRouter();

    expect(router.isAiServiceEnabled('company-1')).toBe(true);
    expect(router.isAiServiceEnabled('company-3')).toBe(false);
  });

  test('does not allow wildcard company rollout in pilot mode', () => {
    process.env.AI_SERVICE_MODE = 'pilot';
    process.env.AI_SERVICE_ENABLED_COMPANIES = '*';
    const router = loadRouter();

    expect(router.isAiServiceEnabled('company-1')).toBe(false);
  });

  test('allows wildcard rollout only when primary mode is explicit', () => {
    process.env.AI_SERVICE_MODE = 'primary';
    process.env.AI_SERVICE_ENABLED_COMPANIES = '*';
    const router = loadRouter();

    expect(router.isAiServiceEnabled('company-1')).toBe(true);
  });

  test('routes chat requests to the AI service client', async () => {
    mockSendChatMessage.mockResolvedValue({
      status: 'ok',
      threadId: 'thread-1',
      reply: 'hello',
    });
    const router = loadRouter();

    const result = await router.routeToAiService({
      companyId: 'company-1',
      customerId: 'customer-1',
      message: 'hello',
      threadId: 'thread-1',
      logger: { info: jest.fn(), error: jest.fn() },
    });

    expect(result.reply).toBe('hello');
    expect(mockSendChatMessage).toHaveBeenCalledWith({
      companyId: 'company-1',
      customerId: 'customer-1',
      message: 'hello',
      threadId: 'thread-1',
    });
  });
});
