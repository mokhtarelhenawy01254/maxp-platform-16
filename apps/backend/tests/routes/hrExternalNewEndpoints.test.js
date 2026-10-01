const hrExternalController = require('../../controller/hr/hrExternalController');
const { getDateStringInTimezone } = require('../../utils/dateUtils');

describe('HR External API — New Endpoints & Timezone Fix Unit Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      companyId: 'test-company-123',
      company: { id: 'test-company-123', name: 'Test Co', timezone: 'Africa/Cairo' },
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Item 1: Attendance Today Timezone Fix', () => {
    test('getDateStringInTimezone resolves Cairo date correctly during midnight hours', () => {
      // At 22:30 UTC on Sep 29, it is 01:30 Cairo time on Sep 30 (UTC+3)
      const lateUtc = new Date('2026-09-29T22:30:00.000Z');
      const cairoDay = getDateStringInTimezone(lateUtc, 'Africa/Cairo');
      expect(cairoDay).toBe('2026-09-30');
    });

    test('getTodayAttendance returns 400 when date parameter is invalid', async () => {
      mockReq.query.date = 'invalid-not-a-date';
      await hrExternalController.getTodayAttendance(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'INVALID_DATE' })
        })
      );
    });
  });

  describe('Item 2: New Read Endpoints Structure', () => {
    test('All 4 new endpoints are exported as functions', () => {
      expect(typeof hrExternalController.listAdvances).toBe('function');
      expect(typeof hrExternalController.listDeductions).toBe('function');
      expect(typeof hrExternalController.listWarnings).toBe('function');
      expect(typeof hrExternalController.listResignations).toBe('function');
    });
  });

  describe('Item 3: Enum Validations on Write Routes', () => {
    test('upsertEmployee rejects invalid status with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.body = {
        employeeNumber: 'EMP999',
        firstName: 'Test',
        lastName: 'User',
        status: 'INACTIVE'
      };
      await hrExternalController.upsertEmployee(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('INACTIVE'),
            allowedValues: expect.arrayContaining(['ACTIVE', 'PROBATION', 'TERMINATED'])
          })
        })
      );
    });

    test('createLeaveRequest rejects invalid leave type with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.body = {
        employeeNumber: 'EMP999',
        type: 'VACATION',
        startDate: '2026-10-01',
        endDate: '2026-10-05'
      };
      await hrExternalController.createLeaveRequest(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('VACATION'),
            allowedValues: expect.arrayContaining(['ANNUAL', 'SICK', 'UNPAID'])
          })
        })
      );
    });

    test('createDeduction rejects invalid deduction type with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.body = {
        employeeNumber: 'EMP999',
        amount: 150,
        reason: 'Late penalty',
        type: 'INVALID_PENALTY'
      };
      await hrExternalController.createDeduction(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            allowedValues: expect.arrayContaining(['PENALTY', 'VIOLATION', 'OTHER'])
          })
        })
      );
    });

    test('createReward rejects invalid reward category with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.body = {
        employeeCode: 'EMP999',
        rewardName: 'Best Employee',
        amount: 500,
        rewardCategory: 'SUPER_HERO'
      };
      await hrExternalController.createReward(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            allowedValues: expect.arrayContaining(['PERFORMANCE', 'ATTENDANCE', 'OTHER'])
          })
        })
      );
    });

    test('createShift rejects invalid time format with 400 VALIDATION_ERROR', async () => {
      mockReq.body = {
        name: 'Morning Shift',
        startTime: '9 AM',
        endTime: '17:00'
      };
      await hrExternalController.createShift(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    test('updateAttendanceRecord rejects invalid status with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.params = { id: 'att-123' };
      mockReq.body = { status: 'NOT_HERE' };
      await hrExternalController.updateAttendanceRecord(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            allowedValues: expect.arrayContaining(['PRESENT', 'ABSENT', 'LATE'])
          })
        })
      );
    });

    test('updateAttendanceRecord rejects invalid checkIn time format with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'att-123' };
      mockReq.body = { checkIn: 'invalid-time' };
      await hrExternalController.updateAttendanceRecord(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('checkIn')
          })
        })
      );
    });

    test('updateAttendanceRecord rejects invalid checkOut time format with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'att-123' };
      mockReq.body = { checkOut: '25:00' };
      await hrExternalController.updateAttendanceRecord(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('checkOut')
          })
        })
      );
    });
  });

  describe('Item 4: New Management Endpoints Export Verification', () => {
    test('All 11 management endpoints are exported as functions', () => {
      expect(typeof hrExternalController.getHRSettings).toBe('function');
      expect(typeof hrExternalController.updateHRSettings).toBe('function');
      expect(typeof hrExternalController.createDeduction).toBe('function');
      expect(typeof hrExternalController.updateDeduction).toBe('function');
      expect(typeof hrExternalController.listRewards).toBe('function');
      expect(typeof hrExternalController.createReward).toBe('function');
      expect(typeof hrExternalController.listShifts).toBe('function');
      expect(typeof hrExternalController.createShift).toBe('function');
      expect(typeof hrExternalController.updateShift).toBe('function');
      expect(typeof hrExternalController.assignEmployeeShift).toBe('function');
      expect(typeof hrExternalController.updateAttendanceRecord).toBe('function');
    });
  });

  describe('Item 5: Audit Logging Attribution & Dual-Signature Resilience', () => {
    const { logExternalApiAction } = require('../../services/hrIntegrationService');

    test('logExternalApiAction populates action, targetType, targetId, and targetName with single object', async () => {
      const mockPrisma = {
        activityLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };

      const fakeReq = {
        companyId: 'company-xyz',
        hrCredential: { id: 'cred-123', name: 'H2M Client Key', keyPrefix: 'hrk_h2m' },
        originalUrl: '/api/v1/external/hr/settings'
      };

      await logExternalApiAction(mockPrisma, {
        req: fakeReq,
        action: 'UPDATE_SETTINGS',
        resourceType: 'HRSettings',
        resourceId: 'setting-99',
        targetName: 'HR Settings',
        details: { sectionsUpdated: ['workHours'] }
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-xyz',
          category: 'HR_EXTERNAL_API',
          action: 'UPDATE_SETTINGS',
          targetType: 'HRSettings',
          targetId: 'setting-99',
          targetName: 'HR Settings',
          isLocked: true
        })
      });
    });

    test('logExternalApiAction populates correctly when called as (req, options)', async () => {
      const mockPrisma = {
        activityLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };

      const fakeReq = {
        companyId: 'company-abc',
        externalApiCredential: { id: 'cred-456', name: '000 Key', keyPrefix: 'hrk_000' },
        method: 'POST',
        headers: { host: 'api.maxp.online' },
        originalUrl: '/api/v1/external/hr/deductions'
      };

      await logExternalApiAction(fakeReq, {
        prisma: mockPrisma,
        action: 'CREATE_DEDUCTION',
        resourceType: 'ManualDeduction',
        resourceId: 'ded-77',
        targetName: 'Late deduction',
        details: { amount: 150 }
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-abc',
          category: 'HR_EXTERNAL_API',
          action: 'CREATE_DEDUCTION',
          targetType: 'ManualDeduction',
          targetId: 'ded-77',
          targetName: 'Late deduction'
        })
      });
    });
  });

  describe('Item 6: Phase 4 Endpoints Structure & Validations', () => {
    test('All Phase 4 endpoints are exported as functions', () => {
      expect(typeof hrExternalController.createEmployee).toBe('function');
      expect(typeof hrExternalController.updateEmployee).toBe('function');
      expect(typeof hrExternalController.terminateEmployee).toBe('function');
      expect(typeof hrExternalController.listRewardTypes).toBe('function');
      expect(typeof hrExternalController.createRewardType).toBe('function');
      expect(typeof hrExternalController.updateRewardType).toBe('function');
      expect(typeof hrExternalController.getRewardSettings).toBe('function');
      expect(typeof hrExternalController.updateRewardSettings).toBe('function');
      expect(typeof hrExternalController.evaluateRewardType).toBe('function');
    });

    test('createEmployee rejects negative baseSalary with 400 VALIDATION_ERROR', async () => {
      mockReq.body = {
        employeeNumber: 'EMP-P4-01',
        firstName: 'Test',
        lastName: 'Employee',
        baseSalary: -500
      };
      await hrExternalController.createEmployee(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    test('updateEmployee rejects negative baseSalary with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'emp-123' };
      mockReq.body = { baseSalary: -100 };
      await hrExternalController.updateEmployee(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    test('createEmployee rejects invalid contractType with 400 VALIDATION_ERROR and allowed values', async () => {
      mockReq.body = {
        employeeNumber: 'EMP-P4-02',
        firstName: 'Test',
        lastName: 'Employee',
        contractType: 'FREELANCE_INVALID'
      };
      await hrExternalController.createEmployee(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            allowedValues: expect.arrayContaining(['FULL_TIME', 'PART_TIME', 'CONTRACT'])
          })
        })
      );
    });

    test('evaluateRewardType rejects invalid month with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'rt-123' };
      mockReq.query = { month: '13', year: '2026' };
      await hrExternalController.evaluateRewardType(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });
  });

  describe('Item 7: Attendance Commitment Bonus & Reward Rules Engine', () => {
    test('All 5 reward rules endpoints are exported as functions', () => {
      expect(typeof hrExternalController.listRewardRules).toBe('function');
      expect(typeof hrExternalController.getRewardRuleById).toBe('function');
      expect(typeof hrExternalController.createRewardRule).toBe('function');
      expect(typeof hrExternalController.updateRewardRule).toBe('function');
      expect(typeof hrExternalController.evaluateRewardRule).toBe('function');
    });

    test('createRewardRule rejects missing name with 400 VALIDATION_ERROR', async () => {
      mockReq.body = { value: 1000, maxAllowedAbsenceDays: 2 };
      await hrExternalController.createRewardRule(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('name') })
        })
      );
    });

    test('createRewardRule rejects zero or negative value with 400 VALIDATION_ERROR', async () => {
      mockReq.body = { name: 'مكافأة الالتزام بالدوام', value: -100, maxAllowedAbsenceDays: 2 };
      await hrExternalController.createRewardRule(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('positive') })
        })
      );
    });

    test('createRewardRule rejects negative maxAllowedAbsenceDays with 400 VALIDATION_ERROR', async () => {
      mockReq.body = { name: 'مكافأة الالتزام بالدوام', value: 1000, maxAllowedAbsenceDays: -1 };
      await hrExternalController.createRewardRule(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('maxAllowedAbsenceDays') })
        })
      );
    });

    test('evaluateRewardRule rejects invalid month string with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'rule-123' };
      mockReq.query = { month: '2026-15' };
      await hrExternalController.evaluateRewardRule(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });
  });

  describe('Post-Deployment Fixes: Void Reward, Settings & Attendance Conditions', () => {
    test('voidReward rejects missing reason with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'rec-123' };
      mockReq.body = {};
      await hrExternalController.voidReward(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('reason') })
        })
      );
    });

    test('rewardEligibilityService._hasAttendanceConditions recognizes maxAllowedAbsenceDays and ATTENDANCE_COMMITMENT', () => {
      const rewardEligibilityService = require('../../services/hr/rewardEligibilityService');
      expect(rewardEligibilityService._hasAttendanceConditions({ maxAllowedAbsenceDays: 2 })).toBe(true);
      expect(rewardEligibilityService._hasAttendanceConditions({ type: 'ATTENDANCE_COMMITMENT' })).toBe(true);
      expect(rewardEligibilityService._hasAttendanceConditions({ randomKey: true })).toBe(false);
    });

    test('getRewardTypeById is exported as a controller function', () => {
      expect(typeof hrExternalController.getRewardTypeById).toBe('function');
    });

    test('rewardEligibilityService rejects non-targeted employee with targetMismatch', async () => {
      const rewardEligibilityService = require('../../services/hr/rewardEligibilityService');
      rewardEligibilityService._mockPrisma = {
        rewardType: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'rule-target-1',
            companyId: 'company-1',
            isActive: true,
            eligibilityConditions: JSON.stringify({
              targetUserId: 'target-user-ali',
              maxAllowedAbsenceDays: 2
            })
          })
        },
        employee: {
          findFirst: jest.fn().mockResolvedValue(null)
        }
      };

      const result = await rewardEligibilityService.evaluateEligibility(
        'company-1',
        'different-user-habiba',
        'rule-target-1',
        new Date('2026-09-01'),
        new Date('2026-09-30')
      );

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('القاعدة مخصصة لموظف آخر');
      expect(result.details.targetMismatch).toBe(true);
      rewardEligibilityService._mockPrisma = null;
    });
  });

  describe('Item 8: Attendance Summary Filtering & Void Attendance Record', () => {
    test('voidAttendanceRecord is exported as a function', () => {
      expect(typeof hrExternalController.voidAttendanceRecord).toBe('function');
    });

    test('voidAttendanceRecord returns 400 VALIDATION_ERROR when reason is missing', async () => {
      mockReq.params = { id: 'att-123' };
      mockReq.body = {};
      await hrExternalController.voidAttendanceRecord(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    test('updateAttendanceRecord rejects invalid date format with 400 VALIDATION_ERROR', async () => {
      mockReq.params = { id: 'att-123' };
      mockReq.body = { date: 'invalid-date-format' };
      await hrExternalController.updateAttendanceRecord(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });
  });

  describe('Item 9: Read-Only Payroll Preview & Dry-Run Runs', () => {
    test('previewPayroll and createPayrollRun are exported as functions', () => {
      expect(typeof hrExternalController.previewPayroll).toBe('function');
      expect(typeof hrExternalController.createPayrollRun).toBe('function');
    });

    test('previewPayroll returns 400 VALIDATION_ERROR when month or year is missing', async () => {
      mockReq.query = {};
      mockReq.body = {};
      await hrExternalController.previewPayroll(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    test('createPayrollRun returns 400 when month or year is missing and dryRun is false', async () => {
      mockReq.query = {};
      mockReq.body = {};
      await hrExternalController.createPayrollRun(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });
  });
});

