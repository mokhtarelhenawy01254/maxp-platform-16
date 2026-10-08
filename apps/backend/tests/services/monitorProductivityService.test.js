const monitorService = require('../../services/monitorService');

describe('MonitorService Productivity & Warmup Calculations', () => {
  describe('Late Start & Clock Seconds', () => {
    test('calculates lateStartSeconds correctly when first activity is after clock in', () => {
      const clockIn = new Date('2026-09-28T07:00:00.000Z');
      const firstAct = new Date('2026-09-28T07:32:00.000Z'); // 32 minutes later
      const lateSec = monitorService.calculateLateStartSeconds(clockIn, firstAct, false);
      expect(lateSec).toBe(32 * 60);
    });

    test('returns 0 lateStartSeconds when activity started before clock in', () => {
      const clockIn = new Date('2026-09-28T07:30:00.000Z');
      const firstAct = new Date('2026-09-28T07:15:00.000Z');
      const lateSec = monitorService.calculateLateStartSeconds(clockIn, firstAct, false);
      expect(lateSec).toBe(0);
    });

    test('calculates totalClockSeconds from checkIn to checkOut', () => {
      const clockIn = new Date('2026-09-28T07:00:00.000Z');
      const clockOut = new Date('2026-09-28T15:30:00.000Z'); // 8.5 hours
      const clockSec = monitorService.calculateTotalClockSeconds(clockIn, clockOut, false);
      expect(clockSec).toBe(8.5 * 3600);
    });
  });

  describe('Balanced Weighted Productivity Score', () => {
    test('rewards completed tasks even if device activity is low (field/meetings)', () => {
      const metrics = {
        totalActiveSeconds: 2 * 3600, // only 2 hours active
        totalClockSeconds: 8 * 3600,  // out of 8 hours
        totalProductiveSeconds: 1.8 * 3600,
        totalUnproductiveSeconds: 0,
        avgActivityScore: 40,
        completedTasksCount: 3,       // but finished 3 tasks!
        openTasksCount: 1,
        overdueTasksCount: 0,
      };

      const score = monitorService.computeProductivityScore(metrics);
      expect(score).toBeGreaterThanOrEqual(65);
      expect(score).toBeLessThanOrEqual(100);

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).toBe('OFF_DEVICE_WORK');
    });

    test('penalizes high motion without outputs (distraction / jiggler)', () => {
      const metrics = {
        totalActiveSeconds: 7 * 3600, // 7 hours moving mouse
        totalClockSeconds: 8 * 3600,
        totalProductiveSeconds: 0.5 * 3600,
        totalUnproductiveSeconds: 4 * 3600, // 4 hours on gaming/entertainment
        avgActivityScore: 90,
        completedTasksCount: 0,       // 0 tasks done
        openTasksCount: 3,
        overdueTasksCount: 2,
      };

      const score = monitorService.computeProductivityScore(metrics);
      expect(score).toBeLessThan(40);

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).toBe('DISTRACTION');
    });

    test('detects task overload for manager review', () => {
      const metrics = {
        totalActiveSeconds: 2 * 3600,
        totalClockSeconds: 8 * 3600,
        totalProductiveSeconds: 1 * 3600,
        totalUnproductiveSeconds: 0,
        avgActivityScore: 35,
        completedTasksCount: 0,
        openTasksCount: 6,
        overdueTasksCount: 4, // 4 overdue tasks!
      };

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).toBe('TASK_OVERLOAD');
      expect(signal.target).toBe('MANAGER');
    });

    test('detects direct neglect only when both activity and outputs are zero with high presence', () => {
      const metrics = {
        totalActiveSeconds: 15 * 60, // 15 mins active
        totalClockSeconds: 6 * 3600, // 6 hours clocked in
        totalProductiveSeconds: 0,
        totalUnproductiveSeconds: 0,
        avgActivityScore: 10,
        completedTasksCount: 0,
        openTasksCount: 0,
        overdueTasksCount: 0,
      };

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).toBe('NEGLECT');
      expect(signal.target).toBe('DIRECT_INTERVENTION');
    });

    test('prevents false NEGLECT signal when employee has an active task timer running', () => {
      const metrics = {
        totalActiveSeconds: 20 * 60, // 20 mins active
        totalClockSeconds: 4 * 3600, // 4 hours clocked in
        totalProductiveSeconds: 0,
        totalUnproductiveSeconds: 0,
        avgActivityScore: 15,
        completedTasksCount: 0,
        openTasksCount: 2,
        overdueTasksCount: 0,
        hasActiveTimer: true, // task timer is actively running
      };

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).not.toBe('NEGLECT');
    });

    test('returns STEADY_PERFORMANCE when employee has steady active progress on open tasks without distraction', () => {
      const metrics = {
        totalActiveSeconds: 4 * 3600, // 4 hours active
        totalClockSeconds: 5 * 3600,  // 5 hours clocked in
        totalProductiveSeconds: 3.5 * 3600,
        totalUnproductiveSeconds: 0,
        avgActivityScore: 78,
        completedTasksCount: 0, // working on a long multi-hour open task
        openTasksCount: 2,
        overdueTasksCount: 0,
        hasActiveTimer: true,
      };

      const signal = monitorService.evaluateOperationalSignal({
        ...metrics,
        activeRatio: Math.round((metrics.totalActiveSeconds / metrics.totalClockSeconds) * 100),
      });
      expect(signal.type).toBe('STEADY_PERFORMANCE');
      expect(signal.severity).toBe('success');
    });
  });
});
