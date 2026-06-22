jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppInboundService', () => ({
  saveIncomingMessage: jest.fn(async () => ({ id: 'saved-message-1' })),
  updateMessageStatus: jest.fn(async () => undefined)
}));

jest.mock('../../utils/webhookSignature', () => ({
  verifyMetaWebhookSignature: jest.fn(() => ({ ok: false, reason: 'no_signature' }))
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { saveIncomingMessage } = require('../../services/whatsapp/WhatsAppInboundService');
const { buildMetaSessionLookup, postWebhook } = require('../../controller/whatsappMetaWebhookController');

describe('whatsappMetaWebhookController', () => {
  let prisma;
  let warnSpy;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.META_WA_APP_SECRET;
    delete process.env.META_WA_WEBHOOK_SECRET;

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    prisma = {
      whatsAppSession: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => ({
          id: 'active-meta-session',
          companyId: 'company-1'
        }))
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    saveIncomingMessage.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('builds Meta session lookup that ignores deleted duplicates and prefers the default latest session', () => {
    expect(buildMetaSessionLookup({
      phoneNumberId: '1165821659950962',
      displayPhoneNumber: '+201033316739'
    })).toEqual({
      where: {
        provider: 'META_CLOUD',
        OR: [
          { metaPhoneNumberId: '1165821659950962' },
          { metaDisplayPhoneNumber: '+201033316739' }
        ],
        NOT: [
          { metadata: { contains: '"isDeleted":true' } },
          { metadata: { contains: '"isDeleted": true' } }
        ]
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
  });

  test('saves inbound Meta message against the resolved active session', async () => {
    const req = {
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              metadata: {
                phone_number_id: '1165821659950962',
                display_phone_number: '+201033316739'
              },
              contacts: [{ profile: { name: 'Mokhtar' } }],
              messages: [{
                id: 'wamid.test',
                from: '201123087745',
                timestamp: '1782165000',
                type: 'text',
                text: { body: 'عندك منتجات ايه' }
              }]
            }
          }]
        }]
      }
    };
    const res = {
      sendStatus: jest.fn(),
      status: jest.fn(function status() { return this; }),
      json: jest.fn()
    };

    await postWebhook(req, res);

    expect(prisma.whatsAppSession.findFirst).toHaveBeenCalledWith(
      buildMetaSessionLookup({
        phoneNumberId: '1165821659950962',
        displayPhoneNumber: '+201033316739'
      })
    );
    expect(saveIncomingMessage).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'active-meta-session',
      companyId: 'company-1',
      remoteJid: '201123087745@s.whatsapp.net',
      messageId: 'wamid.test',
      messageType: 'TEXT',
      content: 'عندك منتجات ايه',
      pushName: 'Mokhtar'
    }));
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });
});
