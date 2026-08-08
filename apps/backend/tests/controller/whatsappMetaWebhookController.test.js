jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppInboundService', () => ({
  saveIncomingMessage: jest.fn(async () => ({ id: 'saved-message-1' })),
  updateMessageStatus: jest.fn(async () => undefined)
}));

jest.mock('../../utils/webhookSignature', () => ({
  verifyMetaWebhookSignature: jest.fn(() => ({ ok: false, reason: 'no_signature' })),
  shouldStrictlyEnforceMetaWebhookSignature: jest.fn(() => true)
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { saveIncomingMessage, updateMessageStatus } = require('../../services/whatsapp/WhatsAppInboundService');
const { verifyMetaWebhookSignature, shouldStrictlyEnforceMetaWebhookSignature } = require('../../utils/webhookSignature');
const { buildMetaSessionLookup, getWebhook, postWebhook } = require('../../controller/whatsappMetaWebhookController');

describe('whatsappMetaWebhookController', () => {
  let prisma;
  let warnSpy;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.META_WA_APP_SECRET;
    delete process.env.META_WA_WEBHOOK_SECRET;

    verifyMetaWebhookSignature.mockReturnValue({ ok: false, reason: 'no_signature' });
    shouldStrictlyEnforceMetaWebhookSignature.mockReturnValue(true);

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
        status: 'CONNECTED',
        OR: [
          { metaPhoneNumberId: '1165821659950962' },
          { metaDisplayPhoneNumber: '+201033316739' }
        ],
        AND: [
          {
            OR: [
              { metadata: null },
              {
                NOT: [
                  { metadata: { contains: '"isDeleted":true' } },
                  { metadata: { contains: '"isDeleted": true' } }
                ]
              }
            ]
          }
        ]
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    });
  });

  test('saves inbound Meta message against the resolved active session', async () => {
    process.env.META_WA_APP_SECRET = 'test-app-secret';
    verifyMetaWebhookSignature.mockReturnValue({ ok: true, reason: 'valid' });
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

  test('rejects unverified webhook with 403 when strict signature enforcement is enabled', async () => {
    process.env.META_WA_APP_SECRET = 'test-app-secret';
    verifyMetaWebhookSignature.mockReturnValue({ ok: false, reason: 'invalid_signature' });
    shouldStrictlyEnforceMetaWebhookSignature.mockReturnValue(true);
    const req = { body: { object: 'whatsapp_business_account', entry: [] } };
    const res = {
      sendStatus: jest.fn(),
      status: jest.fn(function status() { return this; }),
      json: jest.fn()
    };

    await postWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(saveIncomingMessage).not.toHaveBeenCalled();
  });

  test('processes unverified webhook when strict signature enforcement is disabled', async () => {
    process.env.META_WA_APP_SECRET = 'test-app-secret';
    verifyMetaWebhookSignature.mockReturnValue({ ok: false, reason: 'invalid_signature' });
    shouldStrictlyEnforceMetaWebhookSignature.mockReturnValue(false);
    const req = {
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              metadata: { phone_number_id: '1165821659950962', display_phone_number: '+201033316739' },
              messages: [{
                id: 'wamid.test2',
                from: '201123087745',
                timestamp: '1782165000',
                type: 'text',
                text: { body: 'سلام' }
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

    expect(saveIncomingMessage).toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('forwards status errors + recipient_id + timestamp to updateMessageStatus for delivery sync', async () => {
    shouldStrictlyEnforceMetaWebhookSignature.mockReturnValue(false);
    const req = {
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              metadata: { phone_number_id: '1165821659950962', display_phone_number: '+201033316739' },
              statuses: [{
                id: 'wamid.delivery1',
                status: 'failed',
                timestamp: '1782165000',
                recipient_id: '201123087745',
                errors: [{
                  code: 131050,
                  title: 'Message not delivered',
                  message: 'This message was not delivered to maintain healthy ecosystem engagement.',
                  error_data: { details: 'In order to maintain a healthy ecosystem engagement, the message failed to be delivered.' }
                }]
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

    expect(updateMessageStatus).toHaveBeenCalledWith(
      'company-1',
      'wamid.delivery1',
      'FAILED',
      expect.objectContaining({
        recipientId: '201123087745',
        errors: [
          expect.objectContaining({
            code: 131050,
            error_data: expect.objectContaining({ details: expect.any(String) })
          })
        ],
        timestamp: expect.any(Number)
      })
    );
    expect(saveIncomingMessage).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('accepts verify tokens from active Meta sessions with null metadata', async () => {
    const req = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'maxwhats_2026',
        'hub.challenge': 'challenge-ok'
      }
    };
    const res = {
      status: jest.fn(function status() { return this; }),
      send: jest.fn(),
      sendStatus: jest.fn()
    };

    await getWebhook(req, res);

    expect(prisma.whatsAppSession.findFirst).toHaveBeenCalledWith({
      where: {
        provider: 'META_CLOUD',
        metaWebhookVerifyToken: 'maxwhats_2026',
        AND: [
          {
            OR: [
              { metadata: null },
              {
                NOT: [
                  { metadata: { contains: '"isDeleted":true' } },
                  { metadata: { contains: '"isDeleted": true' } }
                ]
              }
            ]
          }
        ]
      }
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('challenge-ok');
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
