const broadcastController = require('../../controller/broadcastController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockPrisma = {
  customerList: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  customer: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    groupBy: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  safeQuery: async (fn) => fn(mockPrisma),
  executeWithRetry: async (fn) => fn(mockPrisma),
}));

jest.mock('../../utils/statsRecorder', () => ({
  recordSentMessageStat: jest.fn(),
}));

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(),
}));

jest.mock('../../utils/allFunctions', () => ({
  sendFacebookMessage: jest.fn(),
}));

jest.mock('../../services/whatsapp', () => ({
  WhatsAppMessageHandler: class {},
}));

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({
  default: class {},
}));

describe('broadcastController — customer lists', () => {
  const companyId = 'comp_1';
  const req = (body = {}, params = {}, query = {}) => ({ user: { companyId }, body, params, query });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.groupBy.mockResolvedValue([]);
  });

  describe('createCustomerList', () => {
    test('ينشئ قائمة ويحسب العدد من عميل count', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue(null);
      mockPrisma.customer.count.mockResolvedValue(42);
      mockPrisma.customerList.create.mockResolvedValue({ id: 'list_1', name: 'VIP', count: 42, criteria: '{"type":"all"}' });

      const res = createResponse();
      await broadcastController.createCustomerList(
        req({ name: 'VIP', description: 'كبار', criteria: { type: 'all' } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockPrisma.customer.count).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId, status: 'ACTIVE' } }));
      expect(mockPrisma.customerList.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'VIP', count: 42, companyId }),
      }));
    });

    test('يرفض الاسم المكرر بـ 409', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'other' });
      const res = createResponse();
      await broadcastController.createCustomerList(
        req({ name: 'VIP', criteria: { type: 'all' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('يرفض غياب الاسم أو المعايير', async () => {
      const res = createResponse();
      await broadcastController.createCustomerList(req({ name: '' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateCustomerList', () => {
    test('يحدّث قائمة موجودة ويعيد حساب العدد', async () => {
      mockPrisma.customerList.findFirst
        .mockResolvedValueOnce({ id: 'list_1', isDefault: false })
        .mockResolvedValueOnce(null);
      mockPrisma.customer.count.mockResolvedValue(10);
      mockPrisma.customerList.update.mockResolvedValue({ id: 'list_1', name: 'جديدة', count: 10 });

      const res = createResponse();
      await broadcastController.updateCustomerList(
        req({ name: 'جديدة', criteria: { type: 'active', hours: 12 } }, { listId: 'list_1' }),
        res,
      );

      expect(mockPrisma.customerList.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('قائمة غير موجودة → 404', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue(null);
      const res = createResponse();
      await broadcastController.updateCustomerList(
        req({ name: 'x', criteria: { type: 'all' } }, { listId: 'missing' }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('قائمة افتراضية → 400', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'all', isDefault: true });
      const res = createResponse();
      await broadcastController.updateCustomerList(
        req({ name: 'x', criteria: { type: 'all' } }, { listId: 'all' }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refreshCustomerListCount', () => {
    test('يعيد حساب العدد ويحدّثه', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'list_1', criteria: '{"type":"all"}' });
      mockPrisma.customer.count.mockResolvedValue(77);
      mockPrisma.customerList.update.mockResolvedValue({ id: 'list_1', count: 77 });

      const res = createResponse();
      await broadcastController.refreshCustomerListCount(req({}, { listId: 'list_1' }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { id: 'list_1', count: 77 },
      }));
    });

    test('قائمة غير موجودة → 404', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue(null);
      const res = createResponse();
      await broadcastController.refreshCustomerListCount(req({}, { listId: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('previewCustomerListCount', () => {
    test('يعيد العدد لمعايير بدون حفظ', async () => {
      mockPrisma.customer.count.mockResolvedValue(5);
      const res = createResponse();
      await broadcastController.previewCustomerListCount(
        req({ criteria: { type: 'tag', tag: 'VIP' } }),
        res,
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { count: 5 },
      }));
    });

    test('معايير ناقصة → 400', async () => {
      const res = createResponse();
      await broadcastController.previewCustomerListCount(req({}), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCustomersInList', () => {
    test('قائمة مخصصة → يرجع data/total/page/limit', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'list_1', criteria: '{"type":"all"}' });
      mockPrisma.customer.count.mockResolvedValue(3);
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c1', firstName: 'محمد', lastName: 'أحمد', email: '', phone: '201', status: 'ACTIVE', tags: '', customerRating: 'EXCELLENT', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = createResponse();
      await broadcastController.getCustomersInList(
        req({}, { listId: 'list_1' }),
        res,
      );

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total: 3,
        page: 1,
        limit: 25,
        hasMore: false,
      }));
      const payload = res.json.mock.calls[0][0];
      expect(payload.data[0].name).toBe('محمد أحمد');
    });

    test('قائمة افتراضية all → بدون قراءة من customerList', async () => {
      mockPrisma.customer.count.mockResolvedValue(8);
      mockPrisma.customer.findMany.mockResolvedValue([]);
      const res = createResponse();
      await broadcastController.getCustomersInList(req({}, { listId: 'all' }), res);
      expect(mockPrisma.customerList.findFirst).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 8 }));
    });

    test('قائمة غير موجودة → 404', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue(null);
      const res = createResponse();
      await broadcastController.getCustomersInList(req({}, { listId: 'nope' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteCustomerList', () => {
    test('يحذف قائمة مخصصة بنجاح', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'list_1', isDefault: false });
      mockPrisma.customerList.delete.mockResolvedValue({ id: 'list_1' });
      const res = createResponse();
      await broadcastController.deleteCustomerList(req({}, { listId: 'list_1' }), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('قائمة افتراضية → 400', async () => {
      mockPrisma.customerList.findFirst.mockResolvedValue({ id: 'all', isDefault: true });
      const res = createResponse();
      await broadcastController.deleteCustomerList(req({}, { listId: 'all' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
