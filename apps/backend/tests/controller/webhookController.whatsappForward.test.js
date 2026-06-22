jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => null),
}));

jest.mock('../../utils/allFunctions', () => ({
  updateConversationLastMessageStatus: jest.fn(),
  resetConversationUnreadCount: jest.fn(),
}));

jest.mock('../../utils/dbPermissionHelper', () => ({
  isPermissionError: jest.fn(() => false),
  getPermissionErrorMessage: jest.fn(() => 'permission error'),
}));

jest.mock('../../utils/statsRecorder', () => ({
  recordSentMessageStat: jest.fn(),
}));

jest.mock('../../utils/webhookSignature', () => ({
  shouldStrictlyEnforceMetaWebhookSignature: jest.fn(() => true),
  verifyMetaWebhookSignature: jest.fn(() => ({ ok: false, reason: 'invalid_signature' })),
}));

jest.mock('../../controller/whatsappMetaWebhookController', () => ({
  getWebhook: jest.fn((req, res) => res.status(200).send('wa-verify')),
  postWebhook: jest.fn((req, res) => res.status(200).send('wa-event')),
}));

const { getWebhook, postWebhook } = require('../../controller/webhookController');
const whatsappMetaWebhookController = require('../../controller/whatsappMetaWebhookController');
const { verifyMetaWebhookSignature } = require('../../utils/webhookSignature');

describe('webhookController WhatsApp forwarding', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('forwards WhatsApp Business Account POST payloads to the WhatsApp Meta controller', async () => {
    const req = {
      body: {
        object: 'whatsapp_business_account',
        entry: [],
      },
    };
    const res = {
      status: jest.fn(function status() { return this; }),
      send: jest.fn(),
    };

    await postWebhook(req, res);

    expect(whatsappMetaWebhookController.postWebhook).toHaveBeenCalledWith(req, res);
    expect(verifyMetaWebhookSignature).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('wa-event');
  });

  test('falls back to WhatsApp verify handling when the token is not the Facebook token', async () => {
    process.env.FACEBOOK_VERIFY_TOKEN = 'facebook-token';
    const req = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'maxwhats_2026',
        'hub.challenge': 'challenge-1',
      },
    };
    const res = {
      status: jest.fn(function status() { return this; }),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    await getWebhook(req, res);

    expect(whatsappMetaWebhookController.getWebhook).toHaveBeenCalledWith(req, res);
    expect(res.send).toHaveBeenCalledWith('wa-verify');
  });
});
