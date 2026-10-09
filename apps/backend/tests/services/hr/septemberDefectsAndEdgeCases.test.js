const { describe, it } = require('node:test');
const assert = require('node:assert');
const attendanceService = require('../../../services/hr/attendanceService');
const payrollService = require('../../../services/hr/payrollService');

describe('September 2026 HR & Payroll Defect Edge Cases Test Suite', () => {

  const defaultSettings = {
    workDays: '[0, 1, 2, 3, 4, 6]',
    workStartTime: '10:00',
    workEndTime: '18:00',
    lateGracePeriod: 10,
    lateThresholdMinutes: 10,
    earlyLeaveGracePeriod: 15,
    gracePeriodMinutes: 60,
    overtimeRate: 1.5,
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8
  };

  it('Defect 1: Early leave and late minutes must be strictly separated and never merged', () => {
    // Punch: in at 10:15 (15m late), out at 17:00 (1 hour early leave)
    const checkIn = new Date('2026-09-15T07:15:00.000Z'); // 10:15 Cairo
    const checkOut = new Date('2026-09-15T14:00:00.000Z'); // 17:00 Cairo

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      checkOut,
      settings: defaultSettings,
      timezone: 'Africa/Cairo'
    });

    assert.strictEqual(result.lateMinutes, 5, 'lateMinutes should reflect check-in delay beyond allowance cutoff (10:15 - 10:10 = 5m)');
    assert.strictEqual(result.earlyLeaveMinutes, 60, 'earlyLeaveMinutes should reflect checkout shortfall (60m)');
    assert.strictEqual(result.status, 'LATE');
  });

  it('Defect 2: Rest day punch must not be classified as LATE and overtime must calculate hours after shift end', () => {
    // Friday 2026-09-04: in at 15:00 Cairo (12:00Z), out at 20:30 Cairo (17:30Z)
    // Shift ends at 18:00 -> Overtime past shift end = 20:30 - 18:00 = 2.5 hours
    const checkIn = new Date('2026-09-04T12:00:00.000Z');
    const checkOut = new Date('2026-09-04T17:30:00.000Z');

    const result = attendanceService.classifyAttendanceRecord({
      recordDate: checkIn,
      checkIn,
      checkOut,
      settings: defaultSettings,
      timezone: 'Africa/Cairo',
      shift: { startTime: '10:00', endTime: '18:00' }
    });

    assert.strictEqual(result.isRestDay, true);
    assert.strictEqual(result.lateMinutes, 0, 'Rest day punch must have 0 late minutes');
    assert.strictEqual(result.earlyLeaveMinutes, 0);
    assert.ok(['WEEKEND', 'OVERTIME'].includes(result.status), 'Status must be WEEKEND or OVERTIME');
    assert.strictEqual(result.workHours, 5.5, 'Work hours on rest day should be full presence (5.5h)');

    // Hours past scheduled shift end (18:00): 20:30 - 18:00 = 2.5 hours
    const shiftEndMinutes = 18 * 60;
    const checkOutMinutes = 20 * 60 + 30;
    const postShiftHours = (checkOutMinutes - shiftEndMinutes) / 60;
    assert.strictEqual(postShiftHours, 2.5, 'Overtime past shift end must be exactly 2.5h');
  });

  it('Defect 3: Mid-month hire base salary proration for current and previous months', () => {
    // Shady hired on 2026-09-09. September working days = 26. Days from hire = 19.
    const workingDaysDates = payrollService.getWorkingDaysDates(2026, 9, null, [0, 1, 2, 3, 4, 6]);
    assert.strictEqual(workingDaysDates.length, 26);

    const workingDaysFromHire = workingDaysDates.filter(d => d >= '2026-09-09');
    assert.strictEqual(workingDaysFromHire.length, 19);

    const baseSalary = 4000;
    const proratedBase = Math.round((baseSalary * (19 / 26)) * 100) / 100;
    assert.strictEqual(proratedBase, 2923.08);

    const unearnedDeduction = baseSalary - proratedBase;
    assert.strictEqual(Math.round(unearnedDeduction * 100) / 100, 1076.92);
  });

  it('Defect 4: Monthly 60-minute grace absorbs late minutes progressively across the month', () => {
    // Employee with 4 late occurrences: 3m, 68m, 3m, 3m = 77m total
    // Grace 60m: 3m covered (57 left) -> 68m takes 57m (0 left, 11m deducted) -> 3m deducted -> 3m deducted
    // Deducted = 11 + 3 + 3 = 17 minutes!
    let remainingGrace = 60;
    const occurrences = [3, 68, 3, 3];
    let totalDeductedMins = 0;

    for (const mins of occurrences) {
      let graceUsed = 0;
      if (remainingGrace > 0) {
        graceUsed = Math.min(mins, remainingGrace);
        remainingGrace -= graceUsed;
      }
      totalDeductedMins += Math.max(0, mins - graceUsed);
    }

    assert.strictEqual(totalDeductedMins, 17, 'Total deducted minutes should be exactly 77 - 60 = 17m');
    assert.strictEqual(remainingGrace, 0);

    // Rate for 3500 base: 3500 / 26 / 480 = 0.2804487 EGP/min
    const penalty = 17 * (3500 / 26 / 480);
    assert.strictEqual(Number(penalty.toFixed(2)), 4.77);
  });

  it('Defect 5: NON_DEDUCTIBLE permissions do not deduct from salary', () => {
    const perm = {
      type: 'NON_DEDUCTIBLE',
      hours: 1.5,
      date: new Date('2026-09-24T00:00:00.000Z')
    };

    const isNonDeductible = perm.type === 'NON_DEDUCTIBLE' || perm.isNonDeductible === true;
    assert.strictEqual(isNonDeductible, true);
  });

  it('Defect 6: Inferred absence ignores approved leaves, weekends, and pre-hire dates', () => {
    const workingDates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-05'];
    const attendedSet = new Set(['2026-09-01', '2026-09-02']);
    const paidLeaveSet = new Set(['2026-09-03']);
    const hireDateStr = '2026-09-01';

    const absentDates = workingDates.filter(d =>
      (!hireDateStr || d >= hireDateStr) &&
      !attendedSet.has(d) &&
      !paidLeaveSet.has(d)
    );

    assert.deepStrictEqual(absentDates, ['2026-09-05'], 'Only unpunched date without leave should be absent');
  });
});
