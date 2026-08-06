const mockPrisma = {
  conversation: {
    findFirst: jest.fn(),
  },
  whatsAppNumberAssignment: {
    findFirst: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const { getConversationAudience, emitToAudience, clearConversationAudienceCache } = require('../../services/whatsappRealtimeAudienceService');

describe('whatsappRealtimeAudienceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearConversationAudienceCache();
  });

  test('getConversationAudience includes admins, leaders, and assigned agent in Shared Inbox mode', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      assignedUserId: 'agent-1',
    });

    mockPrisma.whatsAppNumberAssignment.findFirst.mockResolvedValue({
      assignedUserId: 'owner-1',
      routingMode: 'SHARED_INBOX',
      routingUserIds: JSON.stringify(['agent-1', 'agent-2']),
      team: {
        members: [
          { userId: 'agent-3', isActive: true },
        ],
      },
    });

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'admin-1', role: 'COMPANY_ADMIN' },
      { id: 'leader-1', role: 'TEAM_LEADER' },
      { id: 'agent-1', role: 'AGENT' },
      { id: 'agent-2', role: 'AGENT' },
    ]);

    const result = await getConversationAudience({
      companyId: 'company-1',
      sessionId: 'session-1',
      conversationId: 'conversation-1',
    });

    expect(result.assignedUserId).toBe('agent-1');
    // Admins and leaders: admin-1, leader-1
    // Assigned agent: agent-1
    // Shared inbox routing users: agent-1, agent-2
    // Team members: agent-3
    expect(result.userIds).toContain('admin-1');
    expect(result.userIds).toContain('leader-1');
    expect(result.userIds).toContain('agent-1');
    expect(result.userIds).toContain('agent-2');
    expect(result.userIds).toContain('agent-3');
    expect(result.userIds).toContain('owner-1');
  });

  test('getConversationAudience includes only assigned user and admins/leaders in Round Robin mode when assigned', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      assignedUserId: 'agent-1',
    });

    mockPrisma.whatsAppNumberAssignment.findFirst.mockResolvedValue({
      assignedUserId: 'owner-1',
      routingMode: 'ROUND_ROBIN',
      routingUserIds: JSON.stringify(['agent-1', 'agent-2']),
      team: {
        members: [
          { userId: 'agent-3', isActive: true },
        ],
      },
    });

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'admin-1', role: 'COMPANY_ADMIN' },
      { id: 'leader-1', role: 'TEAM_LEADER' },
    ]);

    const result = await getConversationAudience({
      companyId: 'company-1',
      sessionId: 'session-1',
      conversationId: 'conversation-1',
    });

    expect(result.userIds).toContain('admin-1');
    expect(result.userIds).toContain('leader-1');
    expect(result.userIds).toContain('agent-1');
    // agent-2 and agent-3 should not be in the list for assigned round-robin chat
    expect(result.userIds).not.toContain('agent-2');
    expect(result.userIds).not.toContain('agent-3');
  });

  test('getConversationAudience caches results so bursts reuse one DB round-trip', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      assignedUserId: 'agent-1',
    });

    mockPrisma.whatsAppNumberAssignment.findFirst.mockResolvedValue({
      assignedUserId: 'owner-1',
      routingMode: 'SHARED_INBOX',
      routingUserIds: JSON.stringify(['agent-1', 'agent-2']),
      team: {
        members: [
          { userId: 'agent-3', isActive: true },
        ],
      },
    });

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'admin-1', role: 'COMPANY_ADMIN' },
      { id: 'agent-1', role: 'AGENT' },
    ]);

    const args = {
      companyId: 'company-1',
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      remoteJid: '20123456789@s.whatsapp.net',
    };

    const first = await getConversationAudience(args);
    const second = await getConversationAudience(args);

    expect(first).toEqual(second);
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);

    clearConversationAudienceCache();
    await getConversationAudience(args);
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(2);
  });
});
