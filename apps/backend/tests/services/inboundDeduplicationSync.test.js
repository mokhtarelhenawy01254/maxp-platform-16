const claimedKeys = new Map();
let claimSeq = 0;

const mockPrisma = {
  $executeRawUnsafe: jest.fn(async () => 0),
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  conversation: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  message: {
    create: jest.fn(),
  },
  messageInboundDedupe: {
    create: jest.fn(async ({ data }) => {
      const key = `${data.companyId}:${data.channel}:${data.externalMessageId}`;
      if (claimedKeys.has(key)) {
        const err = new Error(`Unique constraint failed on ${key}`);
        err.code = 'P2002';
        throw err;
      }
      const record = { id: `claim-${++claimSeq}`, ...data };
      claimedKeys.set(key, record);
      return record;
    }),
    updateMany: jest.fn(async () => ({ count: 1 })),
    update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })),
    delete: jest.fn(async ({ where }) => {
      for (const [k, v] of claimedKeys.entries()) {
        if (v.id === where.id) {
          claimedKeys.delete(k);
          break;
        }
      }
      return { id: where.id };
    }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn((op) => op()),
}));

jest.mock('../../services/inboxNotificationService', () => ({
  notifyNewMessage: jest.fn(async () => {}),
}));

jest.mock('../../services/whatsappAssignmentEngineService', () => ({
  assignConversationToBestModerator: jest.fn(async ({ conversationId }) => ({
    conversation: { id: conversationId, assignedUserId: null, status: 'NEW', metadata: '{}' },
  })),
}));

jest.mock('../../services/whatsappInboxSettingsService', () => ({
  getNormalizedSettings: jest.fn(async () => ({})),
}));

const WhatsAppSyncService = require('../../services/whatsapp/WhatsAppSyncService');
const { resetSchemaEnsureState } = require('../../services/inboundDeduplicationGuard');

describe('inboundDeduplicationSync integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    claimedKeys.clear();
    claimSeq = 0;
    resetSchemaEnsureState();

    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      companyId: 'comp-1',
      firstName: 'Ali',
      lastName: 'Hassan',
      phone: '201001234567',
      phoneNormalized: '+201001234567',
      whatsappId: '201001234567',
    });

    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      companyId: 'comp-1',
      customerId: 'cust-1',
      status: 'NEW',
      assignedUserId: null,
      metadata: JSON.stringify({ sessionId: 'sess-1', remoteJid: '201001234567@s.whatsapp.net' }),
    });

    mockPrisma.conversation.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      ...data,
    }));

    mockPrisma.message.create.mockImplementation(async ({ data }) => ({
      id: 'msg-1',
      ...data,
    }));
  });

  test('sequential syncMessage with same wamid creates message once and logs single duplicate_skipped', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const messageData = {
      messageId: 'wamid.HBgLMjAxMDAxMjM0NTY3FQIAERgSMTIzNDU2',
      type: 'image',
      content: '',
      mediaUrl: 'https://cdn.example.com/photo.jpg',
      timestamp: new Date('2026-11-12T10:00:00Z'),
      pushName: 'Ali',
    };

    const first = await WhatsAppSyncService.syncMessage(
      'comp-1',
      'sess-1',
      '201001234567@s.whatsapp.net',
      messageData,
      true
    );
    const second = await WhatsAppSyncService.syncMessage(
      'comp-1',
      'sess-1',
      '201001234567@s.whatsapp.net',
      messageData,
      true
    );

    expect(first.wasCreated).toBe(true);
    expect(first.message.id).toBe('msg-1');
    expect(first.message.channel).toBe('whatsapp');
    expect(first.message.externalMessageId).toBe(messageData.messageId);

    expect(second.wasCreated).toBe(false);
    expect(second.message).toBeNull();
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);

    const dupLogs = logSpy.mock.calls
      .map((args) => args.join(' '))
      .filter((line) => line.includes('[INBOUND-DEDUPE] duplicate_skipped'));
    expect(dupLogs).toHaveLength(1);
    expect(dupLogs[0]).toContain(`externalMessageId=${messageData.messageId}`);
    expect(dupLogs[0]).toContain('companyId=comp-1');
    logSpy.mockRestore();
  });

  test('parallel Promise.all syncMessage with same wamid creates message atomically once', async () => {
    const messageData = {
      messageId: 'wamid.PARALLEL_EMOJI_001',
      type: 'text',
      content: '👍',
      timestamp: new Date('2026-11-12T10:01:00Z'),
      pushName: 'Ali',
    };

    const [resA, resB] = await Promise.all([
      WhatsAppSyncService.syncMessage('comp-1', 'sess-1', '201001234567@s.whatsapp.net', messageData, true),
      WhatsAppSyncService.syncMessage('comp-1', 'sess-1', '201001234567@s.whatsapp.net', messageData, true),
    ]);

    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
    const createdCount = [resA, resB].filter((r) => r && r.wasCreated === true).length;
    const skippedCount = [resA, resB].filter((r) => r && r.wasCreated === false).length;
    expect(createdCount).toBe(1);
    expect(skippedCount).toBe(1);
  });

  test('releases claim when message.create fails so retry succeeds', async () => {
    const messageData = {
      messageId: 'wamid.RETRY_001',
      type: 'text',
      content: 'hello',
      timestamp: new Date('2026-11-12T10:02:00Z'),
      pushName: 'Ali',
    };

    mockPrisma.message.create
      .mockRejectedValueOnce(new Error('Transient DB write failure'))
      .mockResolvedValueOnce({ id: 'msg-retry-1', channel: 'whatsapp', externalMessageId: messageData.messageId });

    const firstAttempt = await WhatsAppSyncService.syncMessage(
      'comp-1',
      'sess-1',
      '201001234567@s.whatsapp.net',
      messageData,
      true
    );
    expect(firstAttempt).toBeNull();
    expect(mockPrisma.messageInboundDedupe.delete).toHaveBeenCalledTimes(1);

    const retryAttempt = await WhatsAppSyncService.syncMessage(
      'comp-1',
      'sess-1',
      '201001234567@s.whatsapp.net',
      messageData,
      true
    );
    expect(retryAttempt.wasCreated).toBe(true);
    expect(retryAttempt.message.id).toBe('msg-retry-1');
  });
});
