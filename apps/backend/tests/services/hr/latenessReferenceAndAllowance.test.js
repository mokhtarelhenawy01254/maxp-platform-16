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
});
