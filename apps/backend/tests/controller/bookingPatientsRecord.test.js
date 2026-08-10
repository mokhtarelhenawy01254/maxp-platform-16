jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  createPatient,
  updatePatient,
  mergePatients,
  getPatientFull,
  getPatientById,
} = require('../../controller/bookingPatientsController');
const {
  getAllReferringPhysicians,
  createReferringPhysician,
  updateReferringPhysician,
  deleteReferringPhysician,
} = require('../../controller/bookingReferringPhysiciansController');

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

const companyReq = (overrides = {}) => ({
  user: { id: 'user-1', companyId: 'company-1', name: 'Nada' },
  params: {},
  body: {},
  query: {},
  ...overrides,
});

const MEDICAL_HISTORY = {
  conditions: [{ code: 'diabetes', label: 'سكر', checked: true }, { code: 'asthma', label: 'ربو', checked: false }],
  allergies: [{ code: 'penicillin', label: 'حساسية بنسلين', checked: true }],
};

describe('bookingPatientsRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createPatient persists clinic record fields', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      referringPhysician: { findFirst: jest.fn().mockResolvedValue({ id: 'ref-1', companyId: 'company-1' }) },
      priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-1', companyId: 'company-1' }) },
      patient: {
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'p1', ...data })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({
        body: {
          firstName: 'أحمد',
          status: 'ACTIVE',
          source: 'whatsapp',
          maritalStatus: 'MARRIED',
          occupation: 'مهندس',
          city: 'القاهرة',
          medicalHistory: MEDICAL_HISTORY,
          referringPhysicianId: 'ref-1',
          priceListId: 'pl-1',
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        firstName: 'أحمد',
        status: 'ACTIVE',
        source: 'whatsapp',
        maritalStatus: 'MARRIED',
        occupation: 'مهندس',
        city: 'القاهرة',
        medicalHistory: MEDICAL_HISTORY,
        referringPhysicianId: 'ref-1',
        priceListId: 'pl-1',
      }),
    });
  });

  test('createPatient accepts medicalHistory as JSON string', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: {
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'p1', ...data })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({
        body: { firstName: 'أحمد', medicalHistory: JSON.stringify(MEDICAL_HISTORY) },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.create.mock.calls[0][0].data.medicalHistory).toEqual(MEDICAL_HISTORY);
  });

  test('createPatient rejects invalid medicalHistory', async () => {
    const prisma = { patient: { create: jest.fn() } };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: 'أحمد', medicalHistory: ['sugar', 'pressure'] } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('updatePatient persists clinic record fields', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn().mockImplementation(async ({ where, data }) => ({
          id: where.id, firstName: 'أحمد', gender: 'MALE', ...data,
        })),
      },
      referringPhysician: { findFirst: jest.fn().mockResolvedValue({ id: 'ref-2', companyId: 'company-1' }) },
      priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'company-1' }) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({
        params: { id: 'p1' },
        body: {
          status: 'REVIEW',
          source: 'facebook',
          maritalStatus: 'SINGLE',
          occupation: 'طبيب',
          city: 'الجيزة',
          medicalHistory: MEDICAL_HISTORY,
          referringPhysicianId: 'ref-2',
          priceListId: 'pl-2',
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        status: 'REVIEW',
        source: 'facebook',
        maritalStatus: 'SINGLE',
        occupation: 'طبيب',
        city: 'الجيزة',
        medicalHistory: MEDICAL_HISTORY,
        referringPhysicianId: 'ref-2',
        priceListId: 'pl-2',
      }),
    });
  });

  test('updatePatient rejects requests without a company scope', async () => {
    const prisma = { patient: { findFirst: jest.fn(), update: jest.fn() } };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient({ user: { id: 'user-1' }, params: { id: 'p1' }, body: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, error: 'غير مصرح' });
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  test('createPatient rejects a referringPhysicianId from another company', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      referringPhysician: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { create: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: 'أحمد', referringPhysicianId: 'ref-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('الطبيب المحوّل غير موجود');
    expect(prisma.referringPhysician.findFirst).toHaveBeenCalledWith({ where: { id: 'ref-foreign', companyId: 'company-1' }, select: { id: true } });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('createPatient rejects a priceListId from another company', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      referringPhysician: { findFirst: jest.fn().mockResolvedValue(null) },
      priceList: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { create: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: 'أحمد', priceListId: 'pl-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('قائمة الأسعار غير موجودة');
    expect(prisma.priceList.findFirst).toHaveBeenCalledWith({ where: { id: 'pl-foreign', companyId: 'company-1' }, select: { id: true } });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('createPatient rejects a customerId from another company', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { create: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: 'أحمد', customerId: 'cust-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('العميل غير موجود');
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({ where: { id: 'cust-foreign', companyId: 'company-1' }, select: { id: true } });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('updatePatient rejects a priceListId from another company', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn(),
      },
      priceList: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({ params: { id: 'p1' }, body: { priceListId: 'pl-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('قائمة الأسعار غير موجودة');
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  test('mergePatients moves invoices & appointments and deactivates source', async () => {
    const prisma = {
      patient: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'source', companyId: 'company-1' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', firstName: 'هدف', lastName: 'م' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', firstName: 'هدف', _count: { appointments: 4 } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      medicalInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
      appointment: { updateMany: jest.fn().mockResolvedValue({ count: 5 }) },
      transactionLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'source' }, body: { targetPatientId: 'target' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'source', mergedIntoId: null },
      data: { mergedIntoId: 'target', status: 'INACTIVE', isActive: false },
    });
    expect(prisma.medicalInvoice.updateMany).toHaveBeenCalledWith({ where: { patientId: 'source' }, data: { patientId: 'target' } });
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({ where: { patientId: 'source' }, data: { patientId: 'target' } });
    expect(prisma.transactionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: 'company-1', entityType: 'PATIENT', entityId: 'source', action: 'MERGE' }),
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  test('mergePatients rejects merging into an inactive target', async () => {
    const prisma = {
      patient: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'source', companyId: 'company-1' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', isActive: false }),
      },
      $transaction: jest.fn(),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'source' }, body: { targetPatientId: 'target' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('mergePatients rejects merging a patient with itself', async () => {
    const prisma = { $transaction: jest.fn() };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'p1' }, body: { targetPatientId: 'p1' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('mergePatients rejects double-merge of an already merged source', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 'source', companyId: 'company-1', mergedIntoId: 'target' }),
      },
      $transaction: jest.fn(),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'source' }, body: { targetPatientId: 'target2' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('لا يمكن دمج مريض مدمج بالفعل');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('mergePatients deactivates source even when it has no invoices or appointments', async () => {
    const prisma = {
      patient: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'source', companyId: 'company-1' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', firstName: 'هدف', lastName: 'م' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', firstName: 'هدف', _count: { appointments: 0 } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      medicalInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      appointment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      transactionLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'source' }, body: { targetPatientId: 'target' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'source', mergedIntoId: null },
      data: expect.objectContaining({ mergedIntoId: 'target', status: 'INACTIVE', isActive: false }),
    });
  });

  test('mergePatients rejects a concurrent double-merge via the guarded write', async () => {
    const prisma = {
      patient: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'source', companyId: 'company-1' })
          .mockResolvedValueOnce({ id: 'target', companyId: 'company-1', firstName: 'هدف', lastName: 'م' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      medicalInvoice: { updateMany: jest.fn() },
      appointment: { updateMany: jest.fn() },
      transactionLog: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'source' }, body: { targetPatientId: 'target' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('لا يمكن دمج مريض مدمج بالفعل');
    expect(prisma.medicalInvoice.updateMany).not.toHaveBeenCalled();
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    expect(prisma.transactionLog.create).not.toHaveBeenCalled();
  });

  test('mergePatients rejects merging when source belongs to another company', async () => {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await mergePatients(
      companyReq({ params: { id: 'other-source' }, body: { targetPatientId: 'target' } }),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'other-source', companyId: 'company-1' }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('getPatientById includes referringPhysician and priceList', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          companyId: 'company-1',
          firstName: 'أحمد',
          gender: 'MALE',
          referringPhysician: { id: 'ref-1', name: 'د. أحمد', specialty: 'قلب' },
          priceList: { id: 'pl-1', name: 'قائمة أساسية' },
          appointments: [],
          invoices: [],
        }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getPatientById(companyReq({ params: { id: 'p1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1', companyId: 'company-1' },
        include: expect.objectContaining({
          referringPhysician: expect.any(Object),
          priceList: expect.any(Object),
        }),
      })
    );
    expect(res.payload.data.referringPhysician.name).toBe('د. أحمد');
    expect(res.payload.data.priceList.id).toBe('pl-1');
    expect(res.payload.data.financialSummary).toEqual({
      invoiceCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
      unpaidInvoices: 0,
    });
  });

  test('getPatientFull returns patient with physician, priceList, appointments, invoices summary and log count', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          companyId: 'company-1',
          firstName: 'أحمد',
          gender: 'MALE',
          referringPhysician: { id: 'ref-1', name: 'د. أحمد', specialty: 'قلب' },
          priceList: { id: 'pl-1', name: 'قائمة أساسية' },
          appointments: [{ id: 'appt-1', appointmentDate: new Date(), startTime: '10:00' }],
          _count: { appointments: 1 },
        }),
      },
      medicalInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'PAID', total: 500, discount: 0, amountPaid: 500 },
          { status: 'UNPAID', total: 200, discount: 20, amountPaid: 0 },
        ]),
      },
      transactionLog: { count: jest.fn().mockResolvedValue(3) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getPatientFull(companyReq({ params: { id: 'p1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.referringPhysician.name).toBe('د. أحمد');
    expect(res.payload.data.priceList.id).toBe('pl-1');
    expect(res.payload.data.latestAppointments).toHaveLength(1);
    expect(res.payload.data.invoicesSummary).toEqual({
      count: 2,
      totalBilled: 700,
      totalPaid: 500,
      outstanding: 180,
    });
    expect(res.payload.data.transactionLogCount).toBe(3);
  });

  test('getPatientFull outstanding uses net (total - discount + addition) and excludes REFUNDED', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          companyId: 'company-1',
          firstName: 'أحمد',
          gender: 'MALE',
          referringPhysician: null,
          priceList: null,
          appointments: [],
          _count: { appointments: 0 },
        }),
      },
      medicalInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'PARTIAL', total: 1000, discount: 100, additionAmount: 200, amountPaid: 300 },
          { status: 'REFUNDED', total: 500, discount: 0, additionAmount: 0, amountPaid: 500 },
        ]),
      },
      transactionLog: { count: jest.fn().mockResolvedValue(0) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getPatientFull(companyReq({ params: { id: 'p1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.invoicesSummary).toEqual({
      count: 2,
      totalBilled: 1000,
      totalPaid: 300,
      outstanding: 800,
    });
  });

  describe('referring physicians CRUD', () => {
    test('lists, creates, updates and soft-deletes referring physicians company-scoped', async () => {
      const prisma = {
        referringPhysician: {
          findMany: jest.fn().mockResolvedValue([{ id: 'r1', name: 'د. أحمد', isActive: true }]),
          create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'r2', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'r1', companyId: 'company-1' }),
          update: jest.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
        },
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      let res = createResponse();
      await getAllReferringPhysicians(companyReq(), res);
      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data).toHaveLength(1);
      expect(prisma.referringPhysician.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-1' }) })
      );

      res = createResponse();
      await createReferringPhysician(
        companyReq({ body: { name: 'د. محمد', phone: '01000000000', specialty: 'عظام' } }),
        res
      );
      expect(res.statusCode).toBe(200);
      expect(prisma.referringPhysician.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ companyId: 'company-1', name: 'د. محمد', phone: '01000000000', specialty: 'عظام' }),
      });

      res = createResponse();
      await updateReferringPhysician(
        companyReq({ params: { id: 'r1' }, body: { specialty: 'أطفال', phone: '01111111111' } }),
        res
      );
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.specialty).toBe('أطفال');
      expect(prisma.referringPhysician.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({ specialty: 'أطفال', phone: '01111111111' }),
      });

      res = createResponse();
      await deleteReferringPhysician(companyReq({ params: { id: 'r1' } }), res);
      expect(res.statusCode).toBe(200);
      expect(prisma.referringPhysician.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { isActive: false } });
    });

    test('createReferringPhysician requires a name', async () => {
      const prisma = { referringPhysician: { create: jest.fn() } };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await createReferringPhysician(companyReq({ body: { phone: '01000000000' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(prisma.referringPhysician.create).not.toHaveBeenCalled();
    });
  });
});
