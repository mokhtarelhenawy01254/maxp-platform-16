/**
 * @module performance360Engine.test
 * @description Unit tests for MaxP Enterprise 360° Performance Calculation Engine
 */

const {
  resolveEvaluationPeriod,
  computeEmployee360Metrics
} = require("../../services/hr/performance360Engine");

describe("performance360Engine", () => {
  describe("resolveEvaluationPeriod", () => {
    test("returns last 30 days rolling period when no month/year provided", () => {
      const period = resolveEvaluationPeriod({});
      expect(period.isMonthSpecific).toBe(false);
      expect(period.periodLabel).toBe("آخر 30 يوماً");
      expect(period.periodStartDate).toBeInstanceOf(Date);
      expect(period.periodEndDate).toBeInstanceOf(Date);
      expect(period.periodEndDate.getTime()).toBeGreaterThan(period.periodStartDate.getTime());
    });

    test("returns specific calendar month when valid month and year provided", () => {
      const period = resolveEvaluationPeriod({ month: "4", year: "2026" });
      expect(period.isMonthSpecific).toBe(true);
      expect(period.month).toBe(4);
      expect(period.year).toBe(2026);
      expect(period.periodLabel).toBe("أبريل 2026");
      expect(period.periodStartDate.toISOString()).toContain("2026-04-01");
      expect(period.periodEndDate.toISOString()).toContain("2026-04-30");
    });
  });

  describe("computeEmployee360Metrics", () => {
    let mockDb;

    beforeEach(() => {
      mockDb = {
        employee: {
          findFirst: jest.fn().mockResolvedValue({
            id: "emp-1",
            userId: "user-1",
            companyId: "comp-1",
            department: { id: "dept-1", name: "Engineering" },
            position: { id: "pos-1", title: "Software Engineer" },
            user: { id: "user-1", firstName: "Mokhtar", lastName: "Admin", email: "test@maxp.online" }
          })
        },
        task: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "task-1",
              title: "Task 1",
              status: "COMPLETED",
              dueDate: new Date("2026-04-15"),
              completedDate: new Date("2026-04-14"),
              updatedAt: new Date("2026-04-14"),
              returnCount: 0,
              lastReturnReason: null,
              missingEvidence: false
            },
            {
              id: "task-2",
              title: "Task 2",
              status: "COMPLETED",
              dueDate: new Date("2026-04-20"),
              completedDate: new Date("2026-04-22"), // Late
              updatedAt: new Date("2026-04-22"),
              returnCount: 1,
              lastReturnReason: "Fix typo",
              missingEvidence: false
            }
          ])
        },
        attendance: {
          findMany: jest.fn().mockResolvedValue([
            { id: "att-1", date: new Date("2026-04-02"), status: "PRESENT", lateMinutes: 0 },
            { id: "att-2", date: new Date("2026-04-03"), status: "LATE", lateMinutes: 25 }
          ])
        },
        monitorDailySummary: {
          findMany: jest.fn().mockResolvedValue([
            { id: "mon-1", date: new Date("2026-04-02"), productivityScore: 85, avgActivityScore: 80, totalActiveSeconds: 25000 }
          ])
        },
        goal: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "goal-1",
              title: "Deliver Q2 Feature",
              progress: 80,
              status: "IN_PROGRESS",
              endDate: new Date("2026-04-30"),
              goalDate: new Date("2026-04-30")
            }
          ])
        }
      };
    });

    test("queries dbClient.goal.findMany with valid Goal model fields (endDate, goalDate) and NOT dueDate", async () => {
      const result = await computeEmployee360Metrics(mockDb, {
        companyId: "comp-1",
        userId: "user-1",
        employeeId: "emp-1",
        periodStartDate: new Date("2026-04-01"),
        periodEndDate: new Date("2026-04-30")
      });

      expect(mockDb.goal.findMany).toHaveBeenCalled();
      const goalCallArgs = mockDb.goal.findMany.mock.calls[0][0];

      // CRITICAL ASSERTION: dueDate must NOT be present in select
      expect(goalCallArgs.select.dueDate).toBeUndefined();
      expect(goalCallArgs.select.endDate).toBe(true);
      expect(goalCallArgs.select.goalDate).toBe(true);
      expect(goalCallArgs.select.progress).toBe(true);
      expect(goalCallArgs.select.status).toBe(true);

      // Verify computed result structure
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.isEvaluated).toBe(true);
      expect(result.tier).toBeDefined();
      expect(result.tierLabel).toBeDefined();
      expect(result.pillars).toBeDefined();
      expect(result.pillars.goals).toBeDefined();
      expect(result.pillars.goals.score).toBe(80);
      expect(result.telemetryStats.activeGoals).toBe(1);
    });

    test("handles employee with no goals gracefully without throwing", async () => {
      mockDb.goal.findMany.mockResolvedValue([]);

      const result = await computeEmployee360Metrics(mockDb, {
        companyId: "comp-1",
        userId: "user-1",
        employeeId: "emp-1",
        periodStartDate: new Date("2026-04-01"),
        periodEndDate: new Date("2026-04-30")
      });

      expect(result.telemetryStats.activeGoals).toBe(0);
      expect(result.pillars.goals.score).toBe(0);
      expect(result.pillars.goals.isApplicable).toBe(false);
      // Rebalanced weight should redistribute across other pillars
      expect(result.compositeScore).toBeGreaterThan(0);
    });
  });
});
