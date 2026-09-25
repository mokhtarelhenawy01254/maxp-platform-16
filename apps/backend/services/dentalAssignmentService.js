const { getSharedPrismaClient } = require('./sharedDatabase');
const { round2 } = require('../utils/dentalLabHelpers');
const { getFinancePolicy, resolvePostingMode, resolveTreasuryAccount, SOURCE_TYPES, POSTING_STATUS } = require('./financialPostingService');
const { getStageTemplatesForWorkType } = require('./dentalStageTemplateService');

/**
 * Standard working days default: Sun(0) to Thu(4) + Sat(6), Friday(5) off
 */
const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4, 6];

/**
 * Check if a technician is on duty today
 */
function isTechnicianOnDuty(technician, date = new Date()) {
  const checkDate = (date instanceof Date && !isNaN(date)) ? date : new Date(date || Date.now());
  const dayOfWeek = checkDate.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

  const workingDays = Array.isArray(technician.workingDays)
    ? technician.workingDays
    : (Array.isArray(technician.workDays) ? technician.workDays : DEFAULT_WORKING_DAYS);

  // 1. Day of week check
  if (!workingDays.includes(dayOfWeek)) {
    return { onDuty: false, reason: 'يوم عطلة أسبوعية للفني' };
  }

  // 2. Vacations check
  if (Array.isArray(technician.vacations) && technician.vacations.length > 0) {
    const todayStr = checkDate.toISOString().split('T')[0];
    for (const vac of technician.vacations) {
      if (vac && vac.startDate && vac.endDate) {
        if (todayStr >= vac.startDate && todayStr <= vac.endDate) {
          return { onDuty: false, reason: `إجازة استثنائية: ${vac.reason || 'إجازة مصرحة'}` };
        }
      }
    }
  }

  return { onDuty: true, reason: 'متاح للعمل' };
}

/**
 * Read full lab automation & policy settings
 */
async function getLabPolicies(prisma, companyId) {
  try {
    const settingRow = await prisma.dentalSetting.findFirst({
      where: { companyId, key: 'labPolicies' },
    });
    const p = settingRow?.value || {};

    return {
      assignment: {
        mode: p.assignment?.mode || 'SUGGEST', // OFF | SUGGEST | AUTO
        strategy: p.assignment?.strategy || 'LEAST_LOADED', // LEAST_LOADED | OLDEST_WAITING | ROUND_ROBIN | BY_ROLE_MATCH
        respectSchedule: p.assignment?.respectSchedule !== false,
        dailyCapPerTechnician: Number(p.assignment?.dailyCapPerTechnician) || 0,
        stageScope: p.assignment?.stageScope || 'STAGE', // STAGE | CASE
        fallbackMode: p.assignment?.fallbackMode || 'SUGGEST',
      },
      escalation: {
        enabled: p.escalation?.enabled !== false,
        afterHoursInStage: Number(p.escalation?.afterHoursInStage) || 24,
        target: p.escalation?.target || 'BACKUP_ROLE', // BACKUP_ROLE | SUPERVISOR | SPECIFIC
        maxLevels: Number(p.escalation?.maxLevels) || 2,
        notify: p.escalation?.notify !== false,
      },
      dueDate: {
        fromWorkType: p.dueDate?.fromWorkType !== false,
        urgentRule: p.dueDate?.urgentRule || 'PERCENT', // PERCENT | URGENT_DAYS | FIXED_DAYS
        urgentValue: Number(p.dueDate?.urgentValue) || 50, // 50% default
        minDays: Number(p.dueDate?.minDays) || 1,
      },
      fields: {
        patientPhoneRequired: Boolean(p.fields?.patientPhoneRequired),
        requireToothAndShade: Boolean(p.fields?.requireToothAndShade),
      },
      notify: {
        patientEnabled: Boolean(p.notify?.patientEnabled),
        doctorEnabled: p.notify?.doctorEnabled !== false,
      },
      stages: {
        usePerTypeTemplate: p.stages?.usePerTypeTemplate !== false,
      },
      finance: {
        caseInvoicePosting: p.finance?.caseInvoicePosting || 'CONFIRM',
        supplierPaymentPosting: p.finance?.supplierPaymentPosting || 'CONFIRM',
        technicianPayoutPosting: p.finance?.technicianPayoutPosting || 'CONFIRM',
        bomStockConsumption: p.finance?.bomStockConsumption || 'CONFIRM',
        outsourcePosting: p.finance?.outsourcePosting || 'CONFIRM',
        requiredAccount: Boolean(p.finance?.requiredAccount),
        defaultTreasuryAccountId: p.finance?.defaultTreasuryAccountId || null,
        autoEnabledAt: p.finance?.autoEnabledAt || null,
      },
    };
  } catch (err) {
    console.warn('Error reading lab policies, using defaults:', err.message);
    return {
      assignment: { mode: 'SUGGEST', strategy: 'LEAST_LOADED', respectSchedule: true, dailyCapPerTechnician: 0, stageScope: 'STAGE', fallbackMode: 'SUGGEST' },
      escalation: { enabled: true, afterHoursInStage: 24, target: 'BACKUP_ROLE', maxLevels: 2, notify: true },
      dueDate: { fromWorkType: true, urgentRule: 'PERCENT', urgentValue: 50, minDays: 1 },
      fields: { patientPhoneRequired: false, requireToothAndShade: false },
      notify: { patientEnabled: false, doctorEnabled: true },
      stages: { usePerTypeTemplate: true },
      finance: { caseInvoicePosting: 'CONFIRM', supplierPaymentPosting: 'CONFIRM', technicianPayoutPosting: 'CONFIRM', bomStockConsumption: 'CONFIRM', outsourcePosting: 'CONFIRM', requiredAccount: false, defaultTreasuryAccountId: null },
    };
  }
}

/**
 * Calculate expected due date based on lead time and urgency settings
 */
function calculateExpectedDueDate(leadTimeDays = 5, priority = 'NORMAL', dueDatePolicy = {}, urgentLeadTimeDays = null) {
  const baseDays = Math.max(1, parseInt(leadTimeDays, 10) || 5);
  let effectiveDays = baseDays;

  const prio = String(priority || 'NORMAL').toUpperCase();

  if (prio === 'STAT') {
    effectiveDays = Math.max(1, dueDatePolicy.minDays || 1);
  } else if (prio === 'URGENT') {
    if (urgentLeadTimeDays && Number(urgentLeadTimeDays) > 0) {
      effectiveDays = Number(urgentLeadTimeDays);
    } else {
      const rule = dueDatePolicy.urgentRule || 'PERCENT';
      const val = Number(dueDatePolicy.urgentValue) || 50;
      if (rule === 'PERCENT') {
        effectiveDays = Math.max(1, Math.ceil(baseDays * (val / 100)));
      } else if (rule === 'FIXED_DAYS') {
        effectiveDays = Math.max(1, val);
      } else {
        effectiveDays = Math.max(1, Math.ceil(baseDays * 0.5));
      }
    }
  }

  // Ensure not less than minDays
  const minDays = Number(dueDatePolicy.minDays) || 1;
  effectiveDays = Math.max(minDays, effectiveDays);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + effectiveDays);

  return {
    dueDate: targetDate,
    dueDateString: targetDate.toISOString().split('T')[0],
    leadDays: effectiveDays,
    baseDays,
    rationale: prio === 'URGENT'
      ? `تم حساب ${effectiveDays} يوم بناءً على الاستعجال (${dueDatePolicy.urgentRule || 'نسبة 50%'} من مدة النوع ${baseDays} يوم)`
      : prio === 'STAT'
        ? `أولوية طارئة جدًا (STAT) - تسليم خلال ${effectiveDays} يوم`
        : `المدة القياسية لنوع الشغل (${baseDays} يوم)`,
  };
}

/**
 * Select the best technician for a stage or case
 */
async function selectTechnicianForAssignment(prisma, companyId, { requiredRole = null, date = new Date() } = {}) {
  const policies = await getLabPolicies(prisma, companyId);
  const { mode, strategy, respectSchedule, dailyCapPerTechnician, fallbackMode } = policies.assignment;

  if (mode === 'OFF') {
    return { selectedTechnician: null, rationale: 'الإسناد التلقائي معطّل', candidates: [] };
  }

  // Fetch all active technicians
  const technicians = await prisma.dentalTechnician.findMany({
    where: { companyId, isActive: true },
  });

  if (technicians.length === 0) {
    return { selectedTechnician: null, rationale: 'لا يوجد فنيون نشطون في المعمل', candidates: [] };
  }

  // Filter 1: Schedule & Vacations
  let eligible = [];
  const offDuty = [];

  for (const tech of technicians) {
    if (respectSchedule) {
      const dutyCheck = isTechnicianOnDuty(tech, date);
      if (!dutyCheck.onDuty) {
        offDuty.push({ tech, reason: dutyCheck.reason });
        continue;
      }
    }

    // Filter 2: Daily Cap
    const cap = tech.dailyCap > 0 ? tech.dailyCap : dailyCapPerTechnician;
    if (cap > 0) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const assignedTodayCount = await prisma.dentalCaseAssignment.count({
        where: {
          technicianId: tech.id,
          assignedAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (assignedTodayCount >= cap) {
        offDuty.push({ tech, reason: `تجاوز السقف اليومي (${assignedTodayCount}/${cap})` });
        continue;
      }
    }

    eligible.push(tech);
  }

  // Guard: If AUTO mode but 0 technicians have configured working schedules or all are off
  if (eligible.length === 0) {
    return {
      selectedTechnician: null,
      modeFallback: 'SUGGEST',
      guardWarning: 'جميع الفنيين في عطلة أو تجاوزوا السقف اليومي، تم الرجوع لوضع الاقتراح اليدوي',
      rationale: 'لا يوجد فني متاح يطابق جدول العمل اليوم',
      candidates: [],
      offDuty,
    };
  }

  // Filter 3: Role match if specified
  let roleMatched = eligible;
  if (requiredRole && requiredRole !== 'GENERAL_TECHNICIAN') {
    const exact = eligible.filter((t) => t.role === requiredRole);
    if (exact.length > 0) roleMatched = exact;
  }

  // Count active load for candidates
  const candidateScores = [];
  for (const tech of roleMatched) {
    const activeStagesCount = await prisma.dentalCaseStage.count({
      where: {
        assigneeId: tech.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    candidateScores.push({
      technician: tech,
      activeLoad: activeStagesCount,
      roleMatch: tech.role === requiredRole,
    });
  }

  // Apply Strategy
  let best = candidateScores[0];
  if (strategy === 'LEAST_LOADED' || !strategy) {
    candidateScores.sort((a, b) => a.activeLoad - b.activeLoad);
    best = candidateScores[0];
  } else if (strategy === 'BY_ROLE_MATCH') {
    candidateScores.sort((a, b) => (b.roleMatch ? 1 : 0) - (a.roleMatch ? 1 : 0) || a.activeLoad - b.activeLoad);
    best = candidateScores[0];
  } else {
    // ROUND_ROBIN or OLDEST_WAITING
    candidateScores.sort((a, b) => a.activeLoad - b.activeLoad);
    best = candidateScores[0];
  }

  const rationale = `الأقل تحميلاً (${best.activeLoad} مراحل نشطة)${best.roleMatch ? `، ومطابق للدور (${best.technician.role})` : ''} ومتاح للعمل اليوم`;

  return {
    selectedTechnician: best.technician,
    activeLoad: best.activeLoad,
    rationale,
    effectiveMode: mode,
    candidates: candidateScores.map((c) => ({
      id: c.technician.id,
      name: c.technician.name,
      role: c.technician.role,
      activeLoad: c.activeLoad,
    })),
    offDuty,
  };
}

/**
 * Run escalation monitor on active cases/stages exceeding SLA
 */
async function runEscalationCheck(companyId, { userId = 'SYSTEM_ESCALATION' } = {}) {
  const prisma = getSharedPrismaClient();
  const policies = await getLabPolicies(prisma, companyId);
  const { escalation } = policies;

  if (!escalation.enabled) {
    return { executed: false, reason: 'ESCALATION_DISABLED', escalatedCount: 0 };
  }

  const hoursThreshold = escalation.afterHoursInStage || 24;
  const cutoffDate = new Date(Date.now() - hoursThreshold * 3600 * 1000);

  // Find stages in progress exceeding hours
  const overdueStages = await prisma.dentalCaseStage.findMany({
    where: {
      case: { companyId, isDeleted: false, status: { notIn: ['READY', 'DELIVERED', 'CLOSED'] } },
      status: 'IN_PROGRESS',
      startedAt: { lte: cutoffDate },
    },
    include: {
      case: true,
    },
  });

  const escalated = [];

  for (const stage of overdueStages) {
    // Check backup technician
    const currentAssigneeId = stage.assigneeId;
    let backupTech = null;

    if (currentAssigneeId) {
      const currentTech = await prisma.dentalTechnician.findUnique({ where: { id: currentAssigneeId } });
      if (currentTech?.backupTechnicianId) {
        backupTech = await prisma.dentalTechnician.findFirst({
          where: { id: currentTech.backupTechnicianId, companyId, isActive: true },
        });
      }
      if (!backupTech && currentTech?.role) {
        // Find another technician with same role
        const peers = await prisma.dentalTechnician.findMany({
          where: { companyId, role: currentTech.role, id: { not: currentAssigneeId }, isActive: true },
        });
        for (const p of peers) {
          if (isTechnicianOnDuty(p).onDuty) {
            backupTech = p;
            break;
          }
        }
      }
    }

    if (!backupTech) {
      // Find supervisor or general technician on duty
      backupTech = await prisma.dentalTechnician.findFirst({
        where: { companyId, role: { in: ['SUPERVISOR', 'GENERAL_TECHNICIAN'] }, isActive: true },
      });
    }

    if (backupTech) {
      // Reassign stage to backup
      await prisma.dentalCaseStage.update({
        where: { id: stage.id },
        data: {
          assigneeId: backupTech.id,
          assigneeName: backupTech.name,
          note: `${stage.note ? stage.note + ' | ' : ''}تم التصعيد تلقائيًا لتجاوز ${hoursThreshold} ساعة إلى ${backupTech.name}`,
        },
      });

      // Record in status history
      await prisma.dentalCaseStatusHistory.create({
        data: {
          companyId,
          caseId: stage.caseId,
          dimension: 'STAGE',
          status: stage.case.status,
          oldStatus: stage.case.status,
          changedBy: userId,
          userName: 'نظام التصعيد التلقائي',
          reason: `تصعيد مرحلة (${stage.name}) لتجاوزها ${hoursThreshold} ساعة عمل. تم التحويل من ${stage.assigneeName || 'غير مسند'} إلى ${backupTech.name}`,
        },
      });

      escalated.push({
        stageId: stage.id,
        stageName: stage.name,
        caseNumber: stage.case.caseNumber,
        oldAssignee: stage.assigneeName,
        newAssignee: backupTech.name,
        hoursOverdue: Math.round((Date.now() - new Date(stage.startedAt).getTime()) / (3600 * 1000)),
      });
    }
  }

  return {
    executed: true,
    escalatedCount: escalated.length,
    escalated,
  };
}

/**
 * 🧪 Dry-Run Simulation: Test policies on a case without writing to database
 */
async function simulateCaseAutomation(companyId, caseInput = {}) {
  const prisma = getSharedPrismaClient();
  const policies = await getLabPolicies(prisma, companyId);

  // 1. Resolve Work Type
  let workType = null;
  if (caseInput.workTypeId) {
    workType = await prisma.dentalWorkType.findFirst({
      where: { id: caseInput.workTypeId, companyId },
      include: { boms: { include: { material: true } } },
    });
  }

  const priority = caseInput.priority || 'NORMAL';
  const leadTimeDays = workType ? workType.leadTimeDays : 5;
  const urgentLeadTimeDays = workType ? workType.urgentLeadTimeDays : null;

  // 2. Evaluate Due Date
  const dueDateCalc = calculateExpectedDueDate(leadTimeDays, priority, policies.dueDate, urgentLeadTimeDays);

  // 3. Evaluate Assignment
  const assignmentSim = await selectTechnicianForAssignment(prisma, companyId, {
    requiredRole: caseInput.requiredRole || 'GENERAL_TECHNICIAN',
  });

  // 4. Evaluate Stage Templates
  const stageTemplates = await getStageTemplatesForWorkType(prisma, companyId, caseInput.workTypeId);

  // 5. Evaluate Financial Posting
  const treasuryAccount = await resolveTreasuryAccount(prisma, companyId, policies.finance.defaultTreasuryAccountId);
  const sampleAmount = Number(caseInput.total || caseInput.priceSnapshot || (workType ? workType.price : 500)) || 500;
  const invoicePostingMode = resolvePostingMode(policies.finance, SOURCE_TYPES.CASE_INVOICE, Boolean(treasuryAccount));

  // 6. Evaluate Escalation Simulation
  const escalationThreshold = policies.escalation.afterHoursInStage || 24;
  const simulatedEscalationTime = new Date(Date.now() + escalationThreshold * 3600 * 1000);

  return {
    caseSummary: {
      workTypeName: workType?.name || caseInput.workTypeName || 'نوع عمل قياسي',
      priority,
      sampleAmount,
    },
    dueDate: {
      calculatedDueDate: dueDateCalc.dueDateString,
      leadDays: dueDateCalc.leadDays,
      rationale: dueDateCalc.rationale,
    },
    assignment: {
      assignedTechnician: assignmentSim.selectedTechnician ? {
        id: assignmentSim.selectedTechnician.id,
        name: assignmentSim.selectedTechnician.name,
        role: assignmentSim.selectedTechnician.role,
      } : null,
      effectiveMode: assignmentSim.effectiveMode,
      rationale: assignmentSim.rationale,
      guardWarning: assignmentSim.guardWarning || null,
      candidatesCount: assignmentSim.candidates.length,
    },
    stages: stageTemplates.map((s) => ({
      name: s.name,
      sortOrder: s.sortOrder,
      requiredRole: s.requiredRole,
      stageWage: s.stageWage,
      slaHours: s.slaHours,
    })),
    escalation: {
      enabled: policies.escalation.enabled,
      hoursThreshold: escalationThreshold,
      willEscalateAt: simulatedEscalationTime.toISOString(),
      targetStrategy: policies.escalation.target,
    },
    financialPosting: {
      configuredMode: policies.finance.caseInvoicePosting,
      effectiveMode: invoicePostingMode.mode,
      guardTriggered: invoicePostingMode.guardTriggered,
      treasuryAccount: treasuryAccount ? { id: treasuryAccount.id, name: treasuryAccount.name } : null,
      predictedStatus: invoicePostingMode.mode === 'AUTO' && treasuryAccount ? 'POSTED' : 'PENDING_CONFIRM',
      sampleAmount,
    },
  };
}

module.exports = {
  DEFAULT_WORKING_DAYS,
  isTechnicianOnDuty,
  getLabPolicies,
  calculateExpectedDueDate,
  selectTechnicianForAssignment,
  runEscalationCheck,
  simulateCaseAutomation,
};
