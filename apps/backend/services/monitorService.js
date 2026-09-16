const { getSharedPrismaClient } = require('./sharedDatabase');

class MonitorService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  async processActivityBatch(companyId, employeeId, activities) {
    if (!activities || !activities.length) return { count: 0 };
    const res = await this.prisma.monitorActivityLog.createMany({
      data: activities.map(a => ({
        companyId,
        employeeId,
        intervalStart: new Date(a.intervalStart),
        intervalEnd: new Date(a.intervalEnd),
        mouseEvents: Number(a.mouseEvents || 0),
        keyboardEvents: Number(a.keyboardEvents || 0),
        activeSeconds: Number(a.activeSeconds || 0),
        activityScore: Number(a.activityScore || 0),
        status: a.status || 'active',
      }))
    });

    try {
      await this.updateDailySummaryFromActivity(companyId, employeeId, activities);
    } catch (e) {
      console.error('[MonitorService] Failed to update daily summary:', e.message);
    }

    return res;
  }

  async updateDailySummaryFromActivity(companyId, employeeId, activities) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalActive = activities.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);
    const avgScore = activities.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activities.length;

    await this.prisma.monitorDailySummary.upsert({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date: today,
        },
      },
      update: {
        totalActiveSeconds: { increment: totalActive },
        lastActivityTime: new Date(),
        avgActivityScore: avgScore,
        productivityScore: Math.round(avgScore),
      },
      create: {
        companyId,
        employeeId,
        date: today,
        firstActivityTime: new Date(),
        lastActivityTime: new Date(),
        totalActiveSeconds: totalActive,
        totalIdleSeconds: 0,
        productivityScore: Math.round(avgScore),
        avgActivityScore: avgScore,
      },
    });
  }

  async processAppUsageBatch(companyId, employeeId, appData) {
    if (!appData || !appData.length) return { count: 0 };
    return this.prisma.monitorAppUsage.createMany({
      data: appData.map(a => {
        const startedAt = a.startedAt ? new Date(a.startedAt) : new Date();
        const startOfDay = new Date(startedAt);
        startOfDay.setHours(0, 0, 0, 0);
        return {
          companyId,
          employeeId,
          appName: a.appName || 'Unknown',
          windowTitle: a.windowTitle || null,
          category: a.category || 'unrated',
          durationSeconds: Number(a.durationSeconds || 0),
          startedAt,
          endedAt: a.endedAt ? new Date(a.endedAt) : null,
          date: a.date ? new Date(a.date) : startOfDay,
        };
      })
    });
  }

  async processWebUsageBatch(companyId, employeeId, webData) {
    if (!webData || !webData.length) return { count: 0 };
    return this.prisma.monitorWebUsage.createMany({
      data: webData.map(w => {
        const startedAt = w.startedAt ? new Date(w.startedAt) : new Date();
        const startOfDay = new Date(startedAt);
        startOfDay.setHours(0, 0, 0, 0);
        return {
          companyId,
          employeeId,
          url: w.url || w.domain || '',
          domain: w.domain || '',
          pageTitle: w.pageTitle || null,
          category: w.category || 'unrated',
          durationSeconds: Number(w.durationSeconds || 0),
          startedAt,
          endedAt: w.endedAt ? new Date(w.endedAt) : null,
          date: w.date ? new Date(w.date) : startOfDay,
        };
      })
    });
  }

  async updateHeartbeat(companyId, employeeId, deviceInfo) {
    return this.prisma.monitorDeviceSession.create({
      data: { companyId, employeeId, ...deviceInfo }
    });
  }

  async getDailySummary(companyId, employeeId, date) {
    return this.prisma.monitorDailySummary.findUnique({
      where: { companyId_employeeId_date: { companyId, employeeId, date: new Date(date) } }
    });
  }

  async getTeamOverview(companyId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const summaries = await this.prisma.monitorDailySummary.findMany({
      where: { companyId, date: { gte: startOfDay, lte: endOfDay } }
    });

    const employeeIds = summaries.map(s => s.employeeId).filter(Boolean);
    let employees = [];
    if (employeeIds.length > 0) {
      employees = await this.prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        include: { department: true }
      });
    }

    const empMap = new Map(employees.map(e => [e.id, e]));

    return summaries.map(s => ({
      ...s,
      employee: empMap.get(s.employeeId) || null,
      status: s.lastActivityTime && (Date.now() - new Date(s.lastActivityTime).getTime() < 15 * 60 * 1000) ? 'active' : 'idle'
    }));
  }

  async getEmployeeTimeline(companyId, employeeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const activities = await this.prisma.monitorActivityLog.findMany({
      where: { companyId, employeeId, intervalStart: { gte: startOfDay, lte: endOfDay } }
    });

    return { activities };
  }

  async getCategories(companyId) {
    return this.prisma.monitorAppCategory.findMany({
      where: { companyId }
    });
  }

  async updateCategory(companyId, categoryData) {
    return this.prisma.monitorAppCategory.upsert({
      where: {
        companyId_name_type_departmentId: {
          companyId,
          name: categoryData.name,
          type: categoryData.type,
          departmentId: categoryData.departmentId || null
        }
      },
      update: { category: categoryData.category },
      create: { ...categoryData, companyId }
    });
  }

  async recalculateDailySummary(companyId, employeeId, date) {
    return this.prisma.monitorDailySummary.findUnique({
      where: { companyId_employeeId_date: { companyId, employeeId, date: new Date(date) } }
    });
  }
}

module.exports = new MonitorService();
