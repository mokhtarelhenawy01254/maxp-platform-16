const mockSendFacebookMessage = jest.fn();

// Mock the sendFacebookMessage function from allFunctions.js
jest.mock('../../utils/allFunctions', () => ({
  sendFacebookMessage: mockSendFacebookMessage,
}));

const {
  executeTool,
  getNativeToolDefinitions,
} = require('../../legacy-ai-agent/aiAgent/agentToolRegistry');

describe('agent facebook.reply tool', () => {
  beforeEach(() => {
    mockSendFacebookMessage.mockReset();
  });

  test('exports a schema that matches the registry requirements', () => {
    const [tool] = getNativeToolDefinitions(['facebook.reply']);

    expect(tool.function.name).toBe('agenttool__facebook_reply');
    expect(tool.function.parameters.required).toEqual(
      expect.arrayContaining(['recipientId', 'pageId'])
    );
    expect(tool.function.parameters.required).not.toContain('message');
    expect(tool.function.parameters.properties).toEqual(
      expect.objectContaining({
        recipientId: expect.objectContaining({ type: 'string' }),
        message: expect.objectContaining({ type: 'string' }),
        messageType: expect.objectContaining({
          type: 'string',
          enum: ['TEXT', 'IMAGE'],
        }),
        imageUrl: expect.objectContaining({ type: 'string' }),
        mediaUrl: expect.objectContaining({ type: 'string' }),
        pageId: expect.objectContaining({ type: 'string' }),
      })
    );
  });

  test('returns structured failure when required routing params are missing', async () => {
    const result = await executeTool('company_123456', 'facebook.reply', {
      recipientId: '1234567890',
      message: 'Hello from the agent!',
      pageId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('INVALID_TOOL_INPUT');
    expect(mockSendFacebookMessage).not.toHaveBeenCalled();
  });

  test('successfully executes handler when valid inputs are provided', async () => {
    mockSendFacebookMessage.mockResolvedValueOnce({
      success: true,
      messageId: 'mid.12345',
    });

    const result = await executeTool('company_123456', 'facebook.reply', {
      recipientId: '1234567890',
      message: 'Hello from the agent!',
      pageId: 'page_123',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      success: true,
      messageId: 'mid.12345',
      recipientId: '1234567890',
      pageId: 'page_123',
      messageType: 'TEXT',
      status: 'SENT',
    });
    expect(mockSendFacebookMessage).toHaveBeenCalledWith(
      '1234567890',
      'Hello from the agent!',
      'TEXT',
      'page_123'
    );
  });

  test('throws error when the underlying sendFacebookMessage fails', async () => {
    mockSendFacebookMessage.mockResolvedValueOnce({
      success: false,
      error: 'API_ERROR',
      message: 'Failed to send message',
    });

    const result = await executeTool('company_123456', 'facebook.reply', {
      recipientId: '1234567890',
      message: 'Hello from the agent!',
      pageId: 'page_123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('TOOL_EXECUTION_FAILED');
    expect(mockSendFacebookMessage).toHaveBeenCalledWith(
      '1234567890',
      'Hello from the agent!',
      'TEXT',
      'page_123'
    );
  });

  test('sends an image message when imageUrl is provided', async () => {
    mockSendFacebookMessage.mockResolvedValueOnce({
      success: true,
      messageId: 'mid.image123',
    });

    const result = await executeTool('company_123456', 'facebook.reply', {
      recipientId: '1234567890',
      imageUrl: 'https://cdn.example.test/product.jpg',
      pageId: 'page_123',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      success: true,
      messageId: 'mid.image123',
      recipientId: '1234567890',
      pageId: 'page_123',
      messageType: 'IMAGE',
      status: 'SENT',
    });
    expect(mockSendFacebookMessage).toHaveBeenCalledWith(
      '1234567890',
      'https://cdn.example.test/product.jpg',
      'IMAGE',
      'page_123'
    );
  });
});
