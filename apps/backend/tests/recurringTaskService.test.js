const recurringTaskService = require('../services/recurringTaskService');

describe('RecurringTaskService unit tests', () => {
  test('Daily recurrence adds 1 day by default', () => {
    const baseDate = new Date('2026-09-23T10:00:00Z');
    const rule = { enabled: true, frequency: 'daily', interval: 1, endType: 'never' };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).not.toBeNull();
    const expected = new Date('2026-09-24T10:00:00Z');
    expect(result.nextDueDate.toISOString()).toBe(expected.toISOString());
    expect(result.nextCount).toBe(2);
  });

  test('Daily recurrence with interval 3 days', () => {
    const baseDate = new Date('2026-09-23T10:00:00Z');
    const rule = { enabled: true, frequency: 'daily', interval: 3, endType: 'never' };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).not.toBeNull();
    const expected = new Date('2026-09-26T10:00:00Z');
    expect(result.nextDueDate.toISOString()).toBe(expected.toISOString());
  });

  test('Weekly recurrence with specified days of week', () => {
    // 2026-09-23 is Wednesday (day 3)
    const baseDate = new Date('2026-09-23T10:00:00Z');
    // Days: Thursday (4) and Sunday (0)
    const rule = { enabled: true, frequency: 'weekly', interval: 1, daysOfWeek: [0, 4], endType: 'never' };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).not.toBeNull();
    // Next day in week should be Thursday (2026-09-24)
    expect(result.nextDueDate.getDay()).toBe(4);
    expect(result.nextDueDate.getDate()).toBe(24);
  });

  test('Monthly recurrence advances by interval months', () => {
    const baseDate = new Date('2026-09-23T10:00:00Z');
    const rule = { enabled: true, frequency: 'monthly', interval: 1, dayOfMonth: 23, endType: 'never' };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).not.toBeNull();
    expect(result.nextDueDate.getMonth()).toBe(9); // October (0-indexed: 9)
    expect(result.nextDueDate.getDate()).toBe(23);
  });

  test('EndType count terminates when reaching endCount', () => {
    const baseDate = new Date('2026-09-23T10:00:00Z');
    const rule = { enabled: true, frequency: 'daily', interval: 1, endType: 'count', endCount: 3, currentCount: 3 };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).toBeNull();
  });

  test('EndType date terminates when exceeding endDate', () => {
    const baseDate = new Date('2026-09-23T10:00:00Z');
    const rule = { enabled: true, frequency: 'daily', interval: 1, endType: 'date', endDate: '2026-09-23' };
    const result = recurringTaskService.calculateNextDates(null, baseDate, rule);

    expect(result).toBeNull();
  });
});
