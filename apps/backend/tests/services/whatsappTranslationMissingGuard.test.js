let mockPrismaInstance = null;

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrismaInstance,
  safeQuery: (fn) => (typeof fn === 'function' ? fn(mockPrismaInstance) : Promise.resolve(null)),
}));

const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
const WhatsAppMessageHandler = require('../../services/whatsapp/WhatsAppMessageHandler');
const NotificationSendGuard = require('../../services/whatsapp/notificationSendGuard');
const MetaCloudProvider = require('../../services/whatsapp/providers/MetaCloudProvider');
const { processImage } = require('../../utils/imageProcessor');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

describe('Watchdog Fixes: Translation Missing, ImageProc Same-File, and Safe Logging', () => {
  const companyId = 'comp-watchdog-test';
  const sessionId = 'sess-meta-watchdog';

  beforeEach(() => {
    NotificationSendGuard.resetGuardState();
    mockPrismaInstance = null;
    jest.clearAllMocks();
  });

  describe('1. Image Processor same-file safety', () => {
    test('processImage successfully overwrites when inputPath === outputPath without throwing EPERM or Cannot use same file', async () => {
      const dir = path.join(__dirname, 'temp_img_test');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const testWebp = path.join(dir, 'sample.webp');

      await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
        .webp()
        .toFile(testWebp);

      const result = await processImage(testWebp, dir);
      expect(result.filename).toBe('sample.webp');
      expect(result.size).toBeGreaterThan(0);
      expect(fs.existsSync(testWebp)).toBe(true);

      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('2. Meta Cloud translation missing error handling', () => {
    test('Auto-heals template language when Meta returns does not exist in translation and Meta lists a different language', async () => {
      const templateInDb = {
        id: 'tmpl-quality-1',
        companyId,
        eventType: 'CUSTOMER_QUALITY_UPGRADED',
        metaTemplateName: 'customer_quality_upgradedv3',
        metaTemplateStatus: 'APPROVED',
        metaTemplateLanguage: 'ar',
        channel: 'META_CLOUD',
        content: 'مبروك {customerName} تصنيفك أصبح {qualityTier}',
        variables: JSON.stringify(['customerName', 'qualityTier']),
        isActive: true
      };

      const updateMock = jest.fn().mockResolvedValue(templateInDb);

      mockPrismaInstance = {
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: companyId, name: 'Test Co' })
        },
        whatsAppNotificationSettings: {
          findUnique: jest.fn().mockResolvedValue({
            companyId,
            isEnabled: true,
            loyaltyEnabled: true
          })
        },
        whatsAppSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }),
          findFirst: jest.fn().mockResolvedValue({
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }),
          findMany: jest.fn().mockResolvedValue([{
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }])
        },
        whatsAppNotificationTemplate: {
          findFirst: jest.fn().mockResolvedValue(templateInDb),
          findMany: jest.fn().mockResolvedValue([templateInDb]),
          update: updateMock
        },
        whatsAppNotificationLog: {
          create: jest.fn().mockResolvedValue({ id: 'log-1' }),
          update: jest.fn().mockResolvedValue({ id: 'log-1' })
        },
        customer: {
          findFirst: jest.fn().mockResolvedValue({ id: 'c1', phone: '201000000000', firstName: 'Ali', companyId })
        }
      };

      const sendMock = jest.spyOn(WhatsAppMessageHandler, 'sendTemplateMessage')
        .mockRejectedValueOnce(new Error('(#132000) Template name does not exist in the translation'))
        .mockResolvedValueOnce({ id: 'wamid-recovered-123' });

      jest.spyOn(MetaCloudProvider, 'listTemplates').mockResolvedValue([
        {
          name: 'customer_quality_upgradedv3',
          status: 'APPROVED',
          language: 'en',
          components: [{ type: 'BODY', text: 'Hello {{1}} tier {{2}}' }]
        }
      ]);

      const res = await WhatsAppNotificationService.sendNotification({
        companyId,
        sessionId,
        eventType: 'CUSTOMER_QUALITY_UPGRADED',
        recipientPhone: '201000000000',
        customer: { name: 'Ali', firstName: 'Ali' },
        variables: { customerName: 'Ali', qualityTier: 'VIP' }
      });

      expect(res.success).toBe(true);
      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(sendMock.mock.calls[1][3].language).toBe('en');
    });

    test('Marks template NOT_FOUND and trips circuit breaker when template is not in Meta WABA', async () => {
      const templateInDb = {
        id: 'tmpl-quality-deleted',
        companyId,
        eventType: 'CUSTOMER_QUALITY_UPGRADED',
        metaTemplateName: 'customer_quality_nonexistent',
        metaTemplateStatus: 'APPROVED',
        metaTemplateLanguage: 'ar',
        channel: 'META_CLOUD',
        content: 'مبروك {customerName}',
        variables: JSON.stringify(['customerName']),
        isActive: true
      };

      const updateMock = jest.fn().mockResolvedValue(templateInDb);

      mockPrismaInstance = {
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: companyId, name: 'Test Co' })
        },
        whatsAppNotificationSettings: {
          findUnique: jest.fn().mockResolvedValue({
            companyId,
            isEnabled: true,
            loyaltyEnabled: true
          })
        },
        whatsAppSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }),
          findFirst: jest.fn().mockResolvedValue({
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }),
          findMany: jest.fn().mockResolvedValue([{
            id: sessionId,
            companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED'
          }])
        },
        whatsAppNotificationTemplate: {
          findFirst: jest.fn().mockResolvedValue(templateInDb),
          findMany: jest.fn().mockResolvedValue([templateInDb]),
          update: updateMock
        },
        whatsAppNotificationLog: {
          create: jest.fn().mockResolvedValue({ id: 'log-2' }),
          update: jest.fn().mockResolvedValue({ id: 'log-2' })
        },
        customer: {
          findFirst: jest.fn().mockResolvedValue({ id: 'c2', phone: '201000000000', firstName: 'Ali', companyId })
        }
      };

      jest.spyOn(WhatsAppMessageHandler, 'sendTemplateMessage')
        .mockRejectedValue(new Error('(#132000) Template name does not exist in the translation'));

      jest.spyOn(MetaCloudProvider, 'listTemplates').mockResolvedValue([]);

      const res = await WhatsAppNotificationService.sendNotification({
        companyId,
        sessionId,
        eventType: 'CUSTOMER_QUALITY_UPGRADED',
        recipientPhone: '201000000000',
        customer: { name: 'Ali', firstName: 'Ali' },
        variables: { customerName: 'Ali' }
      });

      expect(res.success).toBe(false);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'tmpl-quality-deleted' },
        data: { metaTemplateStatus: 'NOT_FOUND' }
      }));

      // Next call must be blocked immediately by circuit breaker without hitting sendTemplateMessage again
      const gateCheck = NotificationSendGuard.checkFailureWindow({
        companyId,
        eventType: 'CUSTOMER_QUALITY_UPGRADED',
        templateId: 'tmpl-quality-deleted'
      });
      expect(gateCheck.suppressed).toBe(true);
    });
  });
});
