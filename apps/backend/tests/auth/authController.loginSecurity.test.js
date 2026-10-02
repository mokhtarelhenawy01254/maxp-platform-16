const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  role: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  company: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn().mockResolvedValue(undefined),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

process.env.JWT_SECRET = 'test-jwt-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-12345678901234567890';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

const bcrypt = require('bcryptjs');
const { login } = require('../../controller/authController');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController login security & enumeration protection', () => {
  const INVALID_CREDENTIALS_MSG = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  const INACTIVE_USER_MSG = 'الحساب غير مفعل';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 with unified invalid credentials message when user does not exist', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    bcrypt.compare.mockResolvedValue(false);

    const req = {
      body: {
        email: 'nonexistent@example.com',
        password: 'anypassword',
      },
      headers: {},
    };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      })
    );
  });

  it('returns 401 with unified invalid credentials message when user exists but password is wrong', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u-1',
      email: 'user@example.com',
      password: '$2b$10$hashedpassword',
      role: 'OWNER',
      companyId: 'comp-1',
      isActive: true,
      company: { id: 'comp-1', name: 'Test Co', isActive: true, installedApps: [] },
      userCompanies: [],
    });
    bcrypt.compare.mockResolvedValue(false);

    const req = {
      body: {
        email: 'user@example.com',
        password: 'wrongpassword',
      },
      headers: {},
    };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      })
    );
  });

  it('prevents user enumeration: returns 401 with unified invalid credentials message when inactive user has WRONG password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u-inactive',
      email: 'inactive@example.com',
      password: '$2b$10$hashedpassword',
      role: 'OWNER',
      companyId: 'comp-1',
      isActive: false, // Inactive account
      company: { id: 'comp-1', name: 'Test Co', isActive: true, installedApps: [] },
      userCompanies: [],
    });
    bcrypt.compare.mockResolvedValue(false); // Wrong password!

    const req = {
      body: {
        email: 'inactive@example.com',
        password: 'wrongpassword',
      },
      headers: {},
    };
    const res = createResponse();

    await login(req, res);

    // Must NOT reveal "الحساب غير مفعل" on wrong password!
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      })
    );
  });

  it('returns 401 inactive account message ONLY when inactive user provides CORRECT password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u-inactive',
      email: 'inactive@example.com',
      password: '$2b$10$hashedpassword',
      role: 'OWNER',
      companyId: 'comp-1',
      isActive: false, // Inactive account
      company: { id: 'comp-1', name: 'Test Co', isActive: true, installedApps: [] },
      userCompanies: [],
    });
    bcrypt.compare.mockResolvedValue(true); // Correct password!

    const req = {
      body: {
        email: 'inactive@example.com',
        password: 'correctpassword',
      },
      headers: {},
    };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: INACTIVE_USER_MSG,
      })
    );
  });

  it('returns 200 with token and user data when active user provides CORRECT password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u-active',
      email: 'active@example.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Swan',
      lastName: 'Owner',
      role: 'OWNER',
      companyId: 'comp-1',
      isActive: true,
      timezone: 'Africa/Cairo',
      lastLoginAt: null,
      company: {
        id: 'comp-1',
        name: 'Swan Co',
        slug: 'swan-co',
        logo: null,
        currency: 'EGP',
        isActive: true,
        sidebarLayout: 'three-tier',
        installedApps: [],
      },
      userCompanies: [],
    });
    bcrypt.compare.mockResolvedValue(true); // Correct password!

    const req = {
      body: {
        email: 'active@example.com',
        password: 'correctpassword',
      },
      headers: {},
    };
    const res = createResponse();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            email: 'active@example.com',
            isActive: true,
          }),
        }),
      })
    );
  });
});
