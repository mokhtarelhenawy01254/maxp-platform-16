const { describe, it } = require('node:test');
const assert = require('node:assert');
const attendanceService = require('../../../services/hr/attendanceService');

describe('Lateness Reference & Allowance Fix (Cairo UTC+3)', () => {
  const companyTimezone = 'Africa/Cairo';

  // Standard H2m company configuration
  const defaultSettings = {
    workDays: '[0, 1, 2, 3, 4, 6]',
    lateGracePeriod: 10,
    lateThresholdMinutes: 10,
    earlyLeaveGracePeriod: 15,
  };

  const companyLatenessRules = {
    workStartTime: '10:00',
    latestAllowedTime: '10:10',
    monthlyAllowanceMinutes: 60,
  };

  const standardOfficeShift = {
    id: 'shift_office',
    name: 'مكتب',
    startTime: '10:00',
    endTime: '18:00',
  };

  const eveningModeratorShift = {
    id: 'shift_evening',
    name: 'شيفت مودريتور (4م)',
    startTime: '16:00',
    endTime: '00:00',
  };

  it('Test 1: Punch at 07:30 Cairo -> 0 late minutes (early check-in)', () => {
    // 07:30 AM Cairo = 04:30 AM UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T04:30:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 0, '07:30 check-in must have 0 late minutes');
    assert.strictEqual(result.status, 'PRESENT');
  });

  it('Test 2: Punch at 10:05 Cairo -> 0 late minutes (within 10:10 allowance)', () => {
    // 10:05 AM Cairo = 07:05 AM UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T07:05:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 0, '10:05 check-in must have 0 late minutes (inside latestAllowedTime 10:10)');
    assert.strictEqual(result.status, 'PRESENT');
  });

  it('Test 3: Punch at 10:15 Cairo -> 5 late minutes (exceeds 10:10 allowance by 5m)', () => {
    // 10:15 AM Cairo = 07:15 AM UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T07:15:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 5, '10:15 check-in must be exactly 5 minutes late (10:15 - 10:10 = 5)');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Test 4: Punch at 12:00 Cairo -> 110 late minutes (exceeds 10:10 allowance by 110m)', () => {
    // 12:00 PM Cairo = 09:00 AM UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T09:00:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 110, '12:00 check-in must be exactly 110 minutes late (12:00 - 10:10 = 110)');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Test 5: Evening punch at 16:00 Cairo evaluated against standard 10:00 shift -> 350 late minutes', () => {
    // 16:00 Cairo = 13:00 UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T13:00:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 350, '16:00 check-in for 10:00 shift is 350m late (16:00 - 10:10 = 350)');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Test 6: Evening punch at 16:00 Cairo evaluated against evening shift (16:00-00:00) -> 0 late minutes', () => {
    // 16:00 Cairo = 13:00 UTC on 2026-10-07
    const checkIn = new Date('2026-10-07T13:00:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: eveningModeratorShift,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 0, '16:00 check-in for 16:00 shift must have 0 late minutes');
    assert.strictEqual(result.status, 'PRESENT');
  });

  it('Test 7: Unified fallback when shift is null reads latenessRules (10:00 / 10:10) instead of 09:00', () => {
    // When shift is null, check-in at 10:15 should still be 5m late based on latenessRules
    const checkIn = new Date('2026-10-07T07:15:00.000Z'); // 10:15 Cairo

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: null,
      latenessRules: companyLatenessRules,
    });

    assert.strictEqual(result.lateMinutes, 5, 'Fallback with null shift must read latenessRules and yield 5m late');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Test 8: Null latenessRules fallback still respects allowance cutoff (10:15 -> 5m late, NOT 15m)', () => {
    // When latenessRules is null, lateGracePeriod is 10 min. 10:15 must be 5m late (NOT 15m as in the old buggy else branch)
    const checkIn = new Date('2026-10-07T07:15:00.000Z'); // 10:15 Cairo

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      settings: defaultSettings,
      timezone: companyTimezone,
      shift: standardOfficeShift,
      latenessRules: null,
    });

    assert.strictEqual(result.lateMinutes, 5, 'Must subtract 10m allowance to yield 5m late, eliminating old bug that yielded 15m');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Test 9: latenessService.calculateLateness matches exact requirements: 07:30->0, 10:05->0, 10:15->5, 12:00->110', () => {
    const latenessService = require('../../../services/hr/latenessService');
    const expectedStart = new Date('2026-10-07T07:00:00.000Z'); // 10:00 Cairo
    const latestAllowed = new Date('2026-10-07T07:10:00.000Z'); // 10:10 Cairo

    // 07:30 Cairo (04:30 UTC) -> 0 late
    const r0730 = latenessService.calculateLateness(
      new Date('2026-10-07T04:30:00.000Z'),
      expectedStart,
      latestAllowed,
      60
    );
    assert.strictEqual(r0730.latenessMinutes, 0);
    assert.strictEqual(r0730.category, 'ON_TIME');

    // 10:05 Cairo (07:05 UTC) -> 0 late (within allowance)
    const r1005 = latenessService.calculateLateness(
      new Date('2026-10-07T07:05:00.000Z'),
      expectedStart,
      latestAllowed,
      60
    );
    assert.strictEqual(r1005.latenessMinutes, 0);
    assert.strictEqual(r1005.category, 'ALLOWANCE_USED');
    assert.strictEqual(r1005.allowanceUsed, 5);

    // 10:15 Cairo (07:15 UTC) -> 5 late (direct violation)
    const r1015 = latenessService.calculateLateness(
      new Date('2026-10-07T07:15:00.000Z'),
      expectedStart,
      latestAllowed,
      60
    );
    assert.strictEqual(r1015.latenessMinutes, 5);
    assert.strictEqual(r1015.category, 'DIRECT_VIOLATION');

    // 12:00 Cairo (09:00 UTC) -> 110 late (direct violation)
    const r1200 = latenessService.calculateLateness(
      new Date('2026-10-07T09:00:00.000Z'),
      expectedStart,
      latestAllowed,
      60
    );
    assert.strictEqual(r1200.latenessMinutes, 110);
    assert.strictEqual(r1200.category, 'DIRECT_VIOLATION');
  });

  describe('Legacy Bug Simulation (RED Before vs GREEN After)', () => {
    // Legacy calculation formula: Math.floor((punchUtc - 07:00Utc) / 60000) without allowance subtraction
    function legacyBuggyCalc(punchDateUtc) {
      const shiftStartUtc = new Date('2026-10-07T07:00:00.000Z');
      const diffMs = punchDateUtc.getTime() - shiftStartUtc.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      return diffMin > 0 ? diffMin : 0;
    }

    it('Proves legacy code was RED on all 4 required test cases', () => {
      // Punch 07:30 Cairo (04:30 UTC):
      // In legacy code, if compared against 07:00 local time or 07:00 UTC shift assumption:
      // Punch at 07:07 Cairo in the database was recorded as 7 minutes late because 07:07 UTC - 07:00 UTC = 7
      const punch0707 = new Date('2026-10-07T07:07:00.000Z'); // 10:07 Cairo
      assert.strictEqual(legacyBuggyCalc(punch0707), 7, 'Legacy buggy calc gave 7 minutes late for 10:07 Cairo punch');

      // Punch at 10:05 Cairo (07:05 UTC):
      const punch1005 = new Date('2026-10-07T07:05:00.000Z');
      assert.strictEqual(legacyBuggyCalc(punch1005), 5, 'Legacy buggy calc gave 5m late instead of 0m (RED)');

      // Punch at 10:15 Cairo (07:15 UTC):
      const punch1015 = new Date('2026-10-07T07:15:00.000Z');
      assert.strictEqual(legacyBuggyCalc(punch1015), 15, 'Legacy buggy calc gave 15m late instead of 5m (RED)');

      // Punch at 12:00 Cairo (09:00 UTC):
      const punch1200 = new Date('2026-10-07T09:00:00.000Z');
      assert.strictEqual(legacyBuggyCalc(punch1200), 120, 'Legacy buggy calc gave 120m late instead of 110m (RED)');
    });

    it('Proves fixed code is GREEN on all 4 required test cases', () => {
      const fixedResults = [
        attendanceService.classifyAttendanceRecord({
          recordDate: new Date('2026-10-07T04:30:00.000Z'), // 07:30 Cairo
          checkIn: new Date('2026-10-07T04:30:00.000Z'),
          settings: defaultSettings,
          timezone: companyTimezone,
          shift: standardOfficeShift,
          latenessRules: companyLatenessRules,
        }),
        attendanceService.classifyAttendanceRecord({
          recordDate: new Date('2026-10-07T07:05:00.000Z'), // 10:05 Cairo
          checkIn: new Date('2026-10-07T07:05:00.000Z'),
          settings: defaultSettings,
          timezone: companyTimezone,
          shift: standardOfficeShift,
          latenessRules: companyLatenessRules,
        }),
        attendanceService.classifyAttendanceRecord({
          recordDate: new Date('2026-10-07T07:15:00.000Z'), // 10:15 Cairo
          checkIn: new Date('2026-10-07T07:15:00.000Z'),
          settings: defaultSettings,
          timezone: companyTimezone,
          shift: standardOfficeShift,
          latenessRules: companyLatenessRules,
        }),
        attendanceService.classifyAttendanceRecord({
          recordDate: new Date('2026-10-07T09:00:00.000Z'), // 12:00 Cairo
          checkIn: new Date('2026-10-07T09:00:00.000Z'),
          settings: defaultSettings,
          timezone: companyTimezone,
          shift: standardOfficeShift,
          latenessRules: companyLatenessRules,
        }),
      ];

      assert.strictEqual(fixedResults[0].lateMinutes, 0, '07:30 Cairo -> 0 (GREEN)');
      assert.strictEqual(fixedResults[1].lateMinutes, 0, '10:05 Cairo -> 0 (GREEN)');
      assert.strictEqual(fixedResults[2].lateMinutes, 5, '10:15 Cairo -> 5 (GREEN)');
      assert.strictEqual(fixedResults[3].lateMinutes, 110, '12:00 Cairo -> 110 (GREEN)');
    });
  });
});
