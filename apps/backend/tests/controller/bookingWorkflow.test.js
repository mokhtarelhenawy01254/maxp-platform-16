jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  updateBookingStatus,
  updateReportStatus,
  assignDoctor,
  markDeliveredWithoutReport,
  markResultDelivered,
  receptionQueue,
  doctorWorklist,
  reportWorklist,
  validateBookingTransition,
  validateReportTransition,
} = require('../../controller/bookingWorkflowController');

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

const makePrisma = () => ({
  appointment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  bookingDoctor: { findFirst: jest.fn() },
  transactionLog: { create: jest.fn() },
});

const makeAppointment = (overrides = {}) => ({
  id: 'apt-1',
  companyId: 'company-1',
  customerName: '╪ú╪¡┘à╪» ┘à╪¡┘à╪»',
  customerPhone: '01000000000',
  customerEmail: null,
  customerGender: 'male',
  branchId: 'branch-1',
  doctorId: null,
  assignedDoctorId: null,
  serviceId: 'svc-1',
  serviceName: '┘â╪┤┘ü',
  appointmentDate: new Date('2026-08-07'),
  startTime: '10:00',
  endTime: '10:30',
  duration: 30,
  status: 'confirmed',
  bookingStatus: 'CONFIRMED',
  reportStatus: null,
  accessionNumber: null,
  ticketNumber: null,
  room: null,
  preparationNote: null,
  deliveredWithoutReport: false,
  resultDelivered: false,
  labelPrinted: false,
  diagnosis: null,
  treatmentPlan: null,
  prescription: null,
  notes: null,
  paymentRequired: true,
  paymentStatus: 'pending',
  patientId: 'patient-1',
  patient: { id: 'patient-1', firstName: '╪ú╪¡┘à╪»', lastName: '┘à╪¡┘à╪»', phone: '01000000000' },
  branch: { id: 'branch-1', name: '┘ü╪▒╪╣ ┘ê╪│╪╖ ╪º┘ä╪¿┘ä╪»' },
  service: { id: 'svc-1', name: '┘â╪┤┘ü' },
  doctor: null,
  assignedDoctor: null,
  ...overrides,
});

describe('validateBookingTransition', () => {
  test('allows forward chain transitions', () => {
    expect(validateBookingTransition('UNCONFIRMED', 'CONFIRMED')).toEqual({ valid: true });
    expect(validateBookingTransition('CONFIRMED', 'CHECKED_IN')).toEqual({ valid: true });
    expect(validateBookingTransition('CHECKED_IN', 'PROCEDURE_STARTED')).toEqual({ valid: true });
    expect(validateBookingTransition('PROCEDURE_STARTED', 'PROCEDURE_COMPLETED')).toEqual({ valid: true });
    expect(validateBookingTransition('PROCEDURE_COMPLETED', 'CHECKED_OUT')).toEqual({ valid: true });
  });

  test('allows cancel and missed from most states', () => {
    expect(validateBookingTransition('UNCONFIRMED', 'CANCELLED')).toEqual({ valid: true });
    expect(validateBookingTransition('CONFIRMED', 'MISSED')).toEqual({ valid: true });
    expect(validateBookingTransition('CHECKED_IN', 'CANCELLED')).toEqual({ valid: true });
    expect(validateBookingTransition('PROCEDURE_STARTED', 'MISSED')).toEqual({ valid: true });
    expect(validateBookingTransition('PROCEDURE_COMPLETED', 'CANCELLED')).toEqual({ valid: true });
  });

  test('rejects skipping, backward and terminal transitions with Arabic error', () => {
    expect(validateBookingTransition('UNCONFIRMED', 'CHECKED_IN').valid).toBe(false);
    expect(validateBookingTransition('CHECKED_IN', 'CONFIRMED').valid).toBe(false);
    expect(validateBookingTransition('CHECKED_OUT', 'CANCELLED').valid).toBe(false);
    expect(validateBookingTransition('CANCELLED', 'CONFIRMED').valid).toBe(false);
    expect(validateBookingTransition('MISSED', 'CHECKED_IN').valid).toBe(false);
    expect(validateBookingTransition('CONFIRMED', 'CONFIRMED').valid).toBe(false);
    expect(validateBookingTransition(null, 'CONFIRMED').valid).toBe(false);
    expect(validateBookingTransition('CONFIRMED', null).valid).toBe(false);

    const rejected = validateBookingTransition('CONFIRMED', 'PROCEDURE_COMPLETED');
    expect(rejected.valid).toBe(false);
    expect(rejected.error).toContain('┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪º┘å╪¬┘é╪º┘ä');
    expect(typeof rejected.error).toBe('string');
  });
});

describe('validateReportTransition', () => {
  test('allows forward report chain', () => {
    expect(validateReportTransition('PENDING', 'NOTES_IN_PROGRESS')).toEqual({ valid: true });
    expect(validateReportTransition('NOTES_IN_PROGRESS', 'NOTES_COMPLETED')).toEqual({ valid: true });
    expect(validateReportTransition('NOTES_COMPLETED', 'UNDER_REVIEW')).toEqual({ valid: true });
    expect(validateReportTransition('UNDER_REVIEW', 'APPROVED')).toEqual({ valid: true });
  });

  test('rejects invalid report transitions', () => {
    expect(validateReportTransition('NOTES_COMPLETED', 'PENDING').valid).toBe(false);
    expect(validateReportTransition('APPROVED', 'UNDER_REVIEW').valid).toBe(false);
    expect(validateReportTransition('PENDING', 'UNDER_REVIEW').valid).toBe(false);
    expect(validateReportTransition('PENDING', 'PENDING').valid).toBe(false);
    expect(validateReportTransition('PENDING', '').valid).toBe(false);

    const rejected = validateReportTransition('PENDING', 'APPROVED');
    expect(rejected.valid).toBe(false);
    expect(rejected.error).toContain('┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪º┘å╪¬┘é╪º┘ä');
    expect(typeof rejected.error).toBe('string');
  });
});

describe('updateBookingStatus', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('returns 403 without companyId', async () => {
    const res = createResponse();
    await updateBookingStatus({ user: {}, params: { id: 'apt-1' }, body: { status: 'CONFIRMED' } }, res);
    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
  });

  test('returns 400 when status missing', async () => {
    const res = createResponse();
    await updateBookingStatus({ user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 when appointment not found', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    const res = createResponse();
    await updateBookingStatus({ user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CONFIRMED' } }, res);
    expect(res.statusCode).toBe(404);
  });

  test('rejects invalid transition with Arabic message', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ bookingStatus: 'CONFIRMED', status: 'confirmed' }));
    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'PROCEDURE_COMPLETED' } },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error).toContain('┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪º┘å╪¬┘é╪º┘ä');
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  test('rejects same-state transition', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ bookingStatus: 'CONFIRMED', status: 'confirmed' }));
    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CONFIRMED' } },
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  test('updates booking status and mirrors legacy status', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ bookingStatus: 'CONFIRMED', status: 'confirmed' }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CHECKED_IN' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'apt-1' },
        data: expect.objectContaining({ bookingStatus: 'CHECKED_IN', status: 'confirmed' }),
      }),
    );
    expect(res.payload.data.bookingStatus).toBe('CHECKED_IN');
    expect(res.payload.data.status).toBe('confirmed');
  });

  test('sets accession and ticket numbers on check-in when empty', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({
      bookingStatus: 'CONFIRMED',
      status: 'confirmed',
      accessionNumber: null,
      ticketNumber: null,
    }));
    prisma.appointment.count.mockResolvedValue(2);
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CHECKED_IN' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.count).toHaveBeenCalled();
    const data = prisma.appointment.update.mock.calls[0][0].data;
    expect(data.accessionNumber).toMatch(/^ACC-/);
    expect(data.ticketNumber).toBe('0003');
  });

  test('counts only previously-ticketed appointments when allocating a ticket number', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({
      bookingStatus: 'CONFIRMED',
      status: 'confirmed',
      accessionNumber: null,
      ticketNumber: null,
    }));
    prisma.appointment.count.mockResolvedValue(4);
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CHECKED_IN' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: 'company-1',
        id: { not: 'apt-1' },
        ticketNumber: { not: null },
        branchId: 'branch-1',
        appointmentDate: new Date('2026-08-07'),
      }),
    });
    expect(prisma.appointment.update.mock.calls[0][0].data.ticketNumber).toBe('0005');
  });

  test('keeps existing accession and ticket numbers', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({
      bookingStatus: 'CONFIRMED',
      status: 'confirmed',
      accessionNumber: 'ACC-EXISTING',
      ticketNumber: '0042',
    }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CHECKED_IN' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.count).not.toHaveBeenCalled();
    const data = prisma.appointment.update.mock.calls[0][0].data;
    expect(data.accessionNumber).toBeUndefined();
    expect(data.ticketNumber).toBeUndefined();
  });

  test('writes a TransactionLog row after a valid transition', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ bookingStatus: 'CONFIRMED', status: 'confirmed' }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));
    prisma.transactionLog.create.mockResolvedValue({ id: 'log-1' });

    const res = createResponse();
    await updateBookingStatus(
      {
        user: { id: 'user-1', firstName: '┘à╪¡┘à╪»', lastName: '╪╣┘ä┘è', companyId: 'company-1' },
        params: { id: 'apt-1' },
        body: { status: 'CHECKED_IN' },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.transactionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        entityType: 'APPOINTMENT',
        entityId: 'apt-1',
        action: 'UPDATE',
        description: '╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪¼╪▓ ╪Ñ┘ä┘ë CHECKED_IN',
        userId: 'user-1',
        userName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
      }),
    });
  });

  test('does not set accession/ticket numbers or write log on invalid transition', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ bookingStatus: 'CONFIRMED', status: 'confirmed' }));
    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CHECKED_OUT' } },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(prisma.appointment.count).not.toHaveBeenCalled();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(prisma.transactionLog.create).not.toHaveBeenCalled();
  });

  test('cancel transition mirrors legacy status without setting accession/ticket', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({
      bookingStatus: 'UNCONFIRMED',
      status: 'pending',
      accessionNumber: null,
      ticketNumber: null,
    }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateBookingStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'CANCELLED' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    const data = prisma.appointment.update.mock.calls[0][0].data;
    expect(data).toEqual(expect.objectContaining({ bookingStatus: 'CANCELLED', status: 'cancelled' }));
    expect(data.accessionNumber).toBeUndefined();
    expect(data.ticketNumber).toBeUndefined();
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });
});

describe('updateReportStatus', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('rejects invalid report transition', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ reportStatus: 'NOTES_COMPLETED' }));
    const res = createResponse();
    await updateReportStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'PENDING' } },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪º┘å╪¬┘é╪º┘ä');
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  test('advances report status', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ reportStatus: 'PENDING' }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateReportStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'NOTES_IN_PROGRESS' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reportStatus: 'NOTES_IN_PROGRESS' }),
      }),
    );
    expect(res.payload.data.reportStatus).toBe('NOTES_IN_PROGRESS');
  });

  test('treats missing report status as PENDING', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment({ reportStatus: null }));
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await updateReportStatus(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { status: 'NOTES_IN_PROGRESS' } },
      res,
    );

    expect(res.statusCode).toBe(200);
  });
});

describe('assignDoctor', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('rejects missing doctorId', async () => {
    const res = createResponse();
    await assignDoctor({ user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 when appointment not found', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    const res = createResponse();
    await assignDoctor(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { doctorId: 'doc-1' } },
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(prisma.bookingDoctor.findFirst).not.toHaveBeenCalled();
  });

  test('rejects doctor not belonging to company', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment());
    prisma.bookingDoctor.findFirst.mockResolvedValue(null);

    const res = createResponse();
    await assignDoctor(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { doctorId: 'doc-9' } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('┘ä╪º ┘è┘å╪¬┘à┘è');
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  test('assigns doctor to appointment', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment());
    prisma.bookingDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1', name: '╪│╪º╪▒╪⌐', title: '╪»┘â╪¬┘ê╪▒', specialty: '╪╣╪╕╪º┘à' });
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({
        ...data,
        id: where.id,
        assignedDoctor: { id: 'doc-1', name: '╪│╪º╪▒╪⌐', title: '╪»┘â╪¬┘ê╪▒', specialty: '╪╣╪╕╪º┘à' },
      })));

    const res = createResponse();
    await assignDoctor(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { doctorId: 'doc-1' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.bookingDoctor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc-1', companyId: 'company-1' } }),
    );
    const { data } = prisma.appointment.update.mock.calls[0][0];
    expect(data.assignedDoctorId).toBe('doc-1');
    expect(data.doctorId).toBe('doc-1');
    expect(data.staffId).toBeUndefined();
    expect(res.payload.data.assignedDoctorName).toBe('╪»┘â╪¬┘ê╪▒ ╪│╪º╪▒╪⌐');
  });
});

describe('markDeliveredWithoutReport', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('rejects non-boolean value', async () => {
    const res = createResponse();
    await markDeliveredWithoutReport(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { value: 'yes' } },
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  test('toggles delivered without report flag', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment());
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await markDeliveredWithoutReport(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { value: true } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.update.mock.calls[0][0].data.deliveredWithoutReport).toBe(true);
  });
});

describe('markResultDelivered', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('rejects non-boolean value', async () => {
    const res = createResponse();
    await markResultDelivered(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { value: 1 } },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  test('toggles result delivered flag', async () => {
    prisma.appointment.findFirst.mockResolvedValue(makeAppointment());
    prisma.appointment.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeAppointment({ ...data, id: where.id })));

    const res = createResponse();
    await markResultDelivered(
      { user: { companyId: 'company-1' }, params: { id: 'apt-1' }, body: { value: true } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.update.mock.calls[0][0].data.resultDelivered).toBe(true);
    expect(res.payload.data.resultDelivered).toBe(true);
  });
});

describe('receptionQueue', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns 403 without companyId', async () => {
    const res = createResponse();
    await receptionQueue({ user: {}, query: {} }, res);
    expect(res.statusCode).toBe(403);
  });

  test('returns active appointments ordered unconfirmed/confirmed then checked-in', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppointment({ id: 'apt-1', bookingStatus: 'CHECKED_IN', startTime: '09:00', status: 'confirmed' }),
      makeAppointment({ id: 'apt-2', bookingStatus: 'CONFIRMED', startTime: '08:00', status: 'confirmed' }),
      makeAppointment({ id: 'apt-3', bookingStatus: 'UNCONFIRMED', startTime: '10:00', status: 'pending' }),
    ]);

    const res = createResponse();
    await receptionQueue({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1', appointmentDate: new Date('2026-08-07') }),
      }),
    );
    expect(res.payload.data.map((a) => a.id)).toEqual(['apt-3', 'apt-2', 'apt-1']);
    expect(res.payload.data[0].patient.name).toBe('╪ú╪¡┘à╪» ┘à╪¡┘à╪»');
    expect(res.payload.data[0].paymentStatus).toBe('pending');
    expect(res.payload.data[0].serviceName).toBe('┘â╪┤┘ü');
  });

  test('passes branchId filter when provided', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = createResponse();
    await receptionQueue(
      { user: { companyId: 'company-1' }, query: { date: '2026-08-07', branchId: 'branch-1' } },
      res,
    );
    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.branchId).toBe('branch-1');
  });

  test('excludes cancelled/missed and post-reception states from the query', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = createResponse();
    await receptionQueue({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);
    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where).toEqual(expect.objectContaining({
      companyId: 'company-1',
      appointmentDate: new Date('2026-08-07'),
      OR: expect.any(Array),
    }));
    const inList = where.OR[0].bookingStatus.in;
    expect(inList).toEqual(['UNCONFIRMED', 'CONFIRMED', 'CHECKED_IN']);
    expect(inList).not.toContain('CANCELLED');
    expect(inList).not.toContain('MISSED');
    expect(inList).not.toContain('CHECKED_OUT');
  });

  test('defaults to the Cairo day (not the UTC day) between midnight and 02:00', async () => {
    jest.useFakeTimers({ now: new Date('2026-08-01T22:30:00.000Z') });
    prisma.appointment.findMany.mockResolvedValue([]);

    const res = createResponse();
    await receptionQueue({ user: { companyId: 'company-1' }, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ appointmentDate: new Date('2026-08-02') }),
      }),
    );
  });
});

describe('doctorWorklist', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('requires doctorId', async () => {
    const res = createResponse();
    await doctorWorklist({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);
    expect(res.statusCode).toBe(400);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  test('returns appointments for the doctor with diagnosis fields', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppointment({ id: 'apt-1', doctorId: 'doc-1', bookingStatus: 'PROCEDURE_STARTED', diagnosis: '╪º┘ä╪¬┘ç╪º╪¿ ╪º┘ä╪¡┘ä┘é', treatmentPlan: '┘à╪╢╪º╪» ╪¡┘è┘ê┘è' }),
    ]);

    const res = createResponse();
    await doctorWorklist(
      { user: { companyId: 'company-1' }, query: { date: '2026-08-07', doctorId: 'doc-1' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          OR: [{ doctorId: 'doc-1' }, { assignedDoctorId: 'doc-1' }],
          bookingStatus: { in: ['CHECKED_IN', 'PROCEDURE_STARTED', 'PROCEDURE_COMPLETED'] },
        }),
      }),
    );
    expect(res.payload.data[0].id).toBe('apt-1');
    expect(res.payload.data[0].diagnosis).toBe('╪º┘ä╪¬┘ç╪º╪¿ ╪º┘ä╪¡┘ä┘é');
  });
});

describe('reportWorklist', () => {
  let prisma;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('returns only appointments that still need reports', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppointment({ id: 'apt-1', reportStatus: 'NOTES_IN_PROGRESS', assignedDoctorId: 'doc-1' }),
    ]);

    const res = createResponse();
    await reportWorklist({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data[0].id).toBe('apt-1');
    expect(res.payload.data[0].reportStatus).toBe('NOTES_IN_PROGRESS');
  });

  test('excludes cancelled/missed bookings and approved reports from the query', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = createResponse();
    await reportWorklist({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);
    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.AND).toHaveLength(2);
    const bookingOr = where.AND[0].OR;
    expect(bookingOr[0].bookingStatus.notIn).toEqual(expect.arrayContaining(['CANCELLED', 'MISSED']));
    const reportOr = where.AND[1].OR;
    expect(reportOr[0].reportStatus.notIn).toEqual(['APPROVED']);
  });
});
