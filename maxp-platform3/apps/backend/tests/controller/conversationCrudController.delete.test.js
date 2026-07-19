jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation())
}));

jest.mock('../../services/socketService', () => ({}));
jest.mock('../../utils/messageHealthChecker', () => jest.fn());
jest.mock('../../utils/cachingUtils', () => ({
  conversationCache: {
    invalidateConversation: jest.fn()
  }
}));
jest.mock('../../utils/facebookMediaProxy', () => ({
  proxyCustomerAvatarUrl: jest.fn((_customerId, url) => url)
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { conversationCache } = require('../../utils/cachingUtils');
const { deleteConverstation } = require('../../controller/conversation/conversationCrudController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('conversationCrudController.deleteConverstation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects deletes without an authenticated company', async () => {
    const req = {
      params: { id: 'conv_1' },
      user: {}
    };
    const res = createResponse();

    await deleteConverstation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('معرف الشركة')
      })
    );
    expect(getSharedPrismaClient).not.toHaveBeenCalled();
  });

  test('looks up the conversation inside the current company boundary', async () => {
    const prisma = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      params: { id: 'conv_1' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await deleteConverstation(req, res);

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv_1', companyId: 'company_1' }
      })
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deletes conversation data transactionally and preserves linked orders', async () => {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      mediaFile: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 })
      },
      conversationOutcome: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      conversationMemory: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      message: {
        deleteMany: jest.fn().mockResolvedValue({ count: 4 })
      },
      conversation: {
        delete: jest.fn().mockResolvedValue({ id: 'conv_1' })
      }
    };

    const prisma = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conv_1',
          customer: { firstName: 'Mokhtar' },
          _count: { messages: 4 }
        })
      },
      $transaction: jest.fn(async (callback) => callback(tx))
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      params: { id: 'conv_1' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await deleteConverstation(req, res);

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv_1', companyId: 'company_1' },
      data: { conversationId: null }
    });
    expect(tx.message.deleteMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv_1' }
    });
    expect(tx.conversation.delete).toHaveBeenCalledWith({
      where: { id: 'conv_1' }
    });
    expect(conversationCache.invalidateConversation).toHaveBeenCalledWith(
      'conv_1',
      'company_1'
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          deletedMessagesCount: 4
        })
      })
    );
  });
});
