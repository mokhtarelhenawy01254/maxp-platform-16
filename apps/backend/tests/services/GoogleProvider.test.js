const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

jest.mock('../../services/aiAgent/geminiModelPolicy', () => ({
  normalizeGeminiTextModel: jest.fn((model) => model || 'gemini-2.5-flash'),
}));

const GoogleProvider = require('../../services/aiAgent/providers/GoogleProvider');
const { normalizeGeminiTextModel } = require('../../services/aiAgent/geminiModelPolicy');

describe('GoogleProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps max_tokens to maxOutputTokens and normalizes array prompts', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '{"ok":true}',
        candidates: [],
        usageMetadata: { totalTokenCount: 42 },
      },
    });

    const provider = new GoogleProvider({ apiKey: 'google-secret' });
    const result = await provider.generateResponse(
      [
        { role: 'system', content: 'اعمل JSON فقط' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'اكتب لاند قصيرة' },
            { type: 'text', text: 'بدون markdown' },
          ],
        },
      ],
      {
        model: 'gemma-4-31b-it',
        max_tokens: 321,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
          },
        },
      },
    );

    expect(normalizeGeminiTextModel).toHaveBeenCalledWith('gemma-4-31b-it');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemma-4-31b-it' });
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [{
        role: 'user',
        parts: [{
          text: 'اعمل JSON فقط\n\nاكتب لاند قصيرة\nبدون markdown',
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 321,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
          },
        },
      },
    });
    expect(result).toMatchObject({
      success: true,
      content: '{"ok":true}',
      model: 'gemma-4-31b-it',
      provider: 'GOOGLE',
    });
  });

  test('passes function declarations to Gemini and returns function calls', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '',
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'update_campaign_settings',
                    args: { budgetAmount: 500 },
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: { totalTokenCount: 18 },
      },
    });

    const provider = new GoogleProvider({ apiKey: 'google-secret' });
    const result = await provider.generateResponse('غير الميزانية', {
      model: 'gemini-2.5-flash',
      tools: [
        {
          type: 'function',
          function: {
            name: 'update_campaign_settings',
            description: 'Update budget',
            parameters: {
              type: 'object',
              properties: {
                budgetAmount: { type: 'number' },
              },
            },
          },
        },
      ],
    });

    const requestBody = mockGenerateContent.mock.calls[0][0];
    expect(requestBody.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'update_campaign_settings',
            description: 'Update budget',
            parameters: {
              type: 'OBJECT',
              properties: {
                budgetAmount: { type: 'NUMBER' },
              },
            },
          },
        ],
      },
    ]);
    expect(result.toolCalls).toEqual([
      {
        id: 'update_campaign_settings',
        type: 'function',
        function: {
          name: 'update_campaign_settings',
          arguments: JSON.stringify({ budgetAmount: 500 }),
        },
        provider: 'GOOGLE',
      },
    ]);
  });

  test('fails with a timeout error when the provider stalls past timeoutMs', async () => {
    jest.useFakeTimers();
    mockGenerateContent.mockImplementation(
      () => new Promise(() => {})
    );

    const provider = new GoogleProvider({ apiKey: 'google-secret', timeoutMs: 5000 });
    const pending = provider.generateResponse('ping', {
      timeoutMs: 25,
    });

    jest.advanceTimersByTime(30);

    await expect(pending).rejects.toMatchObject({
      message: 'Google Provider Error: Request timed out after 25ms',
      provider: 'GOOGLE',
      code: 'TIMEOUT',
    });

    jest.useRealTimers();
  });
});
