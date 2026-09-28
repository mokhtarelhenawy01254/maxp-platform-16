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
    if (!activities || !activities.length) return;

    // Use the actual interval timestamp rather than server's current arrival time
    const firstIntervalStart = activities[0].intervalStart ? new Date(activities[0].intervalStart) : new Date();
    const dateStr = (isNaN(firstIntervalStart.getTime()) ? new Date() : firstIntervalStart).toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const totalActive = activities.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);

    // Calculate total idle seconds for this batch (clamped to max 300s per interval)
    const totalIdle = activities.reduce((sum, a) => {
      const startMs = a.intervalStart ? new Date(a.intervalStart).getTime() : 0;
      const endMs = a.intervalEnd ? new Date(a.intervalEnd).getTime() : 0;
      const active = Number(a.activeSeconds) || 0;
      if (startMs && endMs && endMs > startMs) {
        const intervalSec = Math.min(300, Math.max(1, Math.floor((endMs - startMs) / 1000)));
        return sum + Math.max(0, intervalSec - active);
      }
      return sum;
    }, 0);

    const avgScore = activities.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activities.length;

    const existing = await this.prisma.monitorDailySummary.findUnique({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date: targetDate,
        },
      },
      select: { totalActiveSeconds: true, avgActivityScore: true },
    }).catch(() => null);

    let runningAvg = Math.round(avgScore);
    if (existing && existing.totalActiveSeconds > 0) {
      const prevWeight = existing.totalActiveSeconds;
      const newWeight = Math.max(1, totalActive);
      runningAvg = Math.round(((existing.avgActivityScore * prevWeight) + (avgScore * newWeight)) / (prevWeight + newWeight));
    }

    await this.prisma.monitorDailySummary.upsert({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date: targetDate,
        },
      },
      update: {
        totalActiveSeconds: { increment: totalActive },
        totalIdleSeconds: { increment: totalIdle },
        lastActivityTime: new Date(),
        avgActivityScore: runningAvg,
        productivityScore: runningAvg,
      },
      create: {
        companyId,
        employeeId,
        date: targetDate,
        firstActivityTime: firstIntervalStart,
        lastActivityTime: new Date(),
        totalActiveSeconds: totalActive,
        totalIdleSeconds: totalIdle,
        productivityScore: runningAvg,
        avgActivityScore: runningAvg,
      },
    });
  }

  async processAppUsageBatch(companyId, employeeId, appData) {
    if (!appData || !appData.length) return { count: 0 };
    const capped = appData.slice(0, 500);
    return this.prisma.monitorAppUsage.createMany({
      data: capped.map(a => {
        const startedAt = a.startedAt ? new Date(a.startedAt) : new Date();
        const dateStr = (isNaN(startedAt.getTime()) ? new Date() : startedAt).toISOString().split('T')[0];
        const utcDate = new Date(`${dateStr}T00:00:00.000Z`);
        return {
          companyId,
          employeeId,
          appName: String(a.appName || 'Unknown').slice(0, 100),
          windowTitle: a.windowTitle ? String(a.windowTitle).slice(0, 255) : null,
          category: ['productive', 'neutral', 'unproductive', 'unrated'].includes(a.category) ? a.category : 'unrated',
          durationSeconds: Math.max(0, Math.min(86400, Number(a.durationSeconds || 0))),
          startedAt,
          endedAt: a.endedAt ? new Date(a.endedAt) : null,
          date: a.date ? new Date(a.date) : utcDate,
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
        const dateStr = (isNaN(startedAt.getTime()) ? new Date() : startedAt).toISOString().split('T')[0];
        const utcDate = new Date(`${dateStr}T00:00:00.000Z`);
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
          date: w.date ? new Date(w.date) : utcDate,
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

  async endDeviceSession(companyId, employeeId, reason = 'MANUAL_CLOSE') {
    try {
      return await this.prisma.monitorDeviceSession.updateMany({
        where: { companyId, employeeId, isOnline: true },
        data: {
          isOnline: false,
          lastHeartbeat: new Date(),
        }
      });
    } catch (err) {
      console.warn('[MonitorService] Could not update device session end:', err.message);
      return null;
    }
  }

  async getDailySummary(companyId, employeeId, date, alternateEmployeeId = null) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    let summary = await this.prisma.monitorDailySummary.findUnique({
      where: { companyId_employeeId_date: { companyId, employeeId, date: targetDate } }
    });
    if (!summary && alternateEmployeeId && alternateEmployeeId !== employeeId) {
      summary = await this.prisma.monitorDailySummary.findUnique({
        where: { companyId_employeeId_date: { companyId, employeeId: alternateEmployeeId, date: targetDate } }
      });
    }
    return summary;
  }

  computeBreaksFromActivities(activities) {
    if (!activities || !activities.length) {
      return { totalBreaksCount: 0, totalBreakSeconds: 0, totalBreakMinutes: 0, breaks: [] };
    }

    const sorted = [...activities].sort((a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime());
    const rawBreaks = [];
    let currentBreak = null;

    for (let i = 0; i < sorted.length; i++) {
      const act = sorted[i];
      const startMs = new Date(act.intervalStart).getTime();
      const endMs = new Date(act.intervalEnd).getTime();
      const actSec = Number(act.activeSeconds) || 0;
      const score = Number(act.activityScore) || 0;
      const isIdleInterval = actSec === 0 || act.status === 'idle' || score < 20;

      // Check if there was an untracked gap of >= 3 minutes before this interval
      if (i > 0) {
        const prevEndMs = new Date(sorted[i - 1].intervalEnd).getTime();
        const gapSec = Math.floor((startMs - prevEndMs) / 1000);
        if (gapSec >= 180) {
          if (currentBreak) {
            const dur = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
            if (dur >= 300) {
              rawBreaks.push({
                startMs: currentBreak.startMs,
                endMs: currentBreak.endMs,
                durationSeconds: dur,
                isGap: false,
              });
            }
            currentBreak = null;
          }
          rawBreaks.push({
            startMs: prevEndMs,
            endMs: startMs,
            durationSeconds: gapSec,
            isGap: true,
          });
        }
      }

      if (isIdleInterval) {
        if (!currentBreak) {
          currentBreak = { startMs, endMs };
        } else {
          currentBreak.endMs = Math.max(currentBreak.endMs, endMs);
        }
      } else {
        if (currentBreak) {
          const durationSec = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
          if (durationSec >= 300) {
            rawBreaks.push({
              startMs: currentBreak.startMs,
              endMs: currentBreak.endMs,
              durationSeconds: durationSec,
              isGap: false,
            });
          }
          currentBreak = null;
        }
      }
    }

    if (currentBreak) {
      const durationSec = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
      if (durationSec >= 300) {
        rawBreaks.push({
          startMs: currentBreak.startMs,
          endMs: currentBreak.endMs,
          durationSeconds: durationSec,
          isGap: false,
        });
      }
    }

    // 🧹 De-fragmentation: دمج فترات التوقف المتتالية إذا كان الفاصل بينهما أقل من 4 دقائق (تجنب تفتيت الخمول)
    const mergedBreaks = [];
    for (const b of rawBreaks) {
      if (mergedBreaks.length === 0) {
        mergedBreaks.push({ ...b });
      } else {
        const last = mergedBreaks[mergedBreaks.length - 1];
        const gapBetweenBreaksSec = Math.floor((b.startMs - last.endMs) / 1000);
        if (gapBetweenBreaksSec <= 240) {
          last.endMs = Math.max(last.endMs, b.endMs);
          last.durationSeconds = Math.floor((last.endMs - last.startMs) / 1000);
          if (b.isGap) last.isGap = true;
        } else {
          mergedBreaks.push({ ...b });
        }
      }
    }

    const formattedBreaks = mergedBreaks.map((b, idx) => {
      const startDate = new Date(b.startMs);
      const endDate = new Date(b.endMs);
      const durationMinutes = Math.round(b.durationSeconds / 60);

      let reasonType = 'UNLOGGED_INACTIVITY';
      let reasonLabel = 'توقف عن استخدام الجهاز (خمول)';

      if (b.isGap) {
        reasonType = 'DEVICE_DISCONNECTED_OR_POWER_CUT';
        reasonLabel = durationMinutes >= 30
          ? 'انقطاع اتصال طويل / إغلاق جهاز أو وضع سكون'
          : 'انقطاع اتصال مؤقت بالجهاز / إغلاق أو شبكة';
      } else if (durationMinutes >= 45) {
        reasonType = 'EXTENDED_ABSENCE';
        reasonLabel = 'توقف ممتد عن استخدام الجهاز (غياب عن المكتب)';
      } else if (durationMinutes <= 15) {
        reasonType = 'SHORT_BREAK';
        reasonLabel = 'توقف قصير / خمول مؤقت';
      } else {
        reasonType = 'UNLOGGED_INACTIVITY';
        reasonLabel = 'توقف عن استخدام الجهاز (خمول غير موثق)';
      }

      return {
        breakNumber: idx + 1,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        startTimeStr: startDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        endTimeStr: endDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        durationSeconds: b.durationSeconds,
        durationMinutes,
        reasonType,
        reasonLabel,
      };
    });

    const totalBreakSeconds = formattedBreaks.reduce((sum, b) => sum + b.durationSeconds, 0);

    return {
      totalBreaksCount: formattedBreaks.length,
      totalBreakSeconds,
      totalBreakMinutes: Math.round(totalBreakSeconds / 60),
      breaks: formattedBreaks
    };
  }

  async getTeamOverview(companyId, date) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const [summaries, activeLogs, appUsages, completedTasks, createdTasks, attendances, deviceSessions, activeTimers] = await Promise.all([
      this.prisma.monitorDailySummary.findMany({
        where: { companyId, date: { gte: startOfDay, lte: endOfDay } }
      }),
      this.prisma.monitorActivityLog.findMany({
        where: { companyId, intervalStart: { gte: startOfDay, lte: endOfDay } },
        select: { employeeId: true, activeSeconds: true, activityScore: true, intervalStart: true, intervalEnd: true }
      }),
      this.prisma.monitorAppUsage.findMany({
        where: {
          companyId,
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        select: { employeeId: true, appName: true, durationSeconds: true }
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          status: { in: ['COMPLETED', 'IN_REVIEW'] },
          OR: [
            { updatedAt: { gte: startOfDay, lte: endOfDay } },
            { completedDate: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        select: { assignedTo: true, id: true, status: true }
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        select: { createdBy: true, id: true, status: true }
      }),
      this.prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startOfDay, lte: endOfDay }
        },
        select: {
          userId: true,
          employeeRelId: true,
          checkIn: true,
          checkOut: true,
          checkInMethod: true
        }
      }).catch(() => []),
      this.prisma.monitorDeviceSession.findMany({
        where: { companyId, isOnline: true },
        select: { employeeId: true, lastHeartbeat: true, deviceName: true, appVersion: true }
      }).catch(() => []),
      this.prisma.timeEntry.findMany({
        where: { companyId, isRunning: true },
        include: {
          task: { select: { id: true, title: true, priority: true } },
          user: { select: { id: true, firstName: true, lastName: true } }
        }
      }).catch(() => [])
    ]);

    // Build attendance map supporting both userId and employeeRelId, merging multiple daily punches
    const attendanceMap = new Map();
    for (const att of (attendances || [])) {
      const keys = [att.userId, att.employeeRelId].filter(Boolean);
      for (const k of keys) {
        if (!attendanceMap.has(k)) {
          attendanceMap.set(k, { ...att });
        } else {
          const existing = attendanceMap.get(k);
          // Preserve earliest checkIn
          if (att.checkIn && (!existing.checkIn || new Date(att.checkIn) < new Date(existing.checkIn))) {
            existing.checkIn = att.checkIn;
            existing.checkInMethod = att.checkInMethod || existing.checkInMethod;
          }
          // Preserve latest checkOut
          if (att.checkOut && (!existing.checkOut || new Date(att.checkOut) > new Date(existing.checkOut))) {
            existing.checkOut = att.checkOut;
          }
        }
      }
    }

    // Build device session map
    const sessionMap = new Map();
    for (const sess of (deviceSessions || [])) {
      if (sess.employeeId) sessionMap.set(sess.employeeId, sess);
    }

    // Build active task timers map
    const activeTimerMap = new Map();
    for (const timer of (activeTimers || [])) {
      if (timer.userId) activeTimerMap.set(timer.userId, timer);
    }

    // Collect all candidate IDs
    const rawIds = new Set([
      ...summaries.map(s => s.employeeId),
      ...activeLogs.map(a => a.employeeId),
      ...appUsages.map(a => a.employeeId),
      ...completedTasks.map(t => t.assignedTo),
      ...createdTasks.map(t => t.createdBy),
      ...(attendances || []).map(a => a.userId),
      ...(attendances || []).map(a => a.employeeRelId),
      ...(deviceSessions || []).map(d => d.employeeId),
      ...(activeTimers || []).map(t => t.userId),
    ].filter(Boolean));

    const employeeIds = Array.from(rawIds);
    const empMap = new Map();

    if (employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId,
          OR: [{ id: { in: employeeIds } }, { userId: { in: employeeIds } }]
        },
        include: { department: true, position: true }
      });

      employees.forEach(e => {
        empMap.set(e.id, e);
        if (e.userId) {
          empMap.set(e.userId, e);
          if (attendanceMap.has(e.userId) && !attendanceMap.has(e.id)) {
            attendanceMap.set(e.id, attendanceMap.get(e.userId));
          }
          if (attendanceMap.has(e.id) && !attendanceMap.has(e.userId)) {
            attendanceMap.set(e.userId, attendanceMap.get(e.id));
          }
          if (activeTimerMap.has(e.userId) && !activeTimerMap.has(e.id)) {
            activeTimerMap.set(e.id, activeTimerMap.get(e.userId));
          }
          if (activeTimerMap.has(e.id) && !activeTimerMap.has(e.userId)) {
            activeTimerMap.set(e.userId, activeTimerMap.get(e.id));
          }
        }
      });

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
            department: { name: u.role === 'COMPANY_ADMIN' ? 'الإدارة العامة' : 'فريق العمل' },
            position: { title: 'موظف' }
          });
        });
      }
    }

    // Aggregate true top apps per employee (deprioritizing generic desktop shells)
    const empAppMap = new Map();
    for (const app of appUsages) {
      if (!empAppMap.has(app.employeeId)) empAppMap.set(app.employeeId, new Map());
      const m = empAppMap.get(app.employeeId);
      const name = String(app.appName || 'Unknown').trim();
      m.set(name, (m.get(name) || 0) + (app.durationSeconds || 0));

      const emp = empMap.get(app.employeeId);
      const altId = (emp?.userId && emp.userId !== app.employeeId) ? emp.userId : (emp?.id && emp.id !== app.employeeId ? emp.id : null);
      if (altId) {
        if (!empAppMap.has(altId)) empAppMap.set(altId, new Map());
        const mAlt = empAppMap.get(altId);
        mAlt.set(name, (mAlt.get(name) || 0) + (app.durationSeconds || 0));
      }
    }

    const empTopApp = new Map();
    for (const [empId, m] of empAppMap.entries()) {
      const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
      const realApp = sorted.find(([name]) => !['سطح المكتب', 'Desktop', 'explorer', 'explorer.exe', 'Windows Explorer', 'مستكشف ويندوز'].includes(name));
      empTopApp.set(empId, realApp ? realApp[0] : (sorted[0] ? sorted[0][0] : 'سطح المكتب'));
    }

    // Task count map mapped to both userId and employee.id
    const taskCountMap = new Map();
    for (const t of completedTasks) {
      if (t.assignedTo) {
        taskCountMap.set(t.assignedTo, (taskCountMap.get(t.assignedTo) || 0) + 1);
        const emp = empMap.get(t.assignedTo);
        if (emp?.id && emp.id !== t.assignedTo) {
          taskCountMap.set(emp.id, (taskCountMap.get(emp.id) || 0) + 1);
        }
      }
    }

    // Created task count map mapped to both userId and employee.id
    const createdTaskCountMap = new Map();
    for (const t of createdTasks) {
      if (t.createdBy) {
        createdTaskCountMap.set(t.createdBy, (createdTaskCountMap.get(t.createdBy) || 0) + 1);
        const emp = empMap.get(t.createdBy);
        if (emp?.id && emp.id !== t.createdBy) {
          createdTaskCountMap.set(emp.id, (createdTaskCountMap.get(emp.id) || 0) + 1);
        }
      }
    }

    // Group and Deduplicate by canonical employee entity to ban duplicate rows
    const grouped = new Map();

    // 1. Process summaries
    for (const s of summaries) {
      const empObj = empMap.get(s.employeeId) || { id: s.employeeId, firstName: s.employeeId };
      const canonicalKey = empObj.id || empObj.userId || s.employeeId;
      const att = attendanceMap.get(canonicalKey) || attendanceMap.get(empObj.userId) || attendanceMap.get(s.employeeId);

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          productivityScores: [],
          lastActivityTime: s.lastActivityTime,
          firstActivityTime: s.firstActivityTime,
          clockInTime: att?.checkIn || s.clockInTime || null,
          clockOutTime: att?.checkOut || s.clockOutTime || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(s.employeeId) || empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          completedTasksCount: taskCountMap.get(canonicalKey) || taskCountMap.get(empObj.userId) || taskCountMap.get(s.employeeId) || 0,
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || createdTaskCountMap.get(s.employeeId) || 0,
        });
      }

      const item = grouped.get(canonicalKey);
      item.totalActiveSeconds += (s.totalActiveSeconds || 0);
      item.totalIdleSeconds += (s.totalIdleSeconds || 0);
      if (s.productivityScore > 0) item.productivityScores.push(s.productivityScore);
      if (s.lastActivityTime && (!item.lastActivityTime || new Date(s.lastActivityTime) > new Date(item.lastActivityTime))) {
        item.lastActivityTime = s.lastActivityTime;
      }
      if (s.firstActivityTime && (!item.firstActivityTime || new Date(s.firstActivityTime) < new Date(item.firstActivityTime))) {
        item.firstActivityTime = s.firstActivityTime;
      }
      if (!item.clockInTime && (att?.checkIn || s.clockInTime)) {
        item.clockInTime = att?.checkIn || s.clockInTime;
      }
      if (!item.clockOutTime && (att?.checkOut || s.clockOutTime)) {
        item.clockOutTime = att?.checkOut || s.clockOutTime;
      }
      if (!item.checkInMethod && att?.checkInMethod) {
        item.checkInMethod = att.checkInMethod;
      }
    }

    // 2. Ensure anyone with active logs is represented even if summary record was delayed
    for (const log of activeLogs) {
      const empObj = empMap.get(log.employeeId) || { id: log.employeeId, firstName: log.employeeId };
      const canonicalKey = empObj.id || empObj.userId || log.employeeId;
      const att = attendanceMap.get(canonicalKey) || attendanceMap.get(empObj.userId) || attendanceMap.get(log.employeeId);

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          productivityScores: [],
          lastActivityTime: log.intervalEnd,
          firstActivityTime: log.intervalStart,
          clockInTime: att?.checkIn || null,
          clockOutTime: att?.checkOut || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(log.employeeId) || empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          completedTasksCount: taskCountMap.get(canonicalKey) || taskCountMap.get(empObj.userId) || taskCountMap.get(log.employeeId) || 0,
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || createdTaskCountMap.get(log.employeeId) || 0,
        });
      }
    }

    // 3. Ensure anyone with attendance or tasks is also represented
    for (const [key, att] of attendanceMap.entries()) {
      const empObj = empMap.get(key) || { id: key, firstName: key };
      const canonicalKey = empObj.id || empObj.userId || key;

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          productivityScores: [],
          lastActivityTime: null,
          firstActivityTime: null,
          clockInTime: att?.checkIn || null,
          clockOutTime: att?.checkOut || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          completedTasksCount: taskCountMap.get(canonicalKey) || taskCountMap.get(empObj.userId) || 0,
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || 0,
        });
      }
    }

    // 4. Ensure anyone who created tasks is also represented
    for (const [key, count] of createdTaskCountMap.entries()) {
      const empObj = empMap.get(key) || { id: key, firstName: key };
      const canonicalKey = empObj.id || empObj.userId || key;

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          productivityScores: [],
          lastActivityTime: null,
          firstActivityTime: null,
          clockInTime: null,
          clockOutTime: null,
          checkInMethod: null,
          status: 'offline',
          topApp: empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          completedTasksCount: taskCountMap.get(canonicalKey) || taskCountMap.get(empObj.userId) || 0,
          createdTasksCount: count || 0,
        });
      }
    }

    // Finalize aggregated items
    const result = Array.from(grouped.values()).map(item => {
      const avgScore = item.productivityScores.length > 0
        ? Math.round(item.productivityScores.reduce((a, b) => a + b, 0) / item.productivityScores.length)
        : (item.totalActiveSeconds > 0 ? 70 : 0);

      const session = sessionMap.get(item.employeeId) || sessionMap.get(item.employee?.userId) || sessionMap.get(item.employee?.id);
      const lastHeartbeatMs = session?.lastHeartbeat ? new Date(session.lastHeartbeat).getTime() : 0;
      const isDeviceConnected = lastHeartbeatMs > 0 && (Date.now() - lastHeartbeatMs < 4 * 60 * 1000);

      const lastActivityMs = item.lastActivityTime ? new Date(item.lastActivityTime).getTime() : 0;
      const isActivityRecent = lastActivityMs > 0 && (Date.now() - lastActivityMs < 4 * 60 * 1000);

      let status = 'offline';
      if (isActivityRecent) {
        status = 'active'; // يعمل بنشاط حالياً (حركة ماوس أو كيبورد خلال آخر 4 دقائق)
      } else if (isDeviceConnected) {
        status = 'idle'; // الجهاز متصل وشغال لكن الموظف متوقف عن العمل أو ترك جهازه
      } else {
        status = 'offline'; // الجهاز مغلق أو انقطعت الكهرباء أو النت
      }

      const lastSeenTime = (session?.lastHeartbeat && (!item.lastActivityTime || new Date(session.lastHeartbeat) > new Date(item.lastActivityTime)))
        ? session.lastHeartbeat
        : item.lastActivityTime;

      // Calculate elapsed attendance duration & untracked gap
      let elapsedAttendanceSeconds = 0;
      let hasMissingClockOut = false;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      if (item.clockInTime) {
        const inMs = new Date(item.clockInTime).getTime();
        if (!isNaN(inMs)) {
          let outMs = item.clockOutTime ? new Date(item.clockOutTime).getTime() : 0;
          if (!outMs || isNaN(outMs)) {
            if (isToday) {
              outMs = Date.now();
            } else {
              // Past day missing clock-out: cap at standard 9-hour shift (32,400s)
              hasMissingClockOut = true;
              outMs = inMs + (9 * 3600 * 1000);
            }
          }
          if (outMs > inMs) {
            elapsedAttendanceSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
            // Absolute sanity cap at 12 hours
            elapsedAttendanceSeconds = Math.min(elapsedAttendanceSeconds, 12 * 3600);
          }
        }
      }

      const trackedDeviceSeconds = (item.totalActiveSeconds || 0) + (item.totalIdleSeconds || 0);
      const untrackedSeconds = (elapsedAttendanceSeconds > trackedDeviceSeconds)
        ? (elapsedAttendanceSeconds - trackedDeviceSeconds)
        : 0;

      const activeTimer = activeTimerMap.get(item.employeeId) || activeTimerMap.get(item.employee?.userId) || activeTimerMap.get(item.employee?.id);
      let activeTask = null;
      if (activeTimer && activeTimer.task) {
        const startMs = new Date(activeTimer.startTime).getTime();
        const elapsedSec = !isNaN(startMs) && Date.now() > startMs ? Math.floor((Date.now() - startMs) / 1000) : 0;
        activeTask = {
          entryId: activeTimer.id,
          taskId: activeTimer.taskId,
          title: activeTimer.task.title,
          priority: activeTimer.task.priority,
          startTime: activeTimer.startTime,
          elapsedSeconds: elapsedSec,
        };
      }

      return {
        employeeId: item.employeeId,
        employee: item.employee,
        totalActiveSeconds: item.totalActiveSeconds,
        totalIdleSeconds: item.totalIdleSeconds,
        productivityScore: avgScore,
        lastActivityTime: item.lastActivityTime,
        firstActivityTime: item.firstActivityTime,
        lastSeenTime,
        deviceName: session?.deviceName || null,
        isDeviceConnected,
        clockInTime: item.clockInTime,
        clockOutTime: item.clockOutTime,
        checkInMethod: item.checkInMethod,
        hasMissingClockOut,
        elapsedAttendanceSeconds,
        untrackedSeconds,
        status,
        topApp: item.topApp,
        completedTasksCount: item.completedTasksCount || 0,
        createdTasksCount: item.createdTasksCount || 0,
        activeTask,
      };
    });

    return result;
  }

  async getEmployeeTimeline(companyId, employeeId, date) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // 1. Resolve employee and user identities
    const [employeeRecord, userRecord] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { companyId, OR: [{ id: employeeId }, { userId: employeeId }] },
        include: {
          department: { select: { name: true } },
          position: { select: { title: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
      }).catch(() => null),
      this.prisma.user.findFirst({
        where: { companyId, id: employeeId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }).catch(() => null),
    ]);

    const resolvedUserId = employeeRecord?.userId || userRecord?.id || employeeId;
    const resolvedEmployeeId = employeeRecord?.id || employeeId;
    const candidateIds = Array.from(new Set([employeeId, resolvedUserId, resolvedEmployeeId].filter(Boolean)));

    // 2. Fetch all telemetry, apps, websites, tasks, attendance, and active device session
    const [activities, apps, websites, summary, completedTasks, createdTasks, attendance, deviceSession, activeTimer] = await Promise.all([
      this.prisma.monitorActivityLog.findMany({
        where: { companyId, employeeId: { in: candidateIds }, intervalStart: { gte: startOfDay, lte: endOfDay } },
        orderBy: { intervalStart: 'asc' },
      }),
      this.prisma.monitorAppUsage.findMany({
        where: {
          companyId,
          employeeId: { in: candidateIds },
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorWebUsage.findMany({
        where: {
          companyId,
          employeeId: { in: candidateIds },
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorDailySummary.findFirst({
        where: { companyId, employeeId: { in: candidateIds }, date: { gte: startOfDay, lte: endOfDay } },
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          assignedTo: { in: candidateIds },
          status: { in: ['COMPLETED', 'IN_REVIEW'] },
          OR: [
            { updatedAt: { gte: startOfDay, lte: endOfDay } },
            { completedDate: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        include: {
          project: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          createdBy: { in: candidateIds },
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.attendance.findFirst({
        where: {
          companyId,
          OR: [
            { userId: { in: candidateIds } },
            { employeeRelId: { in: candidateIds } }
          ],
          date: { gte: startOfDay, lte: endOfDay }
        }
      }).catch(() => null),
      this.prisma.monitorDeviceSession.findFirst({
        where: { companyId, employeeId: { in: candidateIds }, isOnline: true },
        orderBy: { lastHeartbeat: 'desc' }
      }).catch(() => null),
      this.prisma.timeEntry.findFirst({
        where: { companyId, userId: { in: candidateIds }, isRunning: true },
        include: {
          task: { select: { id: true, title: true, priority: true } }
        }
      }).catch(() => null),
    ]);

    // 3. True recalculation directly from activity logs (eliminates zero-telemetry display discrepancy)
    const calcActiveSeconds = activities.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);
    const calcIdleSeconds = activities.reduce((sum, a) => {
      const startMs = a.intervalStart ? new Date(a.intervalStart).getTime() : 0;
      const endMs = a.intervalEnd ? new Date(a.intervalEnd).getTime() : 0;
      const active = Number(a.activeSeconds) || 0;
      if (startMs && endMs && endMs > startMs) {
        const intervalSec = Math.min(300, Math.max(1, Math.floor((endMs - startMs) / 1000)));
        return sum + Math.max(0, intervalSec - active);
      }
      return sum;
    }, 0);

    const calcProdScore = activities.length > 0
      ? Math.round(activities.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activities.length)
      : 0;

    const lastHeartbeatMs = deviceSession?.lastHeartbeat ? new Date(deviceSession.lastHeartbeat).getTime() : 0;
    const isDeviceConnected = lastHeartbeatMs > 0 && (Date.now() - lastHeartbeatMs < 4 * 60 * 1000);
    const lastActivityTimeVal = summary?.lastActivityTime || (activities.length > 0 ? activities[activities.length - 1].intervalEnd : null);
    const lastActMs = lastActivityTimeVal ? new Date(lastActivityTimeVal).getTime() : 0;
    const isActivityRecent = lastActMs > 0 && (Date.now() - lastActMs < 4 * 60 * 1000);

    let currentStatus = 'offline';
    if (isActivityRecent) {
      currentStatus = 'active'; // نشط ويعمل حالياً
    } else if (isDeviceConnected) {
      currentStatus = 'idle'; // الجهاز متصل وشغال لكن متوقف عن الحركة
    } else {
      currentStatus = 'offline'; // الجهاز مغلق أو انقطع الاتصال/الكهرباء
    }

    const lastSeenTime = (deviceSession?.lastHeartbeat && (!lastActivityTimeVal || new Date(deviceSession.lastHeartbeat) > new Date(lastActivityTimeVal)))
      ? deviceSession.lastHeartbeat
      : lastActivityTimeVal;

    const clockInVal = attendance?.checkIn || summary?.clockInTime || null;
    const clockOutVal = attendance?.checkOut || summary?.clockOutTime || null;

    let elapsedAttendanceSeconds = 0;
    let hasMissingClockOut = false;
    if (clockInVal) {
      const inMs = new Date(clockInVal).getTime();
      if (!isNaN(inMs)) {
        let outMs = clockOutVal ? new Date(clockOutVal).getTime() : 0;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        if (!outMs || isNaN(outMs)) {
          if (isToday) {
            outMs = Date.now();
          } else {
            hasMissingClockOut = true;
            outMs = inMs + (9 * 3600 * 1000);
          }
        }
        if (outMs > inMs) {
          elapsedAttendanceSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
          elapsedAttendanceSeconds = Math.min(elapsedAttendanceSeconds, 12 * 3600);
        }
      }
    }

    const trackedDeviceSec = (summary?.totalActiveSeconds && summary.totalActiveSeconds > 0 ? summary.totalActiveSeconds : calcActiveSeconds) +
                             (summary?.totalIdleSeconds && summary.totalIdleSeconds > 0 ? summary.totalIdleSeconds : calcIdleSeconds);
    const untrackedSeconds = elapsedAttendanceSeconds > trackedDeviceSec ? (elapsedAttendanceSeconds - trackedDeviceSec) : 0;

    const finalSummary = {
      ...(summary || {}),
      totalActiveSeconds: (summary?.totalActiveSeconds && summary.totalActiveSeconds > 0) ? summary.totalActiveSeconds : calcActiveSeconds,
      totalIdleSeconds: (summary?.totalIdleSeconds && summary.totalIdleSeconds > 0) ? summary.totalIdleSeconds : calcIdleSeconds,
      productivityScore: (summary?.productivityScore && summary.productivityScore > 0) ? summary.productivityScore : calcProdScore,
      firstActivityTime: summary?.firstActivityTime || (activities.length > 0 ? activities[0].intervalStart : null),
      lastActivityTime: lastActivityTimeVal,
      lastSeenTime,
      isDeviceConnected,
      status: currentStatus,
      deviceName: deviceSession?.deviceName || null,
      clockInTime: clockInVal,
      clockOutTime: clockOutVal,
      checkInMethod: attendance?.checkInMethod || null,
      hasMissingClockOut,
      elapsedAttendanceSeconds,
      untrackedSeconds,
      activeTask: activeTimer?.task ? {
        entryId: activeTimer.id,
        taskId: activeTimer.taskId,
        title: activeTimer.task.title,
        priority: activeTimer.task.priority,
        startTime: activeTimer.startTime,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000)),
      } : null,
    };

    // 4. Task Performance Calculation (Deterministic logic)
    const tasksCount = completedTasks.length;
    const totalActive = finalSummary.totalActiveSeconds || 0;
    const totalIdle = finalSummary.totalIdleSeconds || 0;
    const totalSessionSeconds = totalActive + totalIdle || 1;

    const avgActiveSecondsPerTask = tasksCount > 0 ? Math.round(totalActive / tasksCount) : 0;
    const avgIdleSecondsPerTask = tasksCount > 0 ? Math.round(totalIdle / tasksCount) : 0;
    const activeRatioPct = Math.round((totalActive / totalSessionSeconds) * 100);
    const idleRatioPct = Math.round((totalIdle / totalSessionSeconds) * 100);
    const idleToActiveRatio = totalActive > 0 ? (totalIdle / totalActive).toFixed(1) : '0.0';

    const taskPerformance = {
      activeTask: activeTimer?.task ? {
        entryId: activeTimer.id,
        taskId: activeTimer.taskId,
        title: activeTimer.task.title,
        priority: activeTimer.task.priority,
        startTime: activeTimer.startTime,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000)),
      } : null,
      tasksCompletedCount: tasksCount,
      tasksCreatedCount: createdTasks.length,
      avgActiveSecondsPerTask,
      avgIdleSecondsPerTask,
      activeRatioPct,
      idleRatioPct,
      idleToActiveRatio,
      tasks: completedTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        completedAt: t.completedDate || t.updatedAt,
        projectName: t.project?.name || 'عام',
      })),
      createdTasks: createdTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        assignedToName: t.assignee ? [t.assignee.firstName, t.assignee.lastName].filter(Boolean).join(' ') : 'غير محدد',
        projectName: t.project?.name || 'عام',
      }))
    };

    // 5. Break Detection Calculation
    const breaksSummary = this.computeBreaksFromActivities(activities);

    // 6. Aggregate apps
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

    // 7. Aggregate web
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
      summary: finalSummary,
      employee: employeeRecord || {
        id: resolvedUserId,
        firstName: userRecord ? [userRecord.firstName, userRecord.lastName].filter(Boolean).join(' ') : 'الموظف',
        department: { name: 'الإدارة العامة' },
        position: { title: 'موظف' }
      },
      taskPerformance,
      breaksSummary,
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
    const res = await this.prisma.monitorAppCategory.upsert({
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

    try {
      if (categoryData.type === 'app') {
        await this.prisma.monitorAppUsage.updateMany({
          where: { companyId, appName: categoryData.name },
          data: { category: categoryData.category }
        });
      } else {
        await this.prisma.monitorWebUsage.updateMany({
          where: { companyId, domain: categoryData.name },
          data: { category: categoryData.category }
        });
      }
    } catch (e) {
      console.warn('[MonitorService] Failed to cascade category update:', e.message);
    }

    return res;
  }

  async recalculateDailySummary(companyId, employeeId, date) {
    return this.prisma.monitorDailySummary.findUnique({
      where: { companyId_employeeId_date: { companyId, employeeId, date: new Date(date) } }
    });
  }
}

module.exports = new MonitorService();
