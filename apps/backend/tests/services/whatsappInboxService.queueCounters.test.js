const mockPrisma = {
  conversation: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/socketService', () => ({
  emitToCompany: jest.fn(),
}));

jest.mock('../../services/whatsappInboxSettingsService', () => ({
  getNormalizedSettings: jest.fn(),
  serializeSettingsPayload: jest.fn((payload) => payload),
}));

jest.mock('../../services/inboxNotificationService', () => ({
  notifyNewMessage: jest.fn(),
  notifyTransfer: jest.fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppWindowService', () => ({
  computeWindowStatus: jest.fn(() => ({ isOpen: true })),
}));

jest.mock('../../middleware/rbacMiddleware', () => ({
  normalizeRole: jest.fn((role) => role),
}));

jest.mock('../../services/whatsappConversationRoutingService', () => ({
  ROUTING_MODES: {},
  getAssignmentRoutingUserIds: jest.fn(() => []),
  getSessionAssignment: jest.fn(() => null),
  normalizeRoutingMode: jest.fn(() => 'SHARED_INBOX'),
}));

const whatsappInboxService = require('../../services/whatsappInboxService');

describe('WhatsAppInboxService._getQueueCounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const where = { companyId: 'company-1', channel: 'WHATSAPP' };

  test('computes counters from groupBy statuses without pulling every row', async () => {
    mockPrisma.conversation.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 2 } },
      { status: 'ACTIVE', _count: { _all: 3 } },
      { status: 'ESCALATED', _count: { _all: 1 } },
      { status: 'CLOSED', _count: { _all: 5 } },
      { status: 'PENDING', _count: { _all: 4 } },
    ]);

    mockPrisma.conversation.findMany.mockImplementation((args) => {
      // SLA candidates: non-CLOSED conversations
      if (args.select.metadata) {
        return Promise.resolve([
          { status: 'NEW', metadata: JSON.stringify({ sla: { maxWaitingDeadlineAt: new Date(Date.now() - 10000).toISOString() } }) },
          { status: 'ACTIVE', metadata: JSON.stringify({ sla: { maxWaitingDeadlineAt: new Date(Date.now() + 60000).toISOString() } }) },
        ]);
      }
      // Missed chats candidates
      return Promise.resolve([
        { lastMessageAt: new Date(Date.now() - 40 * 60 * 1000) },
        { lastMessageAt: new Date(Date.now() - 5 * 60 * 1000) },
      ]);
    });

    const counters = await whatsappInboxService._getQueueCounters(mockPrisma, where);

    expect(counters.total).toBe(15);
    expect(counters.waiting).toBe(2); // NEW
    expect(counters.assigned).toBe(4); // ACTIVE + ESCALATED
    expect(counters.pending).toBe(4); // PENDING
    expect(counters.closed).toBe(5); // CLOSED
    expect(counters.escalated).toBe(1);
    expect(counters.slaBreached).toBe(1); // only the expired deadline
    expect(counters.missedChats).toBe(1); // only the 40-min-old one

    // Filters pushed to SQL instead of pulling all rows
    expect(mockPrisma.conversation.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where,
      _count: { _all: true },
    });
  });

  test('returns zeros when no conversations exist', async () => {
    mockPrisma.conversation.groupBy.mockResolvedValue([]);
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    const counters = await whatsappInboxService._getQueueCounters(mockPrisma, where);

    expect(counters).toEqual({
      total: 0,
      waiting: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      escalated: 0,
      slaBreached: 0,
      missedChats: 0,
    });
  });
});
