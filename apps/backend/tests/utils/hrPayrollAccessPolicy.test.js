/**
 * TICKET-2026-11-06-RBAC-01 · F-02
 * سياسة الرواتب: من يسجّل المنشئ، وكيف يُمنع الاعتماد الذاتي.
 */
const {
  SELF_APPROVAL_EXEMPT_ROLES,
  recordPayrollCreation,
  didActorCreatePayroll,
  buildSelfApprovalError,
  normalizeRole,
} = require('../../utils/hrPayrollAccessPolicy');

const createPrismaMock = () => ({
  user: { findUnique: jest.fn() },
  hRAuditLog: { create: jest.fn(), findFirst: jest.fn() },
});

describe('hrPayrollAccessPolicy', () => {
  test('only OWNER and SUPER_ADMIN are exempt from the self-approval rule', () => {
    expect(SELF_APPROVAL_EXEMPT_ROLES).toEqual(['SUPER_ADMIN', 'OWNER']);
    expect(SELF_APPROVAL_EXEMPT_ROLES).not.toContain('MANAGER');
    expect(SELF_APPROVAL_EXEMPT_ROLES).not.toContain('COMPANY_ADMIN');
  });

  test('normalizeRole upper-cases and tolerates junk', () => {
    expect(normalizeRole(' owner ')).toBe('OWNER');
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
    expect(normalizeRole(42)).toBe('');
  });

  test('recordPayrollCreation stores a real PAYROLL/CREATE audit row with actor name', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Doaa', lastName: 'Wagdy' });
    prisma.hRAuditLog.create.mockResolvedValue({ id: 'log-1' });

    await recordPayrollCreation(prisma, {
      companyId: 'c1',
      actorId: 'u1',
      payrollId: 'p1',
      details: { month: 11, year: 2026 },
    });

    expect(prisma.hRAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'c1',
        actorId: 'u1',
        actorName: 'Doaa Wagdy',
        action: 'CREATE',
        entityType: 'PAYROLL',
        entityId: 'p1',
        details: { month: 11, year: 2026 },
      }),
    });
  });

  test('recordPayrollCreation never throws when the audit write fails', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.hRAuditLog.create.mockRejectedValue(new Error('db down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      recordPayrollCreation(prisma, { companyId: 'c1', actorId: 'u1', payrollId: 'p1' })
    ).resolves.toBeUndefined();

    warn.mockRestore();
  });

  test('didActorCreatePayroll is true only for a matching actor and payroll', async () => {
    const prisma = createPrismaMock();
    prisma.hRAuditLog.findFirst.mockResolvedValue({ id: 'log-1' });

    const result = await didActorCreatePayroll(prisma, {
      companyId: 'c1',
      actorId: 'u1',
      payrollId: 'p1',
    });

    expect(result).toBe(true);
    expect(prisma.hRAuditLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'c1',
          actorId: 'u1',
          action: 'CREATE',
          entityType: 'PAYROLL',
          entityId: 'p1',
        }),
      })
    );
  });

  test('didActorCreatePayroll fails safe (false) when the lookup errors', async () => {
    const prisma = createPrismaMock();
    prisma.hRAuditLog.findFirst.mockRejectedValue(new Error('db down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      didActorCreatePayroll(prisma, { companyId: 'c1', actorId: 'u1', payrollId: 'p1' })
    ).resolves.toBe(false);

    warn.mockRestore();
  });

  test('buildSelfApprovalError carries 409 + a stable code', () => {
    const error = buildSelfApprovalError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(error.message).toContain('أنشأته بنفسك');
  });
});
