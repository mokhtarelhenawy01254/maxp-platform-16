import { computeTaskStats, type ServerTaskStatsPayload } from "../helpers";

describe("useTasksPageController taskStats mapping and pagination regression", () => {
  describe("stats-mapping unit test (given a stats payload → expected five numbers)", () => {
    it("maps serverStats payload to expected five numbers (total, pending, inProgress, completed, overdue)", () => {
      const statsPayload: ServerTaskStatsPayload = {
        totalTasks: 26,
        tasksByStatus: {
          pending: 5,
          inProgress: 8,
          inReview: 2,
          completed: 10,
          cancelled: 1,
        },
        overdueTasks: 4,
      };

      const result = computeTaskStats({
        serverStats: statsPayload,
        taskFilter: "all",
      });

      expect(result).toEqual({
        total: 26,
        pending: 7, // 5 pending + 2 inReview awaiting approval
        inProgress: 8,
        completed: 10,
        overdue: 4,
      });
    });

    it("uses myTasksByStatus and myOverdueTasks when taskFilter is my-tasks", () => {
      const statsPayload: ServerTaskStatsPayload = {
        totalTasks: 26,
        myTasks: 12,
        tasksByStatus: {
          pending: 5,
          inProgress: 8,
          inReview: 2,
          completed: 10,
        },
        myTasksByStatus: {
          pending: 2,
          inProgress: 4,
          inReview: 1,
          completed: 5,
        },
        overdueTasks: 4,
        myOverdueTasks: 1,
      };

      const result = computeTaskStats({
        serverStats: statsPayload,
        taskFilter: "my-tasks",
      });

      expect(result).toEqual({
        total: 12,
        pending: 3, // 2 pending + 1 inReview
        inProgress: 4,
        completed: 5,
        overdue: 1,
      });
    });

    it("handles overdue and total property aliases gracefully", () => {
      const statsPayload: ServerTaskStatsPayload = {
        total: 15,
        tasksByStatus: {
          pending: 3,
          inProgress: 5,
          completed: 7,
        },
        overdue: 2,
      };

      const result = computeTaskStats({
        serverStats: statsPayload,
        taskFilter: "all",
      });

      expect(result).toEqual({
        total: 15,
        pending: 3,
        inProgress: 5,
        completed: 7,
        overdue: 2,
      });
    });
  });

  describe("pagination regression: taskStats must NOT be rebuilt from safeTasks when serverStats exists", () => {
    const fullServerStats: ServerTaskStatsPayload = {
      totalTasks: 26,
      tasksByStatus: {
        pending: 6,
        inProgress: 8,
        inReview: 2,
        completed: 10,
      },
      overdueTasks: 3,
    };

    // Page 1 slice (10 tasks out of 26)
    const page1Tasks = [
      { id: "t1", status: "completed", dueDate: null },
      { id: "t2", status: "completed", dueDate: null },
      { id: "t3", status: "completed", dueDate: null },
      { id: "t4", status: "in_progress", dueDate: null },
      { id: "t5", status: "in_progress", dueDate: null },
      { id: "t6", status: "pending", dueDate: null },
      { id: "t7", status: "pending", dueDate: null },
      { id: "t8", status: "completed", dueDate: null },
      { id: "t9", status: "completed", dueDate: null },
      { id: "t10", status: "completed", dueDate: null },
    ];

    // Page 2 slice (different 10 tasks)
    const page2Tasks = [
      { id: "t11", status: "in_progress", dueDate: null },
      { id: "t12", status: "in_progress", dueDate: null },
      { id: "t13", status: "in_progress", dueDate: null },
      { id: "t14", status: "completed", dueDate: null },
      { id: "t15", status: "completed", dueDate: null },
      { id: "t16", status: "pending", dueDate: null },
      { id: "t17", status: "in_review", dueDate: null },
      { id: "t18", status: "completed", dueDate: null },
      { id: "t19", status: "completed", dueDate: null },
      { id: "t20", status: "in_progress", dueDate: null },
    ];

    it("keeps five header numbers unchanged across page 1 and page 2 navigation", () => {
      const page1Stats = computeTaskStats({
        serverStats: fullServerStats,
        safeTasks: page1Tasks,
        serverTotalTasks: 26,
      });

      const page2Stats = computeTaskStats({
        serverStats: fullServerStats,
        safeTasks: page2Tasks,
        serverTotalTasks: 26,
      });

      // Header numbers must be identical across pages
      expect(page1Stats).toEqual({
        total: 26,
        pending: 8, // 6 + 2
        inProgress: 8,
        completed: 10,
        overdue: 3,
      });

      expect(page2Stats).toEqual(page1Stats);

      // Verify that page 1 numbers are NOT computed from page 1 slice
      // (Page 1 slice has only 2 pending and 2 in_progress, but header reports full 8 and 8)
      expect(page1Stats.pending).not.toBe(
        page1Tasks.filter((t) => t.status === "pending").length,
      );
      expect(page1Stats.inProgress).not.toBe(
        page1Tasks.filter((t) => t.status === "in_progress").length,
      );
    });

    it("falls back to safeTasks only when serverStats is absent (offline fallback)", () => {
      const fallbackResult = computeTaskStats({
        serverStats: null,
        safeTasks: page1Tasks,
        serverTotalTasks: 0,
      });

      expect(fallbackResult).toEqual({
        total: 10,
        pending: 2,
        inProgress: 2,
        completed: 6,
        overdue: 0,
      });
    });
  });
});
