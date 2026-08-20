jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  createPatient,
  updatePatient,
  getAllPatients,
  getPatientById,
  getPatientFull,
} = require('../../controller/bookingPatientsController');

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

describe('bookingPatientsInsurance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createPatient persists insurance and contact fields', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      insuranceCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'ins-1', companyId: 'company-1' }) },
      insuranceMemberType: { findFirst: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1' }) },
      patient: {
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'p1', ...data })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({
        body: {
          firstName: '╪ú╪¡┘à╪»',
          title: '╪»┘â╪¬┘ê╪▒',
          insuranceNumber: 'INS-123456',
          insuranceCompanyId: 'ins-1',
          memberTypeId: 'mt-1',
          homePhone: '0223456789',
          workPhone: '0233344556',
          fax: '0233344557',
          postalCode: '11511',
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.insuranceCompany.findFirst).toHaveBeenCalledWith({
      where: { id: 'ins-1', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.insuranceMemberType.findFirst).toHaveBeenCalledWith({
      where: { id: 'mt-1', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        title: '╪»┘â╪¬┘ê╪▒',
        insuranceNumber: 'INS-123456',
        insuranceCompanyId: 'ins-1',
        memberTypeId: 'mt-1',
        homePhone: '0223456789',
        workPhone: '0233344556',
        fax: '0233344557',
        postalCode: '11511',
      }),
    });
  });

  test('createPatient rejects an insuranceCompanyId from another company', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { create: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: '╪ú╪¡┘à╪»', insuranceCompanyId: 'ins-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    expect(prisma.insuranceCompany.findFirst).toHaveBeenCalledWith({
      where: { id: 'ins-foreign', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('createPatient rejects a memberTypeId from another company', async () => {
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) },
      insuranceMemberType: { findFirst: jest.fn().mockResolvedValue(null) },
      patient: { create: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await createPatient(
      companyReq({ body: { firstName: '╪ú╪¡┘à╪»', memberTypeId: 'mt-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    expect(prisma.insuranceMemberType.findFirst).toHaveBeenCalledWith({
      where: { id: 'mt-foreign', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  test('updatePatient persists insurance and contact fields', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      insuranceCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'ins-2', companyId: 'company-1' }) },
      insuranceMemberType: { findFirst: jest.fn().mockResolvedValue({ id: 'mt-2', companyId: 'company-1' }) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({
        params: { id: 'p1' },
        body: {
          title: '┘à┘ç┘å╪»╪│',
          insuranceNumber: 'INS-999',
          insuranceCompanyId: 'ins-2',
          memberTypeId: 'mt-2',
          homePhone: '0221111111',
          workPhone: '0222222222',
          fax: '0223333333',
          postalCode: '21511',
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        title: '┘à┘ç┘å╪»╪│',
        insuranceNumber: 'INS-999',
        insuranceCompanyId: 'ins-2',
        memberTypeId: 'mt-2',
        homePhone: '0221111111',
        workPhone: '0222222222',
        fax: '0223333333',
        postalCode: '21511',
      }),
    });
  });

  test('updatePatient rejects an insuranceCompanyId from another company', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn(),
      },
      insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({ params: { id: 'p1' }, body: { insuranceCompanyId: 'ins-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  test('updatePatient rejects a memberTypeId from another company', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn(),
      },
      insuranceMemberType: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({ params: { id: 'p1' }, body: { memberTypeId: 'mt-foreign' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  test('updatePatient clears insurance fields with null', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: 'company-1' }),
        update: jest.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      insuranceCompany: { findFirst: jest.fn() },
      insuranceMemberType: { findFirst: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updatePatient(
      companyReq({
        params: { id: 'p1' },
        body: { insuranceNumber: null, insuranceCompanyId: null, memberTypeId: null },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        insuranceNumber: null,
        insuranceCompanyId: null,
        memberTypeId: null,
      }),
    });
  });

  test('getAllPatients searches by insuranceNumber', async () => {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getAllPatients(companyReq({ query: { search: 'INS-123' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          isActive: true,
          OR: expect.arrayContaining([
            { insuranceNumber: { contains: 'INS-123', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  test('getAllPatients filters by insuranceCompanyId', async () => {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getAllPatients(companyReq({ query: { insuranceCompanyId: 'ins-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ insuranceCompanyId: 'ins-1' }),
      })
    );
  });

  test('getAllPatients includes insuranceCompany and memberType', async () => {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            firstName: '╪ú╪¡┘à╪»',
            insuranceNumber: 'INS-1',
            insuranceCompany: { id: 'ins-1', name: '╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è' },
            memberType: { id: 'mt-1', name: '╪▒╪¿ ╪º┘ä╪ú╪│╪▒╪⌐', coveragePercent: 80 },
            _count: { appointments: 2 },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getAllPatients(companyReq(), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          insuranceCompany: { select: { id: true, name: true } },
          memberType: { select: { id: true, name: true, coveragePercent: true } },
        }),
      })
    );
    expect(res.payload.data[0].insuranceCompany.name).toBe('╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è');
    expect(res.payload.data[0].memberType.coveragePercent).toBe(80);
    expect(res.payload.data[0].memberType.name).toBe('╪▒╪¿ ╪º┘ä╪ú╪│╪▒╪⌐');
  });

  test('getPatientById includes insuranceCompany and memberType', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          companyId: 'company-1',
          firstName: '╪ú╪¡┘à╪»',
          insuranceNumber: 'INS-1',
          insuranceCompany: { id: 'ins-1', name: '╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è' },
          memberType: { id: 'mt-1', name: '╪▒╪¿ ╪º┘ä╪ú╪│╪▒╪⌐', coveragePercent: 80 },
          referringPhysician: null,
          priceList: null,
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
        include: expect.objectContaining({
          insuranceCompany: { select: { id: true, name: true } },
          memberType: { select: { id: true, name: true, coveragePercent: true } },
        }),
      })
    );
    expect(res.payload.data.insuranceCompany.name).toBe('╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è');
    expect(res.payload.data.memberType.coveragePercent).toBe(80);
  });

  test('getPatientFull includes insuranceCompany and memberType', async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          companyId: 'company-1',
          firstName: '╪ú╪¡┘à╪»',
          insuranceNumber: 'INS-1',
          insuranceCompany: { id: 'ins-1', name: '╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è' },
          memberType: { id: 'mt-1', name: '╪▒╪¿ ╪º┘ä╪ú╪│╪▒╪⌐', coveragePercent: 80 },
          referringPhysician: null,
          priceList: null,
          appointments: [],
          _count: { appointments: 0 },
        }),
      },
      medicalInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      transactionLog: { count: jest.fn().mockResolvedValue(0) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getPatientFull(companyReq({ params: { id: 'p1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          insuranceCompany: { select: { id: true, name: true } },
          memberType: { select: { id: true, name: true, coveragePercent: true } },
        }),
      })
    );
    expect(res.payload.data.insuranceCompany.name).toBe('╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪░┘ç╪¿┘è');
    expect(res.payload.data.memberType.name).toBe('╪▒╪¿ ╪º┘ä╪ú╪│╪▒╪⌐');
  });
});
