/**
 * Unit & Integration Tests — Staff Sync Service (الخدمة المركزية لمزامنة الموظفين)
 */

const sharedDatabase = require('../../services/sharedDatabase');

const mPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  userCompany: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  employee: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  }
};

jest.spyOn(sharedDatabase, 'getSharedPrismaClient').mockReturnValue(mPrisma);

const staffSyncService = require('../../services/hr/staffSyncService');

describe('StaffSyncService (الخدمة المركزية لمزامنة الموظفين)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncStaffRecord', () => {
    test('creates new Employee with sequential EMP number and links UserCompany', async () => {
      const mockUser = {
        id: 'u_100',
        name: 'أحمد محمود علي',
        firstName: 'أحمد',
        lastName: 'محمود',
        email: 'ahmed@test.com',
        phone: '01000000001',
        companyId: null,
        employeeNumber: null,
        isActive: true,
        hireDate: new Date('2026-01-01'),
        baseSalary: 5000,
        departmentId: null,
        positionId: null
      };

      mPrisma.user.findUnique.mockResolvedValue(mockUser);
      mPrisma.userCompany.upsert.mockResolvedValue({ id: 'uc_1', companyId: 'comp_1', userId: 'u_100', role: 'AGENT' });
      mPrisma.employee.findUnique.mockResolvedValue(null);
      mPrisma.employee.count.mockResolvedValue(5);
      mPrisma.employee.create.mockResolvedValue({ id: 'emp_1', employeeNumber: 'EMP00006', companyId: 'comp_1' });
      mPrisma.user.update.mockResolvedValue(mockUser);

      const result = await staffSyncService.syncStaffRecord('comp_1', 'u_100', {
        role: 'AGENT'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('CREATED');
      expect(result.employeeNumber).toBe('EMP00006');
      expect(mPrisma.userCompany.upsert).toHaveBeenCalled();
      expect(mPrisma.employee.create).toHaveBeenCalled();
      expect(mPrisma.user.update).toHaveBeenCalled();
    });

    test('updates existing Employee and preserves valid employeeNumber', async () => {
      const mockUser = {
        id: 'u_200',
        firstName: 'سارة',
        lastName: 'خالد',
        email: 'sara@test.com',
        employeeNumber: 'EMP00012',
        isActive: true
      };

      const existingEmp = {
        id: 'emp_200',
        userId: 'u_200',
        companyId: 'old_comp',
        employeeNumber: 'EMP00012',
        status: 'ACTIVE'
      };

      mPrisma.user.findUnique.mockResolvedValue(mockUser);
      mPrisma.userCompany.upsert.mockResolvedValue({ id: 'uc_2', role: 'MANAGER' });
      mPrisma.employee.findUnique.mockResolvedValue(existingEmp);
      mPrisma.employee.update.mockResolvedValue({ ...existingEmp, companyId: 'comp_1' });
      mPrisma.user.update.mockResolvedValue(mockUser);

      const result = await staffSyncService.syncStaffRecord('comp_1', 'u_200', {
        role: 'MANAGER'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('UPDATED');
      expect(result.employeeNumber).toBe('EMP00012');
      expect(mPrisma.employee.update).toHaveBeenCalled();
    });
  });

  describe('syncStaffStatus', () => {
    test('deactivates UserCompany and Employee, deactivates User if no other company', async () => {
      mPrisma.employee.findFirst.mockResolvedValue({ id: 'emp_300', userId: 'u_300' });
      mPrisma.employee.update.mockResolvedValue({ id: 'emp_300', status: 'INACTIVE' });
      mPrisma.userCompany.updateMany.mockResolvedValue({ count: 1 });
      mPrisma.userCompany.count.mockResolvedValue(0);
      mPrisma.user.update.mockResolvedValue({});

      const result = await staffSyncService.syncStaffStatus('comp_1', 'u_300', 'INACTIVE');

      expect(result.success).toBe(true);
      expect(result.status).toBe('INACTIVE');
      expect(result.userDeactivated).toBe(true);
      expect(mPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u_300' },
        data: { isActive: false }
      });
    });
  });

  describe('getAssignableStaff', () => {
    test('returns active staff with supported roles', async () => {
      const mockMembers = [
        {
          id: 'uc_1',
          userId: 'u_1',
          role: 'MANAGER',
          user: {
            id: 'u_1',
            firstName: 'أحمد',
            lastName: 'علي',
            email: 'ahmed@test.com',
            phone: '0100',
            avatar: null,
            employeeNumber: 'EMP00001',
            departmentId: 'd1',
            departmentRelation: { id: 'd1', name: 'خدمة العملاء' },
            positionRelation: { id: 'p1', title: 'مشرف' }
          }
        },
        {
          id: 'uc_2',
          userId: 'u_2',
          role: 'AGENT',
          user: {
            id: 'u_2',
            firstName: 'منى',
            lastName: 'سالم',
            email: 'mona@test.com',
            phone: '0101',
            avatar: null,
            employeeNumber: 'EMP00002',
            departmentId: 'd1',
            departmentRelation: { id: 'd1', name: 'خدمة العملاء' },
            positionRelation: { id: 'p2', title: 'أخصائي' }
          }
        }
      ];

      mPrisma.userCompany.findMany.mockResolvedValue(mockMembers);
      mPrisma.employee.findMany.mockResolvedValue([
        { id: 'emp_1', userId: 'u_1', employeeNumber: 'EMP00001', department: { id: 'd1', name: 'خدمة العملاء' }, position: { id: 'p1', title: 'مشرف' } },
        { id: 'emp_2', userId: 'u_2', employeeNumber: 'EMP00002', department: { id: 'd1', name: 'خدمة العملاء' }, position: { id: 'p2', title: 'أخصائي' } }
      ]);

      const staff = await staffSyncService.getAssignableStaff('comp_1', {
        roles: ['MANAGER', 'AGENT']
      });

      expect(staff.length).toBe(2);
      expect(staff[0].name).toBe('أحمد علي');
      expect(staff[0].role).toBe('MANAGER');
      expect(staff[1].role).toBe('AGENT');
    });
  });

  describe('reconcileCompanyStaff', () => {
    test('dryRun returns discrepancy report without mutating data', async () => {
      mPrisma.user.findMany.mockResolvedValue([
        { id: 'u_1', email: 'u1@test.com', firstName: 'U1', lastName: 'L1', employeeNumber: 'EMP00001', isActive: true }
      ]);
      mPrisma.userCompany.findMany.mockResolvedValue([
        { id: 'uc_1', userId: 'u_1', companyId: 'comp_1', role: 'AGENT', isActive: true, user: { id: 'u_1', email: 'u1@test.com' } }
      ]);

      const report = await staffSyncService.reconcileCompanyStaff('comp_1', { dryRun: true });

      expect(report.companyId).toBe('comp_1');
      expect(report.totalUsers).toBe(1);
      expect(report.dryRun).toBe(true);
      expect(mPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
