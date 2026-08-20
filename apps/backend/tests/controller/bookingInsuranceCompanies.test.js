jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/bookingInsuranceCompaniesController');

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

const priceListRow = (id, name, extra = {}) => ({ id, name, isActive: true, baseListId: null, ...extra });

describe('bookingInsuranceCompaniesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllInsuranceCompanies', () => {
    test('returns companies with attached price list info', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceCompany: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'ic-1', companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪ú┘ê┘ä┘ë', priceListId: 'pl-1', priceList: priceListRow('pl-1', '┘é╪º╪ª┘à╪⌐ ╪ú') },
            { id: 'ic-2', companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪½╪º┘å┘è╪⌐', priceListId: 'pl-2', priceList: priceListRow('pl-2', '┘é╪º╪ª┘à╪⌐ ╪¿', { baseListId: 'pl-1' }) },
            { id: 'ic-3', companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ╪¿╪»┘ê┘å ┘é╪º╪ª┘à╪⌐', priceListId: null, priceList: null }
          ])
        }
      });

      const res = createResponse();
      await controller.getAllInsuranceCompanies({ user: { companyId: 'c1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(getSharedPrismaClient().insuranceCompany.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'c1' },
        orderBy: { name: 'asc' }
      }));
      const data = res.payload.data;
      expect(data).toHaveLength(3);
      expect(data[0].priceList).toMatchObject({ id: 'pl-1', name: '┘é╪º╪ª┘à╪⌐ ╪ú' });
      expect(data[0].priceList.isBase).toBe(true);
      expect(data[1].priceList.isBase).toBe(false);
      expect(data[2].priceList).toBeUndefined();
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllInsuranceCompanies({ user: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createInsuranceCompany', () => {
    test('creates a company linked to a valid price list', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-1', companyId: 'c1' }) },
        insuranceCompany: {
          create: jest.fn().mockResolvedValue({
            id: 'ic-1', companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å', priceListId: 'pl-1', priceList: priceListRow('pl-1', '┘é╪º╪ª┘à╪⌐ ╪ú')
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createInsuranceCompany(
        { user: { companyId: 'c1' }, body: { name: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å', priceListId: 'pl-1', phone1: '0100', contactName: '╪ú╪¡┘à╪»' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceList.findFirst).toHaveBeenCalledWith({ where: { id: 'pl-1', companyId: 'c1' } });
      expect(mockPrisma.insuranceCompany.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å', priceListId: 'pl-1', phone1: '0100', contactName: '╪ú╪¡┘à╪»' })
      }));
      expect(res.payload.data.priceList.isBase).toBe(true);
    });

    test('rejects a priceListId from another company', async () => {
      getSharedPrismaClient.mockReturnValue({
        priceList: { findFirst: jest.fn().mockResolvedValue(null) }
      });
      const res = createResponse();
      await controller.createInsuranceCompany(
        { user: { companyId: 'c1' }, body: { name: '╪┤╪▒┘â╪⌐', priceListId: 'other-pl' } },
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });

    test('requires a name', async () => {
      const res = createResponse();
      await controller.createInsuranceCompany({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ┘à╪╖┘ä┘ê╪¿');
    });

    test('creates a company without a price list', async () => {
      const mockPrisma = {
        insuranceCompany: {
          create: jest.fn().mockResolvedValue({ id: 'ic-2', companyId: 'c1', name: '╪┤╪▒┘â╪⌐', priceListId: null, priceList: null })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createInsuranceCompany({ user: { companyId: 'c1' }, body: { name: '╪┤╪▒┘â╪⌐' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceCompany.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ priceListId: null })
      }));
    });
  });

  describe('updateInsuranceCompany', () => {
    test('updates whitelisted fields', async () => {
      const mockPrisma = {
        insuranceCompany: {
          findFirst: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1' }),
          update: jest.fn().mockResolvedValue({
            id: 'ic-1', companyId: 'c1', name: '╪┤╪▒┘â╪⌐ ┘à╪¡╪»╪½╪⌐', priceListId: 'pl-1', priceList: priceListRow('pl-1', '┘é╪º╪ª┘à╪⌐ ╪ú')
          })
        },
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-1', companyId: 'c1' }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'ic-1' }, body: { name: '╪┤╪▒┘â╪⌐ ┘à╪¡╪»╪½╪⌐', priceListId: 'pl-1', phone1: '0122', isActive: true } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceCompany.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'ic-1' },
        data: expect.objectContaining({ name: '╪┤╪▒┘â╪⌐ ┘à╪¡╪»╪½╪⌐', priceListId: 'pl-1', phone1: '0122', isActive: true })
      }));
    });

    test('rejects a foreign priceListId', async () => {
      const mockPrisma = {
        insuranceCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1' }) },
        priceList: { findFirst: jest.fn().mockResolvedValue(null) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'ic-1' }, body: { priceListId: 'other-pl' } },
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });

    test('clears the price list when priceListId is explicitly null', async () => {
      const mockPrisma = {
        insuranceCompany: {
          findFirst: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1' }),
          update: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1', name: '╪┤╪▒┘â╪⌐', priceListId: null, priceList: null })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'ic-1' }, body: { priceListId: null } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceCompany.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ priceListId: null })
      }));
    });

    test('skips an empty-string priceListId without validating it', async () => {
      const mockPrisma = {
        insuranceCompany: {
          findFirst: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1' }),
          update: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1', name: '╪┤╪▒┘â╪⌐', priceListId: 'pl-1', priceList: priceListRow('pl-1', '┘é╪º╪ª┘à╪⌐ ╪ú') })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'ic-1' }, body: { priceListId: '' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceList).toBeUndefined();
      expect(mockPrisma.insuranceCompany.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.not.objectContaining({ priceListId: expect.any(String) })
      }));
    });

    test('returns 404 for a company of another tenant', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) }
      });
      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'nope' }, body: { name: 'x' } },
        res
      );
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });

    test('rejects an empty name', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) }
      });
      const res = createResponse();
      await controller.updateInsuranceCompany(
        { user: { companyId: 'c1' }, params: { id: 'ic-1' }, body: { name: '   ' } },
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ┘à╪╖┘ä┘ê╪¿');
    });
  });

  describe('deleteInsuranceCompany', () => {
    test('soft deletes via isActive=false and returns Arabic message', async () => {
      const mockPrisma = {
        insuranceCompany: {
          findFirst: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1' }),
          update: jest.fn().mockResolvedValue({ id: 'ic-1', companyId: 'c1', isActive: false })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.deleteInsuranceCompany({ user: { companyId: 'c1' }, params: { id: 'ic-1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.insuranceCompany.update).toHaveBeenCalledWith({
        where: { id: 'ic-1' },
        data: { isActive: false }
      });
      expect(res.payload.success).toBe(true);
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å');
    });

    test('returns 404 for a company of another tenant', async () => {
      getSharedPrismaClient.mockReturnValue({
        insuranceCompany: { findFirst: jest.fn().mockResolvedValue(null) }
      });
      const res = createResponse();
      await controller.deleteInsuranceCompany({ user: { companyId: 'c1' }, params: { id: 'nope' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });
  });
});
