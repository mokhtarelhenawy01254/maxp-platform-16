const productOfferService = require('../../services/whatsapp/productOfferService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: jest.fn((fn) => fn()),
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
  getAllActiveSessions: jest.fn(() => ({ 'sess-1': { isConnected: true, status: 'connected' } })),
}));

jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendImage: jest.fn(async () => ({})),
  sendText: jest.fn(async () => ({})),
}));

jest.mock('../../utils/phoneFormat', () => ({
  formatPhoneNumber: jest.fn((p) => p),
}));

describe('productOfferService.autoSendNewProduct', () => {
  const companyId = 'company-1';
  const product = { id: 'prod-1', name: 'منتج جديد', price: 120, images: ['https://img/1.jpg'] };

  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      whatsAppNotificationSettings: {
        findUnique: jest.fn(async () => ({
          companyId,
          newProductAutoSend: false,
          newProductAudience: 'all',
          newProductNewDays: 7,
          newProductMessage: '',
          productNotificationsEnabled: true,
        })),
      },
      whatsAppSession: {
        findMany: jest.fn(async () => [{ id: 'sess-1', phoneNumber: '01000000000', status: 'connected' }]),
      },
      customer: {
        findMany: jest.fn(async () => [
          { id: 'cust-1', firstName: 'أحمد', lastName: 'محمد', phone: '01001111111' },
          { id: 'cust-2', firstName: 'سارة', lastName: '', phone: '01002222222' },
        ]),
      },
      broadcastCampaign: {
        create: jest.fn(async () => ({ id: 'camp-1' })),
        update: jest.fn(async () => ({})),
      },
      whatsAppNotificationLog: {
        create: jest.fn(async () => ({})),
      },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
  });

  it('يرجع disabled لو الإرسال التلقائي مقفول', async () => {
    const res = await productOfferService.autoSendNewProduct({ companyId, product });
    expect(res).toEqual({ success: false, reason: 'auto_send_disabled' });
    expect(prisma.whatsAppNotificationLog.create).not.toHaveBeenCalled();
  });

  it('يرجع product_notifications_disabled لو إشعارات المنتجات مقفولة', async () => {
    prisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      companyId,
      newProductAutoSend: true,
      productNotificationsEnabled: false,
    });
    const res = await productOfferService.autoSendNewProduct({ companyId, product });
    expect(res).toEqual({ success: false, reason: 'product_notifications_disabled' });
  });

  it('يرجع no_session لو مفيش جلسة واتساب متصلة', async () => {
    prisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      companyId,
      newProductAutoSend: true,
      newProductAudience: 'all',
      newProductNewDays: 7,
      newProductMessage: '',
      productNotificationsEnabled: true,
    });
    prisma.whatsAppSession.findMany.mockResolvedValue([]);
    const res = await productOfferService.autoSendNewProduct({ companyId, product });
    expect(res).toEqual({ success: false, reason: 'no_session' });
  });

  it('يرجع empty_audience لو مفيش عملاء بأرقام', async () => {
    prisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      companyId,
      newProductAutoSend: true,
      newProductAudience: 'all',
      newProductNewDays: 7,
      newProductMessage: '',
      productNotificationsEnabled: true,
    });
    prisma.customer.findMany.mockResolvedValue([{ id: 'cust-1', phone: null }]);
    const res = await productOfferService.autoSendNewProduct({ companyId, product });
    expect(res).toEqual({ success: false, reason: 'empty_audience' });
  });

  it('يبعت لكل عميل صورة المنتج + يسجل سجل إشعار لكل رسالة', async () => {
    const WhatsAppMessageHandler = require('../../services/whatsapp/WhatsAppMessageHandler');
    prisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      companyId,
      newProductAutoSend: true,
      newProductAudience: 'all',
      newProductNewDays: 7,
      newProductMessage: 'مرحباً {اسم العميل} — جرب {productName} بسعر {price}!',
      productNotificationsEnabled: true,
    });

    const res = await productOfferService.autoSendNewProduct({ companyId, product });

    expect(res.success).toBe(true);
    expect(res.sent).toBe(2);
    expect(WhatsAppMessageHandler.sendImage).toHaveBeenCalledTimes(2);
    expect(WhatsAppMessageHandler.sendImage).toHaveBeenCalledWith(
      'sess-1',
      '01001111111',
      'https://img/1.jpg',
      'مرحباً أحمد محمد — جرب منتج جديد بسعر 120!'
    );
    expect(prisma.whatsAppNotificationLog.create).toHaveBeenCalledTimes(2);
    const logCalls = prisma.whatsAppNotificationLog.create.mock.calls.map((c) => c[0].data);
    expect(logCalls[0]).toEqual(
      expect.objectContaining({
        companyId,
        sessionId: 'sess-1',
        eventType: 'NEW_PRODUCT',
        category: 'MARKETING',
        productId: 'prod-1',
        recipientPhone: '01001111111',
        status: 'SENT',
        messageType: 'IMAGE',
      })
    );
    expect(prisma.broadcastCampaign.create).toHaveBeenCalled();
    expect(prisma.broadcastCampaign.update).toHaveBeenCalled();
  });
});