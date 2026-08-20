jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/bookingPatientService', () => ({
  findOrCreatePatient: jest.fn(),
}));

jest.mock('../../utils/dicomUtil', () => {
  const actual = jest.requireActual('../../utils/dicomUtil');
  return { ...actual, parseDicomFromBuffer: jest.fn(() => ({})) };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyController');
const appointments = require('../../controller/radiologyAppointmentsController');
const statistics = require('../../controller/radiologyStatisticsController');
const { getRadiologyGuards, DEFAULT_GUARDS } = require('../../utils/radiologyGuards');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    radiologyStudy: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    radiologyReport: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    radiologyStudyImage: { count: jest.fn() },
    radiologySetting: { findMany: jest.fn(), upsert: jest.fn() },
    radiologyStudyStatusHistory: { findMany: jest.fn(), create: jest.fn() },
    radiologyAppointment: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    radiologyExamType: { findMany: jest.fn(), count: jest.fn() },
    company: { findUnique: jest.fn() },
    patient: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
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
  studyNumber: 'RAD-20260813-0001',
  patientName: 'محمد علي',
  examTypeId: 'et-1',
  examTypeName: 'أشعة مقطعية',
  status: 'PENDING_IMAGING',
  orderStatus: 'IN_PROGRESS',
  billingType: 'PATIENT',
  priceSnapshot: 500,
  additionAmount: 0,
  paidAmount: 0,
  paymentStatus: 'UNPAID',
  submissionStatus: 'NOT_SUBMITTED',
  ...overrides,
});

describe('radiologyGuards util', () => {
  test('returns defaults when no settings rows', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findMany.mockResolvedValue([]);
    const guards = await getRadiologyGuards(prisma, 'company-1');
    expect(guards.requirePaymentBeforeDelivery).toBe(false);
    expect(guards.blockCancelAfterDelivery).toBe(true);
  });

  test('reads stored flags', async () => {
    const prisma = createPrisma();
    prisma.radiologySetting.findMany.mockResolvedValue([
      { key: 'requirePaymentBeforeDelivery', value: 'true' },
      { key: 'blockCancelAfterDelivery', value: 'false' },
    ]);
    const guards = await getRadiologyGuards(prisma, 'company-1');
    expect(guards.requirePaymentBeforeDelivery).toBe(true);
    expect(guards.blockCancelAfterDelivery).toBe(false);
  });

  test('never throws when the settings model is unavailable', async () => {
    const prisma = {};
    const guards = await getRadiologyGuards(prisma, 'company-1');
    expect(guards).toEqual({ requirePaymentBeforeDelivery: false, blockCancelAfterDelivery: true });
  });

  test('defaults are documented', () => {
    expect(DEFAULT_GUARDS).toEqual({ requirePaymentBeforeDelivery: 'false', blockCancelAfterDelivery: 'true' });
  });
});

describe('markDelivered payment guard', () => {
  const setup = async ({ guardOn, billingType = 'PATIENT', paid = 0, hasImages = true, signed = true }) => {
    const prisma = createPrisma();
    prisma.radiologySetting.findMany.mockResolvedValue(
      guardOn ? [{ key: 'requirePaymentBeforeDelivery', value: 'true' }] : []
    );
    prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ billingType, paidAmount: paid }));
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'report-1', reportStatus: signed ? 'SIGNED' : 'DRAFT' });
    prisma.radiologyStudyImage.count.mockResolvedValue(hasImages ? 2 : 0);
    prisma.radiologyReport.update.mockResolvedValue({ id: 'report-1', reportStatus: 'DELIVERED' });
    prisma.radiologyStudy.update.mockResolvedValue(makeStudy({ status: 'DELIVERED', orderStatus: 'COMPLETED' }));
    getSharedPrismaClient.mockReturnValue(prisma);
    return prisma;
  };

  test('blocks delivery of an unpaid PATIENT study when the guard is enabled', async () => {
    const prisma = await setup({ guardOn: true, paid: 0 });
    const res = createResponse();
    await controller.markDelivered(req({ params: { id: 'study-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('سداد');
    expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
  });

  test('allows delivery when the guard is disabled (default)', async () => {
    const prisma = await setup({ guardOn: false, paid: 0 });
    const res = createResponse();
    await controller.markDelivered(req({ params: { id: 'study-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyStudy.update).toHaveBeenCalled();
  });

  test('allows delivery of an insured study even when the guard is enabled', async () => {
    const prisma = await setup({ guardOn: true, billingType: 'INSURANCE', paid: 0 });
    const res = createResponse();
    await controller.markDelivered(req({ params: { id: 'study-1' } }), res);
    expect(res.statusCode).toBe(200);
  });

  test('allows delivery of a paid study when the guard is enabled', async () => {
    const prisma = await setup({ guardOn: true, paid: 500 });
    const res = createResponse();
    await controller.markDelivered(req({ params: { id: 'study-1' } }), res);
    expect(res.statusCode).toBe(200);
  });

  test('still blocks delivery without a signed report (image guard intact)', async () => {
    await setup({ guardOn: false, signed: false });
    const res = createResponse();
    await controller.markDelivered(req({ params: { id: 'study-1' } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('updateAppointment cancel-after-delivery guard', () => {
  const setup = async ({ delivered = true, blockCancel = true }) => {
    const prisma = createPrisma();
    prisma.radiologySetting.findMany.mockResolvedValue(
      blockCancel
        ? [{ key: 'blockCancelAfterDelivery', value: 'true' }]
        : [{ key: 'blockCancelAfterDelivery', value: 'false' }]
    );
    prisma.radiologyAppointment.findFirst.mockResolvedValue({
      id: 'appt-1', companyId: 'company-1', patientId: 'pat-1', patientName: 'مريض', status: 'DONE', studyId: 'study-1',
    });
    prisma.radiologyStudy.findUnique.mockResolvedValue(makeStudy({ status: delivered ? 'DELIVERED' : 'PENDING_IMAGING' }));
    prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });
    getSharedPrismaClient.mockReturnValue(prisma);
    return prisma;
  };

  test('blocks cancelling a booking whose study is delivered', async () => {
    const prisma = await setup({ delivered: true, blockCancel: true });
    const res = createResponse();
    await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CANCELLED' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('إلغاء');
    expect(prisma.radiologyAppointment.update).not.toHaveBeenCalled();
  });

  test('allows cancelling when the guard is disabled', async () => {
    await setup({ delivered: true, blockCancel: false });
    const res = createResponse();
    await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CANCELLED' } }), res);
    expect(res.statusCode).toBe(200);
  });

  test('allows cancelling a booking whose study is not delivered', async () => {
    await setup({ delivered: false, blockCancel: true });
    const res = createResponse();
    await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CANCELLED' } }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe('getAppointmentDetails', () => {
  const setup = (overrides = {}) => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue(
      { id: 'appt-1', companyId: 'company-1', patientName: 'مريض', status: 'CHECKED_IN', studyId: 'study-1', appointmentDate: '2026-08-13T00:00:00.000Z', ...overrides.appointment }
    );
    prisma.radiologyStudy.findMany.mockResolvedValue(overrides.studies || []);
    getSharedPrismaClient.mockReturnValue(prisma);
    return prisma;
  };

  test('returns 403 without companyId', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await appointments.getAppointmentDetails(req({ user: {} }), res);
    expect(res.statusCode).toBe(403);
  });

  test('returns 404 when the appointment is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyAppointment.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await appointments.getAppointmentDetails(req({ params: { id: 'appt-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  test('returns appointment, linked studies and derived order status', async () => {
    const prisma = setup({
      appointment: { status: 'CHECKED_IN' },
      studies: [{ id: 'study-1', status: 'PENDING_IMAGING', orderStatus: 'IN_PROGRESS' }],
    });
    const res = createResponse();
    await appointments.getAppointmentDetails(req({ params: { id: 'appt-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.appointment.id).toBe('appt-1');
    expect(res.payload.data.studies).toHaveLength(1);
    // study exists → orderStatus becomes IN_PROGRESS, not CHECKED_IN
    expect(res.payload.data.orderStatus).toBe('IN_PROGRESS');
    expect(prisma.radiologyStudy.findMany).toHaveBeenCalledWith({ where: { appointmentId: 'appt-1' }, orderBy: { createdAt: 'asc' } });
  });

  test('CHECKED_IN appointment without a study keeps CHECKED_IN order status', async () => {
    setup({ appointment: { status: 'CHECKED_IN' }, studies: [] });
    const res = createResponse();
    await appointments.getAppointmentDetails(req({ params: { id: 'appt-1' } }), res);
    expect(res.payload.data.orderStatus).toBe('CHECKED_IN');
  });

  test('SCHEDULED appointment without a study is PENDING', async () => {
    setup({ appointment: { status: 'SCHEDULED' }, studies: [] });
    const res = createResponse();
    await appointments.getAppointmentDetails(req({ params: { id: 'appt-1' } }), res);
    expect(res.payload.data.orderStatus).toBe('PENDING');
  });
});

describe('getStatistics orderStatusBreakdown', () => {
  test('counts appointments (pre-conversion) + studies without double counting', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([
      { orderStatus: 'IN_PROGRESS' },
      { orderStatus: 'IN_PROGRESS' },
      { orderStatus: 'COMPLETED' },
      { orderStatus: 'CANCELLED' },
    ]);
    prisma.radiologyExamType.findMany.mockResolvedValue([]);
    prisma.radiologyAppointment.findMany.mockResolvedValue([
      { status: 'SCHEDULED', studyId: null },
      { status: 'CHECKED_IN', studyId: null },
      { status: 'CANCELLED', studyId: null },
      { status: 'CANCELLED', studyId: 'study-x' },
      { status: 'DONE', studyId: 'study-y' },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await statistics.getStatistics(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.orderStatusBreakdown).toEqual({
      PENDING: 1,
      CHECKED_IN: 1,
      IN_PROGRESS: 2,
      COMPLETED: 1,
      CANCELLED: 2,
    });
  });

  test('falls back to IN_PROGRESS for studies without orderStatus', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([{ orderStatus: null }]);
    prisma.radiologyExamType.findMany.mockResolvedValue([]);
    prisma.radiologyAppointment.findMany.mockResolvedValue([]);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await statistics.getStatistics(req(), res);
    expect(res.payload.data.orderStatusBreakdown.IN_PROGRESS).toBe(1);
  });
});
