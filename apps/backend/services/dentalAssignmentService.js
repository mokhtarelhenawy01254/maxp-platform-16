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
    let settingRow = null;
    if (prisma?.dentalSetting) {
      if (typeof prisma.dentalSetting.findFirst === 'function') {
        settingRow = await prisma.dentalSetting.findFirst({
          where: { companyId, key: 'labPolicies' },
        });
      } else if (typeof prisma.dentalSetting.findUnique === 'function') {
        settingRow = await prisma.dentalSetting.findUnique({
          where: { companyId_key: { companyId, key: 'labPolicies' } },
        });
      }
    }
    const raw = settingRow?.value;
    let p = {};
    if (typeof raw === 'string') {
      try { p = JSON.parse(raw); } catch (_) { p = {}; }
    } else if (raw && typeof raw === 'object') {
      p = raw;
    }

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
        defaultLeadDays: Number(p.dueDate?.defaultLeadDays) || 5,
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
      dueDate: { fromWorkType: true, defaultLeadDays: 5, urgentRule: 'PERCENT', urgentValue: 50, minDays: 1 },
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
function calculateExpectedDueDate(leadTimeDays = null, priority = 'NORMAL', dueDatePolicy = {}, urgentLeadTimeDays = null) {
  const fallbackLead = dueDatePolicy.defaultLeadDays ? Number(dueDatePolicy.defaultLeadDays) : 5;
  const rawDays = leadTimeDays !== null && leadTimeDays !== undefined ? parseInt(leadTimeDays, 10) : fallbackLead;
  const baseDays = Math.max(1, !isNaN(rawDays) && rawDays > 0 ? rawDays : fallbackLead);
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
 * Sequence:
 * 1. Role match: exact match on requiredRole.
 * 2. Schedule & Cap: on-duty today + under dailyCap.
 * 3. Strategy / Least load: pick least-loaded technician (by active stages).
 * 4. Backup: if no primary matches, check configured backupTechnicianId for that role.
 * 5. Fallback: if still no match, leave UNASSIGNED + fallbackMode=NOTIFY_MANAGER.
 *    (NEVER lump cases onto an arbitrary supervisor or general technician!)
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

  // Helper: check duty and daily cap
  const evaluateTechEligibility = async (tech) => {
    if (respectSchedule) {
      const dutyCheck = isTechnicianOnDuty(tech, date);
      if (!dutyCheck.onDuty) {
        return { eligible: false, reason: dutyCheck.reason };
      }
    }

    const cap = tech.dailyCap > 0 ? tech.dailyCap : dailyCapPerTechnician;
    if (cap > 0) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let assignedTodayCount = 0;
      if (prisma?.dentalCaseAssignment && typeof prisma.dentalCaseAssignment.count === 'function') {
        assignedTodayCount = await prisma.dentalCaseAssignment.count({
          where: {
            technicianId: tech.id,
            assignedAt: { gte: startOfDay, lte: endOfDay },
          },
        });
      }

      if (assignedTodayCount >= cap) {
        return { eligible: false, reason: `تجاوز السقف اليومي (${assignedTodayCount}/${cap})` };
      }
    }

    return { eligible: true, reason: 'متاح للعمل' };
  };

  const offDuty = [];
  const eligibleTechs = [];

  for (const tech of technicians) {
    const evalRes = await evaluateTechEligibility(tech);
    if (evalRes.eligible) {
      eligibleTechs.push(tech);
    } else {
      offDuty.push({ tech, reason: evalRes.reason });
    }
  }

  // Helper to compute active load and assignment telemetry
  const scoreCandidates = async (techList, isRoleMatch = true) => {
    const scores = [];
    for (const tech of techList) {
      let activeStagesCount = 0;
      if (prisma?.dentalCaseStage && typeof prisma.dentalCaseStage.count === 'function') {
        activeStagesCount = await prisma.dentalCaseStage.count({
          where: {
            assigneeId: tech.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        });
      }

      let lastAssignedAt = 0;
      if (prisma?.dentalCaseAssignment && typeof prisma.dentalCaseAssignment.findFirst === 'function') {
        const lastAssign = await prisma.dentalCaseAssignment.findFirst({
          where: { technicianId: tech.id },
          orderBy: { assignedAt: 'desc' },
          select: { assignedAt: true },
        });
        if (lastAssign?.assignedAt) {
          lastAssignedAt = new Date(lastAssign.assignedAt).getTime();
        }
      }

      scores.push({
        technician: tech,
        activeLoad: activeStagesCount,
        roleMatch: isRoleMatch,
        lastAssignedAt,
      });
    }
    return scores;
  };

  const hasSpecificRole = Boolean(requiredRole);

  let candidatePool = [];
  let isBackupCandidate = false;

  if (hasSpecificRole) {
    // 1. Role match among eligible technicians
    const roleMatched = eligibleTechs.filter((t) => t.role === requiredRole);
    if (roleMatched.length > 0) {
      candidatePool = await scoreCandidates(roleMatched, true);
    } else {
      // 2. No direct role-matched technician on-duty under cap -> Check configured backupTechnicianId
      const allRoleTechs = technicians.filter((t) => t.role === requiredRole);
      const backupIds = Array.from(new Set(allRoleTechs.map((t) => t.backupTechnicianId).filter(Boolean)));
      const backupTechs = eligibleTechs.filter((t) => backupIds.includes(t.id));

      if (backupTechs.length > 0) {
        candidatePool = await scoreCandidates(backupTechs, false);
        isBackupCandidate = true;
      }
    }
  } else {
    // No specific role required -> any eligible technician
    candidatePool = await scoreCandidates(eligibleTechs, true);
  }

  // 3. Fallback: If NO matching technician or backup is available -> DO NOT assign to an arbitrary supervisor/technician!
  if (candidatePool.length === 0) {
    const roleName = hasSpecificRole ? requiredRole : 'عام';
    return {
      selectedTechnician: null,
      fallbackMode: 'NOTIFY_MANAGER',
      unassigned: true,
      rationale: `لا يوجد فني متاح مطابق للدور المطلوب (${roleName}) ولا يوجد بديل متاح ضمن جدول العمل والسقف اليومي - تم ترك المرحلة غير مسندة وإشعار المشرف`,
      candidates: [],
      offDuty,
    };
  }

  // 4. Sort candidates according to configured strategy
  const strat = String(strategy || 'LEAST_LOADED').toUpperCase();

  candidatePool.sort((a, b) => {
    if (strat === 'ROUND_ROBIN' || strat === 'OLDEST_WAITING') {
      // Prioritize technician who hasn't been assigned for the longest time
      if (a.lastAssignedAt !== b.lastAssignedAt) {
        return a.lastAssignedAt - b.lastAssignedAt;
      }
      return a.activeLoad - b.activeLoad;
    }

    if (strat === 'BY_ROLE_MATCH') {
      // Prioritize strict role match first
      if (a.roleMatch !== b.roleMatch) {
        return a.roleMatch ? -1 : 1;
      }
      return a.activeLoad - b.activeLoad;
    }

    // Default LEAST_LOADED
    return a.activeLoad - b.activeLoad;
  });

  const best = candidatePool[0];

  let stratDesc = 'الأقل تحميلاً';
  if (strat === 'ROUND_ROBIN') stratDesc = 'توزيع دوري عادل (Round Robin)';
  else if (strat === 'BY_ROLE_MATCH') stratDesc = 'أولوية مطابقة الدور التخصصي';
  else if (strat === 'OLDEST_WAITING') stratDesc = 'الأقدم انتظاراً';

  const rationale = isBackupCandidate
    ? `تم اختيار الفني الاحتياطي (${best.technician.name}) لعدم توفر فني أساسي متاح بالدور (${requiredRole})، باستراتيجية [${stratDesc}] (${best.activeLoad} مراحل نشطة)`
    : `تم اختيار (${best.technician.name}) وفق استراتيجية [${stratDesc}] (${best.activeLoad} مراحل نشطة)${best.roleMatch && hasSpecificRole ? `، ومطابق للدور (${best.technician.role})` : ''} ومتاح للعمل اليوم`;

  return {
    selectedTechnician: best.technician,
    activeLoad: best.activeLoad,
    appliedStrategy: strat,
    rationale,
    effectiveMode: mode,
    isBackup: isBackupCandidate,
    candidates: candidatePool.map((c) => ({
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
    const currentAssigneeId = stage.assigneeId;
    const currentAssigneeName = stage.assigneeName || 'غير مسند';
    const targetRole = stage.requiredRole || null;

    // Idempotency: skip if already escalated recently in the last cutoff window
    if (prisma?.dentalCaseStatusHistory && typeof prisma.dentalCaseStatusHistory.findFirst === 'function') {
      const recentEscalation = await prisma.dentalCaseStatusHistory.findFirst({
        where: {
          companyId,
          caseId: stage.caseId,
          dimension: 'STAGE',
          reason: { contains: `تصعيد` },
          createdAt: { gte: new Date(Date.now() - Math.min(hoursThreshold, 6) * 3600 * 1000) },
        },
      });
      if (recentEscalation) {
        continue;
      }
    }

    let backupTech = null;
    let escalationReason = '';

    // Step 1: Check configured backup of the assigned technician
    if (currentAssigneeId) {
      const currentTech = await prisma.dentalTechnician.findUnique({ where: { id: currentAssigneeId } });
      if (currentTech?.backupTechnicianId) {
        const configuredBackup = await prisma.dentalTechnician.findFirst({
          where: { id: currentTech.backupTechnicianId, companyId, isActive: true },
        });
        if (configuredBackup && isTechnicianOnDuty(configuredBackup).onDuty) {
          const cap = configuredBackup.dailyCap > 0 ? configuredBackup.dailyCap : policies.assignment.dailyCapPerTechnician;
          if (cap <= 0) {
            backupTech = configuredBackup;
            escalationReason = `الاحتياطي المباشر للفني (${currentTech.name})`;
          } else {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const countToday = await prisma.dentalCaseAssignment.count({
              where: { technicianId: configuredBackup.id, assignedAt: { gte: startOfDay } },
            });
            if (countToday < cap) {
              backupTech = configuredBackup;
              escalationReason = `الاحتياطي المباشر للفني (${currentTech.name})`;
            }
          }
        }
      }
    }

    // Step 2: If no configured backup, find least-loaded peer in the SAME role
    if (!backupTech) {
      const roleToSearch = targetRole || (currentAssigneeId ? (await prisma.dentalTechnician.findUnique({ where: { id: currentAssigneeId } }))?.role : null);
      if (roleToSearch) {
        const peerResult = await selectTechnicianForAssignment(prisma, companyId, { requiredRole: roleToSearch });
        if (peerResult.selectedTechnician && peerResult.selectedTechnician.id !== currentAssigneeId) {
          backupTech = peerResult.selectedTechnician;
          escalationReason = `فني زميل مطابق لنفس الدور (${roleToSearch}) بأقل تحميل (${peerResult.activeLoad} مراحل)`;
        }
      }
    }

    // Step 3: If still no backup available: DO NOT dump onto a supervisor!
    if (!backupTech) {
      // Record unassigned escalation alert in history for manager attention
      await prisma.dentalCaseStatusHistory.create({
        data: {
          companyId,
          caseId: stage.caseId,
          dimension: 'STAGE',
          status: stage.case.status,
          oldStatus: stage.case.status,
          changedBy: userId,
          userName: 'نظام التصعيد التلقائي',
          reason: `تنبيه تصعيد: تجاوزت المرحلة (${stage.name}) سقف ${hoursThreshold} ساعة عمل. تعذر إعادة الإسناد التلقائي لعدم توفر بديل متاح مطابق للدور (${targetRole || 'غير محدد'}) - تم تركها للمشرف للتوزيع اليدوي`,
        },
      });

      escalated.push({
        stageId: stage.id,
        stageName: stage.name,
        caseNumber: stage.case.caseNumber,
        oldAssignee: currentAssigneeName,
        oldAssigneeId: currentAssigneeId,
        newAssignee: null,
        newAssigneeId: null,
        unassigned: true,
        action: 'NOTIFY_MANAGER',
        reason: 'لا يوجد بديل متاح مطابق للدور',
        hoursOverdue: Math.round((Date.now() - new Date(stage.startedAt).getTime()) / (3600 * 1000)),
      });
      continue;
    }

    // If backup found: reassign and record history with old and new (name/ID)
    await prisma.dentalCaseStage.update({
      where: { id: stage.id },
      data: {
        assigneeId: backupTech.id,
        assigneeName: backupTech.name,
        note: `${stage.note ? stage.note + ' | ' : ''}تم التصعيد تلقائيًا لتجاوز ${hoursThreshold} ساعة إلى ${backupTech.name} (${escalationReason})`,
      },
    });

    await prisma.dentalCaseStatusHistory.create({
      data: {
        companyId,
        caseId: stage.caseId,
        dimension: 'STAGE',
        status: stage.case.status,
        oldStatus: stage.case.status,
        changedBy: userId,
        userName: 'نظام التصعيد التلقائي',
        reason: `تصعيد مرحلة (${stage.name}) لتجاوزها ${hoursThreshold} ساعة عمل. تم التحويل من [${currentAssigneeName}] (معرّف: ${currentAssigneeId || 'غير مسند'}) إلى [${backupTech.name}] (معرّف: ${backupTech.id}) (${escalationReason})`,
      },
    });

    escalated.push({
      stageId: stage.id,
      stageName: stage.name,
      caseNumber: stage.case.caseNumber,
      oldAssignee: currentAssigneeName,
      oldAssigneeId: currentAssigneeId,
      newAssignee: backupTech.name,
      newAssigneeId: backupTech.id,
      reason: escalationReason,
      hoursOverdue: Math.round((Date.now() - new Date(stage.startedAt).getTime()) / (3600 * 1000)),
    });
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

/**
 * Run automatic periodic escalation scan across all active dental lab tenants
 * Protected by PostgreSQL advisory lock for zero duplicate runs in cluster mode
 */
async function runGlobalDentalEscalation(prismaClient = null) {
  const prisma = prismaClient || getSharedPrismaClient();
  let lockAcquired = false;
  const ESCALATION_LOCK_ID = 847291;

  try {
    // 1. Cluster protection: try PostgreSQL advisory lock
    if (typeof prisma?.$queryRaw === 'function') {
      try {
        const lockRes = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${ESCALATION_LOCK_ID}) AS acquired`;
        lockAcquired = Boolean(lockRes?.[0]?.acquired);
        if (!lockAcquired) {
          console.log('🔒 [DENTAL-ESCALATION-CRON] Another instance is currently executing escalation check, skipping.');
          return { skipped: true, skippedDueToLock: true, reason: 'CLUSTER_LOCK_BUSY', totalEscalated: 0, escalatedStagesCount: 0 };
        }
      } catch (lockErr) {
        if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
          return { skipped: true, skippedDueToLock: true, reason: 'SECONDARY_CLUSTER_INSTANCE', totalEscalated: 0, escalatedStagesCount: 0 };
        }
      }
    }

    // 2. Fetch all active companies
    let companies = [];
    const companyModel = prisma?.company || prisma?.dentalLabCompany;
    if (companyModel && typeof companyModel.findMany === 'function') {
      companies = await companyModel.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
    }

    let totalEscalated = 0;
    const results = [];

    for (const company of companies) {
      try {
        const pol = await getLabPolicies(prisma, company.id);
        if (pol.escalation?.enabled !== false) {
          const res = await runEscalationCheck(company.id, { userId: 'SYSTEM_CRON_ESCALATION' });
          if (res?.escalatedCount > 0) {
            totalEscalated += res.escalatedCount;
            results.push({ companyId: company.id, name: company.name, count: res.escalatedCount });
          }
        }
      } catch (cErr) {
        console.warn(`⚠️ [DENTAL-ESCALATION-CRON] Error for company ${company.id}:`, cErr.message);
      }
    }

    if (totalEscalated > 0) {
      console.log(`⏰ [DENTAL-ESCALATION-CRON] Global escalation scan complete: escalated ${totalEscalated} stages across ${results.length} companies.`);
    }

    return {
      executed: true,
      skippedDueToLock: false,
      companiesChecked: companies.length,
      totalEscalated,
      escalatedStagesCount: totalEscalated,
      results,
    };
  } finally {
    if (lockAcquired && typeof prisma?.$queryRaw === 'function') {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${ESCALATION_LOCK_ID})`.catch(() => {});
    }
  }
}

module.exports = {
  DEFAULT_WORKING_DAYS,
  isTechnicianOnDuty,
  getLabPolicies,
  calculateExpectedDueDate,
  selectTechnicianForAssignment,
  runEscalationCheck,
  runGlobalDentalEscalation,
  simulateCaseAutomation,
};

