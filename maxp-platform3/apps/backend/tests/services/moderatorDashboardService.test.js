const mockPrisma = {
  conversation: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  whatsAppSession: {
    findMany: jest.fn(),
  },
  moderatorTeamMember: {
    findMany: jest.fn(),
  },
  whatsAppNumberAssignment: {
    findMany: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../services/socketService', () => ({
  isUserOnline: jest.fn(() => false),
}));

const redisCacheService = require('../../services/redisCacheService');
const moderatorDashboardService = require('../../services/moderatorDashboardService');

describe('moderatorDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisCacheService.get.mockResolvedValue(null);
    redisCacheService.set.mockResolvedValue(undefined);

    mockPrisma.conversation.count.mockResolvedValue(0);
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.moderatorTeamMember.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppNumberAssignment.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
  });

  test('getDashboardData queries valid customer fields and returns customer.name for the UI', async () => {
    mockPrisma.whatsAppSession.findMany
      .mockResolvedValueOnce([{ id: 'session-1' }])
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          name: 'الخط الرئيسي',
          phoneNumber: '201000000000',
          status: 'CONNECTED',
          lastConnectedAt: null,
        },
      ]);

    mockPrisma.conversation.findMany
      .mockResolvedValueOnce([
        {
          id: 'conv-1',
          status: 'ACTIVE',
          lastMessageAt: '2026-05-17T09:00:00.000Z',
          lastMessageIsFromCustomer: false,
          createdAt: '2026-05-17T08:00:00.000Z',
          updatedAt: '2026-05-17T09:00:00.000Z',
          isRead: false,
          metadata: null,
        },
        {
          id: 'conv-2',
          status: 'PENDING',
          lastMessageAt: '2026-05-17T08:30:00.000Z',
          lastMessageIsFromCustomer: false,
          createdAt: '2026-05-17T08:10:00.000Z',
          updatedAt: '2026-05-17T08:30:00.000Z',
          isRead: true,
          metadata: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'conv-1',
          status: 'ACTIVE',
          lastMessageAt: '2026-05-17T09:00:00.000Z',
          lastMessagePreview: 'أهلاً',
          isRead: false,
          customer: {
            id: 'cust-1',
            firstName: 'سارة',
            lastName: 'علي',
            phone: '201111111111',
            avatar: null,
          },
        },
        {
          id: 'conv-2',
          status: 'PENDING',
          lastMessageAt: '2026-05-17T08:30:00.000Z',
          lastMessagePreview: null,
          isRead: true,
          customer: {
            id: 'cust-2',
            firstName: '',
            lastName: '',
            phone: '201222222222',
            avatar: null,
          },
        },
      ]);

    const result = await moderatorDashboardService.getDashboardData(
      'company-1',
      'user-1',
      'COMPANY_ADMIN'
    );

    expect(mockPrisma.conversation.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        include: expect.objectContaining({
          customer: {
            select: expect.objectContaining({
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
            }),
          },
          user: {
            select: expect.objectContaining({
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: true,
            }),
          },
        }),
      })
    );

    expect(result.latestConversations).toEqual([
      expect.objectContaining({
        id: 'conv-1',
        customer: {
          id: 'cust-1',
          name: 'سارة علي',
          phone: '201111111111',
          avatar: null,
        },
        queueKey: 'ASSIGNED_QUEUE',
      }),
      expect.objectContaining({
        id: 'conv-2',
        customer: {
          id: 'cust-2',
          name: '201222222222',
          phone: '201222222222',
          avatar: null,
        },
        queueKey: 'PENDING_QUEUE',
      }),
    ]);
    expect(result.queueCounters).toEqual(expect.objectContaining({
      assigned: 1,
      pending: 1,
      total: 2,
    }));
    expect(result.latestConversations[0].customer).not.toHaveProperty('firstName');
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { conversationId: 'asc' },
          { createdAt: 'asc' },
        ],
      })
    );
    expect(redisCacheService.set).toHaveBeenCalled();
  });

  test('getTeamDashboard uses the Prisma user relation and preserves assignedUser in the API payload', async () => {
    mockPrisma.moderatorTeamMember.findMany.mockResolvedValue([{ userId: 'agent-1' }]);
    mockPrisma.conversation.findMany.mockResolvedValue([
      {
        id: 'conv-team-1',
        status: 'ACTIVE',
        lastMessageAt: '2026-05-17T10:00:00.000Z',
        lastMessagePreview: 'متابعة',
        isRead: true,
        assignedUserId: 'agent-1',
        customer: {
          id: 'cust-3',
          firstName: 'محمد',
          lastName: 'حسن',
          phone: '201333333333',
          avatar: 'avatar.png',
        },
        user: {
          id: 'agent-1',
          firstName: 'أحمد',
          lastName: 'سمير',
        },
      },
    ]);

    const result = await moderatorDashboardService.getTeamDashboard('company-1', 'team-1');

    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          customer: {
            select: expect.objectContaining({
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
            }),
          },
          user: {
            select: expect.objectContaining({
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: true,
            }),
          },
        }),
      })
    );

    expect(result.teamConversations).toEqual([
      expect.objectContaining({
        id: 'conv-team-1',
        customer: {
          id: 'cust-3',
          name: 'محمد حسن',
          phone: '201333333333',
          avatar: 'avatar.png',
        },
        assignedUser: {
          id: 'agent-1',
          firstName: 'أحمد',
          lastName: 'سمير',
          avatar: undefined,
          department: null,
        },
        queueKey: 'ASSIGNED_QUEUE',
      }),
    ]);
    expect(result.queueCounters).toEqual(expect.objectContaining({
      assigned: 1,
      total: 1,
    }));
    expect(result.teamConversations[0]).not.toHaveProperty('user');
  });
});
