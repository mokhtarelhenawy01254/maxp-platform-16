const mockPrisma = {
  userCompany: {
    findFirst: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  user: {
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({
      id: 'target-user-1',
      firstName: 'Target',
      lastName: 'User',
      email: 'target@example.com',
      phone: null,
      role: 'AGENT',
      isActive: true, // Should remain untouched on User
    }),
  },
  role: {
    findFirst: jest.fn().mockResolvedValue({ id: 'role-1' }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const { updateUser } = require('../../controller/companiesController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('companiesController.updateUser tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates UserCompany.isActive but NEVER mutates global User.isActive', async () => {
    const companyId = 'comp-tenant-a';
    const userId = 'target-user-1';

    mockPrisma.userCompany.findFirst.mockResolvedValue({
      id: 'uc-1',
      userId,
      companyId,
      user: {
        id: userId,
        email: 'target@example.com',
      },
    });

    const req = {
      params: { companyId, userId },
      body: {
        firstName: 'UpdatedName',
        isActive: false, // Tenant admin deactivates membership in this company
      },
    };
    const res = createResponse();

    await updateUser(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(500);

    // 1. Verify User.update was called WITHOUT isActive
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.not.objectContaining({
          isActive: expect.anything(),
        }),
      })
    );

    // 2. Verify UserCompany.updateMany was called WITH isActive: false scoped to companyId
    expect(mockPrisma.userCompany.updateMany).toHaveBeenCalledWith({
      where: { userId, companyId },
      data: expect.objectContaining({
        isActive: false,
      }),
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
