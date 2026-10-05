/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🛡️ Automated Regression & Acceptance Test Suite: Monitor P0 Defects (Phase 1)
 * 
 * Verifies Acceptance Criteria for:
 * 1. Item 1: Deterministic daily summaries (no increment ballooning, <= 86400s,
 *            <= totalClockSeconds + 300 when clocked out, canonical ID deduplication)
 * 2. Item 4: Manual attendance auditability (createdById, updatedById, changeReason,
 *            and HRAuditLog row creation)
 * 3. Item 6: Activity log deduplication (composite unique constraint,
 *            skipDuplicates: true, in-memory deduplication, deviceId mapping, <= 300s)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const monitorService = require('../../services/monitorService');
const attendanceService = require('../../services/hr/attendanceService');
const auditService = require('../../services/hr/auditService');

describe('🛡️ Phase 1 (P0) Acceptance Tests: Monitor & Attendance Defects', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // ITEM 6: monitor_activity_logs Deduplication, Capping & deviceId
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Item 6: Activity Log Deduplication, Capping & deviceId', () => {
    let mockPrisma;
    let originalPrisma;

    beforeEach(() => {
      originalPrisma = monitorService.prisma;
      mockPrisma = {
        monitorActivityLog: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        monitorDailySummary: {
          upsert: jest.fn().mockResolvedValue({ id: 'summary-1' }),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        employee: {
          findFirst: jest.fn().mockResolvedValue({ id: 'emp-1', userId: 'user-1', firstName: 'Test', lastName: 'Emp' }),
        },
        user: {
          findFirst: jest.fn().mockResolvedValue({ id: 'user-1', firstName: 'Test', lastName: 'Emp' }),
        },
        attendance: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        monitorAppUsage: { findMany: jest.fn().mockResolvedValue([]) },
        monitorWebUsage: { findMany: jest.fn().mockResolvedValue([]) },
        task: { findMany: jest.fn().mockResolvedValue([]) },
        monitorAppCategory: { findMany: jest.fn().mockResolvedValue([]) },
      };
      monitorService.prisma = mockPrisma;
    });

    afterEach(() => {
      monitorService.prisma = originalPrisma;
    });

    test('deduplicates duplicate intervals in-memory and passes skipDuplicates: true', async () => {
      const companyId = 'company-test-1';
      const employeeId = 'emp-1';
      const interval = '2026-10-02T08:00:00.000Z';

      // Batch contains duplicate intervalStart with different activeSeconds
      const incomingBatch = [
        {
          intervalStart: interval,
          intervalEnd: '2026-10-02T08:05:00.000Z',
          mouseEvents: 10,
          keyboardEvents: 20,
          activeSeconds: 120,
          deviceId: 'device-laptop-1',
        },
        {
          intervalStart: interval, // duplicate interval
          intervalEnd: '2026-10-02T08:05:00.000Z',
          mouseEvents: 15,
          keyboardEvents: 25,
          activeSeconds: 240, // higher activeSeconds should be preferred
          deviceId: 'device-laptop-1',
        },
        {
          intervalStart: '2026-10-02T08:05:00.000Z',
          intervalEnd: '2026-10-02T08:10:00.000Z',
          activeSeconds: 500, // exceeds 300s -> must be clamped to 300
          deviceId: 'device-laptop-1',
        }
      ];

      await monitorService.processActivityBatch(companyId, employeeId, incomingBatch);

      expect(mockPrisma.monitorActivityLog.createMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.monitorActivityLog.createMany.mock.calls[0][0];

      // Verification 1: skipDuplicates is strictly true
      expect(callArgs.skipDuplicates).toBe(true);

      // Verification 2: only 2 unique intervals inserted (duplicate interval merged)
      expect(callArgs.data.length).toBe(2);

      // Verification 3: highest activeSeconds (240) was preserved
      const interval1 = callArgs.data.find(d => d.intervalStart.toISOString() === interval);
      expect(interval1).toBeDefined();
      expect(interval1.activeSeconds).toBe(240);
      expect(interval1.deviceId).toBe('device-laptop-1');

      // Verification 4: interval > 300s is clamped to 300
      const interval2 = callArgs.data.find(d => d.intervalStart.toISOString() === '2026-10-02T08:05:00.000Z');
      expect(interval2.activeSeconds).toBe(300);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ITEM 1: monitor_daily_summaries Determinism, Clamping & Canonical Deduplication
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Item 1: Daily Summary Deterministic Calculation & Clamping', () => {
    let mockPrisma;
    let originalPrisma;

    beforeEach(() => {
      originalPrisma = monitorService.prisma;
      mockPrisma = {
        employee: {
          findFirst: jest.fn().mockResolvedValue({ id: 'emp-canonical-1', userId: 'user-raw-1', firstName: 'Ali', lastName: 'H2M' }),
        },
        user: {
          findFirst: jest.fn().mockResolvedValue({ id: 'user-raw-1', firstName: 'Ali', lastName: 'H2M' }),
        },
        attendance: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        monitorActivityLog: {
          findMany: jest.fn(),
        },
        monitorAppUsage: { findMany: jest.fn().mockResolvedValue([]) },
        monitorWebUsage: { findMany: jest.fn().mockResolvedValue([]) },
        task: { findMany: jest.fn().mockResolvedValue([]) },
        monitorAppCategory: { findMany: jest.fn().mockResolvedValue([]) },
        monitorDailySummary: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          upsert: jest.fn().mockImplementation(({ update, create }) => Promise.resolve({ ...create, ...update, id: 'sum-1' })),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      monitorService.prisma = mockPrisma;
    });

    afterEach(() => {
      monitorService.prisma = originalPrisma;
    });

    test('calculates totalActiveSeconds deterministically without increment inflation', async () => {
      const companyId = 'company-test-1';
      const rawEmployeeId = 'user-raw-1';
      const targetDate = new Date('2026-09-30T00:00:00.000Z');

      // Raw logs total 3600 active seconds
      mockPrisma.monitorActivityLog.findMany.mockResolvedValue([
        {
          intervalStart: new Date('2026-09-30T08:00:00.000Z'),
          intervalEnd: new Date('2026-09-30T08:05:00.000Z'),
          activeSeconds: 300,
          activityScore: 80,
        },
        {
          intervalStart: new Date('2026-09-30T08:05:00.000Z'),
          intervalEnd: new Date('2026-09-30T08:10:00.000Z'),
          activeSeconds: 300,
          activityScore: 90,
        },
      ]);

      // Run synchronization twice (e.g. simulated network retry)
      const summary1 = await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);
      const summary2 = await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);

      // Must remain exactly 600 active seconds, NOT 1200
      expect(summary1.totalActiveSeconds).toBe(600);
      expect(summary2.totalActiveSeconds).toBe(600);
    });

    test('clamps impossible totalActiveSeconds to max 86,400s per day', async () => {
      const companyId = 'company-test-1';
      const rawEmployeeId = 'user-raw-1';
      const targetDate = new Date('2026-09-30T00:00:00.000Z');

      // Huge raw log sum simulating previous defect (18,476 minutes = 1,108,560 seconds)
      mockPrisma.monitorActivityLog.findMany.mockResolvedValue([
        {
          intervalStart: new Date('2026-09-30T08:00:00.000Z'),
          intervalEnd: new Date('2026-09-30T08:05:00.000Z'),
          activeSeconds: 1108560,
          activityScore: 50,
        },
      ]);

      const summary = await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);

      // Must be capped at exactly 86400 (24h)
      expect(summary.totalActiveSeconds).toBe(86400);
    });

    test('clamps active seconds to totalClockSeconds + 300s when clocked out', async () => {
      const companyId = 'company-test-1';
      const rawEmployeeId = 'user-raw-1';
      const targetDate = new Date('2026-09-30T00:00:00.000Z');

      // Clocked in 8:00 AM, Clocked out 12:00 PM (4 hours = 14,400 seconds)
      mockPrisma.attendance.findFirst.mockResolvedValue({
        checkIn: new Date('2026-09-30T08:00:00.000Z'),
        checkOut: new Date('2026-09-30T12:00:00.000Z'),
      });

      // Raw activity logs report 6 hours (21,600s)
      mockPrisma.monitorActivityLog.findMany.mockResolvedValue([
        {
          intervalStart: new Date('2026-09-30T08:00:00.000Z'),
          intervalEnd: new Date('2026-09-30T08:05:00.000Z'),
          activeSeconds: 21600,
          activityScore: 80,
        },
      ]);

      const summary = await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);

      // totalClockSeconds = 14,400 -> active seconds must be clamped to 14,400 + 300 = 14,700
      expect(summary.totalClockSeconds).toBe(14400);
      expect(summary.totalActiveSeconds).toBe(14700);
    });

    test('clamps active seconds to totalClockSeconds + 300s even when checkOut is null', async () => {
      const companyId = 'company-test-1';
      const rawEmployeeId = 'user-raw-1';
      const targetDate = new Date('2026-09-30T00:00:00.000Z');

      // Clocked in 8:00 AM, missing checkOut on past day (calculateTotalClockSeconds caps at 9 hours = 32,400s)
      mockPrisma.attendance.findFirst.mockResolvedValue({
        checkIn: new Date('2026-09-30T08:00:00.000Z'),
        checkOut: null,
      });

      // Raw activity logs report 50,000s
      mockPrisma.monitorActivityLog.findMany.mockResolvedValue([
        {
          intervalStart: new Date('2026-09-30T08:00:00.000Z'),
          intervalEnd: new Date('2026-09-30T08:05:00.000Z'),
          activeSeconds: 50000,
          activityScore: 80,
        },
      ]);

      const summary = await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);

      // totalClockSeconds = 32,400 -> active seconds must be clamped to 32,400 + 300 = 32,700
      expect(summary.totalClockSeconds).toBe(32400);
      expect(summary.totalActiveSeconds).toBe(32700);
    });

    test('deletes rogue duplicate summaries created under non-canonical candidate IDs', async () => {
      const companyId = 'company-test-1';
      const rawEmployeeId = 'user-raw-1';
      const targetDate = new Date('2026-09-30T00:00:00.000Z');

      mockPrisma.monitorActivityLog.findMany.mockResolvedValue([]);

      await monitorService.syncEmployeeDailySummary(companyId, rawEmployeeId, targetDate);

      // Expected deleteMany called for nonCanonicalIds ('user-raw-1')
      expect(mockPrisma.monitorDailySummary.deleteMany).toHaveBeenCalledWith({
        where: {
          companyId,
          employeeId: { in: ['user-raw-1'] },
          date: targetDate,
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ITEM 4: Manual Attendance Audit Trail (createdById, updatedById, changeReason)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Item 4: Manual Attendance Audit Trail', () => {
    let mockPrisma;
    let originalAttendancePrisma;
    let originalAuditPrisma;

    beforeEach(() => {
      originalAttendancePrisma = attendanceService.prisma;
      originalAuditPrisma = auditService.prisma;

      mockPrisma = {
        employee: {
          findMany: jest.fn().mockResolvedValue([{ userId: 'emp-user-1' }]),
          findUnique: jest.fn().mockResolvedValue({ id: 'emp-1', userId: 'emp-user-1' }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'admin-1', firstName: 'Admin', lastName: 'User' }),
        },
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 'comp-1', timezone: 'Africa/Cairo' }),
        },
        attendance: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'att-existing-1',
            companyId: 'comp-1',
            userId: 'emp-user-1',
            date: new Date('2026-10-01T00:00:00.000Z'),
            checkIn: new Date('2026-10-01T07:00:00.000Z'),
            checkOut: new Date('2026-10-01T15:00:00.000Z'),
          }),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'att-new-1' })),
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'att-existing-1', ...data })),
        },
        hRAuditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        },
        hRSettings: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        employeeShiftAssignment: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        shift: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        manualDeduction: {
          findMany: jest.fn().mockResolvedValue([]),
        }
      };

      attendanceService.getActiveCompanyUserIds = jest.fn().mockResolvedValue(['emp-user-1']);
      attendanceService.getCompanyTimezone = jest.fn().mockResolvedValue('Africa/Cairo');

      // Mock getter
      Object.defineProperty(attendanceService, 'prisma', { value: mockPrisma, configurable: true });
      Object.defineProperty(auditService, 'prisma', { value: mockPrisma, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(attendanceService, 'prisma', { value: originalAttendancePrisma, configurable: true });
      Object.defineProperty(auditService, 'prisma', { value: originalAuditPrisma, configurable: true });
    });

    test('createManualAttendance stores createdById, updatedById, changeReason and writes HRAuditLog', async () => {
      const companyId = 'comp-1';
      const payload = {
        employeeId: 'emp-user-1',
        date: '2026-10-02',
        checkIn: '09:00',
        checkOut: '17:00',
        actorId: 'admin-1',
        actorName: 'Admin User',
        createdById: 'admin-1',
        updatedById: 'admin-1',
        changeReason: 'تصحيح بصمة نسيتها الموظفة',
      };

      const result = await attendanceService.createManualAttendance(companyId, payload);

      // Verify Attendance creation fields
      expect(mockPrisma.attendance.create).toHaveBeenCalledTimes(1);
      const createdData = mockPrisma.attendance.create.mock.calls[0][0].data;
      expect(createdData.createdById).toBe('admin-1');
      expect(createdData.updatedById).toBe('admin-1');
      expect(createdData.changeReason).toBe('تصحيح بصمة نسيتها الموظفة');
      expect(createdData.checkInMethod).toBe('manual');

      // Verify HRAuditLog creation
      expect(mockPrisma.hRAuditLog.create).toHaveBeenCalledTimes(1);
      const auditData = mockPrisma.hRAuditLog.create.mock.calls[0][0].data;
      expect(auditData.companyId).toBe(companyId);
      expect(auditData.actorId).toBe('admin-1');
      expect(auditData.action).toBe('CREATE');
      expect(auditData.entityType).toBe('ATTENDANCE');
      expect(auditData.details.changeReason).toBe('تصحيح بصمة نسيتها الموظفة');
    });

    test('updateAttendance stores updatedById, changeReason and writes HRAuditLog', async () => {
      const companyId = 'comp-1';
      const attendanceId = 'att-existing-1';
      const payload = {
        checkIn: '09:30',
        actorId: 'manager-1',
        actorName: 'Manager User',
        updatedById: 'manager-1',
        changeReason: 'تعديل موعد الحضور حسب إذن رسمي',
      };

      const result = await attendanceService.updateAttendance(companyId, attendanceId, payload);

      // Verify Attendance update data
      expect(mockPrisma.attendance.update).toHaveBeenCalledTimes(1);
      const updatedData = mockPrisma.attendance.update.mock.calls[0][0].data;
      expect(updatedData.updatedById).toBe('manager-1');
      expect(updatedData.changeReason).toBe('تعديل موعد الحضور حسب إذن رسمي');

      // Verify HRAuditLog creation
      expect(mockPrisma.hRAuditLog.create).toHaveBeenCalledTimes(1);
      const auditData = mockPrisma.hRAuditLog.create.mock.calls[0][0].data;
      expect(auditData.companyId).toBe(companyId);
      expect(auditData.actorId).toBe('manager-1');
      expect(auditData.action).toBe('UPDATE');
      expect(auditData.entityType).toBe('ATTENDANCE');
      expect(auditData.details.changeReason).toBe('تعديل موعد الحضور حسب إذن رسمي');
    });
  });
});
