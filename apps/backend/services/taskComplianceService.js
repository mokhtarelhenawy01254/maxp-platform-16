/**
 * taskComplianceService.js
 * 
 * Computes individual and team-wide Task Compliance and Quality metrics across 6 key indicators:
 * 1. نسبة تسليمات بدون دليل (% deliveries without evidence)
 * 2. معدل الإرجاع وإجمالي عدد الإرجاعات (Return rate & total return count)
 * 3. متوسط زمن الاعتماد (Average approval time in hours/days)
 * 4. مهام مسدودة > ٤٨ ساعة (Tasks blocked in review > 48h)
 * 5. وقت نشاط بدون مهمة (Active time without a task)
 * 6. أقدم مهمة مفتوحة (Oldest open task)
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Computes compliance report for a company, with optional filter by memberId / userId.
 * 
 * @param {string} companyId - Tenant company ID
 * @param {Object} options - { userId, periodDays }
 * @returns {Promise<Object>} Full compliance telemetry report
 */
async function computeTaskComplianceReport(companyId, options = {}) {
  const prisma = getSharedPrismaClient();
  const { userId = null, periodDays = 30 } = options;
  const now = new Date();
  const periodStart = periodDays ? new Date(Date.now() - periodDays * 86400000) : null;

  // Base where clause
  const taskWhere = {
    companyId,
    ...(userId ? { assignedTo: userId } : {}),
    ...(periodStart ? { createdAt: { gte: periodStart } } : {})
  };

  // Fetch all tasks matching company / user
  const tasks = await prisma.task.findMany({
    where: taskWhere,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      assignedTo: true,
      createdBy: true,
      hasEvidence: true,
      missingEvidence: true,
      evidence: true,
      returnCount: true,
      lastReturnReason: true,
      returnReasonType: true,
      returnSeverity: true,
      submittedForReviewAt: true,
      approvedAt: true,
      completedDate: true,
      createdAt: true,
      updatedAt: true,
      actualHours: true,
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by member for individual metrics
  const memberMap = new Map();

  function getMemberBucket(uId, assigneeObj) {
    if (!memberMap.has(uId)) {
      const name = assigneeObj
        ? `${assigneeObj.firstName || ''} ${assigneeObj.lastName || ''}`.trim() || assigneeObj.email
        : 'غير محدد';
      memberMap.set(uId, {
        userId: uId,
        userName: name,
        email: assigneeObj?.email || '',
        avatar: assigneeObj?.avatar || null,
        totalAssigned: 0,
        completedCount: 0,
        inReviewCount: 0,
        inProgressCount: 0,
        totalDeliveries: 0,
        deliveriesWithoutEvidence: 0,
        totalReturns: 0,
        returnsMinorCount: 0,
        returnsMediumCount: 0,
        returnsSevereCount: 0,
        tasksWithReturnsCount: 0,
        approvalDurationsHours: [],
        blockedReviewTasks: [],
        oldestOpenTask: null,
        totalTrackedHours: 0
      });
    }
    return memberMap.get(uId);
  }

  for (const t of tasks) {
    const bucket = getMemberBucket(t.assignedTo, t.assignee);
    bucket.totalAssigned += 1;
    bucket.totalTrackedHours += Number(t.actualHours || 0);

    const normStatus = String(t.status || '').toUpperCase();
    const isDelivered = normStatus === 'IN_REVIEW' || normStatus === 'COMPLETED' || Boolean(t.submittedForReviewAt);

    if (normStatus === 'COMPLETED') bucket.completedCount += 1;
    if (normStatus === 'IN_REVIEW') bucket.inReviewCount += 1;
    if (normStatus === 'IN_PROGRESS') bucket.inProgressCount += 1;

    // 1. Deliveries & Evidence
    if (isDelivered) {
      bucket.totalDeliveries += 1;
      const isMissingEvidence = Boolean(t.missingEvidence) || (!t.hasEvidence && !t.evidence);
      if (isMissingEvidence) {
        bucket.deliveriesWithoutEvidence += 1;
      }
    }

    // 2. Returns & Severities
    const retCount = Number(t.returnCount || 0);
    if (retCount > 0) {
      bucket.totalReturns += retCount;
      bucket.tasksWithReturnsCount += 1;
      const sev = Number(t.returnSeverity || 1);
      if (sev === 3) {
        bucket.returnsSevereCount += retCount;
      } else if (sev === 2) {
        bucket.returnsMediumCount += retCount;
      } else {
        bucket.returnsMinorCount += retCount;
      }
    }

    // 3. Approval Time
    if (normStatus === 'COMPLETED' && t.submittedForReviewAt) {
      const finishTime = t.approvedAt || t.completedDate || t.updatedAt;
      if (finishTime) {
        const diffMs = new Date(finishTime).getTime() - new Date(t.submittedForReviewAt).getTime();
        if (diffMs > 0) {
          const diffHours = diffMs / 3600000;
          bucket.approvalDurationsHours.push(diffHours);
        }
      }
    }

    // 4. Blocked in Review > 48h
    if (normStatus === 'IN_REVIEW') {
      const reviewStart = t.submittedForReviewAt || t.updatedAt;
      const hoursInReview = (now.getTime() - new Date(reviewStart).getTime()) / 3600000;
      if (hoursInReview >= 48) {
        bucket.blockedReviewTasks.push({
          id: t.id,
          title: t.title,
          priority: t.priority,
          hoursInReview: Math.round(hoursInReview),
          missingEvidence: Boolean(t.missingEvidence) || (!t.hasEvidence && !t.evidence),
          submittedForReviewAt: reviewStart
        });
      }
    }

    // 6. Oldest open task
    if (normStatus !== 'COMPLETED' && normStatus !== 'CANCELLED') {
      const ageDays = Math.round((now.getTime() - new Date(t.createdAt).getTime()) / 86400000);
      if (!bucket.oldestOpenTask || new Date(t.createdAt).getTime() < new Date(bucket.oldestOpenTask.createdAt).getTime()) {
        bucket.oldestOpenTask = {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt,
          daysOpen: ageDays
        };
      }
    }
  }

  // 5. Activity Time Without Task (Shift / Attendance hours vs Task Tracked hours)
  const userIds = Array.from(memberMap.keys()).filter(Boolean);
  let shiftHoursByUser = new Map();
  try {
    const shifts = await prisma.workShift?.findMany({
      where: {
        companyId,
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
        ...(periodStart ? { startTime: { gte: periodStart } } : {})
      },
      select: { userId: true, duration: true, startTime: true, endTime: true }
    }).catch(() => []);

    if (Array.isArray(shifts)) {
      for (const s of shifts) {
        const h = (s.duration ? s.duration / 60 : (s.endTime ? (new Date(s.endTime) - new Date(s.startTime)) / 3600000 : 0));
        shiftHoursByUser.set(s.userId, (shiftHoursByUser.get(s.userId) || 0) + Math.max(0, h));
      }
    }
  } catch (err) {
    // Ignore shift lookup failure
  }

  // Compute final per-member metrics
  const members = Array.from(memberMap.values()).map((m) => {
    const deliveriesWithoutEvidenceRate = m.totalDeliveries > 0
      ? Math.round((m.deliveriesWithoutEvidence / m.totalDeliveries) * 100)
      : 0;

    const returnRate = m.totalDeliveries > 0
      ? Math.round((m.tasksWithReturnsCount / m.totalDeliveries) * 100)
      : 0;

    const avgApprovalTimeHours = m.approvalDurationsHours.length > 0
      ? Math.round((m.approvalDurationsHours.reduce((a, b) => a + b, 0) / m.approvalDurationsHours.length) * 10) / 10
      : 0;

    const shiftTotalHours = shiftHoursByUser.get(m.userId) || 0;
    const activeTimeWithoutTaskHours = Math.max(0, Math.round((shiftTotalHours - m.totalTrackedHours) * 10) / 10);

    // Quality Score (0-100): 100 − (10×بسيط + 25×متوسط + 50×جسيم)
    const qualityDeductions = (m.returnsMinorCount * 10) + (m.returnsMediumCount * 25) + (m.returnsSevereCount * 50);
    const qualityScore = Math.max(0, 100 - qualityDeductions);

    // Overall Compliance Score (0-100): starts at 100, penalized by no-evidence deliveries, quality score, and SLA
    const complianceScore = Math.max(0, Math.min(100, Math.round(
      100 - (deliveriesWithoutEvidenceRate * 0.4) - ((100 - qualityScore) * 0.4) - (m.blockedReviewTasks.length * 5)
    )));

    return {
      userId: m.userId,
      userName: m.userName,
      email: m.email,
      avatar: m.avatar,
      totalAssigned: m.totalAssigned,
      completedCount: m.completedCount,
      inReviewCount: m.inReviewCount,
      totalDeliveries: m.totalDeliveries,
      deliveriesWithoutEvidence: m.deliveriesWithoutEvidence,
      deliveriesWithoutEvidenceRate,
      totalReturns: m.totalReturns,
      returnsMinorCount: m.returnsMinorCount,
      returnsMediumCount: m.returnsMediumCount,
      returnsSevereCount: m.returnsSevereCount,
      qualityScore,
      returnRate,
      avgApprovalTimeHours,
      blockedReviewCount: m.blockedReviewTasks.length,
      blockedReviewTasks: m.blockedReviewTasks,
      activeTimeWithoutTaskHours,
      totalTrackedHours: Math.round(m.totalTrackedHours * 10) / 10,
      oldestOpenTask: m.oldestOpenTask,
      complianceScore
    };
  });

  // Overall Company Aggregates
  const totalTasks = tasks.length;
  const allDeliveries = members.reduce((sum, m) => sum + m.totalDeliveries, 0);
  const allWithoutEvidence = members.reduce((sum, m) => sum + m.deliveriesWithoutEvidence, 0);
  const allReturns = members.reduce((sum, m) => sum + m.totalReturns, 0);
  const allBlockedTasks = members.flatMap((m) => m.blockedReviewTasks);

  const allDurations = members.flatMap((m) => m.approvalDurationsHours || []);
  const overallAvgApprovalHours = allDurations.length > 0
    ? Math.round((allDurations.reduce((a, b) => a + b, 0) / allDurations.length) * 10) / 10
    : 0;

  const overallQualityScore = members.length > 0
    ? Math.round(members.reduce((acc, m) => acc + m.qualityScore, 0) / members.length)
    : 100;

  return {
    periodDays,
    generatedAt: now.toISOString(),
    overall: {
      totalTasks,
      totalDeliveries: allDeliveries,
      deliveriesWithoutEvidence: allWithoutEvidence,
      deliveriesWithoutEvidenceRate: allDeliveries > 0 ? Math.round((allWithoutEvidence / allDeliveries) * 100) : 0,
      totalReturns: allReturns,
      overallQualityScore,
      avgApprovalTimeHours: overallAvgApprovalHours,
      blockedReviewCount: allBlockedTasks.length,
      blockedReviewTasks: allBlockedTasks.slice(0, 50),
      activeMembersCount: members.length
    },
    members: members.sort((a, b) => b.deliveriesWithoutEvidenceRate - a.deliveriesWithoutEvidenceRate || b.totalAssigned - a.totalAssigned)
  };
}

/**
 * Computes time evaluation report for tasks:
 * estimatedHours, actualHours (from TimeEntry in minutes), diffPct,
 * sessionsCount, firstSession, lastSession, reworkMinutes (tracked time after first review/return).
 *
 * @param {string} companyId
 * @param {Object} options - { from, to, assignedTo }
 * @returns {Promise<Object>}
 */
async function computeTimeEvaluationReport(companyIdOrPrisma, optionsOrCompanyId = {}, maybeOptions = {}) {
  let prisma = getSharedPrismaClient();
  let companyId = null;
  let options = {};

  if (companyIdOrPrisma && typeof companyIdOrPrisma === 'object' && (companyIdOrPrisma.task || companyIdOrPrisma.$queryRaw || typeof companyIdOrPrisma.findMany === 'function')) {
    prisma = companyIdOrPrisma;
    if (typeof optionsOrCompanyId === 'string') {
      companyId = optionsOrCompanyId;
      options = maybeOptions || {};
    } else if (optionsOrCompanyId && typeof optionsOrCompanyId === 'object') {
      companyId = optionsOrCompanyId.companyId;
      options = optionsOrCompanyId;
    }
  } else if (typeof companyIdOrPrisma === 'string') {
    companyId = companyIdOrPrisma;
    options = optionsOrCompanyId || {};
  } else if (companyIdOrPrisma && typeof companyIdOrPrisma === 'object') {
    companyId = companyIdOrPrisma.companyId;
    options = companyIdOrPrisma;
  }

  if (!companyId && options && options.companyId) {
    companyId = options.companyId;
  }

  if (companyId && typeof companyId === 'object' && companyId.companyId) {
    companyId = companyId.companyId;
  }

  const { from = null, to = null, assignedTo = null } = options || {};

  const where = {
    companyId: typeof companyId === 'string' ? companyId : (options?.companyId || ''),
    ...(assignedTo ? { assignedTo } : {}),
  };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      estimatedHours: true,
      actualHours: true,
      returnCount: true,
      returnReasonType: true,
      returnSeverity: true,
      submittedForReviewAt: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      project: {
        select: {
          id: true,
          name: true,
        }
      },
      time_entries: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          duration: true,
          isRunning: true,
        },
        orderBy: { startTime: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  let totalEstimatedHours = 0;
  let totalActualMinutes = 0;
  let totalReworkMinutes = 0;
  let tasksWithTimerCount = 0;

  const items = tasks.map((t) => {
    const rawEstimated = t.estimatedHours !== undefined && t.estimatedHours !== null
      ? Number(t.estimatedHours)
      : (t.estimatedMinutes ? Number(t.estimatedMinutes) / 60 : 0);
    const estimatedHours = Math.round(rawEstimated * 10) / 10;
    totalEstimatedHours += estimatedHours;

    const entries = Array.isArray(t.timeEntries) ? t.timeEntries : (Array.isArray(t.time_entries) ? t.time_entries : []);
    const sessionsCount = entries.length;

    if (sessionsCount === 0) {
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectName: t.project?.name || '—',
        assignedToName: t.assignee
          ? `${t.assignee.firstName || ''} ${t.assignee.lastName || ''}`.trim() || t.assignee.email
          : '—',
        estimatedHours: estimatedHours > 0 ? estimatedHours : '—',
        actualHours: '—',
        actualMinutes: '—',
        diffPct: '—',
        diffMinutes: 0,
        accuracyPct: estimatedHours === 0 ? 100 : '—',
        sessionsCount: 0,
        firstSession: '—',
        lastSession: '—',
        reworkMinutes: Number(t.returnCount || 0) > 0 ? 0 : '—',
        returnCount: Number(t.returnCount || 0),
        returnReasonType: t.returnReasonType || '—',
        returnSeverity: t.returnSeverity || '—',
      };
    }

    tasksWithTimerCount += 1;
    let taskDurationMinutes = 0;
    let reworkMins = 0;

    let reviewDate = t.submittedForReviewAt ? new Date(t.submittedForReviewAt).getTime() : null;
    const activities = Array.isArray(t.taskActivities) ? t.taskActivities : [];
    if (!reviewDate && activities.length > 0) {
      const returnAct = activities.find(a => String(a.details || '').includes('IN_REVIEW') || String(a.action || '').includes('RETURN') || String(a.action || '').includes('REVISION'));
      if (returnAct) {
        reviewDate = new Date(returnAct.createdAt).getTime();
      }
    }

    for (const entry of entries) {
      const dur = Number(entry.duration || 0);
      taskDurationMinutes += dur;

      const entryTime = entry.startTime ? new Date(entry.startTime).getTime() : (entry.createdAt ? new Date(entry.createdAt).getTime() : 0);
      if (reviewDate && entryTime >= reviewDate) {
        reworkMins += dur;
      }
    }

    totalActualMinutes += taskDurationMinutes;
    totalReworkMinutes += reworkMins;

    const actualHours = Math.round((taskDurationMinutes / 60) * 10) / 10;
    let diffPct = '—';
    let diffMinutes = 0;
    let accuracyPct = 100;

    if (estimatedHours > 0) {
      const actualH = taskDurationMinutes / 60;
      diffPct = Math.round(((actualH - estimatedHours) / estimatedHours) * 100);
      diffMinutes = taskDurationMinutes - Math.round(estimatedHours * 60);
      accuracyPct = Math.max(0, 100 - Math.abs(diffPct));
    } else if (taskDurationMinutes > 0) {
      accuracyPct = 0;
    }

    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectName: t.project?.name || '—',
      assignedToName: t.assignee
        ? `${t.assignee.firstName || ''} ${t.assignee.lastName || ''}`.trim() || t.assignee.email
        : '—',
      estimatedHours: estimatedHours > 0 ? estimatedHours : '—',
      actualHours,
      actualMinutes: taskDurationMinutes,
      diffPct,
      diffMinutes,
      accuracyPct,
      sessionsCount,
      firstSession: entries[0]?.startTime ? new Date(entries[0].startTime).toISOString() : '—',
      lastSession: entries[entries.length - 1]?.startTime ? new Date(entries[entries.length - 1].startTime).toISOString() : '—',
      reworkMinutes: reworkMins,
      returnCount: Number(t.returnCount || 0),
      returnReasonType: t.returnReasonType || '—',
      returnSeverity: t.returnSeverity || '—',
    };
  });

  const validAccuracyItems = items.filter(i => typeof i.accuracyPct === 'number');
  const overallAccuracyPct = validAccuracyItems.length > 0
    ? Math.round(validAccuracyItems.reduce((acc, i) => acc + i.accuracyPct, 0) / validAccuracyItems.length)
    : 100;

  const kpisData = {
    totalTasks: tasks.length,
    tasksWithTimer: tasksWithTimerCount,
    totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    totalActualHours: Math.round((totalActualMinutes / 60) * 10) / 10,
    totalReworkMinutes,
    totalReworkHours: Math.round((totalReworkMinutes / 60) * 10) / 10,
    overallAccuracyPct,
  };

  return {
    kpis: kpisData,
    summary: kpisData,
    tasks: items
  };
}

module.exports = {
  computeTaskComplianceReport,
  computeTimeEvaluationReport
};
