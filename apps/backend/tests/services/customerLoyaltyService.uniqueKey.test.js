const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('customerLoyaltyService compound unique input key', () => {
  const companyId = 'company-1';
  const customerId = 'customer-1';
  const programId = 'program-1';

  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const create = jest.fn();
  const update = jest.fn();

  const prisma = {
    customerLoyaltyProgram: { findFirst, findMany },
    customerLoyaltyTier: { findMany },
    customerLoyaltyRecord: { findUnique, create, update },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
    findFirst.mockResolvedValue({ id: programId, companyId, status: 'ACTIVE' });
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    create.mockImplementation(async ({ data }) => ({ ...data, id: 'record-1' }));
  });

  test('enrollCustomer looks up records via the generated customerId_programId input', async () => {
    await loyaltyService.enrollCustomer(companyId, customerId, programId, 0);

    expect(findUnique).toHaveBeenCalledWith({
      where: { customerId_programId: { customerId, programId } },
    });
  });

  test('addPoints looks up records via the generated customerId_programId input', async () => {
    findUnique.mockResolvedValue({ id: 'record-1', companyId, status: 'ACTIVE', metadata: null });
    update.mockResolvedValue({ currentPoints: 10 });

    await loyaltyService.addPoints(companyId, customerId, programId, 10, 'test');

    expect(findUnique).toHaveBeenCalledWith({
      where: { customerId_programId: { customerId, programId } },
    });
  });
});
