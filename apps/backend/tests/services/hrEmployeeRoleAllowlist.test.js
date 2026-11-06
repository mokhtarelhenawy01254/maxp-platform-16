/**
 * TICKET-2026-11-06-RBAC-01 — F-01 (service layer).
 *
 * يثبت أن employeeService يرفض الأدوار الخطيرة قبل أي قراءة/كتابة في قاعدة البيانات
 * (createEmployee / updateEmployee / reactivateEmployee) — أي أن MANAGER لا يستطيع
 * إنشاء أو ترقية مستخدم إلى SUPER_ADMIN/OWNER حتى لو أرسل role في الـ body.
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const employeeService = require('../../services/hr/employeeService');

const makePrismaMock = () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userCompany: { upsert: jest.fn(), create: jest.fn() },
  employee: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { findUnique: jest.fn() },
  notification: { create: jest.fn() },
  salaryHistory: { create: jest.fn() },
});

const createPayload = (role) => ({
  email: 'attacker@example.com',
  firstName: 'At',
  lastName: 'Tacker',
  password: 'Aa123456',
  role,
});

describe('employeeService role allowlist (F-01)', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrismaMock();
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('createEmployee rejects role=SUPER_ADMIN with 403 and writes nothing', async () => {
    await expect(
      employeeService.createEmployee('company-1', createPayload('SUPER_ADMIN'))
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.userCompany.create).not.toHaveBeenCalled();
    expect(prisma.userCompany.upsert).not.toHaveBeenCalled();
  });

  test('createEmployee rejects role=OWNER with 403 and writes nothing', async () => {
    await expect(
      employeeService.createEmployee('company-1', createPayload('OWNER'))
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('createEmployee rejects roles outside UserCompaniesRole with 400', async () => {
    await expect(
      employeeService.createEmployee('company-1', createPayload('EMPLOYEE'))
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('updateEmployee rejects role=SUPER_ADMIN with 403 before reading the employee', async () => {
    await expect(
      employeeService.updateEmployee('company-1', 'emp-1', { role: 'SUPER_ADMIN' })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('reactivateEmployee rejects role=SUPER_ADMIN with 403 before reading the user', async () => {
    await expect(
      employeeService.reactivateEmployee('company-1', 'emp-1', { role: 'SUPER_ADMIN' })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.userCompany.upsert).not.toHaveBeenCalled();
  });
});
