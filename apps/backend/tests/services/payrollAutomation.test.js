const payrollService = require('../../services/hr/payrollService');

describe('HR Payroll Automation & Attendance Deductions', () => {
  afterEach(() => {
    payrollService.prisma = null;
    jest.restoreAllMocks();
  });

  describe('autoCalculateAndDeductPayrolls - Protection of Paid Payrolls', () => {
    it('skips PAID payrolls without modifying them to protect financial integrity', async () => {
      const mockCompanyId = 'company-test-123';
      const mockMonth = 9;
      const mockYear = 2026;

      const mockEmployee = {
        id: 'emp-1',
        firstName: 'أحمد',
        lastName: 'محمد',
        isActive: true,
        companyId: mockCompanyId,
        employees: [{ salary: 10000 }]
      };

      const mockPaidPayroll = {
        id: 'payroll-paid-1',
        userId: 'emp-1',
        month: mockMonth,
        year: mockYear,
        status: 'PAID',
        netSalary: 9500
      };

      const mockUpdate = jest.fn();
      const mockCreate = jest.fn();

      payrollService.prisma = {
        user: {
          findMany: jest.fn().mockResolvedValue([mockEmployee])
        },
        payroll: {
          findFirst: jest.fn().mockResolvedValue(mockPaidPayroll),
          update: mockUpdate,
          create: mockCreate
        }
      };

      const result = await payrollService.autoCalculateAndDeductPayrolls(mockCompanyId, mockMonth, mockYear);

      expect(result.skippedPaid).toBe(1);
      expect(result.processed).toBe(0);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates or updates draft payrolls with calculated deductions for unpaid employees', async () => {
      const mockCompanyId = 'company-test-123';
      const mockMonth = 9;
      const mockYear = 2026;

      const mockEmployee = {
        id: 'emp-2',
        firstName: 'سارة',
        lastName: 'علي',
        isActive: true,
        companyId: mockCompanyId,
        employees: [{ salary: 6000 }]
      };

      const mockDraftPayroll = {
        id: 'payroll-draft-2',
        userId: 'emp-2',
        month: mockMonth,
        year: mockYear,
        status: 'DRAFT'
      };

      const mockUpdate = jest.fn().mockResolvedValue({ id: 'payroll-draft-2', status: 'DRAFT' });
      const mockCreate = jest.fn();

      payrollService.prisma = {
        user: {
          findMany: jest.fn().mockResolvedValue([mockEmployee])
        },
        payroll: {
          findFirst: jest.fn().mockResolvedValue(mockDraftPayroll),
          update: mockUpdate,
          create: mockCreate
        }
      };

      jest.spyOn(payrollService, 'calculatePayrollData').mockResolvedValue({
        baseSalary: 6000,
        fullMonthBaseSalary: 6000,
        totalAllowances: 500,
        totalDeductions: 800,
        grossSalary: 6500,
        netSalary: 5700,
        attendanceDeduction: 600,
        absentDays: 2,
        latePenalty: 100,
        workingDays: 30,
        actualWorkDays: 28,
        deductions: {
          'غياب': 500,
          'تأخيرات': 100,
          'عجز ساعات العمل': 0,
          absenceDetails: '2026-09-10 (غياب كامل x 1.5 = 500.00)',
          lateDetails: '2026-09-12: تأخير 45د = 100.00 ج.م'
        }
      });

      const result = await payrollService.autoCalculateAndDeductPayrolls(mockCompanyId, mockMonth, mockYear);

      expect(result.processed).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.totalAbsenceDeductions).toBe(500);
      expect(result.totalLateDeductions).toBe(100);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPayrollAutomationStatus', () => {
    it('returns company payroll configuration and monthly stats', async () => {
      const mockCompanyId = 'company-test-123';
      const mockMonth = 9;
      const mockYear = 2026;

      payrollService.prisma = {
        hRSettings: {
          findUnique: jest.fn().mockResolvedValue({
            autoDeductionEnabled: true,
            payrollDay: 25,
            absencePenaltyRate: 1.5,
            workingHoursPerDay: 8,
            workingDaysPerMonth: 22
          })
        },
        attendance: {
          count: jest.fn().mockResolvedValue(45)
        },
        payroll: {
          count: jest.fn()
            .mockResolvedValueOnce(6) // total
            .mockResolvedValueOnce(3) // draft
            .mockResolvedValueOnce(2) // paid
        }
      };

      const status = await payrollService.getPayrollAutomationStatus(mockCompanyId, mockMonth, mockYear);

      expect(status.autoDeductionEnabled).toBe(true);
      expect(status.payrollDay).toBe(25);
      expect(status.absencePenaltyRate).toBe(1.5);
      expect(status.workingHoursPerDay).toBe(8);
      expect(status.stats.attendanceCount).toBe(45);
      expect(status.stats.draftCount).toBe(3);
      expect(status.stats.paidCount).toBe(2);
    });
  });
});
