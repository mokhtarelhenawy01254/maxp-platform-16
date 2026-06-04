/**
 * @module devGoalService
 * @description Service layer for Dev Goals (OKRs) — CRUD, progress tracking,
 * key-result rollups, check-ins, and alignment tree.
 */

const { getSharedPrismaClient } = require("./sharedDatabase");

class DevGoalService {
  get prisma() {
    return getSharedPrismaClient();
  }

  // ── Helpers ──────────────────────────────────────────────────────

  _parseJson(str, fallback = []) {
    if (!str) return fallback;
    if (Array.isArray(str)) return str;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  _serializeTags(tags) {
    if (!tags) return null;
    if (typeof tags === "string") return tags;
    return JSON.stringify(tags);
  }

  _recalculateGoalProgress(goalId) {
    return this.prisma.$transaction(async (tx) => {
      const keyResults = await tx.devGoalKeyResult.findMany({
        where: { goalId },
      });

      if (keyResults.length === 0) return { progress: 0, currentValue: 0 };

      let totalWeight = 0;
      let weightedProgress = 0;
      let totalCurrentValue = 0;
      let totalTargetValue = 0;

      for (const kr of keyResults) {
        const weight = kr.weight || 1;
        totalWeight += weight;
        const krProgress =
          kr.targetValue.toNumber() > 0
            ? Math.min(
                (kr.currentValue.toNumber() / kr.targetValue.toNumber()) * 100,
                100,
              )
            : 0;
        weightedProgress += krProgress * weight;
        totalCurrentValue += kr.currentValue.toNumber();
        totalTargetValue += kr.targetValue.toNumber();
      }

      const progress =
        totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

      await tx.devGoal.update({
        where: { id: goalId },
        data: { progress, currentValue: totalCurrentValue },
      });

      return { progress, currentValue: totalCurrentValue };
    });
  }

  // ── Rating System ────────────────────────────────────────────────

  _calculateRating(goal) {
    const today = new Date();
    const start = new Date(goal.startDate);
    const end = new Date(goal.endDate);

    if (today < start) return { rating: 'NOT_STARTED', score: 0 };

    const totalDuration = Math.max(1, end.getTime() - start.getTime());
    const elapsed = Math.max(0, today.getTime() - start.getTime());
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil(elapsed / (1000 * 60 * 60 * 24));

    const targetValue = Number(goal.targetValue || 0);
    const currentValue = Number(goal.currentValue || 0);

    if (targetValue <= 0 || totalDays <= 0) return { rating: 'ON_TRACK', score: 0 };

    const expectedValue = (elapsedDays / totalDays) * targetValue;
    const ratio = expectedValue > 0 ? currentValue / expectedValue : 1;

    let rating = 'OFF_TRACK';
    let score = Math.round(ratio * 100);

    if (ratio >= 1.2) {
      rating = 'EXCELLENT';
    } else if (ratio >= 1.0) {
      rating = 'ON_TRACK';
    } else if (ratio >= 0.7) {
      rating = 'AT_RISK';
    } else {
      rating = 'OFF_TRACK';
    }

    // Clamp score
    if (score > 150) score = 150;

    return { rating, score };
  }

  // ── Task-Based Progress ──────────────────────────────────────────

  async _recalculateGoalProgressByTasks(goalId) {
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.devGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal) return null;

      // Use raw query to bypass potential schema mismatch on DevTask relations
      const taskCountResult = await tx.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM dev_tasks WHERE "goalId" = '${goalId}' AND status = 'DONE'`,
      );
      const completedTasksCount = Number(taskCountResult[0]?.count || 0);

      const targetValue = goal.targetValue ? goal.targetValue.toNumber() : 0;
      const progress =
        targetValue > 0
          ? Math.min(Math.round((completedTasksCount / targetValue) * 100), 100)
          : 0;

      const ratingInfo = this._calculateRating({
        ...goal,
        currentValue: completedTasksCount,
      });

      await tx.$executeRawUnsafe(
        `UPDATE dev_goals SET progress = ${progress}, "currentValue" = ${completedTasksCount}, rating = '${ratingInfo.rating}' WHERE id = '${goalId}'`,
      );

      return {
        progress,
        currentValue: completedTasksCount,
        rating: ratingInfo.rating,
        score: ratingInfo.score,
      };
    });
  }

  async syncGoalWithTask(taskId, previousStatus, newStatus) {
    const task = await this.prisma.devTask.findUnique({
      where: { id: taskId },
      select: { goalId: true },
    });

    if (!task || !task.goalId) return null;

    const isDone = (s) => s === 'DONE';
    const wasDone = isDone(previousStatus);
    const isNowDone = isDone(newStatus);

    // Only recalculate if the task crossed the DONE boundary
    if (wasDone !== isNowDone) {
      return this._recalculateGoalProgressByTasks(task.goalId);
    }

    return null;
  }

  // ── CRUD ─────────────────────────────────────────────────────────

  async createGoal(data) {
    const goal = await this.prisma.devGoal.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type || "TEAM",
        priority: data.priority || "MEDIUM",
        targetType: data.targetType || "NUMBER",
        targetValue: data.targetValue || 0,
        unit: data.unit || null,
        currency: data.currency || "EGP",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        ownerId: data.ownerId || null,
        parentGoalId: data.parentGoalId || null,
        projectId: data.projectId || null,
        quarter: data.quarter || null,
        tags: this._serializeTags(data.tags),
      },
      include: {
        owner: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { keyResults: true, linkedTasks: true, childGoals: true } },
      },
    });

    // Create key results if provided
    if (data.keyResults && data.keyResults.length > 0) {
      await this.prisma.devGoalKeyResult.createMany({
        data: data.keyResults.map((kr) => ({
          goalId: goal.id,
          title: kr.title,
          description: kr.description || null,
          targetType: kr.targetType || "NUMBER",
          targetValue: kr.targetValue || 0,
          unit: kr.unit || null,
          weight: kr.weight || 1,
          startDate: kr.startDate ? new Date(kr.startDate) : null,
          endDate: kr.endDate ? new Date(kr.endDate) : null,
        })),
      });
    }

    return this.getGoalById(goal.id);
  }

  async getGoalById(id) {
    const goal = await this.prisma.devGoal.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        project: { select: { id: true, name: true, color: true } },
        parentGoal: { select: { id: true, title: true } },
        childGoals: {
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            priority: true,
            type: true,
          },
          orderBy: { createdAt: "desc" },
        },
        keyResults: { orderBy: { createdAt: "asc" } },
        linkedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
          },
          take: 20,
          orderBy: { updatedAt: "desc" },
        },
        _count: { select: { keyResults: true, linkedTasks: true, childGoals: true } },
      },
    });

    if (!goal) return null;

    return {
      ...goal,
      tags: this._parseJson(goal.tags),
      owner: goal.owner
        ? { ...goal.owner, name: `${goal.owner.user.firstName} ${goal.owner.user.lastName}` }
        : null,
    };
  }

  async listGoals(filters = {}) {
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.priority) where.priority = filters.priority;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.quarter) where.quarter = filters.quarter;
    if (filters.parentGoalId !== undefined) {
      where.parentGoalId = filters.parentGoalId || null;
    }

    const ownerSelect = { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } };
    const projectSelect = { select: { id: true, name: true, color: true } };

    const goals = await this.prisma.devGoal.findMany({
      where,
      include: {
        owner: ownerSelect,
        project: projectSelect,
        _count: { select: { keyResults: true, linkedTasks: true, childGoals: true } },
      },
      orderBy: [
        { priority: "asc" },
        { endDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return goals.map((g) => ({
      ...g,
      tags: this._parseJson(g.tags),
      owner: g.owner
        ? { ...g.owner, name: `${g.owner.user.firstName} ${g.owner.user.lastName}` }
        : null,
    }));
  }

  async updateGoal(id, data) {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId || null;
    if (data.parentGoalId !== undefined) updateData.parentGoalId = data.parentGoalId || null;
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
    if (data.tags !== undefined) updateData.tags = this._serializeTags(data.tags);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);

    const goal = await this.prisma.devGoal.update({
      where: { id },
      data: updateData,
    });

    return this.getGoalById(id);
  }

  async deleteGoal(id) {
    // Check for child goals
    const childCount = await this.prisma.devGoal.count({
      where: { parentGoalId: id },
    });

    if (childCount > 0) {
      throw new Error("Cannot delete goal with child goals. Delete or reassign children first.");
    }

    await this.prisma.devGoalKeyResult.deleteMany({ where: { goalId: id } });
    await this.prisma.devGoalCheckIn.deleteMany({ where: { goalId: id } });

    // Unlink tasks
    await this.prisma.devTask.updateMany({
      where: { goalId: id },
      data: { goalId: null },
    });

    await this.prisma.devGoal.delete({ where: { id } });
    return { success: true };
  }

  // ── Key Results ──────────────────────────────────────────────────

  async addKeyResult(goalId, data) {
    const kr = await this.prisma.devGoalKeyResult.create({
      data: {
        goalId,
        title: data.title,
        description: data.description || null,
        targetType: data.targetType || "NUMBER",
        targetValue: data.targetValue || 0,
        unit: data.unit || null,
        weight: data.weight || 1,
        confidence: data.confidence || "ON_TRACK",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    await this._recalculateGoalProgress(goalId);
    return kr;
  }

  async updateKeyResult(id, data) {
    const kr = await this.prisma.devGoalKeyResult.findUnique({ where: { id } });
    if (!kr) throw new Error("Key Result not found");

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.status !== undefined) updateData.status = data.status;

    await this.prisma.devGoalKeyResult.update({ where: { id }, data: updateData });
    await this._recalculateGoalProgress(kr.goalId);

    return this.prisma.devGoalKeyResult.findUnique({ where: { id } });
  }

  async deleteKeyResult(id) {
    const kr = await this.prisma.devGoalKeyResult.findUnique({ where: { id } });
    if (!kr) throw new Error("Key Result not found");

    await this.prisma.devGoalKeyResult.delete({ where: { id } });
    await this._recalculateGoalProgress(kr.goalId);
    return { success: true };
  }

  // ── Progress Tracking ────────────────────────────────────────────

  async updateProgress(goalId, progress, currentValue) {
    await this.prisma.devGoal.update({
      where: { id: goalId },
      data: {
        progress: Math.min(Math.max(progress, 0), 100),
        currentValue: currentValue !== undefined ? currentValue : undefined,
      },
    });
    return this.getGoalById(goalId);
  }

  async bulkUpdateProgress(updates) {
    const results = [];
    for (const { goalId, progress, currentValue } of updates) {
      try {
        await this.updateProgress(goalId, progress, currentValue);
        results.push({ goalId, success: true });
      } catch (e) {
        results.push({ goalId, success: false, error: e.message });
      }
    }
    return results;
  }

  // ── Check-ins ────────────────────────────────────────────────────

  async addCheckIn(data) {
    const checkIn = await this.prisma.devGoalCheckIn.create({
      data: {
        goalId: data.goalId,
        keyResultId: data.keyResultId || null,
        memberId: data.memberId,
        content: data.content,
        confidence: data.confidence || null,
        progressValue: data.progressValue || null,
        blockers: data.blockers || null,
      },
      include: {
        member: { select: { id: true, name: true, userId: true } },
      },
    });

    // Update KR currentValue if provided
    if (data.keyResultId && data.progressValue !== undefined) {
      await this.updateKeyResult(data.keyResultId, {
        currentValue: data.progressValue,
      });
    }

    return checkIn;
  }

  async getCheckIns(goalId, limit = 20) {
    return this.prisma.devGoalCheckIn.findMany({
      where: { goalId },
      include: {
        member: { select: { id: true, name: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // ── Alignment Tree ───────────────────────────────────────────────

  async getAlignmentTree(filters = {}) {
    const where = {};
    if (filters.quarter) where.quarter = filters.quarter;
    if (filters.status) where.status = filters.status;

    // Get root goals (no parent)
    const rootGoals = await this.prisma.devGoal.findMany({
      where: { ...where, parentGoalId: null },
      include: {
        owner: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        keyResults: true,
        _count: { select: { linkedTasks: true, childGoals: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatGoal = (g) => ({
      ...g,
      tags: this._parseJson(g.tags),
      owner: g.owner
        ? { ...g.owner, name: `${g.owner.user.firstName} ${g.owner.user.lastName}` }
        : null,
    });

    const buildTree = async (goals) => {
      const tree = [];
      for (const goal of goals) {
        const children = await this.prisma.devGoal.findMany({
          where: { parentGoalId: goal.id },
          include: {
            owner: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
            keyResults: true,
            _count: { select: { linkedTasks: true, childGoals: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        tree.push({
          ...formatGoal(goal),
          children: children.length > 0 ? await buildTree(children.map(formatGoal)) : [],
        });
      }
      return tree;
    };

    return buildTree(rootGoals.map(formatGoal));
  }

  // ── Dashboard Stats ──────────────────────────────────────────────

  async getDashboardStats(filters = {}) {
    const where = {};
    if (filters.quarter) where.quarter = filters.quarter;

    const [totalGoals, activeGoals, completedGoals, allGoals] =
      await Promise.all([
        this.prisma.devGoal.count({ where }),
        this.prisma.devGoal.count({ where: { ...where, status: "ACTIVE" } }),
        this.prisma.devGoal.count({ where: { ...where, status: "COMPLETED" } }),
        this.prisma.devGoal.findMany({
          where,
          include: {
            keyResults: true,
            _count: { select: { linkedTasks: true } },
          },
        }),
      ]);

    const avgProgress =
      allGoals.length > 0
        ? Math.round(
            allGoals.reduce((sum, g) => sum + g.progress, 0) / allGoals.length,
          )
        : 0;

    const atRiskCount = allGoals.filter(
      (g) => g.confidence === "AT_RISK" || g.confidence === "OFF_TRACK",
    ).length;

    const totalKeyResults = allGoals.reduce(
      (sum, g) => sum + g.keyResults.length,
      0,
    );

    const completedKeyResults = allGoals.reduce(
      (sum, g) =>
        sum +
        g.keyResults.filter((kr) => kr.status === "COMPLETED").length,
      0,
    );

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      avgProgress,
      atRiskCount,
      totalKeyResults,
      completedKeyResults,
      totalLinkedTasks: allGoals.reduce(
        (sum, g) => sum + g._count.linkedTasks,
        0,
      ),
    };
  }

  // ── Link / Unlink Tasks ──────────────────────────────────────────

  async linkTask(goalId, taskId) {
    await this.prisma.devTask.update({
      where: { id: taskId },
      data: { goalId },
    });
    return { success: true };
  }

  async unlinkTask(taskId) {
    await this.prisma.devTask.update({
      where: { id: taskId },
      data: { goalId: null },
    });
    return { success: true };
  }

  async bulkLinkTasks(goalId, taskIds) {
    const results = [];
    for (const taskId of taskIds) {
      try {
        await this.linkTask(goalId, taskId);
        results.push({ taskId, success: true });
      } catch (e) {
        results.push({ taskId, success: false, error: e.message });
      }
    }
    return results;
  }
}

module.exports = new DevGoalService();
