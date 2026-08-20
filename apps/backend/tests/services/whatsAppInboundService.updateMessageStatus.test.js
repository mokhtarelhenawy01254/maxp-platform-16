/**
 * Regression tests for updateMessageStatus → whatsapp_notification_logs sync.
 *
 * PRODUCTION-FIX: عندما يرسل Meta webhook status (failed/delivered/read) عبر
 * `status.id` (= whatsappMessageId)، يجب تحديث الـ notification log بالحالة
 * الحقيقية + أخطاء Meta (failureReason/errorCode) بدلاً من بقائه SENT دائماً.
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn())
}));

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => null)
}));

jest.mock('../../services/whatsappRealtimeAudienceService', () => ({
  getConversationAudience: jest.fn(async () => ({ userIds: [] })),
  emitToAudience: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppSyncService', () => ({}));
jest.mock('../../services/whatsapp/contactIdentity', () => ({
  normalizeWhatsAppContactIdentity: jest.fn(() => null)
}));
jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({}));
jest.mock('../../services/aiSdkClient', () => ({}));
jest.mock('../../services/aiSettingsResolver', () => ({
  getEffectiveAiAutoReplySetting: jest.fn(async () => ({}))
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { updateMessageStatus } = require('../../services/whatsapp/WhatsAppInboundService');

describe('updateMessageStatus → notification log sync', () => {
  let prisma;

  beforeEach(() => {
    prisma = {
      whatsAppMessage: {
        findMany: jest.fn(async () => [{
          id: 'msg-1',
          sessionId: 'session-1',
          remoteJid: '201123087745@s.whatsapp.net',
          status: 'SENT'
        }]),
        updateMany: jest.fn(async () => ({ count: 1 }))
      },
      whatsAppNotificationLog: {
        findFirst: jest.fn(async () => ({ id: 'log-1', status: 'SENT' })),
        updateMany: jest.fn(async () => ({ count: 1 }))
      },
      broadcastRecipient: {
        updateMany: jest.fn(async () => ({ count: 0 }))
      },
      broadcastCampaign: {
        update: jest.fn()
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('marked FAILED with Meta error details when webhook status is failed', async () => {
    await updateMessageStatus('company-1', 'wamid.abc', 'FAILED', {
      errors: [{
        code: 131050,
        title: 'Message not delivered',
        message: 'This message was not delivered.',
        error_data: { details: 'In order to maintain a healthy ecosystem engagement.' }
      }],
      recipientId: '201123087745',
      timestamp: 1782165000000
    });

    expect(prisma.whatsAppNotificationLog.findFirst).toHaveBeenCalledWith({
      where: { whatsappMessageId: 'wamid.abc' },
      select: { id: true, status: true }
    });
    const updateCall = prisma.whatsAppNotificationLog.updateMany.mock.calls[0][0];
    expect(updateCall.data.status).toBe('FAILED');
    expect(updateCall.data.errorCode).toBe('131050');
    expect(updateCall.data.failureReason).toContain('healthy ecosystem');
    expect(updateCall.data.failedAt).toBeInstanceOf(Date);
  });

  test('marked DELIVERED when status is delivered and current log is SENT', async () => {
    await updateMessageStatus('company-1', 'wamid.abc', 'DELIVERED', {
      errors: [],
      timestamp: 1782165000000
    });

    const updateCall = prisma.whatsAppNotificationLog.updateMany.mock.calls[0][0];
    expect(updateCall.data.status).toBe('DELIVERED');
    expect(updateCall.data.deliveredAt).toBeInstanceOf(Date);
  });

  test('marked READ when status is read (promotes from SENT)', async () => {
    await updateMessageStatus('company-1', 'wamid.abc', 'READ', {
      errors: [],
      timestamp: 1782165000000
    });

    const updateCall = prisma.whatsAppNotificationLog.updateMany.mock.calls[0][0];
    expect(updateCall.data.status).toBe('READ');
    expect(updateCall.data.readAt).toBeInstanceOf(Date);
    expect(updateCall.data.deliveredAt).toBeInstanceOf(Date);
  });

  test('does not downgrade an already-FAILED log when delivered arrives', async () => {
    prisma.whatsAppNotificationLog.findFirst.mockResolvedValue({ id: 'log-1', status: 'FAILED' });

    await updateMessageStatus('company-1', 'wamid.abc', 'DELIVERED', {
      errors: [],
      timestamp: 1782165000000
    });

    // يجب ألا نرقّي من FAILED إلى DELIVERED
    expect(prisma.whatsAppNotificationLog.updateMany).not.toHaveBeenCalled();
  });

  test('no log update when no notification log matches the whatsappMessageId', async () => {
    prisma.whatsAppNotificationLog.findFirst.mockResolvedValue(null);

    await updateMessageStatus('company-1', 'wamid.unknown', 'FAILED', {
      errors: [{ code: 131050 }],
      timestamp: 1782165000000
    });

    expect(prisma.whatsAppNotificationLog.updateMany).not.toHaveBeenCalled();
  });
});
