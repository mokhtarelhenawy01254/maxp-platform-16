const { getSharedPrismaClient } = require('./sharedDatabase');

class MonitorService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  async processActivityBatch(companyId, employeeId, activities) {
    if (!activities || !activities.length) return { count: 0 };
    return this.prisma.monitorActivityLog.createMany({
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
    return this.prisma.monitorDailySummary.findMany({
      where: { companyId, date: new Date(date) }
    });
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
