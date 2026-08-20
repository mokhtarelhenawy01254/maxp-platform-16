jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  getReportsSummary,
  getRevenueReport,
  getActualVsExpected,
  getDues,
  getPhysicianCommissions,
  getRefunds,
  getCashierDaily,
  exportCsv,
} = require('../../controller/bookingReportsController');

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

const buildReq = (query = {}) => ({
  user: { id: 'user-1', companyId: 'company-1' },
  query
});

const invoiceMock = {
  id: 'inv-1',
  appointmentId: 'appt-1',
  total: 1000,
  discount: 100,
  amountPaid: 900,
  status: 'PAID',
  createdAt: new Date('2026-08-01T10:00:00.000Z'),
  invoiceNumber: 'INV-1',
  patientId: 'pat-1',
  dueDate: null
};

describe('bookingReports KPI controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueReport', () => {
    test('groups billed / discounts / collected / outstanding per doctor and service', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { ...invoiceMock, id: 'inv-1', appointmentId: 'appt-1', total: 1000, discount: 100, amountPaid: 900, status: 'PAID' },
            { ...invoiceMock, id: 'inv-2', appointmentId: 'appt-2', total: 500, discount: 0, amountPaid: 200, status: 'PARTIAL' },
            { ...invoiceMock, id: 'inv-3', appointmentId: 'appt-3', total: 800, discount: 50, amountPaid: 0, status: 'UNPAID' },
            { ...invoiceMock, id: 'inv-4', appointmentId: 'appt-4', total: 300, discount: 0, amountPaid: 300, status: 'REFUNDED' },
          ])
        },
        appointment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'appt-1', doctorId: 'doc-1', serviceId: 'svc-1', serviceName: '┘â╪┤┘ü', reportStatus: 'APPROVED' },
            { id: 'appt-2', doctorId: 'doc-1', serviceId: 'svc-2', serviceName: '╪ú╪┤╪╣╪⌐', reportStatus: 'APPROVED' },
            { id: 'appt-3', doctorId: 'doc-2', serviceId: 'svc-1', serviceName: '┘â╪┤┘ü', reportStatus: 'PENDING' },
            { id: 'appt-4', doctorId: 'doc-3', serviceId: 'svc-3', serviceName: '┘à┘à┘å┘ê╪╣', reportStatus: 'PENDING' },
          ])
        },
        bookingDoctor: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'doc-1', name: '╪»/ ╪ú╪¡┘à╪»', specialty: '╪╣╪╕╪º┘à' },
            { id: 'doc-2', name: '╪»/ ┘à╪¡┘à╪»', specialty: '╪¼┘ä╪»┘è╪⌐' },
          ])
        },
        bookingService: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'svc-1', name: '┘â╪┤┘ü' },
            { id: 'svc-2', name: '╪ú╪┤╪╣╪⌐' },
          ])
        },
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { invoiceId: 'inv-1', amount: 900, paidAt: new Date('2026-08-01T11:00:00.000Z') },
            { invoiceId: 'inv-2', amount: 200, paidAt: new Date('2026-08-01T12:00:00.000Z') },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getRevenueReport(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.totals).toEqual({
        billed: 2300,
        discounts: 150,
        collected: 1100,
        outstanding: 1050,
        invoiceCount: 3,
      });

      const doc1 = res.payload.data.byDoctor.find((r) => r.id === 'doc-1');
      expect(doc1).toEqual(expect.objectContaining({
        name: '╪»/ ╪ú╪¡┘à╪»',
        billed: 1500,
        discounts: 100,
        collected: 1100,
        outstanding: 300,
        invoiceCount: 2,
      }));

      const svc1 = res.payload.data.byService.find((r) => r.id === 'svc-1');
      expect(svc1).toEqual(expect.objectContaining({
        name: '┘â╪┤┘ü',
        billed: 1800,
        discounts: 150,
        collected: 900,
        outstanding: 750,
        invoiceCount: 2,
      }));

      expect(prisma.medicalInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-1' }) })
      );
    });
  });

  describe('getDues', () => {
    test('keeps only invoices with remaining balance and groups by patient', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            {
              id: 'inv-a', invoiceNumber: 'INV-A', patientId: 'pat-1', total: 1000, discount: 0,
              amountPaid: 400, status: 'PARTIAL', dueDate: null, createdAt: new Date('2026-08-01T10:00:00.000Z'),
              patient: { id: 'pat-1', firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' },
            },
            {
              id: 'inv-b', invoiceNumber: 'INV-B', patientId: 'pat-1', total: 500, discount: 100,
              amountPaid: 400, status: 'UNPAID', dueDate: null, createdAt: new Date('2026-08-02T10:00:00.000Z'),
              patient: { id: 'pat-1', firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' },
            },
            {
              id: 'inv-c', invoiceNumber: 'INV-C', patientId: 'pat-2', total: 300, discount: 0,
              amountPaid: 0, status: 'UNPAID', dueDate: null, createdAt: new Date('2026-08-03T10:00:00.000Z'),
              patient: { id: 'pat-2', firstName: '┘à╪▒┘è┘à', lastName: '', phone: '01100000000' },
            },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getDues(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.totals).toEqual({
        outstanding: 900,
        paidBackTotal: 400,
        invoiceCount: 2,
        patientCount: 2,
      });

      const patient1 = res.payload.data.patients.find((p) => p.patientId === 'pat-1');
      expect(patient1).toEqual(expect.objectContaining({
        patientName: '╪ú╪¡┘à╪» ╪╣┘ä┘è',
        patientPhone: '01000000000',
        totalOutstanding: 600,
        paidBackTotal: 400,
        invoiceCount: 1,
      }));
      expect(patient1.invoices.map((i) => i.invoiceNumber)).toEqual(['INV-A']);
      expect(patient1.invoices[0].remaining).toBe(600);
    });
  });

  describe('getPhysicianCommissions', () => {
    test('falls back to zero rate when commissionRate is null', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'inv-x', appointmentId: 'appt-x', total: 1000, discount: 100, status: 'PAID' },
            { id: 'inv-y', appointmentId: 'appt-y', total: 2000, discount: 0, status: 'PARTIAL' },
          ])
        },
        appointment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'appt-x', doctorId: 'doc-1', serviceId: 'svc-1', serviceName: '┘â╪┤┘ü', reportStatus: 'APPROVED' },
            { id: 'appt-y', doctorId: 'doc-2', serviceId: 'svc-1', serviceName: '┘â╪┤┘ü', reportStatus: 'PENDING' },
          ])
        },
        bookingDoctor: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'doc-1', name: '╪»/ ╪ú╪¡┘à╪»', specialty: '╪╣╪╕╪º┘à', commissionRate: 10, branchId: 'branch-1' },
            { id: 'doc-2', name: '╪»/ ┘à╪¡┘à╪»', specialty: '╪¼┘ä╪»┘è╪⌐', commissionRate: null, branchId: null },
          ])
        },
        bookingBranch: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'branch-1', name: '╪º┘ä┘ü╪▒╪╣ ╪º┘ä╪▒╪ª┘è╪│┘è' },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getPhysicianCommissions(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      const doc1 = res.payload.data.rows.find((r) => r.doctorId === 'doc-1');
      expect(doc1).toEqual(expect.objectContaining({
        doctorName: '╪»/ ╪ú╪¡┘à╪»',
        branchName: '╪º┘ä┘ü╪▒╪╣ ╪º┘ä╪▒╪ª┘è╪│┘è',
        gross: 900,
        commissionRate: 10,
        commission: 90,
        net: 810,
        unapprovedCount: 0,
      }));

      const doc2 = res.payload.data.rows.find((r) => r.doctorId === 'doc-2');
      expect(doc2).toEqual(expect.objectContaining({
        doctorName: '╪»/ ┘à╪¡┘à╪»',
        gross: 2000,
        commissionRate: 0,
        commission: 0,
        net: 2000,
        unapprovedCount: 1,
      }));
      expect(doc2.byReportStatus).toEqual(expect.arrayContaining([{ status: 'PENDING', count: 1 }]));

      expect(res.payload.data.totals).toEqual({
        gross: 2900,
        commission: 90,
        net: 2810,
        unapprovedCount: 1,
      });
    });
  });

  describe('getCashierDaily', () => {
    test('aggregates collected by method, discounts and paybacks per cashier per day', async () => {
      const prisma = {
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { amount: 1000, method: 'CASH', paidAt: new Date('2026-08-01T10:00:00.000Z'), cashierName: '╪ú╪¡┘à╪»', reason: null, paybackOfPaymentId: null },
            { amount: 500, method: 'CARD', paidAt: new Date('2026-08-01T11:00:00.000Z'), cashierName: '╪ú╪¡┘à╪»', reason: null, paybackOfPaymentId: null },
            { amount: -200, method: 'CASH', paidAt: new Date('2026-08-01T12:00:00.000Z'), cashierName: '╪ú╪¡┘à╪»', reason: '╪º╪│╪¬╪▒╪»╪º╪»', paybackOfPaymentId: null },
            { amount: 300, method: 'CASH', paidAt: new Date('2026-08-01T13:00:00.000Z'), cashierName: '┘à╪¡┘à╪»', reason: null, paybackOfPaymentId: null },
            { amount: 50, method: 'CASH', paidAt: new Date('2026-08-02T10:00:00.000Z'), cashierName: '┘à╪¡┘à╪»', reason: 'payback refund', paybackOfPaymentId: null },
          ])
        },
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { discount: 100, cashierName: '╪ú╪¡┘à╪»', createdAt: new Date('2026-08-01T09:00:00.000Z'), status: 'PAID' },
          ])
        },
        cashierShift: {
          findMany: jest.fn().mockResolvedValueOnce([
            { cashierName: '╪ú╪¡┘à╪»', openedAt: new Date('2026-08-01T08:00:00.000Z'), openingBalance: 500, closingBalance: 1800, status: 'CLOSED' },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getCashierDaily(buildReq({ from: '2026-08-01', to: '2026-08-02' }), res);

      expect(res.statusCode).toBe(200);
      const ahmed = res.payload.data.rows.find((r) => r.date === '2026-08-01' && r.cashierName === '╪ú╪¡┘à╪»');
      expect(ahmed).toEqual(expect.objectContaining({
        totalCollected: 1500,
        totalCount: 2,
        discounts: 100,
        paybacks: 200,
        netCollected: 1200,
        openingBalance: 500,
        closingBalance: 1800,
        shiftStatus: 'CLOSED',
      }));
      expect(ahmed.byMethod).toEqual(expect.arrayContaining([
        { method: 'CASH', amount: 1000, count: 1 },
        { method: 'CARD', amount: 500, count: 1 },
      ]));

      const mohamedDay1 = res.payload.data.rows.find((r) => r.date === '2026-08-01' && r.cashierName === '┘à╪¡┘à╪»');
      expect(mohamedDay1).toEqual(expect.objectContaining({ totalCollected: 300, paybacks: 0, shiftStatus: 'NO_SHIFT' }));

      const mohamedDay2 = res.payload.data.rows.find((r) => r.date === '2026-08-02' && r.cashierName === '┘à╪¡┘à╪»');
      expect(mohamedDay2).toEqual(expect.objectContaining({ totalCollected: 50, paybacks: 0 }));

      expect(res.payload.data.totals).toEqual(expect.objectContaining({
        totalCollected: 1850,
        totalCount: 4,
        discounts: 100,
        paybacks: 200,
        netCollected: 1550,
        dayCount: 2,
        cashierCount: 2,
      }));
    });

    test('does NOT treat a positive payment with a refund-ish reason as a payback', async () => {
      const prisma = {
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { amount: 500, method: 'CASH', paidAt: new Date('2026-08-01T10:00:00.000Z'), cashierName: '╪ú╪¡┘à╪»', reason: '╪¬╪¡╪╡┘è┘ä ╪º╪│╪¬╪▒╪»╪º╪» ╪│╪º╪¿┘é', paybackOfPaymentId: null },
            { amount: -200, method: 'CASH', paidAt: new Date('2026-08-01T11:00:00.000Z'), cashierName: '╪ú╪¡┘à╪»', reason: '╪º╪│╪¬╪▒╪»╪º╪»', paybackOfPaymentId: 'orig-1' },
          ])
        },
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([]),
        },
        cashierShift: {
          findMany: jest.fn().mockResolvedValueOnce([]),
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getCashierDaily(buildReq({ from: '2026-08-01', to: '2026-08-01' }), res);

      expect(res.statusCode).toBe(200);
      const ahmed = res.payload.data.rows.find((r) => r.cashierName === '╪ú╪¡┘à╪»');
      expect(ahmed.totalCollected).toBe(500);
      expect(ahmed.totalCount).toBe(1);
      expect(ahmed.paybacks).toBe(200);
    });
  });

  describe('getActualVsExpected', () => {
    test('expected = non-refunded invoice net per day; actual = payments per day; variance computed', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'inv-1', total: 1000, discount: 100, additionAmount: 0, status: 'PAID', createdAt: new Date('2026-08-01T10:00:00.000Z') },
            { id: 'inv-2', total: 500, discount: 0, additionAmount: 0, status: 'UNPAID', createdAt: new Date('2026-08-01T11:00:00.000Z') },
            { id: 'inv-3', total: 300, discount: 0, additionAmount: 0, status: 'REFUNDED', createdAt: new Date('2026-08-01T12:00:00.000Z') },
            { id: 'inv-4', total: 700, discount: 50, additionAmount: 150, status: 'PARTIAL', createdAt: new Date('2026-08-02T10:00:00.000Z') },
          ])
        },
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { amount: 900, paidAt: new Date('2026-08-01T11:00:00.000Z') },
            { amount: 200, paidAt: new Date('2026-08-01T12:00:00.000Z') },
            { amount: 300, paidAt: new Date('2026-08-02T11:00:00.000Z') },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getActualVsExpected(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.totals).toEqual({ expected: 2200, actual: 1400, variance: -800 });

      const day1 = res.payload.data.rows.find((r) => r.date === '2026-08-01');
      expect(day1).toEqual({ date: '2026-08-01', expected: 1400, actual: 1100, variance: -300 });
      const day2 = res.payload.data.rows.find((r) => r.date === '2026-08-02');
      expect(day2).toEqual({ date: '2026-08-02', expected: 800, actual: 300, variance: -500 });
    });

    test('groups late-night Egyptian payments into the correct Cairo day and range', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'inv-n', total: 1000, discount: 0, additionAmount: 0, status: 'PAID', createdAt: new Date('2026-08-01T23:00:00.000Z') },
          ])
        },
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { amount: 1000, paidAt: new Date('2026-08-01T23:00:00.000Z') },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getActualVsExpected(buildReq({ from: '2026-08-02', to: '2026-08-02' }), res);

      expect(res.statusCode).toBe(200);
      const day2 = res.payload.data.rows.find((r) => r.date === '2026-08-02');
      expect(day2).toEqual({ date: '2026-08-02', expected: 1000, actual: 1000, variance: 0 });
    });
  });

  describe('getReportsSummary', () => {
    test('financials outstanding uses net (total - discount + addition) minus collected and excludes REFUNDED', async () => {
      const prisma = {
        appointment: {
          count: jest.fn().mockResolvedValue(10),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValue([
            { total: 1000, discount: 100, additionAmount: 0, amountPaid: 900, status: 'PAID', patientId: 'p1', appointmentId: null },
            { total: 500, discount: 0, additionAmount: 50, amountPaid: 100, status: 'PARTIAL', patientId: 'p2', appointmentId: null },
            { total: 300, discount: 0, additionAmount: 0, amountPaid: 0, status: 'REFUNDED', patientId: 'p3', appointmentId: null },
          ]),
        },
        bookingBranch: { findMany: jest.fn().mockResolvedValue([]) },
        bookingDoctor: { findMany: jest.fn().mockResolvedValue([]) },
        patient: { findMany: jest.fn().mockResolvedValue([]) },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getReportsSummary({ user: { companyId: 'company-1' }, query: { period: 'today' } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.financials).toEqual(expect.objectContaining({
        totalRevenue: 1500,
        netRevenue: 1450,
        collected: 1000,
        outstanding: 450,
        invoiceCount: 3,
        unpaidInvoices: 1,
      }));
    });
  });

  describe('getRefunds', () => {
    test('returns only paybacks with positive amounts grouped by cashier/method', async () => {
      const prisma = {
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            {
              id: 'p-1', invoiceId: 'inv-1', amount: -200, method: 'CASH', paidAt: new Date('2026-08-01T10:00:00.000Z'),
              cashierName: '╪ú╪¡┘à╪»', reason: '╪º╪│╪¬╪▒╪»╪º╪»', paybackOfPaymentId: 'orig-1',
              invoice: { invoiceNumber: 'INV-1', patient: { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' } },
            },
            {
              id: 'p-2', invoiceId: 'inv-2', amount: -50, method: 'CARD', paidAt: new Date('2026-08-02T10:00:00.000Z'),
              cashierName: '┘à╪¡┘à╪»', reason: 'payback refund', paybackOfPaymentId: 'orig-2',
              invoice: { invoiceNumber: 'INV-2', patient: { firstName: '┘à╪▒┘è┘à', lastName: '', phone: '01100000000' } },
            },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getRefunds(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.summary).toEqual(expect.objectContaining({
        totalPayback: 250,
        count: 2,
        methods: expect.arrayContaining([
          { method: 'CASH', total: 200 },
          { method: 'CARD', total: 50 },
        ]),
        cashiers: expect.arrayContaining([
          { cashierName: '╪ú╪¡┘à╪»', total: 200, count: 1 },
          { cashierName: '┘à╪¡┘à╪»', total: 50, count: 1 },
        ]),
      }));

      const amounts = res.payload.data.rows.map((r) => r.amount);
      expect(amounts).toEqual([200, 50]);
      expect(res.payload.data.rows[0]).toEqual(expect.objectContaining({
        patientName: '╪ú╪¡┘à╪» ╪╣┘ä┘è',
        patientPhone: '01000000000',
        invoiceNumber: 'INV-1',
      }));

      expect(prisma.medicalPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            OR: expect.arrayContaining([
              expect.objectContaining({ paybackOfPaymentId: { not: null } }),
              expect.objectContaining({ amount: { lt: 0 } }),
            ]),
          }),
        })
      );
    });

    test('does NOT return a positive payment whose reason mentions refund as a payback', async () => {
      const prisma = {
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            {
              id: 'p-1', invoiceId: 'inv-1', amount: -200, method: 'CASH', paidAt: new Date('2026-08-01T10:00:00.000Z'),
              cashierName: '╪ú╪¡┘à╪»', reason: '╪º╪│╪¬╪▒╪»╪º╪»', paybackOfPaymentId: 'orig-1',
              invoice: { invoiceNumber: 'INV-1', patient: { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' } },
            },
            {
              id: 'p-2', invoiceId: 'inv-2', amount: 50, method: 'CARD', paidAt: new Date('2026-08-02T10:00:00.000Z'),
              cashierName: '┘à╪¡┘à╪»', reason: 'payback refund', paybackOfPaymentId: null,
              invoice: { invoiceNumber: 'INV-2', patient: { firstName: '┘à╪▒┘è┘à', lastName: '', phone: '01100000000' } },
            },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getRefunds(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.summary).toEqual(expect.objectContaining({
        totalPayback: 200,
        count: 1,
      }));
      expect(res.payload.data.rows.map((r) => r.id)).toEqual(['p-1']);
    });
  });

  describe('getRevenueReport additions', () => {
    test('outstanding is net (total - discount + addition) minus collected', async () => {
      const prisma = {
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'inv-5', appointmentId: 'appt-5', total: 1000, discount: 100, additionAmount: 200, amountPaid: 500, status: 'PAID' },
          ])
        },
        appointment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'appt-5', doctorId: 'doc-1', serviceId: 'svc-1', serviceName: '┘â╪┤┘ü', reportStatus: 'APPROVED' },
          ])
        },
        bookingDoctor: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'doc-1', name: '╪»/ ╪ú╪¡┘à╪»', specialty: '╪╣╪╕╪º┘à' },
          ])
        },
        bookingService: {
          findMany: jest.fn().mockResolvedValueOnce([
            { id: 'svc-1', name: '┘â╪┤┘ü' },
          ])
        },
        medicalPayment: {
          findMany: jest.fn().mockResolvedValueOnce([
            { invoiceId: 'inv-5', amount: 500, paidAt: new Date('2026-08-01T11:00:00.000Z') },
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getRevenueReport(buildReq({ from: '2026-08-01', to: '2026-08-31' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.totals).toEqual({
        billed: 1000,
        discounts: 100,
        collected: 500,
        outstanding: 600,
        invoiceCount: 1,
      });
      const doc = res.payload.data.byDoctor.find((r) => r.id === 'doc-1');
      expect(doc).toEqual(expect.objectContaining({ billed: 1000, discounts: 100, collected: 500, outstanding: 600 }));
    });
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await getRevenueReport({ user: { id: 'user-1' }, query: {} }, res);
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    expect(getSharedPrismaClient).not.toHaveBeenCalled();
  });
});

describe('exportCsv invoices', () => {
  test('net includes additionAmount and remaining is net minus paid', async () => {
    const prisma = {
      medicalInvoice: {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            id: 'inv-csv', invoiceNumber: 'INV-CSV', total: 1000, discount: 100, additionAmount: 150,
            amountPaid: 400, status: 'PARTIAL', dueDate: null,
            createdAt: new Date('2026-08-01T10:00:00.000Z'),
            patient: { firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '01000000000' },
          },
        ]),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    res.setHeader = jest.fn();
    res.send = jest.fn();

    await exportCsv({ user: { companyId: 'company-1' }, query: { type: 'invoices' } }, res);

    expect(res.statusCode).toBe(200);
    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('INV-CSV');
    const row = csv.split('\n')[1];
    expect(row).toContain('1050');   // net = 1000 - 100 + 150
    expect(row).toContain('650');    // remaining = 1050 - 400
    expect(row).not.toContain(',900,400'); // old wrong net=900 remaining=400
  });
});
