/**
 * 🧪 whatsappNotificationCanonicalFix.test.js
 * اختبارات التحقق من إصلاح طبقة إشعارات العملاء وقوالب Meta
 *
 * Requirements:
 * 1. اختيار القالب: الحالتين المكررتين (CASHBACK_CREDITED و CONFIRMED) + استبعاد PENDING_DELETION (CUSTOMER_QUALITY_UPGRADED).
 * 2. PARAM_COUNT_MISMATCH: قالب 4 متغيرات + payload 3 → صفر إرسال + سجل mismatch مع expected و actual.
 * 3. عزل الشركات: حدث شركة A ما يعملش إشعار لشركة B.
 * 4. التقرير: حدث AUTO_DISCOUNT_* يظهر في نفس الاستعلام مع category=ALL.
 */

let mockPrismaInstance = null;

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrismaInstance,
  safeQuery: (fn) => fn(mockPrismaInstance),
}));

const { findCanonicalNotificationTemplate } = require('../../services/whatsapp/WhatsAppNotificationService');
const whatsappNotificationController = require('../../controller/whatsappNotificationController');

describe('WhatsApp Customer Notification Canonical Fixes', () => {
  beforeEach(() => {
    mockPrismaInstance = null;
    jest.clearAllMocks();
  });

  describe('1. Canonical Template Resolution & Duplicate Drift Elimination', () => {
    test('CASHBACK_CREDITED: يختار القالب ذو 3 متغيرات الحتمي عندما يكون العدد المتوقع 3', async () => {
      const templates = [
        {
          id: '850e263a',
          companyId: 'company-swan',
          eventType: 'CASHBACK_CREDITED',
          name: 'قالب كاش باك قديم',
          channel: 'META_CLOUD',
          metaTemplateName: 'cashback_creditedv3mtcywhw6',
          metaTemplateStatus: 'APPROVED',
          variables: JSON.stringify(['customerName', 'cashAmount', 'currency', 'balance']),
          updatedAt: new Date('2026-10-18T10:00:00Z'),
          createdAt: new Date('2026-10-18T10:00:00Z'),
          isDefault: false
        },
        {
          id: '4e47f6d9',
          companyId: 'company-swan',
          eventType: 'CASHBACK_CREDITED',
          name: 'قالب كاش باك مطابق لميتا',
          channel: 'META_CLOUD',
          metaTemplateName: 'cashback_creditedv3mtcywhw6',
          metaTemplateStatus: 'APPROVED',
          variables: JSON.stringify(['cashAmount', 'currency', 'balance']),
          updatedAt: new Date('2026-10-17T10:00:00Z'),
          createdAt: new Date('2026-10-17T10:00:00Z'),
          isDefault: false
        }
      ];

      const mockPrisma = {
        whatsAppNotificationTemplate: {
          findFirst: jest.fn(async () => templates[0]),
          findMany: jest.fn(async () => templates)
        }
      };

      const chosen = await findCanonicalNotificationTemplate(
        'company-swan',
        'CASHBACK_CREDITED',
        'META_CLOUD',
        mockPrisma,
        { expectedMetaParamCount: 3 }
      );

      expect(chosen).toBeDefined();
      expect(chosen.id).toBe('4e47f6d9');
    });

    test('CUSTOMER_QUALITY_UPGRADED: يستبعد القالب المحذوف PENDING_DELETION ويختار المعتمد APPROVED', async () => {
      const templates = [
        {
          id: '215d8628-pending-del',
          companyId: 'company-swan',
          eventType: 'CUSTOMER_QUALITY_UPGRADED',
          name: 'قالب ترقية الجودة المعلق حذفه',
          channel: 'META_CLOUD',
          metaTemplateName: 'customer_quality_upgradedv3mtcys5z2',
          metaTemplateStatus: 'PENDING_DELETION',
          variables: JSON.stringify(['customerName', 'qualityTier', 'score']),
          updatedAt: new Date('2026-10-18T12:00:00Z'),
          createdAt: new Date('2026-10-18T12:00:00Z'),
          isDefault: true
        },
        {
          id: 'e82742c1-approved',
          companyId: 'company-swan',
          eventType: 'CUSTOMER_QUALITY_UPGRADED',
          name: 'قالب ترقية الجودة المعتمد',
          channel: 'META_CLOUD',
          metaTemplateName: 'customer_quality_upgradedv3mt064dkp',
          metaTemplateStatus: 'APPROVED',
          variables: JSON.stringify(['customerName', 'qualityTier', 'score']),
          updatedAt: new Date('2026-10-17T12:00:00Z'),
          createdAt: new Date('2026-10-17T12:00:00Z'),
          isDefault: false
        }
      ];

      const mockPrisma = {
        whatsAppNotificationTemplate: {
          findFirst: jest.fn(async () => templates[0]),
          findMany: jest.fn(async () => templates)
        }
      };

      const chosen = await findCanonicalNotificationTemplate(
        'company-swan',
        'CUSTOMER_QUALITY_UPGRADED',
        'META_CLOUD',
        mockPrisma,
        { expectedMetaParamCount: 3 }
      );

      expect(chosen).toBeDefined();
      expect(chosen.id).toBe('e82742c1-approved');
      expect(chosen.metaTemplateStatus).toBe('APPROVED');
    });
  });

  describe('2. Pre-Send PARAM_COUNT_MISMATCH Guard', () => {
    test('حارس ما قبل الإرسال يمنع الإرسال ويسجل الخطأ مع expected و actual', async () => {
      const createdLogs = [];
      mockPrismaInstance = {
        whatsAppNotificationSettings: {
          findUnique: jest.fn(async () => ({ isEnabled: true, defaultSessionId: 'sess-meta' }))
        },
        company: {
          findUnique: jest.fn(async () => ({ id: 'company-swan', name: 'Swan' }))
        },
        whatsAppSession: {
          findFirst: jest.fn(async () => ({
            id: 'sess-meta',
            companyId: 'company-swan',
            provider: 'META_CLOUD',
            status: 'CONNECTED',
            credentials: JSON.stringify({ accessToken: 'fake-token', phoneNumberId: '123' })
          })),
          findUnique: jest.fn(async () => ({
            id: 'sess-meta',
            companyId: 'company-swan',
            provider: 'META_CLOUD',
            status: 'CONNECTED',
            credentials: JSON.stringify({ accessToken: 'fake-token', phoneNumberId: '123' })
          }))
        },
        whatsAppNotificationTemplate: {
          findFirst: jest.fn(async () => ({
            id: 'template-4vars',
            companyId: 'company-swan',
            eventType: 'CASHBACK_CREDITED',
            channel: 'META_CLOUD',
            metaTemplateName: 'cashback_creditedv3mtcywhw6',
            metaTemplateStatus: 'APPROVED',
            variables: JSON.stringify(['customerName', 'cashAmount', 'currency', 'balance'])
          }))
        },
        whatsAppNotificationLog: {
          create: jest.fn(async (args) => {
            createdLogs.push(args.data);
            return { id: 'log-err-1', ...args.data };
          }),
          update: jest.fn(async (args) => {
            createdLogs.push(args.data);
            return { id: args.where?.id || 'log-err-1', ...args.data };
          })
        }
      };

      // Mock meta template check to expect 3 placeholders while template provides 4
      const MetaCloudProvider = require('../../services/whatsapp/providers/MetaCloudProvider');
      jest.spyOn(MetaCloudProvider, 'listTemplates').mockResolvedValue([
        {
          name: 'cashback_creditedv3mtcywhw6',
          status: 'APPROVED',
          components: [
            { type: 'BODY', text: 'أهلاً {{1}} رصيدك {{2}} {{3}}' } // 3 placeholders
          ]
        }
      ]);

      const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
      const res = await WhatsAppNotificationService.sendNotification({
        companyId: 'company-swan',
        recipientPhone: '201000000000',
        recipientName: 'أحمد',
        category: 'MARKETING',
        eventType: 'CASHBACK_CREDITED',
        variables: { customerName: 'أحمد', cashAmount: '100', currency: 'EGP', balance: '250' }
      });

      // Verification: sending was blocked, not sent to Meta API
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('META_PARAM_COUNT_MISMATCH');
      expect(createdLogs.length).toBeGreaterThanOrEqual(1);
      const errorLog = createdLogs.find(l => l.errorCode === 'META_PARAM_COUNT_MISMATCH');
      expect(errorLog).toBeDefined();
      expect(errorLog.failureReason).toContain('expects 3 BODY param(s)');
    });
  });

  describe('3. Multi-Tenant Isolation', () => {
    test('حدث شركة A لا يجلب قوالب شركة B إطلاقاً', async () => {
      const mockPrisma = {
        whatsAppNotificationTemplate: {
          findFirst: jest.fn(async ({ where }) => {
            if (where.companyId === 'company-A') {
              return { id: 'template-A', companyId: 'company-A', metaTemplateName: 'meta_a', metaTemplateStatus: 'APPROVED' };
            }
            return null;
          }),
          findMany: jest.fn(async ({ where }) => {
            if (where.companyId === 'company-A') {
              return [{ id: 'template-A', companyId: 'company-A', metaTemplateName: 'meta_a', metaTemplateStatus: 'APPROVED' }];
            }
            return [];
          })
        }
      };

      const chosenForB = await findCanonicalNotificationTemplate(
        'company-B',
        'LOYALTY_POINTS_AWARDED',
        'META_CLOUD',
        mockPrisma
      );

      expect(chosenForB).toBeNull();
      expect(mockPrisma.whatsAppNotificationTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-B' })
        })
      );
    });
  });

  describe('4. Status Report AUTO_DISCOUNT Mapping', () => {
    test('يظهر إشعارات AUTO_DISCOUNT_* والطلب عند category=ALL مع rawEventType', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          companyId: 'company-swan',
          category: 'MARKETING',
          eventType: 'COUPON_SENT',
          rawEventType: 'AUTO_DISCOUNT_COUPON_GRANTED',
          status: 'DELIVERED',
          messageType: 'TEMPLATE',
          createdAt: new Date(),
          recipientPhone: '201000000000'
        },
        {
          id: 'log-2',
          companyId: 'company-swan',
          category: 'ORDER',
          eventType: 'ORDER_CONFIRMED',
          rawEventType: null,
          status: 'DELIVERED',
          messageType: 'TEMPLATE',
          createdAt: new Date(),
          recipientPhone: '201000000001'
        }
      ];

      mockPrismaInstance = {
        whatsAppNotificationLog: {
          findMany: jest.fn(async () => mockLogs),
          count: jest.fn(async () => mockLogs.length)
        }
      };

      const req = {
        user: { companyId: 'company-swan' },
        query: { category: 'ALL' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await whatsappNotificationController.getStatusReport(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.summary.total).toBe(2);

      const autoDiscountItem = responseData.items.find(i => i.eventType === 'AUTO_DISCOUNT_COUPON_GRANTED');
      expect(autoDiscountItem).toBeDefined();
      expect(autoDiscountItem.rawEventType).toBe('AUTO_DISCOUNT_COUPON_GRANTED');
    });
  });
});
