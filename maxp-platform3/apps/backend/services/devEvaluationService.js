const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_WEIGHTS = {
  taskCompletion: 25,
  onTimeDelivery: 20,
  estimationAccuracy: 15,
  timeEfficiency: 15,
  goalAchievement: 15,
  qualityScore: 10,
};

class DevEvaluationService {
  get prisma() {
    return getSharedPrismaClient();
  }

  _parseJSON(str, fallback = null) {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  _getWeights(settings) {
    const custom = this._parseJSON(settings?.evaluationWeights);
    if (!custom) return { ...DEFAULT_WEIGHTS };

    const total = Object.values(custom).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (total === 0) return { ...DEFAULT_WEIGHTS };

    const normalized = {};
    for (const [key, val] of Object.entries(DEFAULT_WEIGHTS)) {
      normalized[key] = ((custom[key] ?? val) / total) * 100;
    }
    return normalized;
  }

  _clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(value * 100) / 100));
  }

  _getPeriodRange(periodType, periodStart, periodEnd) {
    const now = new Date();
    let start, end;

    if (periodStart && periodEnd) {
      start = new Date(periodStart);
      end = new Date(periodEnd);
    } else if (periodType === 'WEEKLY') {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (periodType === 'MONTHLY') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodType === 'QUARTERLY') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { start, end };
  }

  async _getSettings() {
    try {
      const settings = await this.prisma.devSystemSettings.findUnique({
        where: { id: 'default' },
      });
      return settings || {};
    } catch {
      return {};
    }
  }

  async _getTasksForMember(memberId, start, end) {
    return this.prisma.devTask.findMany({
      where: {
        assigneeId: memberId,
        OR: [
          {
            completedDate: {
              gte: start,
              lte: end,
            },
          },
          {
            status: { in: ['IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'TODO'] },
            createdAt: { lte: end },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        estimatedHours: true,
        actualHours: true,
        dueDate: true,
        completedDate: true,
        startDate: true,
        createdAt: true,
        type: true,
        priority: true,
      },
    });
  }

  async _getTimeLogsForMember(memberId, start, end) {
    return this.prisma.devTimeLog.findMany({
      where: {
        memberId,
        startTime: { gte: start, lte: end },
      },
      select: {
        duration: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async _getGoalsForMember(memberId, start, end) {
    return this.prisma.devGoal.findMany({
      where: {
        ownerId: memberId,
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
      select: {
        id: true,
        progress: true,
        targetValue: true,
        currentValue: true,
        status: true,
      },
    });
  }

  async _getReopenCount(memberId, start, end) {
    const reopens = await this.prisma.devTaskActivity.findMany({
      where: {
        memberId,
        action: 'STATUS_CHANGED',
        oldValue: 'DONE',
        createdAt: { gte: start, lte: end },
      },
      select: { id: true },
    });
    return reopens.length;
  }

  async calculateForMember(memberId, periodType, periodStart, periodEnd) {
    const settings = await this._getSettings();
    const weights = this._getWeights(settings);
    const { start, end } = this._getPeriodRange(periodType, periodStart, periodEnd);

    const [tasks, timeLogs, goals, reopenCount] = await Promise.all([
      this._getTasksForMember(memberId, start, end),
      this._getTimeLogsForMember(memberId, start, end),
      this._getGoalsForMember(memberId, start, end),
      this._getReopenCount(memberId, start, end),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / 3600;
    const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const actualHoursFromTasks = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const goalsAssigned = goals.length;
    const goalsAchieved = goals.filter((g) => g.progress >= 100).length;

    const onTimeTasks = tasks.filter((t) => {
      if (t.status !== 'DONE' || !t.dueDate || !t.completedDate) return false;
      return new Date(t.completedDate) <= new Date(t.dueDate);
    }).length;

    const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const onTimeDelivery = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

    const estimationAccuracy = actualHoursFromTasks > 0 && estimatedHours > 0
      ? this._clamp(100 - (Math.abs(actualHoursFromTasks - estimatedHours) / estimatedHours) * 100)
      : 0;

    const timeEfficiency = actualHoursFromTasks > 0 && estimatedHours > 0
      ? this._clamp((estimatedHours / actualHoursFromTasks) * 100)
      : 0;

    const goalAchievement = goalsAssigned > 0
      ? (goalsAchieved / goalsAssigned) * 100
      : 0;

    const qualityScore = completedTasks > 0
      ? this._clamp(((completedTasks - reopenCount) / completedTasks) * 100)
      : 0;

    const overallScore = this._clamp(
      (taskCompletion * weights.taskCompletion) / 100 +
      (onTimeDelivery * weights.onTimeDelivery) / 100 +
      (estimationAccuracy * weights.estimationAccuracy) / 100 +
      (timeEfficiency * weights.timeEfficiency) / 100 +
      (goalAchievement * weights.goalAchievement) / 100 +
      (qualityScore * weights.qualityScore) / 100
    );

    const evaluationData = {
      memberId,
      periodType,
      periodStart: start,
      periodEnd: end,
      overallScore,
      taskCompletion: this._clamp(taskCompletion),
      onTimeDelivery: this._clamp(onTimeDelivery),
      estimationAccuracy: this._clamp(estimationAccuracy),
      timeEfficiency: this._clamp(timeEfficiency),
      goalAchievement: this._clamp(goalAchievement),
      qualityScore: this._clamp(qualityScore),
      totalTasks,
      completedTasks,
      totalHours: Math.round(totalHours * 100) / 100,
      estimatedHours: Math.round(estimatedHours * 100) / 100,
      goalsAssigned,
      goalsAchieved,
      reopenedTasks: reopenCount,
      metadata: {
        weights,
        periodStartISO: start.toISOString(),
        periodEndISO: end.toISOString(),
        calculatedAt: new Date().toISOString(),
      },
    };

    const evaluation = await this.prisma.devEvaluation.upsert({
      where: {
        memberId_periodType_periodStart: {
          memberId,
          periodType,
          periodStart: start,
        },
      },
      update: evaluationData,
      create: evaluationData,
    });

    return evaluation;
  }

  async getForMember(memberId, periodType) {
    const evaluations = await this.prisma.devEvaluation.findMany({
      where: {
        memberId,
        ...(periodType ? { periodType } : {}),
      },
      orderBy: { periodStart: 'desc' },
    });
    return evaluations;
  }

  async getTeamEvaluations(periodType, periodStart, periodEnd) {
    const { start, end } = this._getPeriodRange(periodType, periodStart, periodEnd);

    const members = await this.prisma.devTeamMember.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        devEvaluations: {
          where: {
            periodType: periodType || 'MONTHLY',
            periodStart: start,
          },
          take: 1,
        },
      },
    });

    return members
      .map((m) => ({
        memberId: m.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        avatar: m.user.avatar,
        role: m.role,
        level: m.level,
        xp: m.xp,
        evaluation: m.devEvaluations[0] || null,
      }))
      .sort((a, b) => {
        const scoreA = a.evaluation?.overallScore ?? -1;
        const scoreB = b.evaluation?.overallScore ?? -1;
        return scoreB - scoreA;
      });
  }

  async compareMembers(memberIds, periodType, periodStart, periodEnd) {
    const { start, end } = this._getPeriodRange(periodType, periodStart, periodEnd);

    const evaluations = await this.prisma.devEvaluation.findMany({
      where: {
        memberId: { in: memberIds },
        periodType: periodType || 'MONTHLY',
        periodStart: start,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return evaluations.map((e) => ({
      memberId: e.memberId,
      name: `${e.member.user.firstName} ${e.member.user.lastName}`,
      avatar: e.member.user.avatar,
      evaluation: {
        overallScore: e.overallScore,
        taskCompletion: e.taskCompletion,
        onTimeDelivery: e.onTimeDelivery,
        estimationAccuracy: e.estimationAccuracy,
        timeEfficiency: e.timeEfficiency,
        goalAchievement: e.goalAchievement,
        qualityScore: e.qualityScore,
        totalTasks: e.totalTasks,
        completedTasks: e.completedTasks,
        totalHours: e.totalHours,
        estimatedHours: e.estimatedHours,
        goalsAssigned: e.goalsAssigned,
        goalsAchieved: e.goalsAchieved,
        reopenedTasks: e.reopenedTasks,
      },
    }));
  }
}

module.exports = new DevEvaluationService();
