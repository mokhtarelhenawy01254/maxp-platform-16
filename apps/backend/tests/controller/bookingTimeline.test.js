jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));
jest.mock('../../services/bookingPatientService', () => ({
  findOrCreatePatient: jest.fn()
}));
jest.mock('../../services/bookingNotificationService', () => ({
  notifyAppointmentConfirmed: jest.fn(),
  notifyAppointmentCancelled: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { findOrCreatePatient } = require('../../services/bookingPatientService');
const { getTimeline, createAppointment, updateAppointment } = require('../../controller/bookingAppointmentsController');

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

const makeDoctor = (overrides = {}) => ({
  id: 'doc-1',
  companyId: 'company-1',
  branchId: 'branch-1',
  title: 'دكتور',
  name: 'أحمد',
  specialty: 'عظام',
  isActive: true,
  branch: { id: 'branch-1', name: 'فرع 1' },
  availability: [
    { id: 'av-1', doctorId: 'doc-1', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true }
  ],
  ...overrides
});

const makeAppointment = (overrides = {}) => ({
  id: 'apt-1',
  companyId: 'company-1',
  branchId: 'branch-1',
  doctorId: 'doc-1',
  serviceId: 'service-1',
  serviceName: 'فحص',
  customerName: 'سارة',
  customerPhone: '0100',
  customerGender: 'female',
  patientId: 'pat-1',
  appointmentDate: new Date('2026-08-07'),
  startTime: '10:00',
  endTime: '10:30',
  duration: 30,
  status: 'confirmed',
  bookingStatus: 'CONFIRMED',
  reportStatus: 'PENDING',
  room: 'غرفة 2',
  preparationNote: 'صيام 6 ساعات',
  notes: '',
  title: 'موعد',
  description: null,
  source: 'dashboard',
  paymentRequired: false,
  paymentStatus: null,
  diagnosis: null,
  treatmentPlan: null,
  prescription: null,
  followUpDate: null,
  createdAt: new Date('2026-08-07T08:00:00.000Z'),
  doctor: { id: 'doc-1', title: 'دكتور', name: 'أحمد', specialty: 'عظام' },
  service: { id: 'service-1', name: 'فحص' },
  branch: { id: 'branch-1', name: 'فرع 1' },
  ...overrides
});

describe('bookingAppointmentsController.getTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    getSharedPrismaClient.mockReturnValue({
      bookingDoctor: { findMany: jest.fn() },
      appointment: { findMany: jest.fn() }
    });
    const res = createResponse();
    await getTimeline({ user: {}, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
  });

  test('returns 400 when date is missing', async () => {
    const res = createResponse();
    await getTimeline({ user: { companyId: 'company-1' }, query: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
  });

  test('groups appointments under their doctor and includes booking fields', async () => {
    getSharedPrismaClient.mockReturnValue({
      bookingDoctor: {
        findMany: jest.fn().mockResolvedValue([makeDoctor()])
      },
      appointment: {
        findMany: jest.fn().mockResolvedValue([makeAppointment()])
      }
    });

    const res = createResponse();
    await getTimeline({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(200);
    const { resources, appointments } = res.payload.data;
    expect(resources).toHaveLength(1);
    expect(resources[0].doctorId).toBe('doc-1');
    expect(resources[0].doctorName).toBe('دكتور أحمد');
    expect(resources[0].specialty).toBe('عظام');
    expect(resources[0].startTime).toBe('09:00');
    expect(resources[0].endTime).toBe('17:00');
    expect(resources[0].isAvailable).toBe(true);
    expect(resources[0].slots[0]).toEqual({ time: '09:00' });
    expect(resources[0].slots).toHaveLength(96);

    expect(appointments).toHaveLength(1);
    expect(appointments[0].doctorId).toBe('doc-1');
    expect(appointments[0].doctorName).toBe('دكتور أحمد');
    expect(appointments[0].customerName).toBe('سارة');
    expect(appointments[0].customerPhone).toBe('0100');
    expect(appointments[0].appointmentDate).toBe('2026-08-07');
    expect(appointments[0].startTime).toBe('10:00');
    expect(appointments[0].duration).toBe(30);
    expect(appointments[0].status).toBe('confirmed');
    expect(appointments[0].bookingStatus).toBe('CONFIRMED');
    expect(appointments[0].reportStatus).toBe('PENDING');
    expect(appointments[0].room).toBe('غرفة 2');
    expect(appointments[0].preparationNote).toBe('صيام 6 ساعات');
  });

  test('handles a doctor without availability using default day hours', async () => {
    getSharedPrismaClient.mockReturnValue({
      bookingDoctor: {
        findMany: jest.fn().mockResolvedValue([makeDoctor({ availability: [] })])
      },
      appointment: {
        findMany: jest.fn().mockResolvedValue([])
      }
    });

    const res = createResponse();
    await getTimeline({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(200);
    const { resources, appointments } = res.payload.data;
    expect(resources).toHaveLength(1);
    expect(resources[0].isAvailable).toBe(false);
    expect(resources[0].startTime).toBe('08:00');
    expect(resources[0].endTime).toBe('22:00');
    expect(resources[0].slots[0].time).toBe('08:00');
    expect(resources[0].slots).toHaveLength(168);
    expect(appointments).toEqual([]);
  });

  test('respects branch, date and service filters', async () => {
    const bookingDoctorFindMany = jest.fn().mockResolvedValue([]);
    const appointmentFindMany = jest.fn().mockResolvedValue([]);
    getSharedPrismaClient.mockReturnValue({
      bookingDoctor: { findMany: bookingDoctorFindMany },
      appointment: { findMany: appointmentFindMany }
    });

    const res = createResponse();
    await getTimeline({ user: { companyId: 'company-1' }, query: { date: '2026-08-07', branchId: 'branch-9', serviceId: 'service-9' } }, res);

    expect(bookingDoctorFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: 'company-1', branchId: 'branch-9', isActive: true })
    }));
    expect(appointmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        companyId: 'company-1',
        branchId: 'branch-9',
        serviceId: 'service-9',
        appointmentDate: new Date('2026-08-07')
      })
    }));
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.resources).toEqual([]);
  });

  test('includes appointments without a doctorId so the client can show an unassigned column', async () => {
    getSharedPrismaClient.mockReturnValue({
      bookingDoctor: { findMany: jest.fn().mockResolvedValue([]) },
      appointment: { findMany: jest.fn().mockResolvedValue([makeAppointment({ doctorId: null, doctor: null })]) }
    });

    const res = createResponse();
    await getTimeline({ user: { companyId: 'company-1' }, query: { date: '2026-08-07' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.resources).toEqual([]);
    expect(res.payload.data.appointments).toHaveLength(1);
    expect(res.payload.data.appointments[0].doctorId).toBe('');
    expect(res.payload.data.appointments[0].doctorName).toBe('');
  });
});

describe('bookingAppointmentsController.createAppointment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('persists room and preparationNote on create', async () => {
    const prisma = {
      bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'فرع 1', genderDays: null }) },
      appointment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'apt-new',
          ...data,
          appointmentDate: new Date('2026-08-07'),
          createdAt: new Date('2026-08-07T08:00:00.000Z'),
          bookingStatus: null,
          reportStatus: null,
          branch: { id: 'branch-1', name: 'فرع 1' },
          service: { id: 'service-1', name: 'فحص' }
        }))
      },
      doctorAvailability: { findFirst: jest.fn().mockResolvedValue({ startTime: '09:00', endTime: '17:00', isAvailable: true }) },
      bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'service-1', durationMinutes: 30 }) }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    findOrCreatePatient.mockResolvedValue({ id: 'pat-1' });

    const res = createResponse();
    await createAppointment({
      user: { companyId: 'company-1', id: 'user-1', role: 'ADMIN', firstName: 'علي', lastName: 'محمد' },
      body: {
        customerName: 'سارة', customerPhone: '0100', customerGender: 'female',
        branchId: 'branch-1', doctorId: 'doc-1', serviceId: 'service-1', serviceName: 'فحص',
        appointmentDate: '2026-08-07', startTime: '10:00',
        room: 'غرفة 3', preparationNote: 'صيام 8 ساعات'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ room: 'غرفة 3', preparationNote: 'صيام 8 ساعات' })
    }));
    expect(res.payload.data.room).toBe('غرفة 3');
    expect(res.payload.data.preparationNote).toBe('صيام 8 ساعات');
  });

  test('rejects a serviceId from another company', async () => {
    const prisma = {
      bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'فرع 1', genderDays: null }) },
      appointment: { count: jest.fn().mockResolvedValue(0) },
      bookingService: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    findOrCreatePatient.mockResolvedValue({ id: 'pat-1' });

    const res = createResponse();
    await createAppointment({
      user: { companyId: 'company-1', id: 'user-1', role: 'ADMIN', firstName: 'علي', lastName: 'محمد' },
      body: {
        customerName: 'سارة', branchId: 'branch-1', serviceId: 'service-foreign',
        appointmentDate: '2026-08-07', startTime: '10:00'
      }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('الخدمة غير موجودة');
    expect(prisma.appointment.create).toBeUndefined();
  });
});

describe('bookingAppointmentsController.updateAppointment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('persists room and preparationNote on update', async () => {
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'apt-1', companyId: 'company-1' }),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'apt-1',
          customerName: 'سارة',
          appointmentDate: new Date('2026-08-07'),
          startTime: '10:00',
          endTime: '10:30',
          duration: 30,
          status: 'confirmed',
          room: data.room,
          preparationNote: data.preparationNote,
          createdAt: new Date('2026-08-07T08:00:00.000Z')
        }))
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updateAppointment({
      user: { companyId: 'company-1' },
      params: { id: 'apt-1' },
      body: { room: 'غرفة 5', preparationNote: 'إحضار تحاليل سابقة' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ room: 'غرفة 5', preparationNote: 'إحضار تحاليل سابقة' })
    }));
    expect(res.payload.data.room).toBe('غرفة 5');
    expect(res.payload.data.preparationNote).toBe('إحضار تحاليل سابقة');
  });

  test('rejects a doctorId from another company on update', async () => {
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'apt-1', companyId: 'company-1' }),
        update: jest.fn()
      },
      bookingDoctor: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updateAppointment({
      user: { companyId: 'company-1' },
      params: { id: 'apt-1' },
      body: { doctorId: 'doc-foreign' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('الطبيب غير موجود');
    expect(prisma.bookingDoctor.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc-foreign', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  test('rejects a patientId from another company on update', async () => {
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'apt-1', companyId: 'company-1' }),
        update: jest.fn()
      },
      bookingBranch: { findFirst: jest.fn().mockResolvedValue(null) },
      bookingDoctor: { findFirst: jest.fn().mockResolvedValue(null) },
      bookingService: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updateAppointment({
      user: { companyId: 'company-1' },
      params: { id: 'apt-1' },
      body: { patientId: 'patient-foreign' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('المريض غير موجود');
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-foreign', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });
});

describe('bookingPatientService.findOrCreatePatient tenant isolation', () => {
  test('drops a customerId that belongs to another company', async () => {
    const service = jest.requireActual('../../services/bookingPatientService');
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'p1', ...data })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const result = await service.findOrCreatePatient({
      companyId: 'company-1',
      customerName: 'سارة',
      customerId: 'cust-foreign',
    });

    expect(prisma.customer.findFirst).toHaveBeenCalledWith({ where: { id: 'cust-foreign', companyId: 'company-1' }, select: { id: true } });
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: null }) })
    );
    expect(result).toEqual({ id: 'p1', created: true });
  });
});
