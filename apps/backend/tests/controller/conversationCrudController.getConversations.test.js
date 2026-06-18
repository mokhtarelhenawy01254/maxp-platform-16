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

const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const { getConversations } = require('../../controller/conversation/conversationCrudController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createPrismaMock = (overrides = {}) => ({
  conversation: {
    findMany: jest.fn().mockResolvedValue(overrides.conversations || []),
    count: jest.fn().mockResolvedValue(overrides.totalCount || 0),
    findFirst: jest.fn(),
  },
  ...overrides.extra
});

describe('conversationCrudController.getConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects without company ID', async () => {
    const req = { query: {}, user: {} };
    const res = createResponse();

    await getConversations(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns conversations without search filter', async () => {
    const mockConversations = [
      {
        id: 'conv_1',
        customerId: 'cust_1',
        channel: 'FACEBOOK',
        status: 'ACTIVE',
        lastMessagePreview: 'مرحبا',
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        unreadCount: 1,
        assignedUserId: null,
        priority: 1,
        metadata: null,
        customer: { id: 'cust_1', firstName: 'أحمد', lastName: 'السيد' },
        user: null,
        messages: [{ isFromCustomer: true, isRead: false, content: 'مرحبا', type: 'text' }]
      }
    ];

    const prisma = createPrismaMock({
      conversations: mockConversations,
      totalCount: 1
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      query: { page: '1', limit: '20' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await getConversations(req, res);

    expect(prisma.conversation.findMany).toHaveBeenCalled();
    expect(prisma.conversation.count).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'conv_1', customerName: 'أحمد السيد' })
        ]),
        pagination: expect.objectContaining({ total: 1 })
      })
    );
  });

  test('filters by search query matching customer firstName', async () => {
    const prisma = createPrismaMock({
      conversations: [
        {
          id: 'conv_1',
          customerId: 'cust_1',
          channel: 'FACEBOOK',
          status: 'ACTIVE',
          lastMessagePreview: 'مرحبا',
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
          assignedUserId: null,
          priority: 1,
          metadata: null,
          customer: { id: 'cust_1', firstName: 'محمد', lastName: 'العلي' },
          user: null,
          messages: [{ isFromCustomer: true, isRead: false, content: 'مرحبا', type: 'text' }]
        }
      ],
      totalCount: 1
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      query: { page: '1', limit: '20', search: 'محمد' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await getConversations(req, res);

    // Verify search was passed to Prisma where clause
    const findManyCall = prisma.conversation.findMany.mock.calls[0][0];
    expect(findManyCall.where.AND).toBeDefined();
    expect(findManyCall.where.AND[0].OR).toBeDefined();
    expect(findManyCall.where.AND[0].OR).toContainEqual(
      { customer: { firstName: { contains: 'محمد' } } }
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('filters by search query matching lastMessagePreview', async () => {
    const prisma = createPrismaMock({
      conversations: [
        {
          id: 'conv_2',
          customerId: 'cust_2',
          channel: 'FACEBOOK',
          status: 'ACTIVE',
          lastMessagePreview: 'طلب جديد',
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
          assignedUserId: null,
          priority: 1,
          metadata: null,
          customer: { id: 'cust_2', firstName: 'سارة', lastName: 'خالد' },
          user: null,
          messages: [{ isFromCustomer: true, isRead: false, content: 'طلب جديد', type: 'text' }]
        }
      ],
      totalCount: 1
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      query: { page: '1', limit: '20', search: 'طلب' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await getConversations(req, res);

    const findManyCall = prisma.conversation.findMany.mock.calls[0][0];
    expect(findManyCall.where.AND[0].OR).toContainEqual(
      { lastMessagePreview: { contains: 'طلب' } }
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('count uses the same search-filtered where clause', async () => {
    const prisma = createPrismaMock({
      conversations: [],
      totalCount: 0
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      query: { search: 'test' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await getConversations(req, res);

    const countCall = prisma.conversation.count.mock.calls[0][0];
    expect(countCall.where.AND).toBeDefined();
    expect(countCall.where.AND[0].OR).toBeDefined();
  });

  test('returns empty results when search matches nothing', async () => {
    const prisma = createPrismaMock({
      conversations: [],
      totalCount: 0
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = {
      query: { search: ' nonexistent_zzzz ' },
      user: { companyId: 'company_1' }
    };
    const res = createResponse();

    await getConversations(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [],
        pagination: expect.objectContaining({ total: 0 })
      })
    );
  });
});
