jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));
jest.mock('../../services/bookingPatientService', () => ({
  findOrCreatePatient: jest.fn(),
}));
jest.mock('../../services/bookingNotificationService', () => ({
  notifyAppointmentConfirmed: jest.fn(),
  notifyAppointmentCancelled: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { findOrCreatePatient } = require('../../services/bookingPatientService');
const { updateAppointment, getAvailableSlots } = require('../../controller/bookingAppointmentsController');
const { finalizeDraft } = require('../../controller/bookingDraftController');
const { createService, updateService } = require('../../controller/bookingServicesController');
const { createDoctor, updateDoctor } = require('../../controller/bookingDoctorsController');
const { getPatientById, getPatientFull } = require('../../controller/bookingPatientsController');

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

const req = (overrides = {}) => ({
  user: { id: 'user-1', companyId: 'company-1', firstName: '┘à╪¡┘à╪»', lastName: '╪╣┘ä┘è' },
  params: {},
  body: {},
  query: {},
  ...overrides,
});

describe('booking regression + tenant-isolation fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAppointment ΓÇö empty-string foreign keys', () => {
    const makePrisma = () => {
      const prisma = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'apt-1', companyId: 'company-1' }),
          update: jest.fn().mockResolvedValue({
            id: 'apt-1', companyId: 'company-1', customerName: '╪│╪º╪▒╪⌐',
            customerPhone: null, customerEmail: null, customerGender: null,
            branchId: null, doctorId: null, serviceId: null, serviceName: null,
            patientId: null, title: '┘à┘ê╪╣╪»', description: null,
            appointmentDate: new Date('2026-08-07'), startTime: '10:00', endTime: null,
            duration: 30, status: 'pending', notes: null,
            diagnosis: null, treatmentPlan: null, prescription: null, vitals: null,
            followUpDate: null, createdAt: new Date(),
          }),
        },
      };
      getSharedPrismaClient.mockReturnValue(prisma);
      return prisma;
    };

    test('drops empty-string values for FK fields instead of writing broken references', async () => {
      const prisma = makePrisma();

      const res = createResponse();
      await updateAppointment(
        req({ params: { id: 'apt-1' }, body: { branchId: '', doctorId: '', serviceId: '', patientId: '', notes: '┘à┘ä╪º╪¡╪╕╪⌐' } }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      const { data } = prisma.appointment.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('branchId');
      expect(data).not.toHaveProperty('doctorId');
      expect(data).not.toHaveProperty('serviceId');
      expect(data).not.toHaveProperty('patientId');
      expect(data.notes).toBe('┘à┘ä╪º╪¡╪╕╪⌐');
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({ where: { id: 'apt-1', companyId: 'company-1' } });
    });

    test('still writes valid FK values on a normal update', async () => {
      const prisma = makePrisma();
      prisma.bookingBranch = { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }) };

      const res = createResponse();
      await updateAppointment(
        req({ params: { id: 'apt-1' }, body: { branchId: 'branch-1', serviceName: '┘â╪┤┘ü' } }),
        res,
      );

      expect(res.statusCode).toBe(200);
      const { data } = prisma.appointment.update.mock.calls[0][0];
      expect(data.branchId).toBe('branch-1');
      expect(data.serviceName).toBe('┘â╪┤┘ü');
      expect(prisma.bookingBranch.findFirst).toHaveBeenCalledWith({
        where: { id: 'branch-1', companyId: 'company-1' },
        select: { id: true },
      });
    });
  });

  describe('finalizeDraft ΓÇö cross-tenant FK validation', () => {
    const draft = {
      id: 'draft-1', companyId: 'company-1', status: 'in_progress',
      customerName: '╪ú╪¡┘à╪»', customerPhone: '0100', appointmentDate: new Date('2026-08-07'),
      startTime: '10:00', customerGender: 'male',
    };

    test('rejects a draft whose branch belongs to another company', async () => {
      const prisma = {
        bookingDraft: { findFirst: jest.fn().mockResolvedValue({ ...draft, branchId: 'branch-foreign' }) },
        bookingBranch: { findFirst: jest.fn().mockResolvedValue(null) },
        bookingService: { findFirst: jest.fn() },
        bookingDoctor: { findFirst: jest.fn() },
        appointment: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await finalizeDraft(req({ params: { id: 'draft-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪▒╪╣ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingBranch.findFirst).toHaveBeenCalledWith({ where: { id: 'branch-foreign', companyId: 'company-1' } });
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    test('rejects a draft whose service belongs to another company', async () => {
      const prisma = {
        bookingDraft: { findFirst: jest.fn().mockResolvedValue({ ...draft, branchId: 'branch-1', serviceId: 'service-foreign' }) },
        bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }) },
        bookingService: { findFirst: jest.fn().mockResolvedValue(null) },
        bookingDoctor: { findFirst: jest.fn() },
        appointment: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await finalizeDraft(req({ params: { id: 'draft-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä╪«╪»┘à╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      expect(prisma.bookingService.findFirst).toHaveBeenCalledWith({ where: { id: 'service-foreign', companyId: 'company-1' } });
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    test('rejects a draft whose doctor belongs to another company', async () => {
      const prisma = {
        bookingDraft: { findFirst: jest.fn().mockResolvedValue({ ...draft, branchId: 'branch-1', doctorId: 'doctor-foreign' }) },
        bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }) },
        bookingService: { findFirst: jest.fn() },
        bookingDoctor: { findFirst: jest.fn().mockResolvedValue(null) },
        appointment: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await finalizeDraft(req({ params: { id: 'draft-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä╪╖╪¿┘è╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    test('creates the appointment when all draft references are in-company', async () => {
      const prisma = {
        bookingDraft: {
          findFirst: jest.fn().mockResolvedValue({ ...draft, branchId: 'branch-1', serviceId: 'service-1', doctorId: 'doctor-1' }),
          update: jest.fn().mockResolvedValue({ id: 'draft-1', status: 'completed' }),
        },
        bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1', name: '┘ü╪▒╪╣ 1' }) },
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'service-1', name: '┘â╪┤┘ü' }) },
        bookingDoctor: { findFirst: jest.fn().mockResolvedValue({ id: 'doctor-1', name: '╪». ╪ú╪¡┘à╪»' }) },
        appointment: { create: jest.fn().mockResolvedValue({ id: 'appt-1' }) },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await finalizeDraft(req({ params: { id: 'draft-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            branchId: 'branch-1',
            serviceId: 'service-1',
            doctorId: 'doctor-1',
          }),
        }),
      );
    });
  });

  describe('createService ΓÇö foreign reference validation', () => {
    const baseBody = { name: '┘â╪┤┘ü' };

    test('rejects a categoryId from another company', async () => {
      const prisma = {
        bookingServiceCategory: { findFirst: jest.fn().mockResolvedValue(null) },
        bookingBranch: { count: jest.fn() },
        bookingDoctor: { count: jest.fn() },
        bookingService: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createService(req({ body: { ...baseBody, categoryId: 'cat-foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘é╪│┘à ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingService.create).not.toHaveBeenCalled();
    });

    test('rejects a branchId from another company', async () => {
      const prisma = {
        bookingServiceCategory: { findFirst: jest.fn() },
        bookingBranch: { count: jest.fn().mockResolvedValue(0) },
        bookingDoctor: { count: jest.fn() },
        bookingService: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createService(req({ body: { ...baseBody, branches: ['branch-foreign'] } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪¡╪» ╪º┘ä┘ü╪▒┘ê╪╣ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingBranch.count).toHaveBeenCalledWith({
        where: { companyId: 'company-1', id: { in: ['branch-foreign'] } },
      });
      expect(prisma.bookingService.create).not.toHaveBeenCalled();
    });

    test('rejects a doctorId from another company', async () => {
      const prisma = {
        bookingServiceCategory: { findFirst: jest.fn() },
        bookingBranch: { count: jest.fn() },
        bookingDoctor: { count: jest.fn().mockResolvedValue(1) },
        bookingService: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createService(req({ body: { ...baseBody, doctorIds: ['doctor-1', 'doctor-foreign'] } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪¡╪» ╪º┘ä╪ú╪╖╪¿╪º╪í ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingDoctor.count).toHaveBeenCalledWith({
        where: { companyId: 'company-1', id: { in: ['doctor-1', 'doctor-foreign'] } },
      });
      expect(prisma.bookingService.create).not.toHaveBeenCalled();
    });

    test('creates the service when all references are in-company', async () => {
      const prisma = {
        bookingServiceCategory: { findFirst: jest.fn().mockResolvedValue({ id: 'cat-1' }) },
        bookingBranch: { count: jest.fn().mockResolvedValue(1) },
        bookingDoctor: { count: jest.fn().mockResolvedValue(1) },
        bookingService: { create: jest.fn().mockResolvedValue({ id: 'svc-1' }) },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createService(
        req({ body: { ...baseBody, categoryId: 'cat-1', branches: ['branch-1'], doctorIds: ['doctor-1'] } }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(prisma.bookingService.create).toHaveBeenCalled();
    });
  });

  describe('updateService ΓÇö foreign reference validation', () => {
    test('rejects a categoryId from another company', async () => {
      const prisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'company-1' }), update: jest.fn() },
        bookingServiceCategory: { findFirst: jest.fn().mockResolvedValue(null) },
        bookingDoctor: { count: jest.fn() },
        bookingDoctorService: { deleteMany: jest.fn(), createMany: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await updateService(req({ params: { id: 'svc-1' }, body: { categoryId: 'cat-foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘é╪│┘à ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingService.update).not.toHaveBeenCalled();
    });

    test('rejects a doctorId from another company', async () => {
      const prisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'company-1' }), update: jest.fn() },
        bookingServiceCategory: { findFirst: jest.fn() },
        bookingDoctor: { count: jest.fn().mockResolvedValue(0) },
        bookingDoctorService: { deleteMany: jest.fn(), createMany: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await updateService(req({ params: { id: 'svc-1' }, body: { doctorIds: ['doctor-foreign'] } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪¡╪» ╪º┘ä╪ú╪╖╪¿╪º╪í ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingDoctorService.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('bookingDoctors ΓÇö foreign reference validation', () => {
    test('createDoctor rejects a serviceId from another company', async () => {
      const prisma = {
        bookingBranch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }) },
        bookingService: { count: jest.fn().mockResolvedValue(0) },
        bookingDoctor: { create: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createDoctor(
        req({ body: { branchId: 'branch-1', title: '╪»┘â╪¬┘ê╪▒', serviceIds: ['service-foreign'] } }),
        res,
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪¡╪» ╪º┘ä╪«╪»┘à╪º╪¬ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingDoctor.create).not.toHaveBeenCalled();
    });

    test('updateDoctor rejects a branchId from another company', async () => {
      const prisma = {
        bookingDoctor: { findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', companyId: 'company-1' }), update: jest.fn() },
        bookingBranch: { findFirst: jest.fn().mockResolvedValue(null) },
        bookingService: { count: jest.fn() },
        bookingDoctorService: { deleteMany: jest.fn(), createMany: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await updateDoctor(req({ params: { id: 'doc-1' }, body: { branchId: 'branch-foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪▒╪╣ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingDoctor.update).not.toHaveBeenCalled();
    });

    test('updateDoctor rejects a serviceId from another company', async () => {
      const prisma = {
        bookingDoctor: { findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', companyId: 'company-1' }), update: jest.fn() },
        bookingBranch: { findFirst: jest.fn() },
        bookingService: { count: jest.fn().mockResolvedValue(0) },
        bookingDoctorService: { deleteMany: jest.fn(), createMany: jest.fn() },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await updateDoctor(req({ params: { id: 'doc-1' }, body: { serviceIds: ['service-foreign'] } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪¡╪» ╪º┘ä╪«╪»┘à╪º╪¬ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.bookingDoctorService.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableSlots ΓÇö still works with the clinic-v2 Appointment fields', () => {
    const branch = {
      id: 'branch-1', companyId: 'company-1',
      workingDays: '{"fri":"09:00-17:00"}',
      genderDays: null,
      maxBookingsPerSlot: 1,
    };

    test('marks overlapping slots unavailable while keeping free slots available', async () => {
      const prisma = {
        bookingBranch: { findFirst: jest.fn().mockResolvedValue(branch) },
        appointment: {
          findMany: jest.fn().mockResolvedValue([
            {
              startTime: '09:00', endTime: '09:30',
              status: 'confirmed', bookingStatus: 'CHECKED_IN', reportStatus: 'PENDING',
            },
          ]),
        },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getAvailableSlots(
        req({ query: { branchId: 'branch-1', date: '2026-08-07' } }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      const slots = res.payload.data;
      expect(Array.isArray(slots)).toBe(true);
      const nine = slots.find((s) => s.startTime === '09:00');
      const nineThirty = slots.find((s) => s.startTime === '09:30');
      expect(nine.available).toBe(false);
      expect(nineThirty.available).toBe(true);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1', branchId: 'branch-1', appointmentDate: new Date('2026-08-07'),
          }),
        }),
      );
    });

    test('aligns slot grid to the service duration', async () => {
      const prisma = {
        bookingBranch: { findFirst: jest.fn().mockResolvedValue(branch) },
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'service-1', companyId: 'company-1', durationMinutes: 60 }) },
        appointment: { findMany: jest.fn().mockResolvedValue([]) },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getAvailableSlots(
        req({ query: { branchId: 'branch-1', date: '2026-08-07', serviceId: 'service-1' } }),
        res,
      );

      expect(res.statusCode).toBe(200);
      const slots = res.payload.data;
      expect(slots[0]).toEqual(expect.objectContaining({ startTime: '09:00', duration: 60 }));
      expect(slots[0].endTime).toBe('10:00');
      expect(prisma.bookingService.findFirst).toHaveBeenCalledWith({
        where: { id: 'service-1', companyId: 'company-1' },
      });
    });
  });

  describe('patient financial summary ΓÇö additionAmount in outstanding', () => {
    test('getPatientById counts additionAmount toward outstanding', async () => {
      const prisma = {
        patient: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'p1', companyId: 'company-1', firstName: '╪ú╪¡┘à╪»', gender: 'MALE',
            referringPhysician: null, priceList: null, appointments: [],
            invoices: [
              { id: 'inv-1', status: 'UNPAID', total: 100, discount: 20, additionAmount: 10, amountPaid: 0 },
              { id: 'inv-2', status: 'PAID', total: 500, discount: 0, additionAmount: 0, amountPaid: 500 },
            ],
          }),
        },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getPatientById(req({ params: { id: 'p1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.financialSummary.outstanding).toBe(90);
    });

    test('getPatientFull counts additionAmount toward outstanding and excludes refunded', async () => {
      const prisma = {
        patient: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'p1', companyId: 'company-1', firstName: '╪ú╪¡┘à╪»', gender: 'MALE',
            referringPhysician: null, priceList: null, appointments: [], _count: { appointments: 0 },
          }),
        },
        medicalInvoice: {
          findMany: jest.fn().mockResolvedValue([
            { status: 'REFUNDED', total: 500, discount: 0, additionAmount: 0, amountPaid: 0 },
            { status: 'UNPAID', total: 100, discount: 20, additionAmount: 10, amountPaid: 0 },
          ]),
        },
        transactionLog: { count: jest.fn().mockResolvedValue(0) },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await getPatientFull(req({ params: { id: 'p1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.invoicesSummary.outstanding).toBe(90);
    });
  });
});
