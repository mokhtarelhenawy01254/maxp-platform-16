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
});
