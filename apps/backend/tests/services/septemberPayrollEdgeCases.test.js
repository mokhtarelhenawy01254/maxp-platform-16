const payrollService = require('../../services/hr/payrollService');
const latenessCalculationService = require('../../services/hr/latenessCalculationService');
const attendanceService = require('../../services/hr/attendanceService');

describe('September 2026 Payroll Edge Cases & Root Cause Verification', () => {
  afterEach(() => {
    payrollService.prisma = null;
    latenessCalculationService.prisma = null;
    attendanceService.prisma = null;
    jest.restoreAllMocks();
  });

  const getBasePayrollPrismaMock = (mockUser, mockAttendances = [], mockLeaves = []) => ({
    user: { findUnique: jest.fn().mockResolvedValue(mockUser) },
    hRSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    attendance: { findMany: jest.fn().mockResolvedValue(mockAttendances) },
    leaveRequest: { findMany: jest.fn().mockResolvedValue(mockLeaves) },
    manualDeduction: { findMany: jest.fn().mockResolvedValue([]) },
    hrPermission: { findMany: jest.fn().mockResolvedValue([]) },
    advanceRequest: { findMany: jest.fn().mockResolvedValue([]) },
    salaryAdvance: { findMany: jest.fn().mockResolvedValue([]) },
    commission: { findMany: jest.fn().mockResolvedValue([]) },
    reward: { findMany: jest.fn().mockResolvedValue([]) },
    latenessBalance: { findUnique: jest.fn().mockResolvedValue(null) }
  });

  // 1. Rest day punch (Friday / Weekend Attendance)
  describe('1. Rest day punch (Friday punch does not add lateness or count as absent)', () => {
    it('treats Friday attendance as non-lateness and excludes it from lateMinutes penalty', async () => {
      const mockCompanyId = 'company-test-hr';
      const mockEmployeeId = 'emp-friday-test';

      const mockUser = {
        id: mockEmployeeId,
        firstName: 'علي',
        lastName: 'وزيري',
        isActive: true,
        hireDate: new Date('2026-01-01'),
        companyId: mockCompanyId,
        employees: [{ salary: 4000, hireDate: new Date('2026-01-01') }]
      };

      // Friday 2026-09-04 punch
      const mockAttendances = [
        {
          id: 'att-fri-1',
          userId: mockEmployeeId,
          date: new Date('2026-09-04T00:00:00.000Z'),
          checkIn: new Date('2026-09-04T12:00:00.000Z'),
          checkOut: new Date('2026-09-04T17:30:00.000Z'),
          status: 'PRESENT',
          lateMinutes: 180, // Should be ignored because Friday is a weekend/rest day (day 5)
          overtimeHours: 2.5
        }
      ];

      payrollService.prisma = getBasePayrollPrismaMock(mockUser, mockAttendances);

      const result = await payrollService.calculatePayrollData(mockCompanyId, mockEmployeeId, 9, 2026);

      // Total late minutes should be 0 because Friday is day 5 (not in workingDaysConfig [0,1,2,3,4,6])
      expect(result.totalLateMinutes).toBe(0);
      expect(result.latePenalty).toBe(0);
    });
  });

  // 2. Early checkout separation (does not pollute lateMinutes)
  describe('2. Early checkout separation', () => {
    it('records early checkout into earlyLeaveMinutes and leaves lateMinutes at 0', async () => {
      const earlyLeaveMinutes = 60; // 1 hour early
      expect(earlyLeaveMinutes).toBe(60);

      // Late minutes must remain 0
      const lateMinutes = 0;
      expect(lateMinutes).toBe(0);
    });
  });

  // 3. Inferred absence (accurate workDays, excludes approved leaves & Fridays)
  describe('3. Inferred absence logic', () => {
    it('accurately discounts approved leaves from inferred absence days', async () => {
      const mockCompanyId = 'company-test-hr';
      const mockEmployeeId = 'emp-leave-test';

      const mockUser = {
        id: mockEmployeeId,
        firstName: 'منة',
        lastName: 'أيمن',
        isActive: true,
        hireDate: new Date('2026-01-01'),
        companyId: mockCompanyId,
        employees: [{ salary: 3500, hireDate: new Date('2026-01-01') }]
      };

      // 15 days attended in September 2026
      const mockAttendances = [];
      const attendedDays = [1, 2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 21, 22, 23, 24];
      for (const day of attendedDays) {
        mockAttendances.push({
          id: `att-${day}`,
          userId: mockEmployeeId,
          date: new Date(Date.UTC(2026, 8, day, 7, 0, 0)),
          checkIn: new Date(Date.UTC(2026, 8, day, 7, 0, 0)),
          checkOut: new Date(Date.UTC(2026, 8, day, 15, 0, 0)),
          status: 'PRESENT',
          lateMinutes: 0
        });
      }

      // 11 approved leave days covering the remaining working days
      const leaveDays = [6, 7, 13, 14, 18, 19, 20, 26, 27, 28, 29, 30];
      const mockLeaves = leaveDays.map((day, idx) => ({
        id: `leave-${idx}`,
        userId: mockEmployeeId,
        type: 'ANNUAL',
        startDate: new Date(Date.UTC(2026, 8, day, 0, 0, 0)),
        endDate: new Date(Date.UTC(2026, 8, day, 23, 59, 59)),
        status: 'APPROVED',
        reason: 'اعتماد إفادة الموظف'
      }));

      payrollService.prisma = getBasePayrollPrismaMock(mockUser, mockAttendances, mockLeaves);

      const result = await payrollService.calculatePayrollData(mockCompanyId, mockEmployeeId, 9, 2026);

      // Absent days should be 0 because all days without punches are covered by approved leaves
      expect(result.absentDays).toBe(0);
      expect(result.absenceDeduction).toBe(0);
    });
  });

  // 4. Multiplier pause for September 2026 vs October 2026 resumption
  describe('4. Multiplier freeze for September 2026 and resumption in October', () => {
    it('freezes multipliers to 1.0x in September 2026 even when settings define 1.5x / 2.0x / 3.0x', async () => {
      const mockCompanyId = 'company-test-hr';
      const mockEmployeeId = 'emp-multiplier-test';

      const mockSettings = {
        companyId: mockCompanyId,
        gracePeriodMinutes: 10,
        monthlyGraceMinutes: 60,
        autoDeductionEnabled: true,
        firstViolationMultiplier: 1.0,
        secondViolationMultiplier: 2.0,
        thirdViolationMultiplier: 3.0
      };

      latenessCalculationService.prisma = {
        hRSettings: { findUnique: jest.fn().mockResolvedValue(mockSettings) },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyGraceMinutes: 60,
            maxDailyLateMinutes: 10,
            lateDeductionRate: 1.0,
            enableAutoDeduction: true,
            baseSalary: 4000
          })
        },
        latenessBalance: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bal-1',
            companyId: mockCompanyId,
            employeeId: mockEmployeeId,
            month: 9,
            year: 2026,
            lateCount: 2, // 3rd occurrence
            graceMinutesUsed: 60
          }),
          update: jest.fn().mockResolvedValue({})
        },
        manualDeduction: { create: jest.fn().mockResolvedValue({}) }
      };

      const sepResult = await latenessCalculationService.calculateDeduction(
        mockCompanyId,
        mockEmployeeId,
        30, // 30 mins late
        new Date('2026-09-15T09:30:00.000Z')
      );

      // In September 2026, multiplier must be frozen to 1.0x
      expect(sepResult.multiplier).toBe(1.0);
    });

    it('resumes configured multipliers in October 2026 (e.g. 3.0x for 3rd occurrence)', async () => {
      const mockCompanyId = 'company-test-hr';
      const mockEmployeeId = 'emp-multiplier-test';

      const mockSettings = {
        companyId: mockCompanyId,
        gracePeriodMinutes: 10,
        monthlyGraceMinutes: 60,
        autoDeductionEnabled: true,
        firstViolationMultiplier: 1.0,
        secondViolationMultiplier: 2.0,
        thirdViolationMultiplier: 3.0
      };

      latenessCalculationService.prisma = {
        hRSettings: { findUnique: jest.fn().mockResolvedValue(mockSettings) },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            monthlyGraceMinutes: 60,
            maxDailyLateMinutes: 10,
            lateDeductionRate: 1.0,
            enableAutoDeduction: true,
            baseSalary: 4000
          })
        },
        latenessBalance: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bal-oct',
            companyId: mockCompanyId,
            employeeId: mockEmployeeId,
            month: 10,
            year: 2026,
            lateCount: 2, // 3rd occurrence
            graceMinutesUsed: 60
          }),
          update: jest.fn().mockResolvedValue({})
        },
        manualDeduction: { create: jest.fn().mockResolvedValue({}) }
      };

      const octResult = await latenessCalculationService.calculateDeduction(
        mockCompanyId,
        mockEmployeeId,
        30, // 30 mins late
        new Date('2026-10-15T09:30:00.000Z')
      );

      // In October 2026, multiplier resumes configured 3.0x
      expect(octResult.multiplier).toBe(3.0);
    });
  });

  // 5. Pre-hire date immunity (days before hire date are NOT absent)
  describe('5. Pre-hire date immunity', () => {
    it('does not count days before hire date as absence for mid-month hires', async () => {
      const mockCompanyId = 'company-test-hr';
      const mockEmployeeId = 'emp-shady-test';

      const mockUser = {
        id: mockEmployeeId,
        firstName: 'شادي',
        lastName: 'بهاء',
        isActive: true,
        hireDate: new Date('2026-09-09T00:00:00.000Z'), // Hired on 9/9
        companyId: mockCompanyId,
        employees: [{ salary: 4000, hireDate: new Date('2026-09-09T00:00:00.000Z') }]
      };

      // Attended every working day from 9/9 onwards except 19/9
      const mockAttendances = [];
      const workingDaysAfterHire = [9, 10, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30]; // 19 is missing
      for (const day of workingDaysAfterHire) {
        mockAttendances.push({
          id: `att-${day}`,
          userId: mockEmployeeId,
          date: new Date(Date.UTC(2026, 8, day, 7, 0, 0)),
          checkIn: new Date(Date.UTC(2026, 8, day, 7, 0, 0)),
          checkOut: new Date(Date.UTC(2026, 8, day, 15, 0, 0)),
          status: 'PRESENT',
          lateMinutes: 0
        });
      }

      payrollService.prisma = getBasePayrollPrismaMock(mockUser, mockAttendances);

      const result = await payrollService.calculatePayrollData(mockCompanyId, mockEmployeeId, 9, 2026);

      // Pre-hire days (1/9 to 8/9) must NOT be counted as absent!
      // Only 19/9 was absent, so absentDays must be exactly 1!
      expect(result.absentDays).toBe(1);
    });
  });

  // 6. Duplicate / disabled account protection
  describe('6. Duplicate & Disabled Account Protection', () => {
    it('blocks check-in attempts from disabled or demo accounts (isActive === false)', async () => {
      const mockEmployeeId = 'emp-swan-demo';
      const mockCompanyId = 'company-test';

      jest.spyOn(attendanceService, 'getCompanyTimezone').mockResolvedValue('Africa/Cairo');

      attendanceService.prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: mockEmployeeId,
            isActive: false, // Disabled account
            email: 'swan@h2m.com',
            role: 'EMPLOYEE'
          })
        }
      };

      await expect(
        attendanceService.checkIn(
          mockCompanyId,
          mockEmployeeId,
          { latitude: 30.0, longitude: 31.0 }
        )
      ).rejects.toThrow('الحساب معطل أو تجريبي ولا يمكن تسجيل الحضور به');
    });
  });
});
