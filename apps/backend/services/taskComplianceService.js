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

const { getSharedPrismaClient } = require('../utils/prismaClient');

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

    // 2. Returns
    const retCount = Number(t.returnCount || 0);
    if (retCount > 0) {
      bucket.totalReturns += retCount;
      bucket.tasksWithReturnsCount += 1;
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

    // Quality Score (0-100): starts at 100, penalized by no-evidence deliveries and returns
    const complianceScore = Math.max(0, Math.min(100, Math.round(
      100 - (deliveriesWithoutEvidenceRate * 0.5) - (returnRate * 0.3) - (m.blockedReviewTasks.length * 5)
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

  return {
    periodDays,
    generatedAt: now.toISOString(),
    overall: {
      totalTasks,
      totalDeliveries: allDeliveries,
      deliveriesWithoutEvidence: allWithoutEvidence,
      deliveriesWithoutEvidenceRate: allDeliveries > 0 ? Math.round((allWithoutEvidence / allDeliveries) * 100) : 0,
      totalReturns: allReturns,
      avgApprovalTimeHours: overallAvgApprovalHours,
      blockedReviewCount: allBlockedTasks.length,
      blockedReviewTasks: allBlockedTasks.slice(0, 50),
      activeMembersCount: members.length
    },
    members: members.sort((a, b) => b.deliveriesWithoutEvidenceRate - a.deliveriesWithoutEvidenceRate || b.totalAssigned - a.totalAssigned)
  };
}

module.exports = {
  computeTaskComplianceReport
};
