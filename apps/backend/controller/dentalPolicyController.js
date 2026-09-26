const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getCompanyId, round2 } = require('../utils/dentalLabHelpers');
const {
  getLabPolicies,
  runEscalationCheck,
  simulateCaseAutomation,
} = require('../services/dentalAssignmentService');
const {
  getStageTemplatesForWorkType,
  setStageTemplatesForWorkType,
} = require('../services/dentalStageTemplateService');

/**
 * Get current lab policies & settings
 */
const getPolicies = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const prisma = getSharedPrismaClient();
    const policies = await getLabPolicies(prisma, companyId);
    const enrichedPolicies = {
      ...policies,
      assignment: {
        ...policies.assignment,
        respectWorkingDays: policies.assignment?.respectSchedule !== false,
      },
      escalation: {
        ...policies.escalation,
        escalationHours: policies.escalation?.afterHoursInStage || 24,
        notifyOwnerOnOverdue: policies.escalation?.notify !== false,
      },
      dueDate: {
        ...policies.dueDate,
        defaultLeadDays: policies.dueDate?.defaultLeadDays || 5,
        urgentReductionPercent: policies.dueDate?.urgentRule === 'PERCENT' ? policies.dueDate?.urgentValue : 50,
        urgentReductionDays: policies.dueDate?.urgentRule === 'FIXED_DAYS' ? policies.dueDate?.urgentValue : 1,
      },
    };

    // Active treasury accounts for financial selector
    const treasuryAccounts = await prisma.treasuryAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, type: true, isDefault: true, balance: true },
    });

    res.json({
      success: true,
      data: {
        policies: enrichedPolicies,
        treasuryAccounts,
      },
    });
  } catch (error) {
    console.error('Error getting lab policies:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب سياسات المعمل' });
  }
};

/**
 * Normalize incoming policy payloads ensuring seamless mapping between UI & engine contracts
 */
function normalizeLabPoliciesInput(body = {}, current = {}) {
  const assignmentIn = body.assignment || {};
  const escalationIn = body.escalation || {};
  const dueDateIn = body.dueDate || {};
  const fieldsIn = body.fields || {};
  const notifyIn = body.notify || {};
  const stagesIn = body.stages || {};
  const financeIn = body.finance || {};

  // 1. Assignment normalization
  let mode = assignmentIn.mode || current.assignment?.mode || 'SUGGEST';
  if (mode === 'MANUAL') mode = 'SUGGEST';

  let strategy = assignmentIn.strategy || current.assignment?.strategy || 'LEAST_LOADED';
  if (strategy === 'LEAST_LOAD') strategy = 'LEAST_LOADED';
  if (strategy === 'SPECIALTY_FIRST') strategy = 'BY_ROLE_MATCH';

  let respectSchedule = current.assignment?.respectSchedule !== false;
  if ('respectSchedule' in assignmentIn) {
    respectSchedule = Boolean(assignmentIn.respectSchedule);
  } else if ('respectWorkingDays' in assignmentIn) {
    respectSchedule = Boolean(assignmentIn.respectWorkingDays);
  }

  let dailyCapPerTechnician = Number(current.assignment?.dailyCapPerTechnician) || 0;
  if ('dailyCapPerTechnician' in assignmentIn) {
    dailyCapPerTechnician = Math.max(0, parseInt(assignmentIn.dailyCapPerTechnician, 10) || 0);
  } else if ('dailyCap' in assignmentIn) {
    dailyCapPerTechnician = Math.max(0, parseInt(assignmentIn.dailyCap, 10) || 0);
  }

  // 2. Escalation normalization
  const enabled = escalationIn.enabled !== undefined ? Boolean(escalationIn.enabled) : (current.escalation?.enabled !== false);
  let afterHoursInStage = Number(current.escalation?.afterHoursInStage) || 24;
  if ('afterHoursInStage' in escalationIn) {
    afterHoursInStage = Math.max(1, parseInt(escalationIn.afterHoursInStage, 10) || 24);
  } else if ('escalationHours' in escalationIn) {
    afterHoursInStage = Math.max(1, parseInt(escalationIn.escalationHours, 10) || 24);
  }

  let notify = current.escalation?.notify !== false;
  if ('notify' in escalationIn) {
    notify = Boolean(escalationIn.notify);
  } else if ('notifyOwnerOnOverdue' in escalationIn) {
    notify = Boolean(escalationIn.notifyOwnerOnOverdue);
  }

  // 3. Due Date normalization
  const fromWorkType = dueDateIn.fromWorkType !== undefined ? Boolean(dueDateIn.fromWorkType) : (current.dueDate?.fromWorkType !== false);
  let urgentRule = dueDateIn.urgentRule || current.dueDate?.urgentRule || 'PERCENT';
  let urgentValue = Number(current.dueDate?.urgentValue) || 50;
  if ('urgentValue' in dueDateIn) {
    urgentValue = Math.max(1, Number(dueDateIn.urgentValue) || 50);
  } else if (dueDateIn.urgentReductionDays !== undefined && Number(dueDateIn.urgentReductionDays) > 0) {
    urgentRule = 'FIXED_DAYS';
    urgentValue = Number(dueDateIn.urgentReductionDays);
  } else if (dueDateIn.urgentReductionPercent !== undefined) {
    urgentRule = 'PERCENT';
    urgentValue = Number(dueDateIn.urgentReductionPercent) || 50;
  }

  const defaultLeadDays = dueDateIn.defaultLeadDays !== undefined ? Math.max(1, parseInt(dueDateIn.defaultLeadDays, 10) || 5) : (current.dueDate?.defaultLeadDays || 5);
  const minDays = dueDateIn.minDays !== undefined ? Math.max(1, parseInt(dueDateIn.minDays, 10) || 1) : (current.dueDate?.minDays || 1);

  return {
    assignment: {
      ...current.assignment,
      ...assignmentIn,
      mode,
      strategy,
      respectSchedule,
      respectWorkingDays: respectSchedule, // compatibility alias
      dailyCapPerTechnician,
      stageScope: assignmentIn.stageScope || current.assignment?.stageScope || 'STAGE',
      fallbackMode: assignmentIn.fallbackMode || current.assignment?.fallbackMode || 'SUGGEST',
    },
    escalation: {
      ...current.escalation,
      ...escalationIn,
      enabled,
      afterHoursInStage,
      escalationHours: afterHoursInStage, // compatibility alias
      target: escalationIn.target || current.escalation?.target || 'BACKUP_ROLE',
      maxLevels: Number(escalationIn.maxLevels) || current.escalation?.maxLevels || 2,
      notify,
      notifyOwnerOnOverdue: notify, // compatibility alias
    },
    dueDate: {
      ...current.dueDate,
      ...dueDateIn,
      fromWorkType,
      defaultLeadDays,
      urgentRule,
      urgentValue,
      urgentReductionPercent: urgentRule === 'PERCENT' ? urgentValue : 50, // compatibility alias
      urgentReductionDays: urgentRule === 'FIXED_DAYS' ? urgentValue : 1, // compatibility alias
      minDays,
    },
    fields: {
      ...current.fields,
      ...fieldsIn,
      patientPhoneRequired: Boolean(fieldsIn.patientPhoneRequired ?? current.fields?.patientPhoneRequired),
      requireToothAndShade: Boolean(fieldsIn.requireToothAndShade ?? current.fields?.requireToothAndShade),
    },
    notify: {
      ...current.notify,
      ...notifyIn,
      patientEnabled: Boolean(notifyIn.patientEnabled ?? current.notify?.patientEnabled),
      doctorEnabled: notifyIn.doctorEnabled !== undefined ? Boolean(notifyIn.doctorEnabled) : (current.notify?.doctorEnabled !== false),
    },
    stages: {
      ...current.stages,
      ...stagesIn,
      usePerTypeTemplate: stagesIn.usePerTypeTemplate !== undefined ? Boolean(stagesIn.usePerTypeTemplate) : (current.stages?.usePerTypeTemplate !== false),
    },
    finance: {
      ...current.finance,
      ...financeIn,
    },
  };
}

/**
 * Update lab policies & settings with guards
 */
const updatePolicies = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const prisma = getSharedPrismaClient();
    const current = await getLabPolicies(prisma, companyId);
    const body = req.body || {};

    const updated = normalizeLabPoliciesInput(body, current);

    const warnings = [];

    // Guard 1: AUTO assignment without working schedule
    if (updated.assignment.mode === 'AUTO') {
      const activeTechs = await prisma.dentalTechnician.findMany({
        where: { companyId, isActive: true },
      });
      const hasSchedules = activeTechs.some((t) => Array.isArray(t.workingDays) && t.workingDays.length > 0);
      if (!hasSchedules) {
        warnings.push('تنبيه: تم تفعيل الإسناد التلقائي (AUTO) بينما لم يتم تخصيص أيام عمل للفنيين، سيتم استخدام الجدول الافتراضي (الأحد-الخميس+السبت)');
      }
    }

    // Guard 2: AUTO finance posting without active treasury account
    const activeTreasuryAccounts = await prisma.treasuryAccount.count({
      where: { companyId, isActive: true },
    });
    const anyAutoFinance = Object.values(updated.finance).some((val) => val === 'AUTO');

    if (anyAutoFinance && activeTreasuryAccounts === 0) {
      warnings.push('تحذير مالي: لا يوجد حساب خزينة نشط، سيتم تشغيل الترحيل بوضع CONFIRM لحين إضافة حساب خزينة');
    }

    // Guard 3: 7-day grace period tracking
    // If any finance mode is switched to AUTO and wasn't previously AUTO, stamp autoEnabledAt
    const wasAutoFinance = Object.values(current.finance).some((val) => val === 'AUTO');
    if (anyAutoFinance && !wasAutoFinance) {
      updated.finance.autoEnabledAt = new Date().toISOString();
      warnings.push('حماية الـ 7 أيام: تم تفعيل الترحيل التلقائي، وخلال أول 7 أيام ستعمل الحركات في وضع التأكيد اليدوي (CONFIRM) لضمان دقة الرصيد');
    } else if (anyAutoFinance && current.finance.autoEnabledAt) {
      updated.finance.autoEnabledAt = current.finance.autoEnabledAt;
    }

    // Save to dentalSetting
    await prisma.dentalSetting.upsert({
      where: { companyId_key: { companyId, key: 'labPolicies' } },
      create: { companyId, key: 'labPolicies', value: updated },
      update: { value: updated },
    });

    res.json({
      success: true,
      data: updated,
      warnings,
      message: 'تم حفظ سياسات المعمل بنجاح',
    });
  } catch (error) {
    console.error('Error updating lab policies:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ سياسات المعمل' });
  }
};

/**
 * 🧪 Dry-Run Simulation: Test policies on a case without writing to DB
 */
const simulateAutomation = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const simulation = await simulateCaseAutomation(companyId, req.body || {});
    res.json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    console.error('Error running automation simulation:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تجربة السياسات على الحالة' });
  }
};

/**
 * Trigger manual escalation run
 */
const runEscalation = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const result = await runEscalationCheck(companyId, { userId: req.user?.id || req.user?.email });
    res.json({
      success: true,
      data: result,
      message: `تم فحص التصعيد: تم تصعيد ${result.escalatedCount} مرحلة متأخرة`,
    });
  } catch (error) {
    console.error('Error running escalation check:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فحص التصعيد' });
  }
};

/**
 * Get stage templates for a work type
 */
const getWorkTypeStages = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const stages = await getStageTemplatesForWorkType(prisma, companyId, id);

    res.json({
      success: true,
      data: stages,
    });
  } catch (error) {
    console.error('Error getting work type stages:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب قوالب المراحل' });
  }
};

/**
 * Set/Replace stage templates for a work type
 */
const setWorkTypeStages = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { stages } = req.body || {};
    const prisma = getSharedPrismaClient();

    const created = await setStageTemplatesForWorkType(prisma, companyId, id, stages);

    res.json({
      success: true,
      data: created,
      message: 'تم حفظ قالب مراحل الإنتاج لنوع الشغل بنجاح',
    });
  } catch (error) {
    console.error('Error setting work type stages:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في حفظ قالب المراحل' });
  }
};

/**
 * Patient lookup and deduplication check by phone (P7)
 */
const lookupPatient = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const phone = (req.query.phone || req.query.search || req.query.q) ? String(req.query.phone || req.query.search || req.query.q).trim() : '';
    if (!phone) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const cases = await prisma.dentalLabCase.findMany({
      where: {
        companyId,
        patientPhone: { contains: phone },
        isDeleted: false,
      },
      select: {
        id: true,
        caseNumber: true,
        patientName: true,
        patientPhone: true,
        doctorName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const uniqueNames = [...new Set(cases.map((c) => c.patientName).filter(Boolean))];

    res.json({
      success: true,
      data: {
        phone,
        totalCases: cases.length,
        namesFound: uniqueNames,
        isDuplicate: cases.length > 1,
        cases,
      },
    });
  } catch (error) {
    console.error('Error looking up patient phone:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فحص بيانات المريض' });
  }
};

/**
 * Outsourced cases report (P8)
 */
const getOutsourcedReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const prisma = getSharedPrismaClient();

    const outsourcedCases = await prisma.dentalLabCase.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: [
          { status: 'OUTSOURCED' },
          { outsourceCost: { gt: 0 } },
          { outsourcedAt: { not: null } },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        patientName: true,
        doctorName: true,
        status: true,
        externalLabName: true,
        externalLabContact: true,
        outsourceCost: true,
        outsourcedAt: true,
        expectedReturnAt: true,
        returnedAt: true,
        outsourceNotes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    let totalCost = 0;
    let totalDays = 0;
    let completedCount = 0;
    let overdueCount = 0;

    const enriched = outsourcedCases.map((c) => {
      const cost = round2(Number(c.outsourceCost) || 0);
      totalCost = round2(totalCost + cost);

      const isOverdue = Boolean(
        c.status === 'OUTSOURCED' &&
        c.expectedReturnAt &&
        new Date(c.expectedReturnAt) < now &&
        !c.returnedAt
      );

      if (isOverdue) overdueCount++;

      let durationDays = 0;
      if (c.outsourcedAt) {
        const start = new Date(c.outsourcedAt).getTime();
        const end = c.returnedAt ? new Date(c.returnedAt).getTime() : now.getTime();
        durationDays = round2((end - start) / (1000 * 3600 * 24));
        if (c.returnedAt) {
          totalDays += durationDays;
          completedCount++;
        }
      }

      return {
        ...c,
        outsourceCost: cost,
        isOverdue,
        durationDays,
      };
    });

    const averageDurationDays = completedCount > 0 ? round2(totalDays / completedCount) : 0;

    res.json({
      success: true,
      data: {
        totalOutsourcedCases: outsourcedCases.length,
        totalCost,
        averageDurationDays,
        overdueCount,
        cases: enriched,
      },
    });
  } catch (error) {
    console.error('Error generating outsourced report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تقرير الحالات الخارجية' });
  }
};

module.exports = {
  getPolicies,
  updatePolicies,
  normalizeLabPoliciesInput,
  getLabPolicies,
  simulateAutomation,
  runEscalation,
  getWorkTypeStages,
  setWorkTypeStages,
  lookupPatient,
  getOutsourcedReport,
};
