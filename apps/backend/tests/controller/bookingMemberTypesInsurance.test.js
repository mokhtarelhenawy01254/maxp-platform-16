jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const memberTypesController = require('../../controller/bookingInsuranceMemberTypesController');
const invoicesController = require('../../controller/bookingInvoicesController');

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

const baseReq = {
  user: { id: 'user-1', companyId: 'company-1', firstName: '┘à╪¡┘à╪»', lastName: '╪╣┘ä┘è' }
};

describe('bookingMemberTypesInsuranceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllMemberTypes', () => {
    test('returns company-scoped types ordered by coveragePercent asc', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'mt-1', companyId: 'company-1', name: '╪º┘ä╪▓┘ê╪¼', coveragePercent: 50, isActive: true, _count: { patients: 2 } },
            { id: 'mt-2', companyId: 'company-1', name: '╪º┘ä╪▓┘ê╪¼╪⌐', coveragePercent: 25, isActive: true, _count: { patients: 1 } }
          ])
        }
      });

      const res = createResponse();
      await memberTypesController.getAllMemberTypes({ user: { companyId: 'company-1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(getSharedPrismaClient().insuranceMemberType.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'company-1' },
        orderBy: { coveragePercent: 'asc' }
      }));
      expect(res.payload.data).toHaveLength(2);
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await memberTypesController.getAllMemberTypes({ user: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createMemberType', () => {
    test('creates a member type with clamped coverage', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: {
          create: jest.fn().mockResolvedValue({
            id: 'mt-1', companyId: 'company-1', name: '╪º┘ä╪▓┘ê╪¼', coveragePercent: 50, isActive: true
          })
        }
      });

      const res = createResponse();
      await memberTypesController.createMemberType(
        { user: { companyId: 'company-1' }, body: { name: '╪º┘ä╪▓┘ê╪¼', coveragePercent: 50 } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.name).toBe('╪º┘ä╪▓┘ê╪¼');
      expect(res.payload.data.coveragePercent).toBe(50);
      expect(getSharedPrismaClient().insuranceMemberType.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyId: 'company-1', name: '╪º┘ä╪▓┘ê╪¼', coveragePercent: 50 })
      }));
    });

    test('clamps coverage above 100 to 100', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: {
          create: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1', name: 'x', coveragePercent: 100 })
        }
      });

      const res = createResponse();
      await memberTypesController.createMemberType(
        { user: { companyId: 'company-1' }, body: { name: 'x', coveragePercent: 150 } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(getSharedPrismaClient().insuranceMemberType.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ coveragePercent: 100 })
      }));
    });

    test('clamps negative coverage to 0', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: {
          create: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1', name: 'x', coveragePercent: 0 })
        }
      });

      const res = createResponse();
      await memberTypesController.createMemberType(
        { user: { companyId: 'company-1' }, body: { name: 'x', coveragePercent: -20 } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(getSharedPrismaClient().insuranceMemberType.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ coveragePercent: 0 })
      }));
    });

    test('rejects an invalid coveragePercent', async () => {
      const mockPrisma = { insuranceMemberType: { create: jest.fn() } };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await memberTypesController.createMemberType(
        { user: { companyId: 'company-1' }, body: { name: 'x', coveragePercent: 'abc' } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪║╪╖┘è╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐');
      expect(mockPrisma.insuranceMemberType.create).not.toHaveBeenCalled();
    });

    test('rejects a non-finite coverage (Infinity)', async () => {
      getSharedPrismaClient.mockReturnValue({ insuranceMemberType: { create: jest.fn() } });

      const res = createResponse();
      await memberTypesController.createMemberType(
        { user: { companyId: 'company-1' }, body: { name: 'x', coveragePercent: Infinity } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪║╪╖┘è╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐');
    });

    test('requires a name', async () => {
      const res = createResponse();
      await memberTypesController.createMemberType({ user: { companyId: 'company-1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ┘à╪╖┘ä┘ê╪¿');
    });
  });

  describe('updateMemberType', () => {
    test('updates only whitelisted fields (name, coveragePercent, isActive)', async () => {
      const mockPrisma = {
        insuranceMemberType: {
          findFirst: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1' }),
          update: jest.fn().mockResolvedValue({
            id: 'mt-1', companyId: 'company-1', name: '╪º┘ä╪ú╪╖┘ü╪º┘ä', coveragePercent: 30, isActive: false
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await memberTypesController.updateMemberType(
        { user: { companyId: 'company-1' }, params: { id: 'mt-1' }, body: { name: '╪º┘ä╪ú╪╖┘ü╪º┘ä', coveragePercent: 30, isActive: false, evil: 'x' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceMemberType.update).toHaveBeenCalledWith({
        where: { id: 'mt-1' },
        data: { name: '╪º┘ä╪ú╪╖┘ü╪º┘ä', coveragePercent: 30, isActive: false }
      });
    });

    test('rejects a non-numeric coveragePercent on update', async () => {
      const mockPrisma = {
        insuranceMemberType: {
          findFirst: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1' }),
          update: jest.fn()
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await memberTypesController.updateMemberType(
        { user: { companyId: 'company-1' }, params: { id: 'mt-1' }, body: { coveragePercent: 'abc' } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪║╪╖┘è╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐');
      expect(mockPrisma.insuranceMemberType.update).not.toHaveBeenCalled();
    });

    test('clamps coveragePercent to the 0-100 range on update', async () => {
      const mockPrisma = {
        insuranceMemberType: {
          findFirst: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1' }),
          update: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1', coveragePercent: 100 })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await memberTypesController.updateMemberType(
        { user: { companyId: 'company-1' }, params: { id: 'mt-1' }, body: { coveragePercent: 150 } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceMemberType.update).toHaveBeenCalledWith({
        where: { id: 'mt-1' },
        data: { coveragePercent: 100 }
      });
    });

    test('returns 404 for a member type of another company', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: { findFirst: jest.fn().mockResolvedValue(null) }
      });

      const res = createResponse();
      await memberTypesController.updateMemberType(
        { user: { companyId: 'company-1' }, params: { id: 'nope' }, body: { name: 'x' } },
        res
      );

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    });
  });

  describe('deleteMemberType', () => {
    test('soft deletes via isActive=false', async () => {
      const mockPrisma = {
        insuranceMemberType: {
          findFirst: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1' }),
          update: jest.fn().mockResolvedValue({ id: 'mt-1', companyId: 'company-1', isActive: false })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await memberTypesController.deleteMemberType({ user: { companyId: 'company-1' }, params: { id: 'mt-1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceMemberType.update).toHaveBeenCalledWith({
        where: { id: 'mt-1' },
        data: { isActive: false }
      });
    });

    test('returns 404 when the member type does not exist', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceMemberType: { findFirst: jest.fn().mockResolvedValue(null) }
      });

      const res = createResponse();
      await memberTypesController.deleteMemberType({ user: { companyId: 'company-1' }, params: { id: 'nope' } }, res);

      expect(res.statusCode).toBe(404);
    });
  });
});

describe('invoice insurance auto-compute', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      patient: { findFirst: jest.fn() },
      appointment: { findFirst: jest.fn(), update: jest.fn() },
      medicalInvoice: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      medicalPayment: { findFirst: jest.fn(), create: jest.fn() },
      transactionLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    prisma.medicalInvoice.create.mockImplementation(async ({ data }) => ({ id: 'inv-1', ...data, createdAt: new Date(), updatedAt: new Date() }));
    prisma.transactionLog.create.mockResolvedValue({});
  });

  describe('computeInsuranceShare', () => {
    test('computes round(net * coverage / 100)', () => {
      expect(invoicesController.computeInsuranceShare(100, 50)).toBe(50);
      expect(invoicesController.computeInsuranceShare(90, 33)).toBe(30);
      expect(invoicesController.computeInsuranceShare(0, 50)).toBe(0);
    });

    test('returns 0 for zero, negative or missing coverage', () => {
      expect(invoicesController.computeInsuranceShare(100, 0)).toBe(0);
      expect(invoicesController.computeInsuranceShare(100, -10)).toBe(0);
      expect(invoicesController.computeInsuranceShare(100, undefined)).toBe(0);
    });

    test('clamps coverage to 100%', () => {
      expect(invoicesController.computeInsuranceShare(100, 150)).toBe(100);
    });
  });

  describe('createInvoice', () => {
    test('auto-computes insurance for a patient with a 50% member type', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({ ...baseReq, body: { patientId: 'patient-1', total: 100 } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 50, expenseSplit: 'BOTH', insuranceCompanyId: 'ins-1' })
      }));
    });

    test('computes from net after discount/addition, not total', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({
        ...baseReq,
        body: { patientId: 'patient-1', total: 100, discount: 20, discountReason: '╪╣╪▒╪╢', additionAmount: 10, additionReason: '╪«╪»┘à╪⌐' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 45, expenseSplit: 'BOTH' })
      }));
    });

    test('respects explicit insuranceAmount (no override)', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({
        ...baseReq,
        body: { patientId: 'patient-1', total: 100, insuranceAmount: 20, expenseSplit: 'INSURANCE' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 20, expenseSplit: 'INSURANCE' })
      }));
    });

    test('respects explicit expenseSplit only (no auto-compute)', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({
        ...baseReq,
        body: { patientId: 'patient-1', total: 100, expenseSplit: 'PATIENT' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 0, expenseSplit: 'PATIENT' })
      }));
    });

    test('does not auto-compute for a patient without a member type', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: null, memberType: null
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({ ...baseReq, body: { patientId: 'patient-1', total: 100 } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 0, expenseSplit: 'PATIENT' })
      }));
    });

    test('does not auto-compute for a member type with 0% coverage', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-0',
        memberType: { id: 'mt-0', coveragePercent: 0 }
      });
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoice({ ...baseReq, body: { patientId: 'patient-1', total: 100 } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 0, expenseSplit: 'PATIENT' })
      }));
    });
  });

  describe('createInvoiceFromAppointment', () => {
    const appointment = {
      id: 'appt-1', patientId: 'patient-1', companyId: 'company-1', serviceName: '┘â╪┤┘ü',
      branchId: 'b1', doctorId: 'd1', customerName: '╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»',
      doctor: { id: 'd1', consultationFee: 200 },
      service: { id: 's1', name: '┘â╪┤┘ü', basePrice: 300, branchServices: [], doctorServices: [] }
    };

    test('auto-computes insurance from the patient member type', async () => {
      prisma.appointment.findFirst.mockResolvedValue(appointment);
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.findFirst.mockResolvedValue(null);
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoiceFromAppointment({ ...baseReq, params: { appointmentId: 'appt-1' }, body: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 100, expenseSplit: 'BOTH', insuranceCompanyId: 'ins-1' })
      }));
    });

    test('respects explicit insuranceAmount from the appointment invoice request', async () => {
      prisma.appointment.findFirst.mockResolvedValue(appointment);
      prisma.patient.findFirst.mockResolvedValue({
        id: 'patient-1', insuranceCompanyId: 'ins-1', memberTypeId: 'mt-1',
        memberType: { id: 'mt-1', coveragePercent: 50 }
      });
      prisma.medicalInvoice.findFirst.mockResolvedValue(null);
      prisma.medicalInvoice.count.mockResolvedValue(0);

      const res = createResponse();
      await invoicesController.createInvoiceFromAppointment({
        ...baseReq,
        params: { appointmentId: 'appt-1' },
        body: { insuranceAmount: 40, expenseSplit: 'BOTH', insuranceCompanyId: 'ins-2' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.medicalInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ insuranceAmount: 40, expenseSplit: 'BOTH', insuranceCompanyId: 'ins-2' })
      }));
    });
  });
});
