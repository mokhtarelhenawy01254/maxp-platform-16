jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const BaseAgent = require('../../../legacy-ai-agent/aiAgent/BaseAgent');

describe('BaseAgent selected-agent ai-service chat bridge', () => {
  const originalUrl = process.env.AI_SERVICE_URL;
  const originalToken = process.env.AI_SERVICE_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_URL = 'http://ai-service.test';
    process.env.AI_SERVICE_TOKEN = 'service-token';
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = originalUrl;

    if (originalToken === undefined) delete process.env.AI_SERVICE_TOKEN;
    else process.env.AI_SERVICE_TOKEN = originalToken;
  });

  test('posts selected agent config to Python agent chat endpoint', async () => {
    axios.post.mockResolvedValue({
      data: {
        status: 'ok',
        thread_id: 'thread_1',
        reply: 'أنا شيرين',
        tool_calls: [],
      },
    });

    const agent = new BaseAgent({
      id: 'agent_fb',
      name: 'شيرين',
      role: 'FACEBOOK_SALES_SUPPORT',
      companyId: 'comp_test',
      templateSlug: 'facebook-sales-support-agent',
      model: 'llama-3.3-70b-versatile',
      allowedTools: ['product.search'],
      allowedSkills: [],
      persona: {
        soulInstructions: 'اتكلمي بالعامية المصرية. اسمك شيرين.',
      },
    });

    const result = await agent.processTask({
      currentMessage: 'انت اسمك ايه؟',
      sessionId: 'thread_1',
      userId: 'customer_1',
      intentContext: { channel: 'FACEBOOK' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(axios.post).toHaveBeenCalledWith(
      'http://ai-service.test/admin/agents/chat',
      expect.objectContaining({
        company_id: 'comp_test',
        agent_id: 'agent_fb',
        message: 'انت اسمك ايه؟',
        thread_id: 'thread_1',
        customer_id: 'customer_1',
        channel: 'FACEBOOK',
        agent_config: expect.objectContaining({
          id: 'agent_fb',
          name: 'شيرين',
          role: 'FACEBOOK_SALES_SUPPORT',
          templateSlug: 'facebook-sales-support-agent',
          persona: expect.objectContaining({
            soulInstructions: 'اتكلمي بالعامية المصرية. اسمك شيرين.',
          }),
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer service-token',
        }),
      }),
    );
  });
});
