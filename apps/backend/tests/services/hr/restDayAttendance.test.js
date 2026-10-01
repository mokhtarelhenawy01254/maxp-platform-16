const { describe, it } = require('node:test');
const assert = require('node:assert');
const attendanceService = require('../../../services/hr/attendanceService');

describe('HR Weekly Rest Days & Overtime Attendance Logic', () => {
  describe('parseWorkAndRestDays', () => {
    it('should default to Saturday-Thursday working (0,1,2,3,4,6) and Friday (5) as rest day', () => {
      const { workDays, restDays } = attendanceService.parseWorkAndRestDays(null);
      assert.deepStrictEqual(workDays, [0, 1, 2, 3, 4, 6]);
      assert.deepStrictEqual(restDays, [5]);
    });

    it('should parse custom string JSON array', () => {
      const { workDays, restDays } = attendanceService.parseWorkAndRestDays('[1, 2, 3, 4, 5]');
      assert.deepStrictEqual(workDays, [1, 2, 3, 4, 5]);
      assert.deepStrictEqual(restDays, [0, 6]); // Sunday & Saturday rest
    });

    it('should parse day names if provided', () => {
      const { workDays, restDays } = attendanceService.parseWorkAndRestDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      assert.deepStrictEqual(workDays, [1, 2, 3, 4, 5]);
      assert.deepStrictEqual(restDays, [0, 6]);
    });
  });

  describe('isRestDay', () => {
    it('should identify Friday as a rest day for default H2m configuration', () => {
      const settings = { workDays: '[0, 1, 2, 3, 4, 6]' };
      // 2026-09-04 is a Friday
      const fridayDate = new Date('2026-09-04T12:00:00.000Z');
      const isRest = attendanceService.isRestDay(fridayDate, settings, 'Africa/Cairo');
      assert.strictEqual(isRest, true);
    });

    it('should identify Saturday as a normal working day for default H2m configuration', () => {
      const settings = { workDays: '[0, 1, 2, 3, 4, 6]' };
      // 2026-09-05 is a Saturday
      const saturdayDate = new Date('2026-09-05T08:00:00.000Z');
      const isRest = attendanceService.isRestDay(saturdayDate, settings, 'Africa/Cairo');
      assert.strictEqual(isRest, false);
    });
  });

  describe('classifyAttendanceRecord', () => {
    const defaultSettings = {
      workDays: '[0, 1, 2, 3, 4, 6]',
      workStartTime: '10:00',
      workEndTime: '18:00',
      lateGracePeriod: 15,
      earlyLeaveGracePeriod: 15,
      overtimeRate: 1.0,
    };

    it('Criterion 1 & 2: Rest day punch MUST be classified as OVERTIME with 0 late minutes and full work hours as overtime', () => {
      // Ali Wazery on Friday 2026-09-04: checkIn 15:00 Cairo (12:00Z), checkOut 20:30 Cairo (17:30Z) -> 5.5 hours
      const checkIn = new Date('2026-09-04T12:00:00.000Z');
      const checkOut = new Date('2026-09-04T17:30:00.000Z');

      const result = attendanceService.classifyAttendanceRecord({
        recordDate: checkIn,
        checkIn,
        checkOut,
        settings: defaultSettings,
        timezone: 'Africa/Cairo',
      });

      assert.strictEqual(result.isRestDay, true);
      assert.strictEqual(result.status, 'OVERTIME');
      assert.strictEqual(result.lateMinutes, 0);
      assert.strictEqual(result.earlyLeaveMinutes, 0);
      assert.strictEqual(result.workHours, 5.5);
      assert.strictEqual(result.overtimeHours, 5.5);
    });

    it('Criterion 6: Normal working day late punch MUST be classified as LATE with accurate late minutes and 0 overtime', () => {
      // Saturday 2026-09-05: checkIn 15:00 Cairo (12:00Z), checkOut 20:30 Cairo (17:30Z). Shift starts 10:00 -> 300 mins late
      const checkIn = new Date('2026-09-05T12:00:00.000Z');
      const checkOut = new Date('2026-09-05T17:30:00.000Z');

      const result = attendanceService.classifyAttendanceRecord({
        recordDate: checkIn,
        checkIn,
        checkOut,
        settings: defaultSettings,
        timezone: 'Africa/Cairo',
      });

      assert.strictEqual(result.isRestDay, false);
      assert.strictEqual(result.status, 'LATE');
      assert.strictEqual(result.lateMinutes, 300);
      assert.strictEqual(result.earlyLeaveMinutes, 0);
      assert.strictEqual(result.workHours, 5.5);
      assert.strictEqual(result.overtimeHours, 0);
    });

    it('Criterion 6: Normal working day on-time punch MUST be classified as PRESENT with 0 late minutes', () => {
      // Saturday 2026-09-05: checkIn 09:55 Cairo (06:55Z), checkOut 18:05 Cairo (15:05Z). Shift starts 10:00 -> On time
      const checkIn = new Date('2026-09-05T06:55:00.000Z');
      const checkOut = new Date('2026-09-05T15:05:00.000Z');

      const result = attendanceService.classifyAttendanceRecord({
        recordDate: checkIn,
        checkIn,
        checkOut,
        settings: defaultSettings,
        timezone: 'Africa/Cairo',
      });

      assert.strictEqual(result.isRestDay, false);
      assert.strictEqual(result.status, 'PRESENT');
      assert.strictEqual(result.lateMinutes, 0);
      assert.strictEqual(result.earlyLeaveMinutes, 0);
    });

    it('Criterion 4: Configurable rest days dynamically change classification', () => {
      // If company settings change workDays to [1, 2, 3, 4, 5] (Friday is working day, Sunday [0] is rest day):
      const customSettings = {
        ...defaultSettings,
        workDays: '[1, 2, 3, 4, 5]',
      };

      // Friday 2026-09-04 15:00 becomes LATE because Friday is now a working day:
      const fridayCheckIn = new Date('2026-09-04T12:00:00.000Z');
      const fridayResult = attendanceService.classifyAttendanceRecord({
        recordDate: fridayCheckIn,
        checkIn: fridayCheckIn,
        settings: customSettings,
        timezone: 'Africa/Cairo',
      });
      assert.strictEqual(fridayResult.isRestDay, false);
      assert.strictEqual(fridayResult.status, 'LATE');

      // Sunday 2026-09-06 15:00 becomes OVERTIME because Sunday is now a rest day:
      const sundayCheckIn = new Date('2026-09-06T12:00:00.000Z');
      const sundayCheckOut = new Date('2026-09-06T16:00:00.000Z');
      const sundayResult = attendanceService.classifyAttendanceRecord({
        recordDate: sundayCheckIn,
        checkIn: sundayCheckIn,
        checkOut: sundayCheckOut,
        settings: customSettings,
        timezone: 'Africa/Cairo',
      });
      assert.strictEqual(sundayResult.isRestDay, true);
      assert.strictEqual(sundayResult.status, 'OVERTIME');
      assert.strictEqual(sundayResult.lateMinutes, 0);
      assert.strictEqual(sundayResult.overtimeHours, 4);
    });
  });

  describe('Payroll Rest Day & Overtime Engine Logic', () => {
    const payrollService = require('../../../services/hr/payrollService');

    it('Criterion 1 & 3: Working days in September 2026 for [0,1,2,3,4,6] excludes 4 Fridays', () => {
      // Sep 2026 has 30 days: 4 Fridays (4, 11, 18, 25)
      const workingDays = payrollService.getWorkingDaysInMonth(2026, 9, null, [0, 1, 2, 3, 4, 6], []);
      assert.strictEqual(workingDays, 26);

      const workingDates = payrollService.getWorkingDaysDates(2026, 9, null, [0, 1, 2, 3, 4, 6], []);
      assert.strictEqual(workingDates.length, 26);
      assert.strictEqual(workingDates.includes('2026-09-04'), false); // Friday 4/9 is NOT in working days!
      assert.strictEqual(workingDates.includes('2026-09-05'), true);  // Saturday 5/9 IS a working day!
    });

    it('Criterion 2, 3 & 5: Rest day attendance excluded from late minutes and counted in overtime', () => {
      const workingDaysConfig = [0, 1, 2, 3, 4, 6];
      // Simulated attendance records for Ali Wazery in Sep 2026:
      // 10 working days with 550 total late minutes
      // 1 Friday record (2026-09-04) with 5.5 hours overtime and 0 late minutes (corrected)
      const attendance = [
        { date: '2026-09-01', status: 'LATE', lateMinutes: 60, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-02', status: 'LATE', lateMinutes: 50, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-03', status: 'LATE', lateMinutes: 40, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-04', status: 'OVERTIME', lateMinutes: 0, workHours: 5.5, overtimeHours: 5.5 }, // Friday
        { date: '2026-09-05', status: 'LATE', lateMinutes: 70, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-06', status: 'LATE', lateMinutes: 50, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-07', status: 'LATE', lateMinutes: 60, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-08', status: 'LATE', lateMinutes: 50, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-09', status: 'LATE', lateMinutes: 50, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-10', status: 'LATE', lateMinutes: 60, workHours: 8, overtimeHours: 0 },
        { date: '2026-09-12', status: 'LATE', lateMinutes: 60, workHours: 8, overtimeHours: 0 },
      ];

      // Late occurrences: only working days with lateMinutes > 0 or status LATE
      const lateOccurrences = attendance.filter(a => {
        if (a.status === 'OVERTIME') return false;
        const recordDate = new Date(a.date);
        if (!workingDaysConfig.includes(recordDate.getDay())) return false;
        return (a.lateMinutes > 0 || a.status === 'LATE');
      });

      assert.strictEqual(lateOccurrences.length, 10); // Exactly 10 days! Friday 4/9 excluded!

      // Total late minutes:
      const totalLateMinutes = attendance.reduce((sum, a) => {
        if (a.status === 'OVERTIME') return sum;
        const recordDate = new Date(a.date);
        if (!workingDaysConfig.includes(recordDate.getDay())) return sum;
        return sum + (a.lateMinutes || 0);
      }, 0);

      assert.strictEqual(totalLateMinutes, 550); // Exactly 550 minutes! (NOT 850)

      // Total overtime hours:
      const totalOvertimeHours = attendance.reduce((sum, a) =>
        sum + (parseFloat(a.overtimeHours) || 0), 0
      );

      assert.strictEqual(totalOvertimeHours, 5.5); // Exactly 5.5 hours!
    });
  });
});
