jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/bookingOperationsController');

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

const createPrisma = (overrides = {}) => {
  const prisma = {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    examLabel: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    reportDelivery: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    medicalInvoice: {
      findMany: jest.fn(),
    },
    transactionLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

describe('bookingOperationsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUnprintedLabels', () => {
    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getUnprintedLabels(req({ user: {} }), res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });

    test('lists unprinted appointments with patient, service and room', async () => {
      const prisma = createPrisma();
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          companyId: 'company-1',
          patientId: 'pat-1',
          patient: { id: 'pat-1', firstName: 'محمد', lastName: 'علي', phone: '0100' },
          branch: { id: 'b1', name: 'فرع رئيسي' },
          service: { id: 's1', name: 'كشف عيون' },
          serviceName: null,
          room: 'غرفة 1',
          customerName: 'عميل قديم',
          customerPhone: '0111',
          appointmentDate: new Date('2026-08-07'),
          startTime: '10:00',
          status: 'confirmed',
          bookingStatus: 'CHECKED_IN',
          reportStatus: 'PENDING',
        },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getUnprintedLabels(
        req({ query: { date: '2026-08-07', branchId: 'b1' } }),
        res
      );

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            labelPrinted: false,
            appointmentDate: { gte: expect.any(Date), lte: expect.any(Date) },
            branchId: 'b1',
          },
        })
      );

      expect(res.statusCode).toBe(200);
      const entry = res.payload.data[0];
      expect(entry.appointmentId).toBe('appt-1');
      expect(entry.patientName).toBe('محمد علي');
      expect(entry.patientPhone).toBe('0100');
      expect(entry.serviceName).toBe('كشف عيون');
      expect(entry.room).toBe('غرفة 1');
      expect(entry.branchName).toBe('فرع رئيسي');
    });

    test('defaults to today when no date query is provided', async () => {
      const prisma = createPrisma();
      prisma.appointment.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getUnprintedLabels(req({ query: {} }), res);

      const where = prisma.appointment.findMany.mock.calls[0][0].where;
      expect(where.labelPrinted).toBe(false);
      expect(where.appointmentDate.gte).toBeInstanceOf(Date);
      expect(where.appointmentDate.lte).toBeInstanceOf(Date);
    });
  });

  describe('getPrintedLabels', () => {
    test('returns printed labels joined with patient and appointment', async () => {
      const prisma = createPrisma();
      prisma.examLabel.findMany.mockResolvedValue([
        {
          id: 'label-1',
          companyId: 'company-1',
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          labelType: 'EXAM',
          printedAt: new Date('2026-08-07T09:00:00'),
          printedBy: 'user-1',
          appointment: {
            id: 'appt-1',
            customerName: 'عميل',
            customerPhone: '0111',
            serviceName: 'كشف',
            appointmentDate: new Date('2026-08-07'),
            startTime: '10:00',
            room: 'غرفة 1',
            patient: { id: 'pat-1', firstName: 'محمد', lastName: 'علي', phone: '0100' },
          },
        },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getPrintedLabels(req({ query: { date: '2026-08-07' } }), res);

      expect(prisma.examLabel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1', printedAt: { gte: expect.any(Date), lte: expect.any(Date) } },
          orderBy: { printedAt: 'desc' },
        })
      );

      const printedAtWhere = prisma.examLabel.findMany.mock.calls[0][0].where.printedAt;
      expect(printedAtWhere.gte.toISOString()).toBe('2026-08-07T00:00:00.000Z');
      expect(printedAtWhere.lte.toISOString()).toBe('2026-08-07T23:59:59.999Z');

      const entry = res.payload.data[0];
      expect(entry.id).toBe('label-1');
      expect(entry.labelType).toBe('EXAM');
      expect(entry.patientName).toBe('محمد علي');
      expect(entry.patientPhone).toBe('0100');
      expect(entry.serviceName).toBe('كشف');
      expect(entry.room).toBe('غرفة 1');
    });
  });

  describe('printLabel', () => {
    test('creates ExamLabel and marks appointment labelPrinted', async () => {
      const prisma = createPrisma();
      prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', patientId: 'pat-1' });
      prisma.examLabel.create.mockResolvedValue({
        id: 'label-1',
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        labelType: 'EXAM',
        printedAt: new Date('2026-08-07T09:00:00'),
        printedBy: 'user-1',
      });
      prisma.appointment.update.mockResolvedValue({ id: 'appt-1', labelPrinted: true });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.printLabel(
        req({ body: { appointmentId: 'appt-1', labelType: 'EXAM' } }),
        res
      );

      expect(prisma.examLabel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          labelType: 'EXAM',
          printedBy: 'أحمد محمود',
        }),
      });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { labelPrinted: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.id).toBe('label-1');
    });

    test('rejects appointment that does not belong to the company', async () => {
      const prisma = createPrisma();
      prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', companyId: 'other-company', patientId: 'pat-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.printLabel(req({ body: { appointmentId: 'appt-1' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.examLabel.create).not.toHaveBeenCalled();
    });

    test('rejects invalid label type', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.printLabel(req({ body: { appointmentId: 'appt-1', labelType: 'BAD' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.examLabel.create).not.toHaveBeenCalled();
    });
  });

  describe('getDeliveries', () => {
    test('merges delivery status and invoice paidStatus, applies paidStatus filter', async () => {
      const prisma = createPrisma();
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          companyId: 'company-1',
          patientId: 'pat-1',
          patient: { id: 'pat-1', firstName: 'محمد', lastName: 'علي', phone: '0100' },
          branch: null,
          service: { name: 'كشف' },
          serviceName: null,
          room: 'غرفة 1',
          customerName: 'عميل',
          customerPhone: null,
          appointmentDate: new Date('2026-08-07'),
          startTime: '10:00',
          reportStatus: 'APPROVED',
          resultDelivered: true,
        },
        {
          id: 'appt-2',
          companyId: 'company-1',
          patientId: null,
          patient: null,
          branch: null,
          service: { name: 'أشعة' },
          serviceName: null,
          room: null,
          customerName: 'عميل ثاني',
          customerPhone: '0111',
          appointmentDate: new Date('2026-08-07'),
          startTime: '11:00',
          reportStatus: 'PENDING',
          resultDelivered: false,
        },
      ]);
      prisma.reportDelivery.findMany.mockResolvedValue([
        { id: 'del-2', companyId: 'company-1', appointmentId: 'appt-2', patientId: null, status: 'READY', deliveredAt: null, deliveredBy: null },
      ]);
      prisma.medicalInvoice.findMany.mockResolvedValue([
        { appointmentId: 'appt-1', status: 'PAID' },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDeliveries(
        req({ query: { date: '2026-08-07', paidStatus: 'PAID' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.length).toBe(1);
      const entry = res.payload.data[0];
      expect(entry.appointmentId).toBe('appt-1');
      expect(entry.status).toBe('DELIVERED');
      expect(entry.paidStatus).toBe('PAID');
      expect(entry.patientName).toBe('محمد علي');
    });

    test('derives READY from approved report status and UNPAID without invoice', async () => {
      const prisma = createPrisma();
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          companyId: 'company-1',
          patientId: null,
          patient: null,
          branch: null,
          service: { name: 'كشف' },
          serviceName: null,
          room: null,
          customerName: 'عميل',
          customerPhone: null,
          appointmentDate: new Date('2026-08-07'),
          startTime: '10:00',
          reportStatus: 'APPROVED',
          resultDelivered: false,
        },
      ]);
      prisma.reportDelivery.findMany.mockResolvedValue([]);
      prisma.medicalInvoice.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDeliveries(req({ query: { date: '2026-08-07' } }), res);

      const entry = res.payload.data[0];
      expect(entry.status).toBe('READY');
      expect(entry.paidStatus).toBe('UNPAID');
      expect(entry.id).toBeNull();
    });
  });

  describe('markReady', () => {
    test('upserts a delivery row when missing (by appointment id)', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', patientId: 'pat-1' });
      prisma.reportDelivery.findFirst.mockResolvedValue(null);
      prisma.reportDelivery.create.mockResolvedValue({ id: 'del-1', appointmentId: 'appt-1', status: 'READY' });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markReady(req({ params: { id: 'appt-1' } }), res);

      expect(prisma.reportDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          status: 'READY',
        }),
      });
      expect(res.payload.data.status).toBe('READY');
    });

    test('updates an existing delivery row', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue({
        id: 'del-1',
        companyId: 'company-1',
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        status: 'NOT_READY',
      });
      prisma.reportDelivery.update.mockResolvedValue({ id: 'del-1', status: 'READY' });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markReady(req({ params: { id: 'del-1' } }), res);

      expect(prisma.reportDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { status: 'READY' },
      });
      expect(res.payload.data.status).toBe('READY');
    });

    test('updates existing delivery when id is the appointment id (upsert by appointment)', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', patientId: 'pat-1' });
      prisma.reportDelivery.findFirst.mockResolvedValue({
        id: 'del-1',
        companyId: 'company-1',
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        status: 'NOT_READY',
      });
      prisma.reportDelivery.update.mockResolvedValue({ id: 'del-1', appointmentId: 'appt-1', status: 'READY' });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markReady(req({ params: { id: 'appt-1' } }), res);

      expect(prisma.reportDelivery.findFirst).toHaveBeenCalledWith({
        where: { companyId: 'company-1', appointmentId: 'appt-1' },
      });
      expect(prisma.reportDelivery.create).not.toHaveBeenCalled();
      expect(prisma.reportDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { status: 'READY' },
      });
      expect(res.payload.data.status).toBe('READY');
    });

    test('returns 404 when delivery and appointment are outside the company', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markReady(req({ params: { id: 'unknown' } }), res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('markDelivered', () => {
    test('sets DELIVERED and marks appointment resultDelivered', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue(null);
      prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', patientId: 'pat-1' });
      prisma.reportDelivery.findFirst.mockResolvedValue(null);
      prisma.reportDelivery.create.mockResolvedValue({
        id: 'del-1',
        appointmentId: 'appt-1',
        status: 'DELIVERED',
        deliveredAt: new Date('2026-08-07T12:00:00'),
        deliveredBy: 'أحمد محمود',
      });
      prisma.appointment.update.mockResolvedValue({ id: 'appt-1', resultDelivered: true });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(
        req({ params: { id: 'appt-1' }, user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' } }),
        res
      );

      expect(prisma.reportDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          appointmentId: 'appt-1',
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
          deliveredBy: 'أحمد محمود',
        }),
      });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { resultDelivered: true },
      });
      expect(res.payload.data.status).toBe('DELIVERED');
    });

    test('updates existing delivery with deliveredAt and deliveredBy', async () => {
      const prisma = createPrisma();
      prisma.reportDelivery.findUnique.mockResolvedValue({
        id: 'del-1',
        companyId: 'company-1',
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        status: 'READY',
      });
      prisma.reportDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'DELIVERED',
        deliveredAt: new Date('2026-08-07T12:00:00'),
        deliveredBy: 'أحمد محمود',
      });
      prisma.appointment.update.mockResolvedValue({ id: 'appt-1', resultDelivered: true });
      prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(
        req({ params: { id: 'del-1' }, user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' } }),
        res
      );

      expect(prisma.reportDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date), deliveredBy: 'أحمد محمود' }),
      });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { resultDelivered: true },
      });
    });
  });

  describe('logTransaction', () => {
    test('creates a transaction log row with user context', async () => {
      const prisma = createPrisma();
      prisma.transactionLog.create.mockResolvedValue({
        id: 'log-1',
        entityType: 'INVOICE',
        entityId: 'inv-1',
        action: 'PAYMENT',
        description: 'دفعة نقدية',
        amount: 250,
        payer: 'محمد',
        userId: 'user-1',
        userName: 'أحمد محمود',
        createdAt: new Date('2026-08-07T12:00:00'),
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.logTransaction(
        req({
          body: { entityType: 'INVOICE', entityId: 'inv-1', action: 'PAYMENT', description: 'دفعة نقدية', amount: 250, payer: 'محمد' },
        }),
        res
      );

      expect(prisma.transactionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          entityType: 'INVOICE',
          entityId: 'inv-1',
          action: 'PAYMENT',
          amount: 250,
          userName: 'أحمد محمود',
        }),
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.id).toBe('log-1');
    });

    test('rejects invalid entityType', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.logTransaction(
        req({ body: { entityType: 'CAR', entityId: 'x', action: 'CREATE' } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(prisma.transactionLog.create).not.toHaveBeenCalled();
    });

    test('rejects invalid action', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.logTransaction(
        req({ body: { entityType: 'PATIENT', entityId: 'x', action: 'DELETE' } }),
        res
      );

      expect(res.statusCode).toBe(400);
    });

    test('rejects a non-finite amount (Infinity)', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.logTransaction(
        req({ body: { entityType: 'INVOICE', entityId: 'inv-1', action: 'PAYMENT', amount: Infinity } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المبلغ غير صالح');
      expect(prisma.transactionLog.create).not.toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    test('lists transactions newest first with filters and pagination', async () => {
      const prisma = createPrisma();
      prisma.transactionLog.findMany.mockResolvedValue([
        {
          id: 'log-2', entityType: 'PAYMENT', entityId: 'inv-2', action: 'PAYMENT',
          description: 'دفعة ثانية', amount: 100, payer: null, userId: 'user-1',
          userName: 'أحمد محمود', createdAt: new Date('2026-08-07T13:00:00'),
        },
        {
          id: 'log-1', entityType: 'INVOICE', entityId: 'inv-1', action: 'CREATE',
          description: 'إنشاء فاتورة', amount: 500, payer: 'محمد', userId: null,
          userName: null, createdAt: new Date('2026-08-07T12:00:00'),
        },
      ]);
      prisma.transactionLog.count.mockResolvedValue(2);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTransactions(
        req({ query: { from: '2026-08-01', to: '2026-08-31', entityType: 'INVOICE', search: 'فاتورة', page: '1', limit: '100' } }),
        res
      );

      expect(prisma.transactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            entityType: 'INVOICE',
            createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 100,
        })
      );
      expect(res.payload.data.items.length).toBe(2);
      expect(res.payload.data.total).toBe(2);
      expect(res.payload.data.items[0].id).toBe('log-2');
    });
  });
});
