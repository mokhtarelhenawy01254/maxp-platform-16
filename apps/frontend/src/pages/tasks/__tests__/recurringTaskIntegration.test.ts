import { Task, RecurringRuleConfig } from '../types';

describe('Recurring Task Frontend integration types & serialization', () => {
  it('correctly serializes recurring config into JSON rule string', () => {
    const config: RecurringRuleConfig = {
      frequency: 'daily',
      interval: 2,
      endType: 'count',
      endCount: 5,
    };

    const serialized = JSON.stringify(config);
    expect(serialized).toContain('"frequency":"daily"');
    expect(serialized).toContain('"interval":2');

    const parsed: RecurringRuleConfig = JSON.parse(serialized);
    expect(parsed.frequency).toBe('daily');
    expect(parsed.interval).toBe(2);
    expect(parsed.endCount).toBe(5);
  });

  it('validates task model accepts isRecurring and recurringRule', () => {
    const task: Task = {
      id: 'task-test-1',
      title: 'مهمة يومية متكررة',
      status: 'PENDING',
      priority: 'HIGH',
      isRecurring: true,
      recurringRule: JSON.stringify({ frequency: 'daily', interval: 1, endType: 'never' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(task.isRecurring).toBe(true);
    expect(typeof task.recurringRule).toBe('string');
    const rule = JSON.parse(task.recurringRule!);
    expect(rule.frequency).toBe('daily');
  });
});
