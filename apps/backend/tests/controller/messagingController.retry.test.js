/**
 * Unit tests — إعادة إرسال الرسالة الفاشلة لنفس السجل (Task f508775c).
 * المرافق: apps/backend/controller/conversation/messagingController.js
 */

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation())
}));

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));

jest.mock('../../utils/production-facebook-fix', () => ({
  sendProductionFacebookMessage: jest.fn()
}));

jest.mock('../../utils/facebookWindow', () => {
  const actual = jest.requireActual('../../utils/facebookWindow');
  return {
    ...actual,
    computeFacebookWindow: jest.fn(actual.computeFacebookWindow)
  };
});

jest.mock('../../utils/deliveryFailureMonitor', () => ({
  deliveryFailureMonitor: {
    recordDeliveryAttempt: jest.fn()
  }
}));

jest.mock('../../controller/conversation/conversationShared', () => ({
  getPageToken: jest.fn().mockResolvedValue({
    pageAccessToken: 'test_page_token_123',
    pageName: 'Test Page',
    companyId: 'company_1'
  }),
  getLastWebhookPageId: jest.fn().mockReturnValue('page_123'),
  isValidMessageContent: jest.fn().mockReturnValue(true),
  processedMessages: new Set()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { sendProductionFacebookMessage } = require('../../utils/production-facebook-fix');
const { computeFacebookWindow } = require('../../utils/facebookWindow');
const { retryMessage } = require('../../controller/conversation/messagingController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('TASK f508775c — retryMessage endpoint', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      conversation: {
        findFirst: jest.fn()
      },
      message: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      facebookPage: {
        findFirst: jest.fn().mockResolvedValue({
          pageId: 'page_123',
          pageAccessToken: 'test_page_token_123',
          pageName: 'Test Page',
          companyId: 'company_1'
        })
      }
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  // 1. retry على رسالة FAILED → نفس id اتحدّث لـSENT، وmessage.create مش اتنادى
  test('1. retry on FAILED message updates the same record to SENT and does NOT call message.create', async () => {
    const conversationId = 'conv_1';
    const messageId = 'msg_failed_1';
    const companyId = 'company_1';

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: conversationId,
      companyId,
      channel: 'FACEBOOK',
      customer: {
        id: 'cust_1',
        facebookId: 'fb_user_123'
      },
      metadata: JSON.stringify({ pageId: 'page_123' })
    });

    mockPrisma.message.findFirst
      .mockResolvedValueOnce({
        id: messageId,
        conversationId,
        content: 'مرحبًا بك، تم تحديث طلبك',
        type: 'TEXT',
        deliveryStatus: 'FAILED',
        failureReason: 'Network error',
        metadata: JSON.stringify({
          deliveryStatus: 'FAILED',
          failureReason: 'Network error'
        })
      })
      .mockResolvedValueOnce({
        // last inbound message
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        isFromCustomer: true
      });

    sendProductionFacebookMessage.mockResolvedValue({
      success: true,
      messageId: 'mid.fb.success.123'
    });

    mockPrisma.message.update.mockResolvedValue({
      id: messageId,
      deliveryStatus: 'SENT'
    });

    const req = {
      params: { conversationId, messageId },
      user: { companyId, id: 'user_1' }
    };
    const res = createResponse();

    await retryMessage(req, res);

    // message.create MUST NOT be called
    expect(mockPrisma.message.create).not.toHaveBeenCalled();

    // Meta API must be called with original message content
    expect(sendProductionFacebookMessage).toHaveBeenCalledWith(
      'fb_user_123',
      'مرحبًا بك، تم تحديث طلبك',
      'TEXT',
      'page_123',
      'test_page_token_123'
    );

    // message.update MUST update the existing message record to SENT
    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: messageId },
        data: expect.objectContaining({
          deliveryStatus: 'SENT',
          failureReason: null
        })
      })
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        deliveryStatus: 'SENT',
        data: expect.objectContaining({
          id: messageId,
          deliveryStatus: 'SENT',
          facebookMessageId: 'mid.fb.success.123'
        })
      })
    );
  });

  // 2. retry والنافذة مقفولة → 409 وصفر نداءات ميتا والصف زي ما هو
  test('2. retry with expired window returns 409 with zero Meta calls and row unchanged', async () => {
    const conversationId = 'conv_1';
    const messageId = 'msg_failed_1';
    const companyId = 'company_1';

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: conversationId,
      companyId,
      channel: 'FACEBOOK',
      customer: {
        id: 'cust_1',
        facebookId: 'fb_user_123'
      }
    });

    mockPrisma.message.findFirst
      .mockResolvedValueOnce({
        id: messageId,
        conversationId,
        content: 'مرحبًا',
        deliveryStatus: 'FAILED',
        failureReason: 'Timeout'
      })
      .mockResolvedValueOnce({
        // Last inbound message was 30 hours ago => window closed
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        isFromCustomer: true
      });

    const req = {
      params: { conversationId, messageId },
      user: { companyId, id: 'user_1' }
    };
    const res = createResponse();

    await retryMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'WINDOW_EXPIRED'
      })
    );

    // ZERO Meta calls
    expect(sendProductionFacebookMessage).not.toHaveBeenCalled();

    // Row unchanged: no updates or creates
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
    expect(mockPrisma.message.update).not.toHaveBeenCalled();
  });

  // 3. retry على SENT → 400 وبدون إرسال
  test('3. retry on SENT message returns 400 ALREADY_SENT without sending', async () => {
    const conversationId = 'conv_1';
    const messageId = 'msg_sent_1';
    const companyId = 'company_1';

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: conversationId,
      companyId,
      channel: 'FACEBOOK',
      customer: {
        id: 'cust_1',
        facebookId: 'fb_user_123'
      }
    });

    mockPrisma.message.findFirst.mockResolvedValue({
      id: messageId,
      conversationId,
      content: 'رسالة سابقة',
      deliveryStatus: 'SENT'
    });

    const req = {
      params: { conversationId, messageId },
      user: { companyId, id: 'user_1' }
    };
    const res = createResponse();

    await retryMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'ALREADY_SENT'
      })
    );

    expect(sendProductionFacebookMessage).not.toHaveBeenCalled();
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
    expect(mockPrisma.message.update).not.toHaveBeenCalled();
  });

  // 4. شركة تانية → 404
  test('4. different company request returns 404', async () => {
    const conversationId = 'conv_1';
    const messageId = 'msg_1';
    const otherCompanyId = 'company_foreign';

    // Conversation is NOT found because companyId boundary is enforced
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    const req = {
      params: { conversationId, messageId },
      user: { companyId: otherCompanyId, id: 'user_other' }
    };
    const res = createResponse();

    await retryMessage(req, res);

    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conversationId, companyId: otherCompanyId }
      })
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'NOT_FOUND'
      })
    );

    expect(sendProductionFacebookMessage).not.toHaveBeenCalled();
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
    expect(mockPrisma.message.update).not.toHaveBeenCalled();
  });
});
