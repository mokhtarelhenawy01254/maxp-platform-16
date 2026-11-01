/**
 * Unit tests — حارس التكرار الدوري (Task c0266d2e).
 * المرافق: apps/backend/services/recurrenceGuard.js
 *
 * الحالة المرجعية: مهمة متكررة بتترجع تاني بعد كل اعتماد.
 */

const { findExistingSuccessor } = require('../../services/recurrenceGuard');

const source = {
  id: 'task-1',
  title: 'لينك المحادثة',
  startDate: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('recurrence guard (task c0266d2e)', () => {
  it('allows spawning when there is no successor yet', () => {
    const result = findExistingSuccessor(source, []);
    expect(result.hasSuccessor).toBe(false);
    expect(result.successor).toBeNull();
  });

  it('blocks spawning when a PENDING successor already exists', () => {
    const result = findExistingSuccessor(source, [
      { id: 'task-2', status: 'PENDING', startDate: '2026-10-08T00:00:00.000Z' },
    ]);

    expect(result.hasSuccessor).toBe(true);
    expect(result.successor.id).toBe('task-2');
  });

  it('blocks spawning when the successor is already COMPLETED (السبب الأصلي للتكرار)', () => {
    const result = findExistingSuccessor(source, [
      { id: 'task-2', status: 'COMPLETED', startDate: '2026-10-08T00:00:00.000Z' },
    ]);

    expect(result.hasSuccessor).toBe(true);
  });

  it('ignores the source task itself', () => {
    const result = findExistingSuccessor(source, [
      { id: 'task-1', status: 'COMPLETED', startDate: '2026-10-01T00:00:00.000Z' },
    ]);

    expect(result.hasSuccessor).toBe(false);
  });

  it('ignores candidates that start before the source (older occurrences)', () => {
    const result = findExistingSuccessor(source, [
      { id: 'task-0', status: 'COMPLETED', startDate: '2026-09-24T00:00:00.000Z' },
    ]);

    expect(result.hasSuccessor).toBe(false);
  });

  it('falls back to createdAt when startDate is missing', () => {
    const result = findExistingSuccessor(source, [
      { id: 'task-2', createdAt: '2026-10-09T00:00:00.000Z' },
    ]);

    expect(result.hasSuccessor).toBe(true);
  });

  it('is idempotent: repeated calls on the same data give the same verdict', () => {
    const candidates = [{ id: 'task-2', startDate: '2026-10-08T00:00:00.000Z' }];
    const first = findExistingSuccessor(source, candidates);
    const second = findExistingSuccessor(source, candidates);

    expect(first.hasSuccessor).toBe(true);
    expect(second.hasSuccessor).toBe(true);
    expect(second.successor.id).toBe(first.successor.id);
  });
});
