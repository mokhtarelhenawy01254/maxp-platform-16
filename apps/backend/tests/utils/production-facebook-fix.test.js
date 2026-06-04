jest.mock('axios');
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const axios = require('axios');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  buildUploadFilename,
  handleProductionFacebookError,
  sendProductionFacebookMessage,
  shouldPreferDirectMediaUpload,
  validateFacebookRecipientStrict,
} = require('../../utils/production-facebook-fix');

function mockValidConversation() {
  getSharedPrismaClient.mockReturnValue({
    conversation: {
      findFirst: jest.fn().mockResolvedValue({
        customer: { facebookId: '5099039966872640' },
        messages: [
          {
            createdAt: new Date(Date.now() - 5 * 60 * 1000),
            isFromCustomer: true,
          },
        ],
      }),
    },
  });
}

describe('production-facebook-fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidConversation();
  });

  test('prefers direct upload for image URLs', () => {
    expect(shouldPreferDirectMediaUpload('IMAGE', 'https://example.com/catalog/photo.jpg')).toBe(true);
    expect(shouldPreferDirectMediaUpload('TEXT', 'https://example.com/catalog/photo.jpg')).toBe(false);
  });

  test('keeps encoded filenames readable when preparing upload', () => {
    expect(
      buildUploadFilename(
        'https://example.com/wp-content/uploads/%D8%AA%D8%B1%D9%86%D8%AC-miu-mui-%D8%A8%D9%8A%D8%AC.jpg',
        'image/jpeg',
        'IMAGE',
      ),
    ).toBe('ترنج-miu-mui-بيج.jpg');
  });

  test('uploads image binaries directly to Facebook for remote image URLs', async () => {
    axios.get.mockResolvedValue({
      data: Buffer.from('binary-image'),
      headers: { 'content-type': 'image/jpeg' },
    });
    axios.post.mockResolvedValue({
      data: {
        message_id: 'mid.direct',
        recipient_id: '5099039966872640',
      },
    });

    const result = await sendProductionFacebookMessage(
      '5099039966872640',
      'https://example.com/catalog/photo%20one.jpg',
      'IMAGE',
      'page-1',
      'token-1',
    );

    expect(result).toMatchObject({
      success: true,
      messageId: 'mid.direct',
      recipientId: '5099039966872640',
      transport: 'DIRECT_FILE_UPLOAD',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'https://example.com/catalog/photo%20one.jpg',
      expect.objectContaining({
        responseType: 'arraybuffer',
      }),
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][0]).toBe('https://graph.facebook.com/v18.0/me/messages');
    expect(axios.post.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        params: { access_token: 'token-1' },
      }),
    );
    expect(axios.post.mock.calls[0][2].headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  });

  test('falls back to URL-based image sending when direct upload download fails', async () => {
    axios.get.mockRejectedValue(new Error('download failed'));
    axios.post.mockResolvedValue({
      data: {
        message_id: 'mid.url',
        recipient_id: '5099039966872640',
      },
    });

    const result = await sendProductionFacebookMessage(
      '5099039966872640',
      'https://example.com/catalog/fallback.jpg',
      'IMAGE',
      'page-1',
      'token-1',
    );

    expect(result).toMatchObject({
      success: true,
      messageId: 'mid.url',
      recipientId: '5099039966872640',
    });
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1]).toEqual({
      recipient: { id: '5099039966872640' },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: 'https://example.com/catalog/fallback.jpg',
            is_reusable: true,
          },
        },
      },
      messaging_type: 'RESPONSE',
    });
  });

  test('classifies impersonating-page errors as missing Messenger permissions', () => {
    const result = handleProductionFacebookError({
      code: 190,
      message: "Any of the pages_read_engagement, pages_manage_metadata, pages_messaging permission(s) must be granted before impersonating a user's page.",
    });

    expect(result).toMatchObject({
      success: false,
      error: 'PAGE_MESSAGING_PERMISSION_MISSING',
      canRetry: false,
    });
  });

  test('validates against a recent conversation with customer messages when duplicate conversations exist', async () => {
    const emptyConversation = {
      id: 'conv-empty',
      metadata: JSON.stringify({ pageId: 'page-1' }),
      customer: { facebookId: '5099039966872640' },
      messages: [],
    };
    const activeConversation = {
      id: 'conv-active',
      metadata: JSON.stringify({ pageId: 'page-1' }),
      customer: { facebookId: '5099039966872640' },
      messages: [
        {
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          isFromCustomer: true,
        },
      ],
    };
    const findMany = jest.fn().mockResolvedValue([emptyConversation, activeConversation]);
    getSharedPrismaClient.mockReturnValue({
      conversation: {
        findMany,
      },
    });

    const validation = await validateFacebookRecipientStrict(
      '5099039966872640',
      'page-1',
      'token-1'
    );

    expect(validation).toMatchObject({
      valid: true,
      canSend: true,
      conversation: activeConversation,
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 10,
    }));
  });

  test('does not retry URL-based image sending after a direct-upload permission failure', async () => {
    axios.get.mockResolvedValue({
      data: Buffer.from('binary-image'),
      headers: { 'content-type': 'image/jpeg' },
    });
    axios.post.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 190,
            message: "Any of the pages_read_engagement, pages_manage_metadata, pages_messaging permission(s) must be granted before impersonating a user's page.",
          },
        },
      },
      message: 'Request failed with status code 400',
    });

    const result = await sendProductionFacebookMessage(
      '5099039966872640',
      'https://example.com/catalog/no-retry.jpg',
      'IMAGE',
      'page-1',
      'token-1',
    );

    expect(result).toMatchObject({
      success: false,
      error: 'PAGE_MESSAGING_PERMISSION_MISSING',
      canRetry: false,
    });
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
