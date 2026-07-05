jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const cancellationController = require('../../controller/cancellationController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
  };
  return response;
};

const baseReq = {
  user: { id: 'user-1', companyId: 'company-1', effectiveCompanyId: 'company-1' }
};

describe('cancellationController', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      cancellationReasonCategory: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cancellationReason: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  describe('getCategories', () => {
    test('returns categories with reasons included', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'مشاكل العميل', reasons: [{ id: 'r1', reason: 'غير راغب' }] },
        { id: 'cat-2', name: 'مشاكل المخزون', reasons: [] },
      ];
      prisma.cancellationReasonCategory.findMany.mockResolvedValue(mockCategories);

      const res = createResponse();
      await cancellationController.getCategories(baseReq, res);

      expect(prisma.cancellationReasonCategory.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        include: { reasons: true },
        orderBy: { createdAt: 'desc' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockCategories);
    });

    test('falls back to companyId when effectiveCompanyId is absent', async () => {
      const req = { user: { id: 'user-1', companyId: 'company-1' } };
      prisma.cancellationReasonCategory.findMany.mockResolvedValue([]);

      const res = createResponse();
      await cancellationController.getCategories(req, res);

      expect(prisma.cancellationReasonCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1' } })
      );
    });

    test('returns 500 on error', async () => {
      prisma.cancellationReasonCategory.findMany.mockRejectedValue(new Error('DB error'));

      const res = createResponse();
      await cancellationController.getCategories(baseReq, res);

      expect(res.statusCode).toBe(500);
      expect(res.payload).toEqual({ error: 'Failed to fetch categories', details: 'DB error' });
    });
  });

  describe('createCategory', () => {
    test('creates a category with companyId', async () => {
      const req = { ...baseReq, body: { name: 'مشاكل العميل' } };
      const mockCategory = { id: 'cat-1', name: 'مشاكل العميل', companyId: 'company-1' };
      prisma.cancellationReasonCategory.create.mockResolvedValue(mockCategory);

      const res = createResponse();
      await cancellationController.createCategory(req, res);

      expect(prisma.cancellationReasonCategory.create).toHaveBeenCalledWith({
        data: { name: 'مشاكل العميل', companyId: 'company-1' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockCategory);
    });
  });

  describe('updateCategory', () => {
    test('updates category name and isActive', async () => {
      const req = {
        ...baseReq,
        params: { id: 'cat-1' },
        body: { name: 'مشاكل جديدة', isActive: false }
      };
      const mockUpdated = { id: 'cat-1', name: 'مشاكل جديدة', isActive: false };
      prisma.cancellationReasonCategory.update.mockResolvedValue(mockUpdated);

      const res = createResponse();
      await cancellationController.updateCategory(req, res);

      expect(prisma.cancellationReasonCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1', companyId: 'company-1' },
        data: { name: 'مشاكل جديدة', isActive: false }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockUpdated);
    });
  });

  describe('getReasons', () => {
    test('returns only active reasons with category', async () => {
      const mockReasons = [
        { id: 'r1', reason: 'غير راغب', description: null, category: { id: 'cat-1', name: 'مشاكل العميل' }, isActive: true },
      ];
      prisma.cancellationReason.findMany.mockResolvedValue(mockReasons);

      const res = createResponse();
      await cancellationController.getReasons(baseReq, res);

      expect(prisma.cancellationReason.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockReasons);
    });
  });

  describe('createReason', () => {
    test('creates a cancellation reason', async () => {
      const req = {
        ...baseReq,
        body: { reason: 'غير راغب', description: 'العميل غير راغب في الشراء', categoryId: 'cat-1' }
      };
      const mockReason = { id: 'r1', reason: 'غير راغب', description: 'العميل غير راغب في الشراء', categoryId: 'cat-1', companyId: 'company-1' };
      prisma.cancellationReason.create.mockResolvedValue(mockReason);

      const res = createResponse();
      await cancellationController.createReason(req, res);

      expect(prisma.cancellationReason.create).toHaveBeenCalledWith({
        data: { reason: 'غير راغب', description: 'العميل غير راغب في الشراء', categoryId: 'cat-1', companyId: 'company-1' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockReason);
    });
  });

  describe('updateReason', () => {
    test('updates reason fields', async () => {
      const req = {
        ...baseReq,
        params: { id: 'r1' },
        body: { reason: 'سبب جديد', description: 'وصف جديد', categoryId: 'cat-2', isActive: true }
      };
      const mockUpdated = { id: 'r1', reason: 'سبب جديد', description: 'وصف جديد', categoryId: 'cat-2', isActive: true };
      prisma.cancellationReason.update.mockResolvedValue(mockUpdated);

      const res = createResponse();
      await cancellationController.updateReason(req, res);

      expect(prisma.cancellationReason.update).toHaveBeenCalledWith({
        where: { id: 'r1', companyId: 'company-1' },
        data: { reason: 'سبب جديد', description: 'وصف جديد', categoryId: 'cat-2', isActive: true }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual(mockUpdated);
    });
  });

  describe('deleteReason', () => {
    test('soft-deletes a reason by setting isActive to false', async () => {
      const req = { ...baseReq, params: { id: 'r1' } };
      prisma.cancellationReason.findFirst.mockResolvedValue({ id: 'r1', companyId: 'company-1' });
      prisma.cancellationReason.update.mockResolvedValue({ id: 'r1', isActive: false });

      const res = createResponse();
      await cancellationController.deleteReason(req, res);

      expect(prisma.cancellationReason.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', companyId: 'company-1' }
      });
      expect(prisma.cancellationReason.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { isActive: false }
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual({ success: true });
    });

    test('returns 404 if reason not found for company', async () => {
      const req = { ...baseReq, params: { id: 'r1' } };
      prisma.cancellationReason.findFirst.mockResolvedValue(null);

      const res = createResponse();
      await cancellationController.deleteReason(req, res);

      expect(prisma.cancellationReason.update).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(404);
      expect(res.payload).toEqual({ error: 'Cancellation reason not found' });
    });
  });
});
