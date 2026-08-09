jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labHomeVisitsController');

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
    })
  };
  return response;
};

const createMockPrisma = () => {
  const prisma = {
    labHomeVisit: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'v-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'v1', ...data })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id }))
    }
  };
  return prisma;
};

describe('labHomeVisitsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllVisits', () => {
    test('returns paginated visits scoped to the company ordered by visitDate desc', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findMany.mockResolvedValue([
        { id: 'v1', patientName: 'أحمد', status: 'SCHEDULED', visitDate: '2024-01-10T10:00:00.000Z', reviewed: false },
        { id: 'v2', patientName: 'محمد', status: 'DONE', visitDate: '2024-01-09T10:00:00.000Z', reviewed: true }
      ]);
      prisma.labHomeVisit.count.mockResolvedValue(63);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllVisits({ user: { companyId: 'c1' }, query: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1' },
        orderBy: { visitDate: 'desc' },
        skip: 0,
        take: 50
      });
      expect(prisma.labHomeVisit.count).toHaveBeenCalledWith({ where: { companyId: 'c1' } });
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.total).toBe(63);
      expect(res.payload.page).toBe(1);
      expect(res.payload.limit).toBe(50);
    });

    test('applies status, date range and search filters', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllVisits({
        user: { companyId: 'c1' },
        query: {
          status: 'done',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          search: 'أحمد',
          page: '2',
          limit: '10'
        }
      }, res);

      const where = prisma.labHomeVisit.findMany.mock.calls[0][0].where;
      expect(where).toEqual({
        companyId: 'c1',
        status: 'DONE',
        visitDate: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-01-31')
        },
        OR: [
          { patientName: { contains: 'أحمد', mode: 'insensitive' } },
          { phone: { contains: 'أحمد', mode: 'insensitive' } }
        ]
      });
      expect(prisma.labHomeVisit.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
      expect(prisma.labHomeVisit.count).toHaveBeenCalledWith({ where });
    });

    test('caps limit at 200', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllVisits({ user: { companyId: 'c1' }, query: { limit: '999' } }, res);

      expect(prisma.labHomeVisit.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    });

    test('rejects an invalid status filter', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllVisits({ user: { companyId: 'c1' }, query: { status: 'BOGUS' } }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(prisma.labHomeVisit.findMany).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllVisits({ user: {}, query: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createVisit', () => {
    test('creates a visit with defaults when only patientName is provided', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.create.mockResolvedValue({
        id: 'v-new',
        companyId: 'c1',
        patientName: 'أحمد',
        phone: null,
        address: null,
        visitDate: null,
        status: 'SCHEDULED',
        notes: null,
        reviewed: false
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createVisit({ user: { companyId: 'c1' }, body: { patientName: 'أحمد' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          patientName: 'أحمد',
          phone: undefined,
          address: undefined,
          visitDate: undefined,
          status: 'SCHEDULED',
          notes: undefined
        }
      });
      expect(res.payload.data.patientName).toBe('أحمد');
    });

    test('creates a visit with full fields and parses the visit date', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.create.mockResolvedValue({
        id: 'v-new',
        companyId: 'c1',
        patientName: 'محمد',
        phone: '0100',
        address: 'القاهرة',
        visitDate: new Date('2024-02-01T09:30:00.000Z'),
        status: 'DONE',
        notes: 'ملاحظة',
        reviewed: false
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createVisit({
        user: { companyId: 'c1' },
        body: {
          patientName: 'محمد',
          phone: '0100',
          address: 'القاهرة',
          visitDate: '2024-02-01T09:30:00.000Z',
          status: 'DONE',
          notes: 'ملاحظة'
        }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientName: 'محمد',
          phone: '0100',
          address: 'القاهرة',
          visitDate: new Date('2024-02-01T09:30:00.000Z'),
          status: 'DONE',
          notes: 'ملاحظة'
        })
      });
    });

    test('requires a patient name', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createVisit({ user: { companyId: 'c1' }, body: { patientName: '' } }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم المريض مطلوب');
      expect(prisma.labHomeVisit.create).not.toHaveBeenCalled();
    });

    test('rejects an invalid status', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createVisit({ user: { companyId: 'c1' }, body: { patientName: 'أحمد', status: 'BOGUS' } }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('حالة الزيارة غير صحيحة');
      expect(prisma.labHomeVisit.create).not.toHaveBeenCalled();
    });

    test('rejects an invalid visit date', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createVisit({ user: { companyId: 'c1' }, body: { patientName: 'أحمد', visitDate: 'not-a-date' } }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('تاريخ الزيارة غير صحيح');
      expect(prisma.labHomeVisit.create).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.createVisit({ user: {}, body: { patientName: 'أحمد' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateVisit', () => {
    test('updates whitelisted fields', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst
        .mockResolvedValueOnce({ id: 'v1', companyId: 'c1', patientName: 'أحمد' })
        .mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'محدث', phone: '0111', reviewed: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'v1' },
        body: { patientName: 'محدث', phone: '0111', address: 'الجيزة' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { patientName: 'محدث', phone: '0111', address: 'الجيزة' }
      });
    });

    test('auto-sets reviewed=true when status becomes DONE', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst.mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'أحمد' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'v1' },
        body: { status: 'DONE' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { status: 'DONE', reviewed: true }
      });
    });

    test('marks reviewed when requested explicitly', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst.mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'أحمد' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'v1' },
        body: { reviewed: true }
      }, res);

      expect(prisma.labHomeVisit.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { reviewed: true }
      });
    });

    test('rejects an invalid status', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst.mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'أحمد' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'v1' },
        body: { status: 'BOGUS' }
      }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('حالة الزيارة غير صحيحة');
      expect(prisma.labHomeVisit.update).not.toHaveBeenCalled();
    });

    test('requires a patient name when provided', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst.mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'أحمد' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'v1' },
        body: { patientName: ' ' }
      }, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم المريض مطلوب');
    });

    test('returns 404 for a visit from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateVisit({
        user: { companyId: 'c1' },
        params: { id: 'other' },
        body: { patientName: 'محمد' }
      }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الزيارة غير موجودة');
      expect(prisma.labHomeVisit.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteVisit', () => {
    test('hard deletes a visit and returns an Arabic message', async () => {
      const prisma = createMockPrisma();
      prisma.labHomeVisit.findFirst.mockResolvedValue({ id: 'v1', companyId: 'c1', patientName: 'أحمد' });
      prisma.labHomeVisit.delete.mockResolvedValue({ id: 'v1', patientName: 'أحمد' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteVisit({ user: { companyId: 'c1' }, params: { id: 'v1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labHomeVisit.findFirst).toHaveBeenCalledWith({ where: { id: 'v1', companyId: 'c1' } });
      expect(prisma.labHomeVisit.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
      expect(res.payload.message).toBe('تم حذف الزيارة');
    });

    test('returns 404 for a visit from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteVisit({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
      expect(prisma.labHomeVisit.delete).not.toHaveBeenCalled();
    });
  });
});
