jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/bookingPatientService', () => ({
  findOrCreatePatient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { findOrCreatePatient } = require('../../services/bookingPatientService');
const controller = require('../../controller/radiologyController');
const appointments = require('../../controller/radiologyAppointmentsController');
const payments = require('../../controller/radiologyPaymentsController');
const { deriveRadiologyOrderStatus } = require('../../utils/radiologyStatusHistory');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    sent: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
    setHeader: jest.fn(),
    send: jest.fn((data) => {
      response.sent = data;
      return response;
    }),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    radiologyStudy: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyStudyImage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    radiologyReport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyStudyPayment: {
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    radiologyStudyStatusHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    radiologyShiftPayment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    radiologyShift: {
      findFirst: jest.fn(),
    },
    radiologyInsuranceInvoiceItem: {
      findFirst: jest.fn(),
    },
    radiologyInsuranceInvoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    radiologyAppointment: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    radiologyExamType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyEntityPrice: {
      findFirst: jest.fn(),
    },
    insuranceCompany: {
      findFirst: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
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

const makeStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  studyNumber: 'RAD-20260809-1234',
  patientId: null,
  patientName: 'محمد علي',
  patientPhone: '01001234567',
  patientGender: 'MALE',
  patientAge: '35',
  examTypeId: 'et-1',
  examTypeName: 'أشعة مقطعية',
  modality: 'CT',
  status: 'PENDING_IMAGING',
  orderStatus: 'PENDING',
  appointmentId: null,
  emergency: false,
  withContrast: false,
  referralDoctor: null,
  notes: null,
  accessionNumber: null,
  submissionStatus: 'NOT_SUBMITTED',
  rologyStudyLink: null,
  rologyReportLink: null,
  rologyRadiologist: null,
  reportReceivedAt: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  ...overrides,
});

describe('radiologyOrderDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreatePatient.mockResolvedValue({ id: 'patient-resolved-1' });
  });

  describe('deriveRadiologyOrderStatus', () => {
    test('returns PENDING with no arguments', () => {
      expect(deriveRadiologyOrderStatus()).toBe('PENDING');
      expect(deriveRadiologyOrderStatus({})).toBe('PENDING');
    });

    test('returns PENDING for a SCHEDULED appointment only', () => {
      expect(deriveRadiologyOrderStatus({ appointment: { status: 'SCHEDULED' } })).toBe('PENDING');
    });

    test('returns CHECKED_IN for a CHECKED_IN appointment only', () => {
      expect(deriveRadiologyOrderStatus({ appointment: { status: 'CHECKED_IN' } })).toBe('CHECKED_IN');
    });

    test('returns CANCELLED when the linked appointment is CANCELLED even if a study exists', () => {
      expect(
        deriveRadiologyOrderStatus({ appointment: { status: 'CANCELLED' }, study: { status: 'REPORTED' } })
      ).toBe('CANCELLED');
    });

    test('returns IN_PROGRESS once a study exists', () => {
      expect(deriveRadiologyOrderStatus({ appointment: { status: 'SCHEDULED' }, study: { status: 'PENDING_IMAGING' } })).toBe('IN_PROGRESS');
    });

    test('returns COMPLETED for a DELIVERED study', () => {
      expect(deriveRadiologyOrderStatus({ study: { status: 'DELIVERED' } })).toBe('COMPLETED');
    });
  });

  describe('getStudyDetails', () => {
    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyDetails(req({ user: {}, params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
    });

    test('returns 404 when the study is not found', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyDetails(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الدراسة غير موجودة');
    });

    test('aggregates study, images, report, payments, history, appointment and invoice', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(
        makeStudy({
          priceSnapshot: 1000,
          additionAmount: 100,
          billingType: 'PATIENT',
          appointmentId: 'ap-1',
          paidAmount: 700,
          paymentStatus: 'PARTIAL',
        })
      );
      prisma.radiologyStudyImage.findMany.mockResolvedValue([
        { id: 'img-1', studyId: 'study-1', fileName: 'a.dcm', storedName: 's1.dcm', data: Buffer.from([1, 2, 3]) },
      ]);
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'SIGNED' });
      prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 500 }, { amount: 200 }]);
      prisma.radiologyShiftPayment.findMany.mockResolvedValue([{ id: 'sp-1', amount: 500, type: 'PAYMENT' }]);
      prisma.radiologyStudyStatusHistory.findMany.mockResolvedValue([
        { id: 'h-1', dimension: 'PREP', status: 'PENDING_IMAGING', createdAt: new Date('2026-08-09T10:00:00.000Z') },
        { id: 'h-2', dimension: 'ORDER', status: 'IN_PROGRESS', createdAt: new Date('2026-08-09T11:00:00.000Z') },
      ]);
      prisma.radiologyInsuranceInvoiceItem.findFirst.mockResolvedValue({ id: 'inv-item-1', studyId: 'study-1', invoiceId: 'inv-1' });
      prisma.radiologyInsuranceInvoice.findUnique.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1', totalAmount: 1100 });
      prisma.radiologyAppointment.findUnique.mockResolvedValue({ id: 'ap-1', status: 'CHECKED_IN' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyDetails(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      const data = res.payload.data;

      expect(data.study.id).toBe('study-1');
      expect(data.study.orderStatus).toBe('IN_PROGRESS');
      expect(data.images).toHaveLength(1);
      expect(data.images[0].data).toBeUndefined();
      expect(data.report.id).toBe('rep-1');
      expect(data.payments).toEqual([{ amount: 500 }, { amount: 200 }]);
      expect(data.shiftPayments).toEqual([{ id: 'sp-1', amount: 500, type: 'PAYMENT' }]);
      expect(data.statusHistory.map((h) => h.id)).toEqual(['h-1', 'h-2']);
      expect(data.appointment).toEqual({ id: 'ap-1', status: 'CHECKED_IN' });
      expect(data.insuranceInvoice).toEqual({ id: 'inv-1', invoiceNumber: 'INV-1', totalAmount: 1100 });
      expect(data.totals.total).toBe(1100);
      expect(data.totals.paidAmount).toBe(700);
      expect(data.totals.remaining).toBe(400);
      expect(data.totals.paymentStatus).toBe('PARTIAL');
      expect(data.totals.billingType).toBe('PATIENT');

      expect(prisma.radiologyStudy.findFirst).toHaveBeenCalledWith({ where: { id: 'study-1', companyId: 'company-1' } });
      expect(prisma.radiologyStudyImage.findMany).toHaveBeenCalledWith({
        where: { studyId: 'study-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.radiologyStudyStatusHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studyId: 'study-1' } })
      );
      expect(prisma.radiologyInsuranceInvoiceItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studyId: 'study-1' } })
      );
      expect(prisma.radiologyAppointment.findUnique).toHaveBeenCalledWith({ where: { id: 'ap-1' } });
    });

    test('leaves appointment and insuranceInvoice null when absent', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(
        makeStudy({ priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT', appointmentId: null })
      );
      prisma.radiologyStudyImage.findMany.mockResolvedValue([]);
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      prisma.radiologyStudyPayment.findMany.mockResolvedValue([]);
      prisma.radiologyShiftPayment.findMany.mockResolvedValue([]);
      prisma.radiologyStudyStatusHistory.findMany.mockResolvedValue([]);
      prisma.radiologyInsuranceInvoiceItem.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyDetails(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.appointment).toBeNull();
      expect(prisma.radiologyAppointment.findUnique).not.toHaveBeenCalled();
      expect(res.payload.data.insuranceInvoice).toBeNull();
      expect(prisma.radiologyInsuranceInvoice.findUnique).not.toHaveBeenCalled();
      expect(res.payload.data.totals).toEqual({
        total: 1000,
        paidAmount: 0,
        remaining: 1000,
        paymentStatus: 'UNPAID',
        billingType: 'PATIENT',
      });
    });
  });

  describe('updateStudy history recording', () => {
    test('records a PREP history row and syncs orderStatus to IN_PROGRESS on a status change', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy({ status: 'IMAGED' }), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'PENDING_REPORT' } }), res);

      expect(res.statusCode).toBe(200);
      const historyData = prisma.radiologyStudyStatusHistory.create.mock.calls.map((c) => c[0].data);
      expect(historyData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            companyId: 'company-1',
            studyId: 'study-1',
            dimension: 'PREP',
            status: 'PENDING_REPORT',
            oldStatus: 'IMAGED',
            changedBy: 'user-1',
            userName: 'أحمد محمود',
          }),
        ])
      );
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'study-1' }, data: expect.objectContaining({ orderStatus: 'IN_PROGRESS' }) })
      );
    });

    test('rejects an invalid transition without recording history', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'PENDING_IMAGING' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'REPORTED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudyStatusHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('markDelivered order status', () => {
    test('sets orderStatus COMPLETED and records PREP + REPORT histories', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(
        makeStudy({ status: 'REPORTED', rologyReportLink: 'https://rology.example/report/1' })
      );
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'SIGNED' });
      prisma.radiologyStudyImage.count.mockResolvedValue(0);
      prisma.radiologyReport.update.mockResolvedValue({ id: 'rep-1', reportStatus: 'DELIVERED' });
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'study-1' }, data: expect.objectContaining({ orderStatus: 'COMPLETED' }) })
      );
      const historyData = prisma.radiologyStudyStatusHistory.create.mock.calls.map((c) => c[0].data);
      expect(historyData.some((d) => d.dimension === 'PREP' && d.studyId === 'study-1' && d.status === 'DELIVERED')).toBe(true);
      expect(historyData.some((d) => d.dimension === 'REPORT' && d.studyId === 'study-1' && d.status === 'DELIVERED')).toBe(true);
    });

    test('still blocks delivery without a signed report', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'DRAFT' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يجب توقيع التقرير قبل التسليم');
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudyStatusHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('payment status and REFUNDED', () => {
    test('records a partial payment as PARTIAL with PAYMENT history and shift attachment', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 100, billingType: 'PATIENT' });
      prisma.radiologyStudyPayment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'pay-1', amount: 500 });
      prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 500 }]);
      prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1' });
      prisma.radiologyShiftPayment.create.mockResolvedValue({ id: 'sp-1' });
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 500, method: 'CASH' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.total).toBe(1100);
      expect(res.payload.data.paidAmount).toBe(500);
      expect(res.payload.data.remaining).toBe(600);
      expect(res.payload.data.paymentStatus).toBe('PARTIAL');
      expect(prisma.radiologyShiftPayment.create).toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'study-1' }, data: expect.objectContaining({ paymentStatus: 'PARTIAL', paidAmount: 500 }) })
      );
      const historyData = prisma.radiologyStudyStatusHistory.create.mock.calls.map((c) => c[0].data);
      expect(historyData.some((d) => d.dimension === 'PAYMENT' && d.studyId === 'study-1')).toBe(true);
    });

    test('records a payment up to the total as PAID', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT' });
      prisma.radiologyStudyPayment.aggregate.mockResolvedValue({ _sum: { amount: 600 } });
      prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'pay-2', amount: 400 });
      prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 400 }, { amount: 600 }]);
      prisma.radiologyShift.findFirst.mockResolvedValue(null);
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 400, method: 'CASH' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.paymentStatus).toBe('PAID');
      expect(res.payload.data.remaining).toBe(0);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID' }) })
      );
    });

    test('a full refund sets paymentStatus to REFUNDED and records PAYMENT history with a reason', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT' });
      prisma.radiologyStudyPayment.findMany
        .mockResolvedValueOnce([{ amount: 1000 }])
        .mockResolvedValue([{ amount: 1000 }, { amount: -1000 }]);
      prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'ref-1', amount: -1000 });
      prisma.radiologyShift.findFirst.mockResolvedValue(null);
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await payments.refundStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 1000 } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.paidAmount).toBe(0);
      expect(res.payload.data.paymentStatus).toBe('REFUNDED');
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'study-1' }, data: expect.objectContaining({ paymentStatus: 'REFUNDED', paidAmount: 0 }) })
      );
      const historyData = prisma.radiologyStudyStatusHistory.create.mock.calls.map((c) => c[0].data);
      expect(historyData.some((d) => d.dimension === 'PAYMENT' && String(d.reason || '').includes('استرجاع'))).toBe(true);
    });

    test('still blocks overpayment', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT' });
      prisma.radiologyStudyPayment.aggregate.mockResolvedValue({ _sum: { amount: 900 } });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 200 } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('يتجاوز المتبقي');
      expect(prisma.radiologyStudyPayment.create).not.toHaveBeenCalled();
      expect(prisma.radiologyStudyStatusHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('convertToStudy order status', () => {
    test('creates an IN_PROGRESS study linked to the appointment with initial histories', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue({
        id: 'appt-1', companyId: 'company-1', status: 'SCHEDULED', patientId: 'pat-1', patientName: 'مريض', patientPhone: '010',
        patientGender: 'F', patientAge: '30', examTypeId: 'et-1', examTypeName: 'أشعة CT',
      });
      prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'et-1', name: 'أشعة CT', category: 'CT', price: 400, isActive: true }]);
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'DONE', studyId: 'study-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.convertToStudy(req({ params: { id: 'appt-1' } }), res);

      expect(res.statusCode).toBe(200);
      const createData = prisma.radiologyStudy.create.mock.calls[0][0].data;
      expect(createData.orderStatus).toBe('IN_PROGRESS');
      expect(createData.appointmentId).toBe('appt-1');
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'appt-1' }, data: expect.objectContaining({ studyId: 'study-1' }) })
      );
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'appt-1' }, data: expect.objectContaining({ status: 'DONE' }) })
      );
      const historyData = prisma.radiologyStudyStatusHistory.create.mock.calls.map((c) => c[0].data);
      expect(historyData.some((d) => d.dimension === 'PREP' && d.studyId === 'study-1' && d.status === 'PENDING_IMAGING')).toBe(true);
      expect(historyData.some((d) => d.dimension === 'ORDER' && d.studyId === 'study-1' && d.oldStatus === 'PENDING' && d.status === 'IN_PROGRESS')).toBe(true);
    });

    test('rejects converting a CANCELLED appointment', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', status: 'CANCELLED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.convertToStudy(req({ params: { id: 'appt-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
      expect(prisma.radiologyStudyStatusHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAppointment cancel propagation', () => {
    test('cancelling an appointment with a linked study sets the study orderStatus to CANCELLED', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', status: 'SCHEDULED', studyId: 'study-1' });
      prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });
      prisma.radiologyStudy.findUnique.mockResolvedValue({ id: 'study-1', companyId: 'company-1', status: 'REPORTED', orderStatus: 'IN_PROGRESS' });
      prisma.radiologyStudy.update.mockResolvedValue({ id: 'study-1', orderStatus: 'CANCELLED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CANCELLED' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'study-1' }, data: expect.objectContaining({ orderStatus: 'CANCELLED' }) })
      );
    });

    test('does not touch a linked study for a non-cancel status', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', status: 'SCHEDULED', studyId: 'study-1' });
      prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'CHECKED_IN' });
      prisma.radiologyStudy.findUnique.mockResolvedValue({ id: 'study-1', companyId: 'company-1', status: 'REPORTED', orderStatus: 'IN_PROGRESS' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CHECKED_IN' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });
  });
});
