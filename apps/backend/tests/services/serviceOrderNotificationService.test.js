jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { sendNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
const service = require('../../services/whatsapp/serviceOrderNotificationService');

describe('serviceOrderNotificationService', () => {
  let prismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ phone: '01011112222', name: 'خدمات إبداعية' }),
      },
      whatsAppNotificationSettings: {
        findUnique: jest.fn().mockResolvedValue({ companyLifecycleAdminPhones: '01099998888' }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);
    sendNotification.mockResolvedValue({ success: true, messageId: 'msg-123' });
  });

  describe('notifyOrderCreated', () => {
    it('sends confirmation to customer and alert to admin', async () => {
      const order = {
        id: 'ord-12345678',
        companyId: 'comp-1',
        customerName: 'أحمد علي',
        phone: '01012345678',
        description: 'تصميم هوية بصرية كاملة',
        referenceFiles: [{ originalName: 'logo.png', url: 'https://example.com/logo.png' }]
      };
      const serviceData = {
        name: 'تصميم جرافيك',
        price: 500
      };

      const result = await service.notifyOrderCreated({ order, service: serviceData, companyId: 'comp-1' });

      expect(sendNotification).toHaveBeenCalledTimes(2);

      // Customer notification call
      expect(sendNotification).toHaveBeenNthCalledWith(1, expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '01012345678',
        recipientName: 'أحمد علي',
        recipientType: 'CUSTOMER',
        eventType: 'SERVICE_ORDER_CREATED',
        variables: expect.objectContaining({
          customerName: 'أحمد علي',
          serviceName: 'تصميم جرافيك',
          orderId: '345678',
          priceInfo: '💰 السعر: 500 ج.م',
          description: 'تصميم هوية بصرية كاملة'
        })
      }));

      // Admin alert call
      expect(sendNotification).toHaveBeenNthCalledWith(2, expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '01099998888',
        recipientType: 'ADMIN',
        eventType: 'SERVICE_ORDER_ADMIN_ALERT',
        variables: expect.objectContaining({
          customerName: 'أحمد علي',
          serviceName: 'تصميم جرافيك',
          filesCount: '1'
        })
      }));

      expect(result.customer).toEqual({ success: true, messageId: 'msg-123' });
      expect(result.admin).toEqual({ success: true, messageId: 'msg-123' });
    });

    it('returns missing_order_or_phone if order phone is missing', async () => {
      const result = await service.notifyOrderCreated({ order: { id: 'ord-1' }, service: {} });
      expect(result).toEqual({ success: false, reason: 'missing_order_or_phone' });
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyStatusChanged', () => {
    it('sends IN_PROGRESS notification to customer', async () => {
      const order = {
        id: 'ord-12345678',
        companyId: 'comp-1',
        customerName: 'محمود',
        phone: '01012345678',
        service: { name: 'مونتاج فيديو' }
      };

      await service.notifyStatusChanged({
        order,
        oldStatus: 'NEW',
        newStatus: 'IN_PROGRESS',
        companyId: 'comp-1'
      });

      expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '01012345678',
        recipientType: 'CUSTOMER',
        eventType: 'SERVICE_ORDER_IN_PROGRESS',
        variables: expect.objectContaining({
          customerName: 'محمود',
          serviceName: 'مونتاج فيديو',
          orderId: '345678'
        })
      }));
    });

    it('sends COMPLETED notification to customer', async () => {
      const order = {
        id: 'ord-12345678',
        companyId: 'comp-1',
        customerName: 'محمود',
        phone: '01012345678',
        service: { name: 'تسجيل صوتي' }
      };

      await service.notifyStatusChanged({
        order,
        oldStatus: 'IN_PROGRESS',
        newStatus: 'COMPLETED',
        companyId: 'comp-1'
      });

      expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '01012345678',
        recipientType: 'CUSTOMER',
        eventType: 'SERVICE_ORDER_COMPLETED'
      }));
    });

    it('skips when oldStatus equals newStatus', async () => {
      const order = { id: 'ord-1', phone: '01012345678' };
      const result = await service.notifyStatusChanged({
        order,
        oldStatus: 'IN_PROGRESS',
        newStatus: 'IN_PROGRESS',
        companyId: 'comp-1'
      });

      expect(result).toEqual({ success: false, reason: 'skipped' });
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });
});
