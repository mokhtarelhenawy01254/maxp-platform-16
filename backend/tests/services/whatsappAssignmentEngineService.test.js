const mockPrisma = {
  conversation: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/socketService', () => ({
  isUserOnline: jest.fn(),
  emitToCompany: jest.fn(),
}));

jest.mock('../../services/inboxNotificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../../services/whatsappInboxSettingsService', () => ({
  getNormalizedSettings: jest.fn(),
  serializeSettingsPayload: jest.fn((payload) => payload),
}));

const socketService = require('../../services/socketService');
const { getNormalizedSettings } = require('../../services/whatsappInboxSettingsService');
const whatsappAssignmentEngineService = require('../../services/whatsappAssignmentEngineService');

const buildSettings = (overrides = {}) => ({
  assignmentConfig: {
    strategy: 'ROUND_ROBIN',
    roundRobin: {
      enabled: true,
      stickyReturningCustomers: true,
      respectOnlineStatus: true,
      respectWorkingHours: true,
    },
    leastLoad: {
      activeWeight: 1,
      pendingWeight: 1.5,
      waitingWeight: 1.2,
      unreadWeight: 0.35,
    },
    smartRouting: {
      priorityCustomersFirst: true,
      vipRouting: true,
      countryDetection: true,
      languageDetection: true,
      returningCustomerPreference: true,
      previousOwnerPreference: true,
    },
  },
  ownershipConfig: {
    lockDurationMin: 120,
  },
  queueConfig: {
    maxChatsPerModerator: 25,
  },
  reassignmentConfig: {
    enabled: true,
    timeoutMinutes: 5,
    reassignOnOffline: true,
    reassignOutsideWorkingHours: true,
    reassignOnCapacityReached: true,
  },
  skillConfig: {
    vipTeams: ['team-vip'],
  },
  slaConfig: {
    firstResponseMinutes: 5,
    maxWaitingMinutes: 15,
  },
  assignmentState: {
    roundRobinIndexByScope: {},
  },
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingDays: 'SAT,SUN,MON,TUE,WED,THU',
  ...overrides,
});

describe('whatsappAssignmentEngineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketService.isUserOnline.mockReturnValue(true);
    getNormalizedSettings.mockResolvedValue(buildSettings());
    mockPrisma.conversation.findUnique.mockResolvedValue(null);
    mockPrisma.conversation.count.mockResolvedValue(0);
    mockPrisma.user.findUnique.mockResolvedValue(null);
  });

  test('round robin respects the saved scope index when choosing a moderator', () => {
    const choice = whatsappAssignmentEngineService._pickCandidate(
      [
        {
          user: { id: 'moderator-1', firstName: 'A' },
          workload: { totalWeighted: 2 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: [],
        },
        {
          user: { id: 'moderator-2', firstName: 'B' },
          workload: { totalWeighted: 1 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: [],
        },
        {
          user: { id: 'moderator-3', firstName: 'C' },
          workload: { totalWeighted: 0 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: [],
        },
      ],
      {
        sessionId: 'session-1',
        strategy: 'ROUND_ROBIN',
      },
      buildSettings({
        assignmentState: {
          roundRobinIndexByScope: {
            'session-1': 1,
          },
        },
      })
    );

    expect(choice.user.id).toBe('moderator-2');
    expect(choice.strategy).toBe('ROUND_ROBIN');
  });

  test('least load routing prefers the lightest weighted workload', () => {
    const choice = whatsappAssignmentEngineService._pickCandidate(
      [
        {
          user: { id: 'busy', firstName: 'Busy' },
          workload: { totalWeighted: 7 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: [],
        },
        {
          user: { id: 'light', firstName: 'Light' },
          workload: { totalWeighted: 1.2 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: [],
        },
      ],
      {
        sessionId: 'session-2',
        strategy: 'LEAST_LOAD',
      },
      buildSettings({
        assignmentConfig: {
          ...buildSettings().assignmentConfig,
          strategy: 'LEAST_LOAD',
        },
      })
    );

    expect(choice.user.id).toBe('light');
    expect(choice.strategy).toBe('LEAST_LOAD');
  });

  test('skill-based routing favors VIP-ready previous owners when scores are higher', () => {
    const choice = whatsappAssignmentEngineService._pickCandidate(
      [
        {
          user: { id: 'vip-owner', firstName: 'Vip', department: 'vip' },
          teamId: 'team-vip',
          workload: { totalWeighted: 4 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: ['ar', 'eg', 'vip'],
        },
        {
          user: { id: 'standard', firstName: 'Standard', department: 'sales' },
          teamId: 'team-sales',
          workload: { totalWeighted: 0.5 },
          online: true,
          insideWorkingWindow: true,
          overCapacity: false,
          skills: ['ar', 'eg', 'sales'],
        },
      ],
      {
        sessionId: 'session-3',
        strategy: 'SKILL_BASED',
        detectedLanguage: 'ar',
        detectedCountry: 'EG',
        detectedDepartment: 'vip',
        customerType: 'VIP',
        previousOwnerId: 'vip-owner',
      },
      buildSettings({
        assignmentConfig: {
          ...buildSettings().assignmentConfig,
          strategy: 'SKILL_BASED',
        },
      })
    );

    expect(choice.user.id).toBe('vip-owner');
    expect(choice.strategy).toBe('SKILL_BASED');
  });

  test('reassignment triggers when a customer waits past timeout and the owner is offline', async () => {
    const reassignSpy = jest
      .spyOn(whatsappAssignmentEngineService, 'assignConversationToBestModerator')
      .mockResolvedValue({ assignedUserId: 'moderator-2' });

    getNormalizedSettings.mockResolvedValue(buildSettings({
      reassignmentConfig: {
        enabled: true,
        timeoutMinutes: 5,
        reassignOnOffline: true,
        reassignOutsideWorkingHours: false,
        reassignOnCapacityReached: false,
      },
    }));
    socketService.isUserOnline.mockReturnValue(false);
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      companyId: 'company-1',
      status: 'ASSIGNED',
      assignedUserId: 'moderator-1',
      lastMessageAt: new Date(Date.now() - 10 * 60000).toISOString(),
      lastMessageIsFromCustomer: true,
      metadata: JSON.stringify({
        sessionId: 'session-1',
      }),
      customer: {
        id: 'customer-1',
        phone: '201000000000',
        status: 'STANDARD',
        firstName: 'سارة',
        lastName: 'علي',
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'moderator-1',
      timezone: 'Africa/Cairo',
      availability: null,
    });
    mockPrisma.conversation.count.mockResolvedValue(2);

    await whatsappAssignmentEngineService.evaluateConversationForReassignment({
      companyId: 'company-1',
      conversationId: 'conversation-1',
    });

    expect(reassignSpy).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-1',
      conversationId: 'conversation-1',
      sessionId: 'session-1',
      force: true,
      reason: 'response_timeout',
      excludeUserIds: ['moderator-1'],
    }));

    reassignSpy.mockRestore();
  });
});
