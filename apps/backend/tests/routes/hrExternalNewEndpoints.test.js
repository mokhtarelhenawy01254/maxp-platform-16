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
});
