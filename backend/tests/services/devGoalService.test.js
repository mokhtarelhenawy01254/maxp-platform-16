/**
 * @module devGoalService.test
 * @description Tests for DevGoalService — OKR goal management
 */

const devGoalService = require("../../services/devGoalService");

// Mock Prisma client
jest.mock("../../services/sharedDatabase", () => {
  const mockPrisma = {
    devGoal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    devGoalKeyResult: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    devGoalCheckIn: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    devTask: {
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };
  return { getSharedPrismaClient: () => mockPrisma };
});

const { getSharedPrismaClient } = require("../../services/sharedDatabase");
const prisma = getSharedPrismaClient();

describe("DevGoalService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createGoal ─────────────────────────────────────────────────

  describe("createGoal", () => {
    test("should create a goal with basic fields", async () => {
      const mockGoal = {
        id: "goal_1",
        title: "Increase Revenue",
        type: "TEAM",
        priority: "HIGH",
        status: "ACTIVE",
        progress: 0,
        targetType: "NUMBER",
        targetValue: 100,
        currentValue: 0,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-30"),
        ownerId: null,
        parentGoalId: null,
        projectId: null,
        quarter: "Q2-2026",
        tags: null,
        owner: null,
        project: null,
        _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 },
      };

      prisma.devGoal.create.mockResolvedValue(mockGoal);
      prisma.devGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await devGoalService.createGoal({
        title: "Increase Revenue",
        type: "TEAM",
        priority: "HIGH",
        targetType: "NUMBER",
        targetValue: 100,
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        quarter: "Q2-2026",
      });

      expect(result.title).toBe("Increase Revenue");
      expect(prisma.devGoal.create).toHaveBeenCalled();
    });

    test("should create goal with key results", async () => {
      const mockGoal = {
        id: "goal_2",
        title: "Goal with KRs",
        keyResults: [],
        _count: { keyResults: 2, linkedTasks: 0, childGoals: 0 },
      };

      prisma.devGoal.create.mockResolvedValue(mockGoal);
      prisma.devGoalKeyResult.createMany.mockResolvedValue({ count: 2 });
      prisma.devGoal.findUnique.mockResolvedValue({
        ...mockGoal,
        keyResults: [
          { id: "kr_1", title: "KR1", targetValue: 50, currentValue: 0 },
          { id: "kr_2", title: "KR2", targetValue: 80, currentValue: 0 },
        ],
      });

      const result = await devGoalService.createGoal({
        title: "Goal with KRs",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        keyResults: [
          { title: "KR1", targetValue: 50 },
          { title: "KR2", targetValue: 80 },
        ],
      });

      expect(prisma.devGoalKeyResult.createMany).toHaveBeenCalled();
    });

    test("should serialize tags to JSON string", async () => {
      prisma.devGoal.create.mockImplementation((data) =>
        Promise.resolve({ id: "goal_3", ...data.data, tags: data.data.tags }),
      );
      prisma.devGoal.findUnique.mockResolvedValue({
        id: "goal_3",
        tags: '["urgent","q2"]',
        _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 },
        owner: null,
        project: null,
      });

      await devGoalService.createGoal({
        title: "Tagged Goal",
        tags: ["urgent", "q2"],
        startDate: "2026-04-01",
        endDate: "2026-06-30",
      });

      expect(prisma.devGoal.create).toHaveBeenCalled();
      const createCall = prisma.devGoal.create.mock.calls[0][0];
      expect(createCall.data.tags).toBe('["urgent","q2"]');
    });
  });

  // ── getGoalById ────────────────────────────────────────────────

  describe("getGoalById", () => {
    test("should return goal with all includes", async () => {
      const mockGoal = {
        id: "goal_10",
        title: "Test Goal",
        tags: '["tag1"]',
        owner: { id: "m1", name: "Ahmed", userId: "u1" },
        project: { id: "p1", name: "Project A", color: "#6366f1" },
        parentGoal: null,
        childGoals: [],
        keyResults: [
          { id: "kr1", title: "KR1", targetValue: 100, currentValue: 50, weight: 1, status: "ACTIVE" },
        ],
        linkedTasks: [],
        _count: { keyResults: 1, linkedTasks: 0, childGoals: 0 },
      };

      prisma.devGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await devGoalService.getGoalById("goal_10");

      expect(result.id).toBe("goal_10");
      expect(result.tags).toEqual(["tag1"]);
      expect(result.keyResults).toHaveLength(1);
    });

    test("should return null for non-existent goal", async () => {
      prisma.devGoal.findUnique.mockResolvedValue(null);
      const result = await devGoalService.getGoalById("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── listGoals ──────────────────────────────────────────────────

  describe("listGoals", () => {
    test("should return all goals when no filters", async () => {
      prisma.devGoal.findMany.mockResolvedValue([
        { id: "g1", title: "Goal 1", tags: null, _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 } },
        { id: "g2", title: "Goal 2", tags: "[]", _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 } },
      ]);

      const result = await devGoalService.listGoals();
      expect(result).toHaveLength(2);
      expect(prisma.devGoal.findMany).toHaveBeenCalled();
    });

    test("should apply status filter", async () => {
      prisma.devGoal.findMany.mockResolvedValue([]);
      await devGoalService.listGoals({ status: "ACTIVE" });

      const where = prisma.devGoal.findMany.mock.calls[0][0].where;
      expect(where.status).toBe("ACTIVE");
    });

    test("should apply type filter", async () => {
      prisma.devGoal.findMany.mockResolvedValue([]);
      await devGoalService.listGoals({ type: "TEAM" });

      const where = prisma.devGoal.findMany.mock.calls[0][0].where;
      expect(where.type).toBe("TEAM");
    });

    test("should apply quarter filter", async () => {
      prisma.devGoal.findMany.mockResolvedValue([]);
      await devGoalService.listGoals({ quarter: "Q2-2026" });

      const where = prisma.devGoal.findMany.mock.calls[0][0].where;
      expect(where.quarter).toBe("Q2-2026");
    });
  });

  // ── updateGoal ─────────────────────────────────────────────────

  describe("updateGoal", () => {
    test("should update goal fields", async () => {
      prisma.devGoal.update.mockResolvedValue({ id: "g1", title: "Updated" });
      prisma.devGoal.findUnique.mockResolvedValue({
        id: "g1",
        title: "Updated",
        tags: null,
        _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 },
        owner: null,
        project: null,
        parentGoal: null,
        childGoals: [],
        keyResults: [],
        linkedTasks: [],
      });

      await devGoalService.updateGoal("g1", { title: "Updated" });

      expect(prisma.devGoal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "g1" },
          data: expect.objectContaining({ title: "Updated" }),
        }),
      );
    });

    test("should set status", async () => {
      prisma.devGoal.update.mockResolvedValue({ id: "g1" });
      prisma.devGoal.findUnique.mockResolvedValue({
        id: "g1",
        status: "COMPLETED",
        tags: null,
        _count: { keyResults: 0, linkedTasks: 0, childGoals: 0 },
        owner: null,
        project: null,
        parentGoal: null,
        childGoals: [],
        keyResults: [],
        linkedTasks: [],
      });

      await devGoalService.updateGoal("g1", { status: "COMPLETED" });

      const updateCall = prisma.devGoal.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("COMPLETED");
    });
  });

  // ── deleteGoal ─────────────────────────────────────────────────

  describe("deleteGoal", () => {
    test("should delete goal without children", async () => {
      prisma.devGoal.count.mockResolvedValue(0);
      prisma.devGoalKeyResult.deleteMany.mockResolvedValue({});
      prisma.devGoalCheckIn.deleteMany.mockResolvedValue({});
      prisma.devTask.updateMany.mockResolvedValue({});
      prisma.devGoal.delete.mockResolvedValue({});

      const result = await devGoalService.deleteGoal("g1");
      expect(result.success).toBe(true);
    });

    test("should throw error when goal has children", async () => {
      prisma.devGoal.count.mockResolvedValue(2);

      await expect(devGoalService.deleteGoal("g1")).rejects.toThrow(
        "Cannot delete goal with child goals",
      );
    });
  });

  // ── addKeyResult ───────────────────────────────────────────────

  describe("addKeyResult", () => {
    test("should add key result to goal", async () => {
      const mockKR = {
        id: "kr_new",
        goalId: "g1",
        title: "New KR",
        targetValue: 100,
        currentValue: 0,
        weight: 1,
      };

      prisma.devGoalKeyResult.create.mockResolvedValue(mockKR);
      prisma.devGoalKeyResult.findMany.mockResolvedValue([
        { ...mockKR, targetValue: { toNumber: () => 100 }, currentValue: { toNumber: () => 0 } },
      ]);
      prisma.devGoal.update.mockResolvedValue({});

      const result = await devGoalService.addKeyResult("g1", {
        title: "New KR",
        targetValue: 100,
      });

      expect(result.id).toBe("kr_new");
      expect(prisma.devGoalKeyResult.create).toHaveBeenCalled();
    });
  });

  // ── _recalculateGoalProgress ───────────────────────────────────

  describe("_recalculateGoalProgress", () => {
    test("should calculate weighted progress from key results", async () => {
      prisma.devGoalKeyResult.findMany.mockResolvedValue([
        { targetValue: { toNumber: () => 100 }, currentValue: { toNumber: () => 80 }, weight: 2 },
        { targetValue: { toNumber: () => 50 }, currentValue: { toNumber: () => 25 }, weight: 1 },
      ]);
      prisma.devGoal.update.mockResolvedValue({});

      const result = await devGoalService._recalculateGoalProgress("g1");

      // KR1: 80/100 * 2 = 160
      // KR2: 25/50 * 1 = 50
      // Total weight: 3
      // Progress: (160 + 50) / 3 = 70
      expect(result.progress).toBe(70);
      expect(result.currentValue).toBe(105);
    });

    test("should return 0 when no key results", async () => {
      prisma.devGoalKeyResult.findMany.mockResolvedValue([]);

      const result = await devGoalService._recalculateGoalProgress("g1");
      expect(result.progress).toBe(0);
    });
  });

  // ── addCheckIn ─────────────────────────────────────────────────

  describe("addCheckIn", () => {
    test("should create check-in with member", async () => {
      const mockCheckIn = {
        id: "ci_1",
        goalId: "g1",
        memberId: "m1",
        content: "Progress update",
        confidence: "ON_TRACK",
        member: { id: "m1", name: "Ahmed", userId: "u1" },
      };

      prisma.devGoalCheckIn.create.mockResolvedValue(mockCheckIn);

      const result = await devGoalService.addCheckIn({
        goalId: "g1",
        memberId: "m1",
        content: "Progress update",
        confidence: "ON_TRACK",
      });

      expect(result.content).toBe("Progress update");
    });

    test("should update KR when keyResultId provided", async () => {
      prisma.devGoalCheckIn.create.mockResolvedValue({ id: "ci_2" });
      prisma.devGoalKeyResult.findUnique.mockResolvedValue({ id: "kr_1", goalId: "g1" });
      prisma.devGoalKeyResult.update.mockResolvedValue({});
      prisma.devGoalKeyResult.findMany.mockResolvedValue([]);
      prisma.devGoal.update.mockResolvedValue({});

      await devGoalService.addCheckIn({
        goalId: "g1",
        memberId: "m1",
        content: "KR update",
        keyResultId: "kr_1",
        progressValue: 75,
      });

      expect(prisma.devGoalKeyResult.update).toHaveBeenCalled();
    });
  });

  // ── getDashboardStats ──────────────────────────────────────────

  describe("getDashboardStats", () => {
    test("should return stats for all goals", async () => {
      prisma.devGoal.count.mockResolvedValueOnce(10); // total
      prisma.devGoal.count.mockResolvedValueOnce(7);  // active
      prisma.devGoal.count.mockResolvedValueOnce(2);  // completed
      prisma.devGoal.findMany.mockResolvedValue([
        { progress: 60, confidence: "ON_TRACK", keyResults: [{ status: "COMPLETED" }], _count: { linkedTasks: 3 } },
        { progress: 40, confidence: "AT_RISK", keyResults: [{ status: "ACTIVE" }], _count: { linkedTasks: 1 } },
      ]);

      const stats = await devGoalService.getDashboardStats();

      expect(stats.totalGoals).toBe(10);
      expect(stats.activeGoals).toBe(7);
      expect(stats.completedGoals).toBe(2);
      expect(stats.avgProgress).toBe(50);
      expect(stats.atRiskCount).toBe(1);
      expect(stats.totalLinkedTasks).toBe(4);
    });
  });

  // ── linkTask / unlinkTask ──────────────────────────────────────

  describe("linkTask", () => {
    test("should link task to goal", async () => {
      prisma.devTask.update.mockResolvedValue({});

      const result = await devGoalService.linkTask("g1", "t1");
      expect(result.success).toBe(true);
      expect(prisma.devTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { goalId: "g1" },
      });
    });
  });

  describe("unlinkTask", () => {
    test("should unlink task from goal", async () => {
      prisma.devTask.update.mockResolvedValue({});

      const result = await devGoalService.unlinkTask("t1");
      expect(result.success).toBe(true);
      expect(prisma.devTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { goalId: null },
      });
    });
  });
});
