process.env.JWT_SECRET = 'test-jwt-secret-for-testing-1234567890';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-1234567890';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  company: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
  },
  userCompany: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  employee: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
  },
  systemSettings: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({ config: '{}' }),
  },
  businessSpecialty: {
    findFirst: jest.fn(),
    createMany: jest.fn(),
  },
  dentalTechnician: {
    findFirst: jest.fn(),
  },
  dentalSetting: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn().mockResolvedValue(undefined),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-mail' }),
  })),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNewSignupWelcomeNotification: jest.fn().mockResolvedValue(true),
  sendNewSignupAdminAlertNotification: jest.fn().mockResolvedValue(true),
  sendBenefitGrantedNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../utils/initializeCompanyDefaults', () => ({
  initializeSaasTheme: jest.fn().mockResolvedValue({ success: true }),
  initializeDefaultStorePages: jest.fn().mockResolvedValue({ success: true }),
  initializeDefaultApps: jest.fn().mockResolvedValue({ success: true, installedCount: 0 }),
}));

jest.mock('../../services/platformPartner.service', () => ({
  ensurePartnerForCompanyOwner: jest.fn().mockResolvedValue(null),
}));

const { register } = require('../../controller/authController');
const { checkDentalTechnicianUser } = require('../../services/dentalRoles');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('Register New Company & Dental Technician Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates new company and user as OWNER with isDentalTechnician=false and dentalRole=null', async () => {
    const req = {
      body: {
        email: 'newowner@testcompany.com',
        password: 'Password123!',
        firstName: 'أحمد',
        lastName: 'المالك',
        companyName: 'شركة النور الجديدة',
        phone: '01012345678',
      },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponse();

    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.company.create.mockResolvedValue({
      id: 'comp-100',
      name: 'شركة النور الجديدة',
      slug: 'nour-new-company',
      email: 'newowner@testcompany.com',
      isActive: true,
      sidebarLayout: 'three-tier',
    });
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-100',
      email: 'newowner@testcompany.com',
      firstName: 'أحمد',
      lastName: 'المالك',
      phone: '01012345678',
      role: 'OWNER',
      companyId: 'comp-100',
      isActive: true,
    });
    mockPrisma.userCompany.create.mockResolvedValue({
      id: 'uc-100',
      userId: 'user-100',
      companyId: 'comp-100',
      role: 'OWNER',
      isActive: true,
      isDefault: true,
    });

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-100',
            email: 'newowner@testcompany.com',
            role: 'OWNER',
            companyId: 'comp-100',
            isDentalTechnician: false,
            dentalRole: null,
          }),
        }),
      }),
    );
  });

  it('checkDentalTechnicianUser always returns isTechnician=false and dentalRole=OWNER for OWNER users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-100',
      role: 'OWNER',
    });

    const checkResult = await checkDentalTechnicianUser('user-100', 'comp-100');

    expect(checkResult).toEqual({
      isTechnician: false,
      dentalRole: 'OWNER',
      technician: null,
    });
    expect(mockPrisma.dentalTechnician.findFirst).not.toHaveBeenCalled();
  });
});
