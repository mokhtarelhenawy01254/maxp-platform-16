const WhatsAppReactionService = require('../../services/whatsapp/WhatsAppReactionService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    whatsAppMessage: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    whatsAppSession: {
      findUnique: jest.fn()
    }
  };
  return {
    getSharedPrismaClient: () => mockPrisma
  };
});

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  }))
}));

jest.mock('../../services/whatsappRealtimeAudienceService', () => ({
  emitToAudience: jest.fn(),
  getConversationAudience: jest.fn(async () => ({ userIds: ['user-1'] }))
}));

describe('WhatsAppReactionService', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyReactionToMessage', () => {
    it('applies a new emoji reaction and persists to metadata', async () => {
      prisma.whatsAppMessage.findFirst.mockResolvedValue({
        id: 'msg-db-1',
        messageId: 'wamid-100',
        sessionId: 'session-1',
        remoteJid: '201000000000@s.whatsapp.net',
        metadata: JSON.stringify({ existingProp: true })
      });
      prisma.whatsAppMessage.update.mockResolvedValue({});
      prisma.whatsAppSession.findUnique.mockResolvedValue({ companyId: 'company-1' });

      const res = await WhatsAppReactionService.applyReactionToMessage({
        sessionId: 'session-1',
        companyId: 'company-1',
        remoteJid: '201000000000@s.whatsapp.net',
        targetMessageId: 'wamid-100',
        reactorKey: 'me',
        emoji: '❤️',
        fromMe: true
      });

      expect(res).toEqual({
        messageId: 'wamid-100',
        reactions: { me: '❤️' }
      });

      expect(prisma.whatsAppMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-db-1' },
        data: expect.objectContaining({
          metadata: JSON.stringify({ existingProp: true, reactions: { me: '❤️' } })
        })
      });
    });

    it('removes reaction when emoji is empty string', async () => {
      prisma.whatsAppMessage.findFirst.mockResolvedValue({
        id: 'msg-db-2',
        messageId: 'wamid-200',
        sessionId: 'session-1',
        remoteJid: '201000000000@s.whatsapp.net',
        metadata: JSON.stringify({ reactions: { me: '❤️', customer: '👍' } })
      });
      prisma.whatsAppMessage.update.mockResolvedValue({});
      prisma.whatsAppSession.findUnique.mockResolvedValue({ companyId: 'company-1' });

      const res = await WhatsAppReactionService.applyReactionToMessage({
        sessionId: 'session-1',
        companyId: 'company-1',
        remoteJid: '201000000000@s.whatsapp.net',
        targetMessageId: 'wamid-200',
        reactorKey: 'me',
        emoji: '',
        fromMe: true
      });

      expect(res).toEqual({
        messageId: 'wamid-200',
        reactions: { customer: '👍' }
      });

      expect(prisma.whatsAppMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-db-2' },
        data: expect.objectContaining({
          metadata: JSON.stringify({ reactions: { customer: '👍' } })
        })
      });
    });
  });

  describe('attachReactionsToMessages', () => {
    it('aggregates reactions from REACTION-type messages and metadata', () => {
      const messages = [
        {
          messageId: 'target-1',
          content: 'Hello world',
          messageType: 'TEXT',
          fromMe: false,
          metadata: JSON.stringify({ reactions: { me: '❤️' } })
        },
        {
          messageId: 'reaction-msg-1',
          quotedMessageId: 'target-1',
          messageType: 'REACTION',
          content: '😂',
          fromMe: false,
          participant: 'customer-1'
        },
        {
          messageId: 'target-2',
          content: 'No reactions',
          messageType: 'TEXT',
          fromMe: true
        }
      ];

      const result = WhatsAppReactionService.attachReactionsToMessages(messages);

      expect(result[0].reactions).toEqual({
        me: '❤️',
        'customer-1': '😂'
      });
      expect(result[2].reactions).toBeUndefined();
    });
  });
});
