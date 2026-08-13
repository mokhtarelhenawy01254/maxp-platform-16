jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const appointments = require('../../controller/radiologyAppointmentsController');
const physicians = require('../../controller/radiologyReferringPhysiciansController');
const additions = require('../../controller/radiologyExamAdditionsController');
const statistics = require('../../controller/radiologyStatisticsController');
const payments = require('../../controller/radiologyPaymentsController');
const shifts = require('../../controller/radiologyShiftsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const createPrisma = () => ({
  radiologyAppointment: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  radiologyReferringPhysician: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  radiologyExamAddition: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  radiologyExamType: { findMany: jest.fn(), findFirst: jest.fn() },
  radiologyStudy: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  radiologyStudyPayment: { findMany: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  radiologyInsuranceInvoice: { findMany: jest.fn() },
  radiologyInsuranceLedgerEntry: { findMany: jest.fn() },
  priceListItem: { findFirst: jest.fn() },
  radiologyShift: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  radiologyShiftPayment: { findMany: jest.fn(), create: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

describe('radiologyAppointmentsController', () => {
  test('creates an appointment resolving exam name', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamType.findFirst.mockResolvedValue({ id: 'et-1', name: 'أشعة CT' });
    prisma.radiologyAppointment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.createAppointment(req({ body: { patientName: 'مريض', examTypeId: 'et-1', appointmentDate: '2026-08-15', appointmentTime: '10:30' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyAppointment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ patientName: 'مريض', examTypeName: 'أشعة CT', status: 'SCHEDULED' }) });
  });

  test('rejects missing patient name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await appointments.createAppointment(req({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyAppointment.create).not.toHaveBeenCalled();
  });

  test('lists company-scoped appointments with status filter', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findMany.mockResolvedValue([{ id: 'a1' }]);
    prisma.radiologyAppointment.count.mockResolvedValue(1);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.listAppointments(req({ query: { status: 'SCHEDULED' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyAppointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'company-1', status: 'SCHEDULED' } }));
  });

  test('rejects invalid status', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await appointments.listAppointments(req({ query: { status: 'X' } }), res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 403 when companyId missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await appointments.createAppointment(req({ user: {}, body: { patientName: 'م' } }), res);
    expect(res.statusCode).toBe(403);
  });

  test('createAppointment stores patientId when a patient is linked', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'ap-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.createAppointment(req({ body: { patientId: 'pat-1', patientName: 'مريض', examTypeId: 'et-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyAppointment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ patientId: 'pat-1', status: 'SCHEDULED' }) });
  });

  test('createAppointment stores patientFlags as a deduplicated JSON array', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'ap-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.createAppointment(req({
      body: {
        patientName: 'مريض',
        examTypeId: 'et-1',
        patientFlags: ['pregnancy', 'contrast_allergy', 'pregnancy'],
      },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyAppointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ patientFlags: '["pregnancy","contrast_allergy"]' }),
    });
  });

  test('updateAppointment stores patientFlags', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'ap-1', companyId: 'company-1', status: 'SCHEDULED' });
    prisma.radiologyAppointment.update.mockImplementation(({ data }) => Promise.resolve({ id: 'ap-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.updateAppointment(req({
      params: { id: 'ap-1' },
      body: { patientFlags: ['renal', 'bleeding'] },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith({
      where: { id: 'ap-1' },
      data: expect.objectContaining({ patientFlags: '["renal","bleeding"]' }),
    });
  });

  test('convertToStudy sets priceSnapshot, modality, billingType and carries patientId', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({
      id: 'ap-1', companyId: 'company-1', patientId: 'pat-1', patientName: 'مريض', patientPhone: '011', patientGender: 'F',
      patientAge: '30', examTypeId: 'et-1', examTypeName: 'أشعة مقطعية على الصدر', status: 'SCHEDULED',
    });
    prisma.radiologyExamType.findFirst.mockResolvedValue({ id: 'et-1', name: 'أشعة مقطعية على الصدر', category: 'CT', price: 500, isActive: true });
    prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    prisma.radiologyAppointment.update.mockResolvedValue({});
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.convertToStudy(req({ params: { id: 'ap-1' } }), res);

    expect(res.statusCode).toBe(200);
    const data = prisma.radiologyStudy.create.mock.calls[0][0].data;
    expect(data.patientId).toBe('pat-1');
    expect(data.priceSnapshot).toBe(500);
    expect(data.modality).toBe('CT');
    expect(data.billingType).toBe('PATIENT');
  });

  test('convertToStudy carries patientFlags from the appointment', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({
      id: 'ap-1', companyId: 'company-1', patientId: 'pat-1', patientName: 'مريض', patientPhone: '011', patientGender: 'F',
      patientAge: '30', examTypeId: 'et-1', examTypeName: 'أشعة مقطعية على الصدر', status: 'SCHEDULED',
      nationalId: '29901010123456', insuranceNumber: 'INS-1', patientFlags: '["pregnancy","renal"]',
    });
    prisma.radiologyExamType.findFirst.mockResolvedValue({ id: 'et-1', name: 'أشعة مقطعية على الصدر', category: 'CT', price: 500, isActive: true });
    prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    prisma.radiologyAppointment.update.mockResolvedValue({});
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.convertToStudy(req({ params: { id: 'ap-1' } }), res);

    expect(res.statusCode).toBe(200);
    const data = prisma.radiologyStudy.create.mock.calls[0][0].data;
    expect(data.patientFlags).toBe('["pregnancy","renal"]');
    expect(data.nationalId).toBe('29901010123456');
    expect(data.insuranceNumber).toBe('INS-1');
  });

  test('convertToStudy rejects an unpriced exam', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'ap-1', companyId: 'company-1', patientName: 'م', examTypeId: 'et-1', examTypeName: 'رنين', status: 'SCHEDULED' });
    prisma.radiologyExamType.findFirst.mockResolvedValue({ id: 'et-1', name: 'رنين', category: 'MRI', price: 0, isActive: true });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.convertToStudy(req({ params: { id: 'ap-1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('غير مسعّر');
    expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
  });
});

describe('radiologyReferringPhysiciansController', () => {
  test('creates a physician with validated commission type', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferringPhysician.create.mockResolvedValue({ id: 'p1', name: 'د. محول' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await physicians.createPhysician(req({ body: { name: 'د. محول', commissionType: 'PERCENTAGE', commissionValue: 10 } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyReferringPhysician.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'د. محول', commissionType: 'PERCENTAGE', commissionValue: 10 }) });
  });

  test('rejects invalid commission type', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await physicians.createPhysician(req({ body: { name: 'د. محول', commissionType: 'XXX' } }), res);
    expect(res.statusCode).toBe(400);
  });

  test('computes commissions for studies', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferringPhysician.findMany.mockResolvedValue([{ id: 'p1', name: 'د. محول', commissionType: 'PERCENTAGE', commissionValue: 10 }]);
    prisma.radiologyStudy.findMany.mockResolvedValue([{ referringPhysicianId: 'p1', examTypeId: 'et-1', additionAmount: 100 }]);
    prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'et-1', price: 1000 }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await physicians.physicianCommissions(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.rows[0].commission).toBeCloseTo(110);
    expect(res.payload.data.totalCommission).toBeCloseTo(110);
  });

  test('uses the entity-resolved priceSnapshot for commissions when present', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferringPhysician.findMany.mockResolvedValue([{ id: 'p1', name: 'د. محول', commissionType: 'PERCENTAGE', commissionValue: 10 }]);
    prisma.radiologyStudy.findMany.mockResolvedValue([{ referringPhysicianId: 'p1', examTypeId: 'et-1', priceSnapshot: 850, additionAmount: 150 }]);
    prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'et-1', price: 1000 }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await physicians.physicianCommissions(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.rows[0].amount).toBeCloseTo(1000);
    expect(res.payload.data.rows[0].commission).toBeCloseTo(100);
    expect(res.payload.data.totalCommission).toBeCloseTo(100);
  });
});

describe('radiologyExamAdditionsController', () => {
  test('creates an addition with price', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamAddition.create.mockResolvedValue({ id: 'ad1', name: 'صبغة' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await additions.createAddition(req({ body: { name: 'صبغة', price: 150 } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExamAddition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'صبغة', price: 150 }) });
  });

  test('rejects missing name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await additions.createAddition(req({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  test('soft-deletes an addition', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamAddition.findFirst.mockResolvedValue({ id: 'ad1', companyId: 'company-1' });
    prisma.radiologyExamAddition.update.mockResolvedValue({ id: 'ad1', isActive: false });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await additions.deleteAddition(req({ params: { id: 'ad1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExamAddition.update).toHaveBeenCalledWith({ where: { id: 'ad1' }, data: { isActive: false } });
  });
});

describe('radiologyStatisticsController', () => {
  test('aggregates studies by status/modality/radiologist', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([
      { status: 'DELIVERED', modality: 'CT', assignedRadiologistName: 'د. س', referralDoctor: 'د. م' },
      { status: 'PENDING_REPORT', modality: 'CT', assignedRadiologistName: null, referralDoctor: null },
    ]);
    prisma.radiologyExamType.findMany.mockResolvedValue([{ category: 'CT' }, { category: 'MRI' }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await statistics.getStatistics(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.total).toBe(2);
    expect(res.payload.data.delivered).toBe(1);
    expect(res.payload.data.completionRate).toBe(50);
    expect(res.payload.data.byModality.CT).toBe(2);
    expect(res.payload.data.modalityOptions).toContain('MRI');
  });
});

describe('radiologyPaymentsController', () => {
  test('records a payment and computes status from priceSnapshot', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 100, billingType: 'PATIENT' });
    prisma.radiologyStudyPayment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'pay-1', amount: 500 });
    prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 500 }]);
    prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 500, method: 'CASH' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.total).toBe(1100);
    expect(res.payload.data.remaining).toBe(600);
    expect(res.payload.data.paymentStatus).toBe('PARTIAL');
    expect(prisma.radiologyStudyPayment.create).toHaveBeenCalled();
  });

  test('rejects an amount exceeding the remaining balance', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT' });
    prisma.radiologyStudyPayment.aggregate.mockResolvedValue({ _sum: { amount: 900 } });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 200 } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('يتجاوز المتبقي');
    expect(prisma.radiologyStudyPayment.create).not.toHaveBeenCalled();
  });

  test('rejects a zero amount', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0 });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 0 } }), res);

    expect(res.statusCode).toBe(400);
  });

  test('refunds a payment and lowers paid amount', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0, billingType: 'PATIENT' });
    prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 500 }, { amount: -200 }]);
    prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'ref-1', amount: -200 });
    prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.refundStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 200 } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.paidAmount).toBe(300);
    expect(res.payload.data.paymentStatus).toBe('PARTIAL');
    expect(prisma.radiologyStudyPayment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: -200, method: 'REFUND' }) }));
  });

  test('rejects refund larger than paid', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', priceSnapshot: 1000, additionAmount: 0 });
    prisma.radiologyStudyPayment.findMany.mockResolvedValue([{ amount: 100 }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.refundStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 500 } }), res);

    expect(res.statusCode).toBe(400);
  });

  test('returns 403 when companyId missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await payments.recordStudyPayment(req({ user: {}, params: { id: 'study-1' }, body: { amount: 100 } }), res);
    expect(res.statusCode).toBe(403);
  });
});

describe('radiologyPaymentsController financialSummary', () => {
  test('aggregates patient vs insurance money', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([
      { billingType: 'PATIENT', priceSnapshot: 500, additionAmount: 0, paidAmount: 200 },
      { billingType: 'INSURANCE', priceSnapshot: 1000, additionAmount: 0, paidAmount: 0 },
    ]);
    prisma.radiologyInsuranceInvoice.findMany.mockResolvedValue([
      { insuranceCompanyId: 'c1', insuranceCompanyName: 'الأهرام', totalAmount: 1000, paidAmount: 400, remainingAmount: 600, status: 'PARTIAL' },
    ]);
    prisma.radiologyInsuranceLedgerEntry.findMany.mockResolvedValue([{ amount: 400 }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.financialSummary(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.patient.collected).toBe(200);
    expect(res.payload.data.patient.outstanding).toBe(300);
    expect(res.payload.data.insurance.billed).toBe(1000);
    expect(res.payload.data.insurance.collected).toBe(400);
    expect(res.payload.data.totalCollected).toBe(600);
    expect(res.payload.data.byEntity).toHaveLength(1);
  });
});

describe('radiologyAppointmentsController convertToStudy', () => {
  test('creates a study from an appointment and marks it DONE', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({
      id: 'appt-1', companyId: 'company-1', status: 'SCHEDULED', patientName: 'مريض', patientPhone: '010', patientGender: 'male', patientAge: '20', examTypeId: 'et-1', examTypeName: 'أشعة CT',
    });
    prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'DONE' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.convertToStudy(req({ params: { id: 'appt-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyStudy.create).toHaveBeenCalledWith({ data: expect.objectContaining({ patientName: 'مريض', examTypeName: 'أشعة CT', status: 'PENDING_IMAGING' }) });
    expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith({ where: { id: 'appt-1' }, data: { status: 'DONE' } });
  });

  test('rejects converting a cancelled appointment', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue({ id: 'appt-1', companyId: 'company-1', status: 'CANCELLED' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await appointments.convertToStudy(req({ params: { id: 'appt-1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
  });
});

describe('radiologyShiftsController', () => {
  test('opens a shift when none is open', async () => {
    const prisma = createPrisma();
    prisma.radiologyShift.findFirst.mockResolvedValue(null);
    prisma.radiologyShift.create.mockImplementation(({ data }) => Promise.resolve({ id: 'shift-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await shifts.openShift(req({ body: { cashierName: 'شروق' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyShift.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cashierName: 'شروق', status: 'OPEN' }) });
  });

  test('rejects opening a shift when one is already open', async () => {
    const prisma = createPrisma();
    prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1', status: 'OPEN' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await shifts.openShift(req({ body: { cashierName: 'شروق' } }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyShift.create).not.toHaveBeenCalled();
  });

  test('getActiveShift summarizes payments and refunds by method', async () => {
    const prisma = createPrisma();
    prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1', status: 'OPEN', cashierName: 'شروق' });
    prisma.radiologyShiftPayment.findMany.mockResolvedValue([
      { type: 'PAYMENT', amount: 500, method: 'CASH' },
      { type: 'PAYMENT', amount: 300, method: 'CARD' },
      { type: 'REFUND', amount: 100, method: 'CASH' },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await shifts.getActiveShift(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary.collected).toBe(800);
    expect(res.payload.data.summary.refunded).toBe(100);
    expect(res.payload.data.summary.net).toBe(700);
    expect(res.payload.data.summary.byMethod.CASH).toBe(500);
    expect(res.payload.data.summary.byMethod.CARD).toBe(300);
  });

  test('closes an open shift', async () => {
    const prisma = createPrisma();
    prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1', status: 'OPEN', cashierName: 'شروق' });
    prisma.radiologyShiftPayment.findMany.mockResolvedValue([{ type: 'PAYMENT', amount: 500, method: 'CASH' }]);
    prisma.radiologyShift.update.mockResolvedValue({ id: 'shift-1', status: 'CLOSED', closedAt: new Date() });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await shifts.closeShift(req({ params: { id: 'shift-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyShift.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CLOSED' }) }));
    expect(res.payload.data.summary.collected).toBe(500);
  });

  test('returns 403 when companyId missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await shifts.openShift(req({ user: {}, body: {} }), res);
    expect(res.statusCode).toBe(403);
  });
});
