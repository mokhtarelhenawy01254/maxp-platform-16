jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const NvidiaProvider = require('../../services/aiAgent/providers/NvidiaProvider');

describe('NvidiaProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({
      data: {
        id: 'chatcmpl-test',
        model: 'openai/gpt-oss-120b',
        choices: [
          {
            message: { content: 'KEY_OK' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 7,
          completion_tokens: 2,
          total_tokens: 9,
        },
      },
    });
  });

  it('uses NVIDIA NIM OpenAI-compatible chat completions defaults', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'nvidia-test-key',
    });

    const result = await provider.generateResponse('Reply with KEY_OK', {
      temperature: 0,
      max_tokens: 16,
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Reply with KEY_OK' }],
        temperature: 0,
        max_tokens: 16,
        stream: false,
      },
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer nvidia-test-key',
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      provider: 'NVIDIA',
      model: 'openai/gpt-oss-120b',
      content: 'KEY_OK',
    }));
    expect(result.text()).toBe('KEY_OK');
  });

  it('preserves role-based text messages for chat completions', async () => {
    const provider = new NvidiaProvider({
      apiKey: 'nvidia-test-key',
      baseUrl: 'https://integrate.api.nvidia.com/v1/',
    });

    await provider.generateResponse([
      { role: 'system', content: 'رد بالمصري.' },
      { role: 'user', content: 'تمام؟' },
    ]);

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.messages).toEqual([
      { role: 'system', content: 'رد بالمصري.' },
      { role: 'user', content: 'تمام؟' },
    ]);
  });

  it('passes OpenAI-compatible tools and normalizes returned tool calls', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        id: 'chatcmpl-tool-test',
        model: 'openai/gpt-oss-120b',
        choices: [
          {
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call-budget',
                  type: 'function',
                  function: {
                    name: 'update_campaign_settings',
                    arguments: '{"budgetAmount":500}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 8,
          total_tokens: 28,
        },
      },
    });
    const provider = new NvidiaProvider({
      apiKey: 'nvidia-test-key',
    });
    const tools = [
      {
        type: 'function',
        function: {
          name: 'update_campaign_settings',
          description: 'Update campaign settings',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    const result = await provider.generateResponse('Change budget to 500', {
      tools,
      tool_choice: 'required',
    });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.tools).toBe(tools);
    expect(requestBody.tool_choice).toBe('required');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe('update_campaign_settings');
    expect(result.candidates[0].content.parts[0].functionCall).toEqual({
      name: 'update_campaign_settings',
      args: { budgetAmount: 500 },
    });
  });
});
