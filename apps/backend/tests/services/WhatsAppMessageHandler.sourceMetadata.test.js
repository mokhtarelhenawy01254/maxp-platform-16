jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
  getSession: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppSyncService', () => ({
  syncMessage: jest.fn()
}));

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({
  sendText: jest.fn()
}));

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => null)
}));

jest.mock('../../utils/dbPermissionHelper', () => ({
  isPermissionError: jest.fn(() => false),
  getPermissionErrorMessage: jest.fn(() => 'permission error')
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const MetaCloudProvider = require('../../services/whatsapp/providers/MetaCloudProvider');
const { sendText } = require('../../services/whatsapp/WhatsAppMessageHandler');

describe('WhatsAppMessageHandler source metadata', () => {
  let prisma;

  beforeEach(() => {
    prisma = {
      whatsAppSession: {
        findUnique: jest.fn(async () => ({
          id: 'session-1',
          companyId: 'company-1',
          provider: 'META_CLOUD'
        }))
      },
      whatsAppMessage: {
        upsert: jest.fn(async (args) => ({ id: 'outgoing-1', ...args.create }))
      },
      whatsAppContact: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        upsert: jest.fn(async () => ({}))
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    MetaCloudProvider.sendText.mockResolvedValue({ messageId: 'meta-outgoing-1' });
    jest.clearAllMocks();
  });

  test('persists optional outgoing metadata for Company Assistant WhatsApp replies', async () => {
    await sendText('session-1', '201001112223@s.whatsapp.net', 'تمام', {
      isAIResponse: true,
      metadata: {
        source: 'company_assistant',
        responseSource: {
          type: 'AI',
          usedAi: true
        }
      }
    });

    const upsertArgs = prisma.whatsAppMessage.upsert.mock.calls[0][0];
    expect(JSON.parse(upsertArgs.create.metadata)).toEqual({
      source: 'company_assistant',
      responseSource: {
        type: 'AI',
        usedAi: true
      }
    });
    expect(JSON.parse(upsertArgs.update.metadata)).toEqual({
      source: 'company_assistant',
      responseSource: {
        type: 'AI',
        usedAi: true
      }
    });
  });
});
