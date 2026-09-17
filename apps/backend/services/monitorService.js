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
    const capped = appData.slice(0, 500);
    return this.prisma.monitorAppUsage.createMany({
      data: capped.map(a => {
        const startedAt = a.startedAt ? new Date(a.startedAt) : new Date();
        const startOfDay = new Date(startedAt);
        startOfDay.setHours(0, 0, 0, 0);
        return {
          companyId,
          employeeId,
          appName: String(a.appName || 'Unknown').slice(0, 100),
          windowTitle: a.windowTitle ? String(a.windowTitle).slice(0, 255) : null,
          category: ['productive', 'neutral', 'unproductive', 'unrated'].includes(a.category) ? a.category : 'unrated',
          durationSeconds: Math.max(0, Math.min(86400, Number(a.durationSeconds || 0))),
          startedAt,
          endedAt: a.endedAt ? new Date(a.endedAt) : null,
          date: a.date ? new Date(a.date) : startOfDay,
        };
      })
    });
  }

  async processWebUsageBatch(companyId, employeeId, webData) {
    if (!webData || !webData.length) return { count: 0 };
    const capped = webData.slice(0, 500);
    return this.prisma.monitorWebUsage.createMany({
      data: capped.map(w => {
        const startedAt = w.startedAt ? new Date(w.startedAt) : new Date();
        const startOfDay = new Date(startedAt);
        startOfDay.setHours(0, 0, 0, 0);
        return {
          companyId,
          employeeId,
          url: String(w.url || w.domain || '').slice(0, 500),
          domain: String(w.domain || '').slice(0, 150),
          pageTitle: w.pageTitle ? String(w.pageTitle).slice(0, 255) : null,
          category: ['productive', 'neutral', 'unproductive', 'unrated'].includes(w.category) ? w.category : 'unrated',
          durationSeconds: Math.max(0, Math.min(86400, Number(w.durationSeconds || 0))),
          startedAt,
          endedAt: w.endedAt ? new Date(w.endedAt) : null,
          date: w.date ? new Date(w.date) : startOfDay,
        };
      })
    });
  }

  async updateHeartbeat(companyId, employeeId, deviceInfo = {}) {
    const existing = await this.prisma.monitorDeviceSession.findFirst({
      where: { companyId, employeeId, isOnline: true },
      orderBy: { lastHeartbeat: 'desc' }
    });

    // Reuse session if updated within the last 4 hours
    if (existing && (Date.now() - new Date(existing.lastHeartbeat).getTime() < 4 * 3600 * 1000)) {
      return this.prisma.monitorDeviceSession.update({
        where: { id: existing.id },
        data: {
          lastHeartbeat: new Date(),
          deviceName: deviceInfo.deviceName ? String(deviceInfo.deviceName).slice(0, 100) : existing.deviceName,
          osVersion: deviceInfo.osVersion ? String(deviceInfo.osVersion).slice(0, 100) : existing.osVersion,
          appVersion: deviceInfo.appVersion ? String(deviceInfo.appVersion).slice(0, 50) : existing.appVersion,
        }
      });
    }

    return this.prisma.monitorDeviceSession.create({
      data: {
        companyId,
        employeeId,
        deviceName: deviceInfo.deviceName ? String(deviceInfo.deviceName).slice(0, 100) : 'Desktop Device',
        osVersion: deviceInfo.osVersion ? String(deviceInfo.osVersion).slice(0, 100) : null,
        appVersion: deviceInfo.appVersion ? String(deviceInfo.appVersion).slice(0, 50) : null,
        lastHeartbeat: new Date(),
        isOnline: true
      }
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
    const empMap = new Map();

    if (employeeIds.length > 0) {
      // 1. Try resolving through Employee table by id or userId
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId,
          OR: [{ id: { in: employeeIds } }, { userId: { in: employeeIds } }]
        },
        include: { department: true }
      });

      employees.forEach(e => {
        empMap.set(e.id, e);
        if (e.userId) empMap.set(e.userId, e);
      });

      // 2. Fallback for accounts without employee records (e.g. COMPANY_ADMIN)
      const missingIds = employeeIds.filter(id => !empMap.has(id));
      if (missingIds.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { companyId, id: { in: missingIds } },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        });

        users.forEach(u => {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
          empMap.set(u.id, {
            id: u.id,
            firstName: fullName,
            lastName: '',
            email: u.email,
            department: { name: u.role === 'COMPANY_ADMIN' ? 'الإدارة العامة' : 'فريق العمل' }
          });
        });
      }
    }

    return summaries.map(s => ({
      ...s,
      employee: empMap.get(s.employeeId) || null,
      status: s.lastActivityTime && (Date.now() - new Date(s.lastActivityTime).getTime() < 15 * 60 * 1000) ? 'active' : 'idle'
    }));
  }

  async getEmployeeTimeline(companyId, employeeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [activities, apps, websites, summary, employee] = await Promise.all([
      this.prisma.monitorActivityLog.findMany({
        where: { companyId, employeeId, intervalStart: { gte: startOfDay, lte: endOfDay } },
        orderBy: { intervalStart: 'asc' },
      }),
      this.prisma.monitorAppUsage.findMany({
        where: { companyId, employeeId, date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorWebUsage.findMany({
        where: { companyId, employeeId, date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorDailySummary.findUnique({
        where: { companyId_employeeId_date: { companyId, employeeId, date: startOfDay } },
      }),
      this.prisma.employee.findFirst({
        where: { companyId, OR: [{ id: employeeId }, { userId: employeeId }] },
        include: {
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      }).catch(() => null),
    ]);

    // Aggregate app totals by appName
    const appMap = new Map();
    for (const a of apps) {
      const key = a.appName || 'Unknown';
      if (!appMap.has(key)) {
        appMap.set(key, {
          appName: key,
          windowTitle: a.windowTitle,
          category: a.category || 'unrated',
          durationSeconds: 0,
          entriesCount: 0,
        });
      }
      const existing = appMap.get(key);
      existing.durationSeconds += (a.durationSeconds || 0);
      existing.entriesCount += 1;
      if (a.windowTitle) existing.windowTitle = a.windowTitle;
    }
    const aggregatedApps = Array.from(appMap.values()).sort(
      (a, b) => b.durationSeconds - a.durationSeconds
    );

    // Aggregate web totals by domain
    const webMap = new Map();
    for (const w of websites) {
      const key = w.domain || w.url || 'Unknown';
      if (!webMap.has(key)) {
        webMap.set(key, {
          domain: key,
          url: w.url,
          pageTitle: w.pageTitle,
          category: w.category || 'unrated',
          durationSeconds: 0,
          entriesCount: 0,
        });
      }
      const existing = webMap.get(key);
      existing.durationSeconds += (w.durationSeconds || 0);
      existing.entriesCount += 1;
      if (w.pageTitle) existing.pageTitle = w.pageTitle;
    }
    const aggregatedWeb = Array.from(webMap.values()).sort(
      (a, b) => b.durationSeconds - a.durationSeconds
    );

    return {
      date,
      summary,
      employee,
      activities,
      apps: aggregatedApps,
      rawApps: apps,
      websites: aggregatedWeb,
      rawWebsites: websites,
    };
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
