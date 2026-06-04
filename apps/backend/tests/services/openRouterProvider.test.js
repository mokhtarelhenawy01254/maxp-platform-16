jest.mock('axios', () => ({
  post: jest.fn()
}));

const axios = require('axios');
const OpenRouterProvider = require('../../services/aiAgent/providers/OpenRouterProvider');

describe('OpenRouterProvider multimodal requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({
      data: {
        id: 'gen-test',
        model: 'openrouter/free',
        choices: [
          {
            message: { content: 'الصورة فيها منتج أسود.' },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      }
    });
  });

  it('sends image URLs as OpenAI-compatible multimodal content', async () => {
    const provider = new OpenRouterProvider({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1'
    });

    await provider.generateResponse('حلل الصورة', {
      model: 'openrouter/free',
      imageUrls: ['data:image/jpeg;base64,abc123']
    });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'حلل الصورة' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/jpeg;base64,abc123' }
          }
        ]
      }
    ]);
  });

  it('preserves existing content arrays instead of stringifying them', async () => {
    const provider = new OpenRouterProvider({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1'
    });

    await provider.generateResponse([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'ما المنتج؟' },
          {
            type: 'image_url',
            image_url: { url: 'https://cdn.example.com/product.jpg' }
          }
        ]
      }
    ], {
      model: 'openrouter/free'
    });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.messages[0].content).toEqual([
      { type: 'text', text: 'ما المنتج؟' },
      {
        type: 'image_url',
        image_url: { url: 'https://cdn.example.com/product.jpg' }
      }
    ]);
  });

  it('sends OpenAI-compatible tools and exposes tool calls', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        id: 'gen-tools',
        model: 'openrouter/free',
        choices: [
          {
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'update_campaign_settings',
                    arguments: JSON.stringify({ budgetAmount: 500 })
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 3,
          total_tokens: 15
        }
      }
    });

    const provider = new OpenRouterProvider({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1'
    });
    const tools = [
      {
        type: 'function',
        function: {
          name: 'update_campaign_settings',
          description: 'Update budget',
          parameters: {
            type: 'object',
            properties: {
              budgetAmount: { type: 'number' }
            }
          }
        }
      }
    ];

    const result = await provider.generateResponse('غير الميزانية', {
      model: 'openrouter/free',
      tools,
      tool_choice: 'auto'
    });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.tools).toBe(tools);
    expect(requestBody.tool_choice).toBe('auto');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe('update_campaign_settings');
    expect(result.candidates[0].content.parts[0].functionCall).toEqual({
      name: 'update_campaign_settings',
      args: { budgetAmount: 500 }
    });
  });
});
