jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const appointments = require('../../controller/radiologyAppointmentsController');
const physicians = require('../../controller/radiologyReferringPhysiciansController');
const additions = require('../../controller/radiologyExamAdditionsController');
const statistics = require('../../controller/radiologyStatisticsController');
const payments = require('../../controller/radiologyPaymentsController');

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
  radiologyStudyPayment: { findMany: jest.fn(), create: jest.fn() },
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
  test('records a payment and computes status', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', examTypeId: 'et-1', additionAmount: 100, paidAmount: 0 });
    prisma.radiologyExamType.findFirst.mockResolvedValue({ price: 1000 });
    prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'pay-1', amount: 500 });
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

  test('marks PAID when full amount received', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', examTypeId: null, additionAmount: 0, paidAmount: 0 });
    prisma.radiologyStudyPayment.create.mockResolvedValue({ id: 'pay-1', amount: 100 });
    prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await payments.recordStudyPayment(req({ params: { id: 'study-1' }, body: { amount: 0 } }), res);

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
