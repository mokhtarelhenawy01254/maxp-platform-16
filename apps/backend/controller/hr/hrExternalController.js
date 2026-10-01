/**
 * 🌐 External HR Controller
 * معالج الطلبات الخارجية لأنظمة ERP وأجهزة البصمة وأدوات الذكاء الاصطناعي
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getDateStringInTimezone, combineDateAndTime } = require('../../utils/dateUtils');
const {
  dispatchHrWebhook,
  generateHrApiKey,
  normalizeScopes,
  HR_WEBHOOK_EVENTS,
  logExternalApiAction
} = require('../../services/hrIntegrationService');
const { attendanceService, shiftService, payrollService } = require('../../services/hr');

const VALID_EMPLOYEE_STATUSES = [
  'ACTIVE',
  'PROBATION',
  'ON_LEAVE',
  'TERMINATED',
  'SUSPENDED',
  'RESIGNED',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
];

const VALID_LEAVE_TYPES = [
  'ANNUAL',
  'SICK',
  'UNPAID',
  'MATERNITY',
  'PATERNITY',
  'BEREAVEMENT',
  'MARRIAGE',
  'HAJJ',
  'STUDY',
  'EMERGENCY',
  'OTHER'
];

const VALID_MANUAL_DEDUCTION_TYPES = [
  'PENALTY',
  'VIOLATION',
  'DAMAGE',
  'INSURANCE',
  'LOAN_REPAYMENT',
  'ADVANCE_REPAYMENT',
  'TAX',
  'SOCIAL_INSURANCE',
  'ABSENCE',
  'LATE',
  'EARLY_LEAVE',
  'OTHER',
  'LOAN'
];

const VALID_MANUAL_DEDUCTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const VALID_REWARD_CATEGORIES = [
  'PERFORMANCE',
  'ATTENDANCE',
  'SERVICE_ANNIVERSARY',
  'OTHER'
];

const VALID_REWARD_STATUSES = ['PENDING', 'APPROVED', 'GIVEN', 'CANCELLED'];

const VALID_ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EARLY_LEAVE',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKEND',
  'REMOTE'
];

const VALID_CONTRACT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
  'REMOTE'
];

const VALID_REWARD_TYPE_CATEGORIES = ['FINANCIAL', 'NON_FINANCIAL'];
const VALID_REWARD_CALCULATION_METHODS = ['FIXED', 'PERCENTAGE'];
const VALID_REWARD_TRIGGER_TYPES = ['MANUAL', 'AUTOMATIC'];
const VALID_REWARD_FREQUENCIES = ['ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const VALID_PERMISSION_TYPES = ['PERSONAL', 'WORK_RELATED', 'MEDICAL', 'EMERGENCY', 'NON_DEDUCTIBLE', 'DEDUCTIBLE', 'COMPENSATORY'];

const rewardEligibilityService = require('../../services/hr/rewardEligibilityService');
const rewardApplicationService = require('../../services/hr/rewardApplicationService');

function maskSensitivePhone(phone) {
  if (!phone || typeof phone !== 'string') return phone || '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '••••';
  return trimmed.slice(0, 3) + '••••' + trimmed.slice(-4);
}

function safeParseSettingsArray(val, fallback = []) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function getHRSettingsRuntimeColumns(prisma) {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hr_settings'
    `);
    return new Set(rows.map((row) => row.column_name));
  } catch (err) {
    console.error('❌ [ExternalHrController] Error getting hr_settings columns:', err);
    return new Set();
  }
}

async function readHRSettingsCompat(prisma, companyId, runtimeColumns) {
  if (!runtimeColumns || runtimeColumns.size === 0) {
    return prisma.hRSettings.findUnique({ where: { companyId } });
  }
  const select = {};
  for (const col of runtimeColumns) {
    select[col] = true;
  }
  return prisma.hRSettings.findUnique({
    where: { companyId },
    select
  });
}

async function upsertHRSettingsCompat(prisma, companyId, updateData, runtimeColumns) {
  const existing = await readHRSettingsCompat(prisma, companyId, runtimeColumns);
  const runtimeWriteData = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined && (!runtimeColumns || runtimeColumns.size === 0 || runtimeColumns.has(key))) {
      runtimeWriteData[key] = value;
    }
  }

  if (existing) {
    const keys = Object.keys(runtimeWriteData);
    if (keys.length > 0) {
      const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`);
      const values = keys.map((key) => runtimeWriteData[key]);

      if (runtimeColumns && runtimeColumns.has('updatedAt')) {
        assignments.push(`"updatedAt" = NOW()`);
      }

      await prisma.$queryRawUnsafe(
        `UPDATE "hr_settings" SET ${assignments.join(', ')} WHERE "companyId" = $${values.length + 1}`,
        ...values,
        companyId
      );
    }
    return readHRSettingsCompat(prisma, companyId, runtimeColumns);
  }

  const insertSeed = {
    id: require('crypto').randomUUID(),
    companyId,
    workDays: JSON.stringify([1, 2, 3, 4, 5]),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...runtimeWriteData
  };
  const insertKeys = Object.keys(insertSeed).filter((key) => !runtimeColumns || runtimeColumns.size === 0 || runtimeColumns.has(key));
  if (insertKeys.length > 0) {
    const placeholders = insertKeys.map((_, index) => `$${index + 1}`);
    const values = insertKeys.map((key) => insertSeed[key]);
    await prisma.$queryRawUnsafe(
      `INSERT INTO "hr_settings" (${insertKeys.map((key) => `"${key}"`).join(', ')}) VALUES (${placeholders.join(', ')})`,
      ...values
    );
  }

  return readHRSettingsCompat(prisma, companyId, runtimeColumns);
}

function formatMaskedSettings(settings, companyTimezone = 'Africa/Cairo', latenessRules = null, primaryShift = null) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const workDaysNums = safeParseSettingsArray(settings?.workDays, [1, 2, 3, 4, 5]);
  const workingDays = Array.isArray(workDaysNums)
    ? workDaysNums.map((d) => (typeof d === 'number' ? dayNames[d] : d)).filter(Boolean)
    : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  const rawRecipients = safeParseSettingsArray(settings?.notificationRecipients, []);
  const maskedRecipients = Array.isArray(rawRecipients)
    ? rawRecipients.map((r) => ({
        ...r,
        phone: r?.phone ? maskSensitivePhone(r.phone) : ''
      }))
    : [];

  const workStartTime = latenessRules?.workStartTime || primaryShift?.startTime || settings?.workStartTime || null;
  const workEndTime = primaryShift?.endTime || settings?.workEndTime || null;
  const latestAllowedTime = latenessRules?.latestAllowedTime || null;
  const monthlyAllowanceMinutes = latenessRules?.monthlyAllowanceMinutes !== undefined ? latenessRules.monthlyAllowanceMinutes : null;
  const allowanceResetDay = latenessRules?.allowanceResetDay !== undefined ? latenessRules.allowanceResetDay : null;

  // Lateness Rules & Grace:
  // If company has latenessRules (e.g. H2M with 10:00 & 10:10), derive unified daily threshold (10 mins).
  // If company has NO latenessRules row (the other 94 companies), preserve their exact stored settings:
  // lateThresholdMinutes (e.g. 10) and lateGracePeriod (e.g. 15) without any distortion.
  let derivedRulesDailyThreshold = null;
  if (latenessRules?.workStartTime && latenessRules?.latestAllowedTime) {
    const [startH, startM] = latenessRules.workStartTime.split(':').map(Number);
    const [allowedH, allowedM] = latenessRules.latestAllowedTime.split(':').map(Number);
    if (!isNaN(startH) && !isNaN(startM) && !isNaN(allowedH) && !isNaN(allowedM)) {
      const diffMins = (allowedH * 60 + allowedM) - (startH * 60 + startM);
      if (diffMins > 0) derivedRulesDailyThreshold = diffMins;
    }
  }

  const effectiveDailyLateThreshold = derivedRulesDailyThreshold !== null
    ? derivedRulesDailyThreshold
    : ((settings?.lateThresholdMinutes !== undefined && settings?.lateThresholdMinutes !== null)
        ? Number(settings.lateThresholdMinutes)
        : 10);

  const effectiveLateGracePeriod = derivedRulesDailyThreshold !== null
    ? derivedRulesDailyThreshold
    : ((settings?.lateGracePeriod !== undefined && settings?.lateGracePeriod !== null)
        ? Number(settings.lateGracePeriod)
        : 15);

  const effectiveMonthlyGraceMinutes = latenessRules?.monthlyAllowanceMinutes !== undefined && latenessRules?.monthlyAllowanceMinutes !== null
    ? Number(latenessRules.monthlyAllowanceMinutes)
    : (settings?.gracePeriodMinutes ?? 60);

  return {
    workHours: {
      workingDays,
      workDays: workDaysNums,
      workStartTime: workStartTime || null,
      workEndTime: workEndTime || null,
      latestAllowedTime,
      monthlyAllowanceMinutes,
      allowanceResetDay,
      breakDuration: primaryShift?.breakDuration ?? settings?.breakDuration ?? 60,
      timezone: companyTimezone
    },
    leaves: {
      annualLeaveDefault: settings?.annualLeaveDefault ?? 21,
      sickLeaveDefault: settings?.sickLeaveDefault ?? 15,
      carryOverLimit: settings?.carryOverLimit ?? 5,
      requireApproval: true,
      minAdvanceNotice: 3
    },
    attendance: {
      lateThreshold: effectiveDailyLateThreshold,
      lateThresholdMinutes: effectiveDailyLateThreshold,
      lateGracePeriod: effectiveLateGracePeriod,
      earlyLeaveThreshold: settings?.earlyLeaveGracePeriod ?? 15,
      earlyLeaveGracePeriod: settings?.earlyLeaveGracePeriod ?? 15,
      earlyCheckoutEnabled: settings?.earlyCheckoutEnabled !== false,
      earlyCheckoutThresholdMinutes: settings?.earlyCheckoutThresholdMinutes ?? 0,
      monthlyLateLimit: settings?.monthlyLateLimit ?? 3,
      lateWarningThreshold: settings?.lateWarningThreshold ?? 3,
      lateWarningLevels: safeParseSettingsArray(settings?.lateWarningLevels, []),
      autoDeductionEnabled: settings?.autoDeductionEnabled || false,
      gracePeriodMinutes: effectiveMonthlyGraceMinutes,
      maxDailyDeductionDays: (settings?.maxDailyDeductionDays !== undefined && settings?.maxDailyDeductionDays !== null)
        ? Number(settings.maxDailyDeductionDays)
        : 1.0,
      deductionCalculationMethod: settings?.deductionCalculationMethod || 'minute',
      workingDaysPerMonth: settings?.workingDaysPerMonth ?? 22,
      workingHoursPerDay: settings?.workingHoursPerDay ?? 8,
      requireDeductionReview: settings?.requireDeductionReview !== false,
      absencePenaltyRate: (settings?.absencePenaltyRate !== undefined && settings?.absencePenaltyRate !== null)
        ? Number(settings.absencePenaltyRate)
        : 1.0,
      deductAbsenceInCurrentMonth: settings?.deductAbsenceInCurrentMonth !== false,
      delayPenaltyTiers: safeParseSettingsArray(settings?.delayPenaltyTiers, [])
    },
    permissions: {
      paidPermissionMinutesPerMonth: (settings?.paidPermissionMinutesPerMonth !== undefined && settings?.paidPermissionMinutesPerMonth !== null)
        ? Number(settings.paidPermissionMinutesPerMonth)
        : (companyId === 'h2m-1' ? 120 : 0),
      permissionLeadDays: (settings?.permissionLeadDays !== undefined && settings?.permissionLeadDays !== null)
        ? Number(settings.permissionLeadDays)
        : (companyId === 'h2m-1' ? 2 : 2),
      permissionWarningAfter: (settings?.permissionWarningAfter !== undefined && settings?.permissionWarningAfter !== null)
        ? Number(settings.permissionWarningAfter)
        : (companyId === 'h2m-1' ? 4 : 4),
      permissionExtraMode: settings?.permissionExtraMode || 'deduct'
    },
    geofence: {
      geofenceEnabled: settings?.geofenceEnabled || false,
      officeLatitude: settings?.officeLatitude ? String(settings.officeLatitude) : null,
      officeLongitude: settings?.officeLongitude ? String(settings.officeLongitude) : null,
      geofenceRadius: settings?.geofenceRadius ?? 200
    },
    payroll: {
      payrollDay: settings?.payrollDay ?? 25,
      currency: 'EGP',
      taxRate: (settings?.taxRate !== undefined && settings?.taxRate !== null)
        ? Number(settings.taxRate)
        : 0,
      socialInsuranceRate: (settings?.socialInsuranceRate !== undefined && settings?.socialInsuranceRate !== null)
        ? Number(settings.socialInsuranceRate)
        : 14.0,
      overtimeRate: (settings?.overtimeRate !== undefined && settings?.overtimeRate !== null)
        ? Number(settings.overtimeRate)
        : 1.5,
      maxAdvancePercentage: (settings?.maxAdvancePercentage !== undefined && settings?.maxAdvancePercentage !== null)
        ? Number(settings.maxAdvancePercentage)
        : 50,
      maxActiveAdvances: settings?.maxActiveAdvances ?? 1,
      minMonthsForAdvance: settings?.minMonthsForAdvance ?? 3,
      advanceRepaymentMonths: settings?.advanceRepaymentMonths ?? 6
    },
    notifications: {
      notifyOnLeaveRequest: settings?.notifyOnLeaveRequest !== false,
      notifyOnAttendanceIssue: settings?.notifyOnAttendanceIssue !== false,
      notifyOnPayrollGeneration: settings?.notifyOnPayrollGeneration !== false,
      notifyManagers: settings?.notifyManagers !== false,
      notifyOnWarning: settings?.notifyOnWarning !== false,
      notifyOnProbationEnd: settings?.notifyOnProbationEnd !== false,
      notifyOnContractExpiry: settings?.notifyOnContractExpiry !== false,
      aiOwnerNotificationsEnabled: settings?.aiOwnerNotificationsEnabled || false,
      ownerWhatsAppNumber: settings?.ownerWhatsAppNumber ? maskSensitivePhone(settings.ownerWhatsAppNumber) : '',
      notificationRecipients: maskedRecipients,
      aiNotificationTypes: safeParseSettingsArray(settings?.aiNotificationTypes, [
        'PROMOTION',
        'DEDUCTION',
        'WARNING',
        'KUDOS',
        'TRAINING'
      ]),
      aiNotificationTone: settings?.aiNotificationTone || 'PROFESSIONAL'
    },
    // Top-level aliases for direct key accessibility
    workStartTime: workStartTime || null,
    workEndTime: workEndTime || null,
    latestAllowedTime,
    monthlyAllowanceMinutes,
    allowanceResetDay,
    workingDaysPerMonth: (settings?.workingDaysPerMonth !== undefined && settings?.workingDaysPerMonth !== null)
      ? Number(settings.workingDaysPerMonth)
      : 22,
    workingHoursPerDay: (settings?.workingHoursPerDay !== undefined && settings?.workingHoursPerDay !== null)
      ? Number(settings.workingHoursPerDay)
      : 8,
    absencePenaltyRate: (settings?.absencePenaltyRate !== undefined && settings?.absencePenaltyRate !== null)
      ? Number(settings.absencePenaltyRate)
      : 1.0,
    maxDailyDeductionDays: (settings?.maxDailyDeductionDays !== undefined && settings?.maxDailyDeductionDays !== null)
      ? Number(settings.maxDailyDeductionDays)
      : 1.0,
    socialInsuranceRate: (settings?.socialInsuranceRate !== undefined && settings?.socialInsuranceRate !== null)
      ? Number(settings.socialInsuranceRate)
      : 14.0,
    taxRate: (settings?.taxRate !== undefined && settings?.taxRate !== null)
      ? Number(settings.taxRate)
      : 0,
    overtimeRate: (settings?.overtimeRate !== undefined && settings?.overtimeRate !== null)
      ? Number(settings.overtimeRate)
      : 1.5,
    breakDuration: (primaryShift?.breakDuration !== undefined && primaryShift?.breakDuration !== null)
      ? Number(primaryShift.breakDuration)
      : ((settings?.breakDuration !== undefined && settings?.breakDuration !== null) ? Number(settings.breakDuration) : 0),
    autoDeductionEnabled: settings?.autoDeductionEnabled || false,
    gracePeriodMinutes: effectiveMonthlyGraceMinutes,
    lateThresholdMinutes: effectiveDailyLateThreshold,
    lateGracePeriod: effectiveLateGracePeriod,
    lateThreshold: effectiveDailyLateThreshold,
    payrollDay: settings?.payrollDay ?? 25
  };
}

/**
 * التحقق من صيغة الوقت وتطبيعها لـ HH:mm لضمان التوافق مع attendanceService والمنطقة الزمنية للشركة
 */
function validateAndNormalizeTime(value, fieldName = 'checkIn', timezone = 'Africa/Cairo') {
  if (value === undefined) {
    return { valid: true, value: undefined };
  }
  if (value === null || value === '') {
    return { valid: true, value: null };
  }
  const str = String(value).trim();
  // 1. HH:mm or HH:mm:ss format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
  const match = str.match(timeRegex);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return { valid: true, value: `${hh}:${mm}` };
  }
  // 2. ISO 8601 or parseable datetime string (e.g. 2026-09-30T09:00:00Z)
  if (str.includes('T') || str.includes('-')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const timeInTz = d.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const parts = timeInTz.split(':');
      if (parts.length >= 2) {
        let hh = parts[0].trim();
        if (hh === '24') hh = '00';
        hh = hh.padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        return { valid: true, value: `${hh}:${mm}` };
      }
    }
  }
  return {
    valid: false,
    error: `Invalid time format for ${fieldName}. Expected 'HH:mm' (e.g. '09:00') or valid ISO date-time string.`
  };
}

/**
 * 1. قائمة الموظفين (مع الترقيم والبحث)
 */
const listEmployees = async (req, res) => {
  try {
    const { companyId } = req;
    const { page = 1, limit = 50, search, departmentId, status } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const prisma = getSharedPrismaClient();
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          hireDate: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true } },
          userId: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.count({ where })
    ]);

    return res.json({
      success: true,
      data: employees,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listEmployees] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 2. تفاصيل موظف محدد
 */
const getEmployeeById = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    const prisma = getSharedPrismaClient();
    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [{ id }, { employeeNumber: id }]
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
    }

    return res.json({ success: true, data: employee });
  } catch (error) {
    console.error('❌ [ExternalHrController.getEmployeeById] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 3. إضافة أو تحديث موظف من نظام خارجي (Upsert from ERP)
 */
const upsertEmployee = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      positionId,
      status = 'ACTIVE',
      hireDate
    } = req.body;

    if (!employeeNumber || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'employeeNumber, firstName, and lastName are required' }
      });
    }

    let normalizedStatus = 'ACTIVE';
    if (status !== undefined && status !== null) {
      normalizedStatus = String(status).trim().toUpperCase();
      if (!VALID_EMPLOYEE_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status: '${status}'. Allowed values are: ${VALID_EMPLOYEE_STATUSES.join(', ')}`,
            allowedValues: VALID_EMPLOYEE_STATUSES
          }
        });
      }
    }

    // Map PROBATION to ACTIVE for database persistence since Prisma EmployeeStatus enum does not contain PROBATION
    const dbStatus = normalizedStatus === 'PROBATION' ? 'ACTIVE' : normalizedStatus;

    let parsedHireDate = undefined;
    if (hireDate) {
      const d = new Date(hireDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid hireDate format. Expected YYYY-MM-DD' }
        });
      }
      parsedHireDate = d;
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.employee.findUnique({
      where: {
        companyId_employeeNumber: { companyId, employeeNumber }
      }
    });

    let employee;
    let isCreated = false;

    if (existing) {
      employee = await prisma.employee.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          email: email !== undefined ? email : existing.email,
          phone: phone !== undefined ? phone : existing.phone,
          departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
          positionId: positionId !== undefined ? positionId : existing.positionId,
          status: status !== undefined ? dbStatus : existing.status,
          hireDate: parsedHireDate !== undefined ? parsedHireDate : existing.hireDate
        }
      });
    } else {
      isCreated = true;
      employee = await prisma.employee.create({
        data: {
          companyId,
          employeeNumber,
          firstName,
          lastName,
          email,
          phone,
          departmentId,
          positionId,
          status: dbStatus,
          hireDate: parsedHireDate || new Date()
        }
      });
    }

    // Trigger Outbound Webhook
    dispatchHrWebhook(
      companyId,
      isCreated ? 'hr.employee.created' : 'hr.employee.updated',
      { employeeId: employee.id, employeeNumber: employee.employeeNumber, status: employee.status }
    );

    // D5: Audit Attribution
    await logExternalApiAction({
      req,
      action: isCreated ? 'CREATE_EMPLOYEE' : 'UPDATE_EMPLOYEE',
      resourceType: 'Employee',
      resourceId: employee.id,
      targetName: `${employee.firstName} ${employee.lastName}`,
      details: { employeeNumber: employee.employeeNumber, status: employee.status }
    });

    return res.status(isCreated ? 201 : 200).json({
      success: true,
      data: employee,
      action: isCreated ? 'CREATED' : 'UPDATED'
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.upsertEmployee] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing employee upsert'
      }
    });
  }
};

/**
 * 4. استقبال حركات البصمة المجمعة (Biometric Ingestion)
 * يدعم تسجيل أجهزة البصمة (ZKTeco وغيرها) بحماية التكرار Idempotency
 */
const recordPunchesBatch = async (req, res) => {
  try {
    const { companyId } = req;
    const { punches, deviceId } = req.body;

    if (!Array.isArray(punches) || punches.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PUNCHES', message: 'punches array is required and must not be empty' }
      });
    }

    const timezone = req.company?.timezone || 'Africa/Cairo';
    const prisma = getSharedPrismaClient();
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (const punch of punches) {
      results.processed++;
      const { employeeNumber, punchTime, type = 'CHECK_IN' } = punch;

      if (!employeeNumber || !punchTime) {
        results.failed++;
        results.errors.push({ punch, error: 'employeeNumber and punchTime are required' });
        continue;
      }

      const punchDate = new Date(punchTime);
      if (isNaN(punchDate.getTime())) {
        results.failed++;
        results.errors.push({ punch, error: 'Invalid punchTime date format' });
        continue;
      }

      const normalizedType = String(type || 'CHECK_IN').trim().toUpperCase();
      if (!['CHECK_IN', 'CHECK_OUT'].includes(normalizedType)) {
        results.failed++;
        results.errors.push({ punch, error: `Invalid punch type: '${type}'. Expected CHECK_IN or CHECK_OUT` });
        continue;
      }

      const employee = await prisma.employee.findUnique({
        where: {
          companyId_employeeNumber: { companyId, employeeNumber }
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          status: true,
          user: { select: { id: true, isActive: true } }
        }
      });

      if (!employee || !employee.userId || employee.status === 'TERMINATED' || employee.user?.isActive === false) {
        results.failed++;
        results.errors.push({ punch, error: 'Employee not found, terminated, or user is inactive' });
        continue;
      }

      // Calculate start of day in company timezone (Africa/Cairo default)
      const dateStr = getDateStringInTimezone(punchDate, timezone);
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);

      try {
        const hrSettings = await prisma.hRSettings.findUnique({
          where: { companyId }
        });
        const shift = await attendanceService.getEmployeeShiftForDate(
          companyId,
          employee.id,
          punchDate,
          timezone
        );

        const isRest = attendanceService.isRestDay(punchDate, hrSettings, timezone);
        const workStartTime = shift?.startTime || hrSettings?.workStartTime || '10:00';
        const workEndTime = shift?.endTime || hrSettings?.workEndTime || '18:00';
        const workStart = combineDateAndTime(dayStart, workStartTime, timezone);
        const workEnd = combineDateAndTime(dayStart, workEndTime, timezone);

        const attendance = await prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: employee.userId,
              date: dayStart
            }
          }
        });

        const isCheckIn = normalizedType === 'CHECK_IN';

        if (attendance) {
          const updateData = {};
          if (isCheckIn && (!attendance.checkIn || punchDate < attendance.checkIn)) {
            updateData.checkIn = punchDate;
            updateData.checkInMethod = deviceId ? `BIOMETRIC_${deviceId}` : 'BIOMETRIC_API';

            if (isRest) {
              updateData.status = 'WEEKEND';
              updateData.lateMinutes = 0;
            } else {
              const gracePeriod = hrSettings?.lateGracePeriod || hrSettings?.lateThresholdMinutes || 10;
              const graceTime = new Date(workStart.getTime() + gracePeriod * 60000);
              if (punchDate > graceTime) {
                updateData.lateMinutes = Math.floor((punchDate - workStart) / 60000);
                updateData.status = 'LATE';
              } else {
                updateData.lateMinutes = 0;
                updateData.status = 'PRESENT';
              }
            }
          } else if (!isCheckIn && (!attendance.checkOut || punchDate > attendance.checkOut)) {
            // Debounce check: ignore checkout punch if within 5 minutes of checkIn
            if (attendance.checkIn) {
              const diffMs = punchDate.getTime() - new Date(attendance.checkIn).getTime();
              if (diffMs < 5 * 60 * 1000) {
                console.warn(`⚠️ [recordPunchesBatch] Debounced checkout punch within ${Math.round(diffMs / 1000)}s of checkIn for user ${employee.userId}`);
                results.succeeded++;
                continue;
              }
            }
            updateData.checkOut = punchDate;
            updateData.checkOutMethod = deviceId ? `BIOMETRIC_${deviceId}` : 'BIOMETRIC_API';

            const checkInTime = updateData.checkIn || attendance.checkIn;
            let workHours = 0;
            if (checkInTime) {
              const workMinutes = Math.max(0, (punchDate.getTime() - new Date(checkInTime).getTime()) / 60000);
              workHours = Math.max(0, Math.round((workMinutes / 60) * 100) / 100);
              updateData.workHours = workHours;
            }

            if (isRest) {
              updateData.status = 'WEEKEND';
              updateData.lateMinutes = 0;
              updateData.earlyLeaveMinutes = 0;
              // Overtime on rest days: hours worked after scheduled shift end
              if (workEnd && punchDate > workEnd) {
                updateData.overtimeHours = Math.max(0, Math.round(((punchDate.getTime() - workEnd.getTime()) / 3600000) * 100) / 100);
              } else {
                updateData.overtimeHours = workHours;
              }
            } else {
              // Normal working day: calculate early leave if leaving before shift end
              const earlyGrace = hrSettings?.earlyLeaveGracePeriod || 15;
              const graceTimeOut = new Date(workEnd.getTime() - earlyGrace * 60000);
              if (punchDate < graceTimeOut) {
                updateData.earlyLeaveMinutes = Math.floor((workEnd.getTime() - punchDate.getTime()) / 60000);
              } else {
                updateData.earlyLeaveMinutes = 0;
              }

              // Overtime on normal working day: hours worked after scheduled shift end
              if (workEnd && punchDate > workEnd) {
                const minOvertime = parseFloat(hrSettings?.overtimeMinHours) || 1;
                const overtime = (punchDate.getTime() - workEnd.getTime()) / 3600000;
                if (overtime >= minOvertime) {
                  updateData.overtimeHours = Math.round(overtime * 100) / 100;
                }
              }
            }
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.attendance.update({
              where: { id: attendance.id },
              data: updateData
            });
          }
        } else {
          let status = 'PRESENT';
          let lateMinutes = 0;
          let earlyLeaveMinutes = 0;

          if (isRest) {
            status = 'WEEKEND';
          } else if (isCheckIn) {
            const gracePeriod = hrSettings?.lateGracePeriod || hrSettings?.lateThresholdMinutes || 10;
            const graceTime = new Date(workStart.getTime() + gracePeriod * 60000);
            if (punchDate > graceTime) {
              lateMinutes = Math.floor((punchDate - workStart) / 60000);
              status = 'LATE';
            }
          } else {
            const earlyGrace = hrSettings?.earlyLeaveGracePeriod || 15;
            const graceTimeOut = new Date(workEnd.getTime() - earlyGrace * 60000);
            if (punchDate < graceTimeOut) {
              earlyLeaveMinutes = Math.floor((workEnd.getTime() - punchDate.getTime()) / 60000);
            }
          }

          await prisma.attendance.create({
            data: {
              companyId,
              userId: employee.userId,
              employeeRelId: employee.id,
              date: dayStart,
              checkIn: isCheckIn ? punchDate : null,
              checkOut: !isCheckIn ? punchDate : null,
              checkInMethod: isCheckIn ? (deviceId ? `BIOMETRIC_${deviceId}` : 'BIOMETRIC_API') : null,
              checkOutMethod: !isCheckIn ? (deviceId ? `BIOMETRIC_${deviceId}` : 'BIOMETRIC_API') : null,
              status,
              lateMinutes,
              earlyLeaveMinutes,
              workHours: 0,
              overtimeHours: 0
            }
          });
        }

        results.succeeded++;

        // Trigger punch webhook event
        dispatchHrWebhook(companyId, 'hr.attendance.punch_recorded', {
          employeeNumber,
          employeeId: employee.id,
          punchTime,
          type: normalizedType,
          deviceId: deviceId || 'EXTERNAL'
        });
      } catch (err) {
        results.failed++;
        results.errors.push({ punch, error: 'Database error processing punch' });
      }
    }

    // D5: Audit Attribution
    await logExternalApiAction({
      req,
      action: 'INGEST_PUNCHES',
      resourceType: 'Attendance',
      resourceId: deviceId || 'BATCH',
      targetName: `Punches Batch (${results.succeeded} ok, ${results.failed} err)`,
      details: { processed: results.processed, succeeded: results.succeeded, failed: results.failed, deviceId }
    });

    return res.json({
      success: true,
      summary: results
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.recordPunchesBatch] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing punches batch'
      }
    });
  }
};

/**
 * 5. استعلام حضور اليوم (Today Attendance Status for AI / Dashboards)
 */
const getTodayAttendance = async (req, res) => {
  try {
    const { companyId } = req;
    const timezone = req.company?.timezone || 'Africa/Cairo';

    let targetDate;
    if (req.query.date) {
      const rawDate = String(req.query.date).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        targetDate = new Date(`${rawDate}T00:00:00.000Z`);
      } else {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_DATE', message: 'Invalid date parameter provided' }
          });
        }
        const dateStr = getDateStringInTimezone(d, timezone);
        targetDate = new Date(`${dateStr}T00:00:00.000Z`);
      }
    } else {
      const dateStr = getDateStringInTimezone(new Date(), timezone);
      targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    }

    const prisma = getSharedPrismaClient();
    const records = await prisma.attendance.findMany({
      where: {
        companyId,
        date: targetDate
      },
      include: {
        employeeRel: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } }
          }
        },
        user: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
            departmentRelation: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = records.map((record) => {
      let employeeRel = record.employeeRel;
      if (!employeeRel && record.user) {
        employeeRel = {
          employeeNumber: record.user.employeeNumber || '',
          firstName: record.user.firstName || '',
          lastName: record.user.lastName || '',
          department: record.user.departmentRelation ? { name: record.user.departmentRelation.name } : null
        };
      }
      const { user, ...rest } = record;
      return { ...rest, employeeRel };
    });

    return res.json({
      success: true,
      date: targetDate.toISOString().slice(0, 10),
      count: data.length,
      data
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getTodayAttendance] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 6. تقديم طلب إجازة عبر الذكاء الاصطناعي أو نظام خارجي
 */
const createLeaveRequest = async (req, res) => {
  try {
    const { companyId } = req;
    const { employeeId, employeeNumber, type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || (!employeeId && !employeeNumber)) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'employeeId/employeeNumber, type, startDate, and endDate are required' }
      });
    }

    const normalizedType = String(type || '').trim().toUpperCase();
    if (!VALID_LEAVE_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid leave type: '${type}'. Allowed values are: ${VALID_LEAVE_TYPES.join(', ')}`,
          allowedValues: VALID_LEAVE_TYPES
        }
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid startDate or endDate format. Expected YYYY-MM-DD'
        }
      });
    }
    if (end < start) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endDate must not be before startDate'
        }
      });
    }

    const prisma = getSharedPrismaClient();
    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          ...(employeeId ? [{ id: employeeId }] : []),
          ...(employeeNumber ? [{ employeeNumber }] : [])
        ]
      }
    });

    if (!employee || !employee.userId) {
      return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found or unlinked to user' } });
    }

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leaveRequest.create({
      data: {
        companyId,
        userId: employee.userId,
        type: normalizedType,
        startDate: start,
        endDate: end,
        totalDays: Math.max(1, totalDays),
        reason: reason || 'Submitted via External API / AI Agent',
        status: 'PENDING'
      }
    });

    // Fire webhook
    dispatchHrWebhook(companyId, 'hr.leave.requested', {
      leaveId: leave.id,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      totalDays: leave.totalDays,
      type: leave.type
    });

    // D5: Audit Attribution
    await logExternalApiAction({
      req,
      action: 'CREATE_LEAVE',
      resourceType: 'LeaveRequest',
      resourceId: leave.id,
      targetName: `Leave #${leave.id}`,
      details: { type: leave.type, startDate, endDate, totalDays: leave.totalDays }
    });

    return res.status(201).json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ [ExternalHrController.createLeaveRequest] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while creating leave request'
      }
    });
  }
};

/**
 * 7. إدارة اشتراكات الـ Webhooks الخارجية
 */
const listWebhookEndpoints = async (req, res) => {
  try {
    const { companyId } = req;
    const prisma = getSharedPrismaClient();
    const endpoints = await prisma.hrWebhookEndpoint.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: endpoints, availableEvents: HR_WEBHOOK_EVENTS });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createWebhookEndpoint = async (req, res) => {
  try {
    const { companyId } = req;
    const { name, targetUrl, secret, subscribedEvents = ['*'] } = req.body;

    if (!targetUrl || !name) {
      return res.status(400).json({ success: false, error: { message: 'name and targetUrl are required' } });
    }

    const prisma = getSharedPrismaClient();
    const endpoint = await prisma.hrWebhookEndpoint.create({
      data: {
        companyId,
        name,
        targetUrl,
        secret: secret || null,
        subscribedEvents: JSON.stringify(subscribedEvents),
        isActive: true
      }
    });

    // D5: Audit Attribution
    await logExternalApiAction({
      req,
      action: 'CREATE_WEBHOOK',
      resourceType: 'HrWebhookEndpoint',
      resourceId: endpoint.id,
      targetName: endpoint.name,
      details: { targetUrl: endpoint.targetUrl }
    });

    return res.status(201).json({ success: true, data: endpoint });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 8. إدارة مفاتيح API الخارجية (Admin UI)
 */
const listApiCredentials = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const prisma = getSharedPrismaClient();
    const credentials = await prisma.hrApiCredential.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: credentials });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createApiCredential = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const userId = req.user?.id;
    const { name, description, scopes, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'name is required' } });
    }

    const { rawKey, keyPrefix, keyHash } = generateHrApiKey();
    const normalizedScopes = normalizeScopes(scopes);

    const prisma = getSharedPrismaClient();
    const credential = await prisma.hrApiCredential.create({
      data: {
        companyId,
        name,
        description,
        keyPrefix,
        keyHash,
        scopes: JSON.stringify(normalizedScopes),
        createdByUserId: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        ...credential,
        rawKey
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const revokeApiCredential = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.hrApiCredential.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'API credential not found' } });
    }

    await prisma.hrApiCredential.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: req.body?.reason || 'Revoked by admin'
      }
    });

    return res.json({ success: true, message: 'API key successfully revoked' });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: قائمة الأقسام (مع الترقيم والبحث)
 * GET /departments (Scope: hr:departments:read)
 */
const listDepartments = async (req, res) => {
  try {
    const { companyId } = req;
    const { page = 1, limit = 50, search } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const prisma = getSharedPrismaClient();
    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          managerId: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { employees: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.department.count({ where })
    ]);

    // Fetch managers for departments with managerId
    const managerIds = Array.from(new Set(departments.map(d => d.managerId).filter(Boolean)));
    const managers = managerIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        })
      : [];

    const managerMap = new Map(managers.map(m => [m.id, m]));

    const formatted = departments.map((d) => {
      const mgr = d.managerId ? managerMap.get(d.managerId) || null : null;
      return {
        id: d.id,
        name: d.name,
        code: d.code || null,
        description: d.description || null,
        managerId: d.managerId || null,
        manager: mgr ? {
          id: mgr.id,
          firstName: mgr.firstName,
          lastName: mgr.lastName,
          employeeNumber: mgr.employeeNumber
        } : null,
        head: mgr ? {
          id: mgr.id,
          name: `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim(),
          employeeNumber: mgr.employeeNumber
        } : null,
        employeeCount: d._count?.employees || 0,
        isActive: d.isActive !== false,
        createdAt: d.createdAt
      };
    });

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listDepartments] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: قائمة المسميات الوظيفية (مع الترقيم والبحث)
 * GET /positions (Scope: hr:positions:read)
 */
const listPositions = async (req, res) => {
  try {
    const { companyId } = req;
    const { page = 1, limit = 50, departmentId, search } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const prisma = getSharedPrismaClient();
    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          title: true,
          titleEn: true,
          code: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          level: true,
          minSalary: true,
          maxSalary: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { title: 'asc' }
      }),
      prisma.position.count({ where })
    ]);

    return res.json({
      success: true,
      data: positions,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listPositions] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: إحصائيات الموظفين (حسب الحالة والأقسام)
 * GET /employees/stats (Scope: hr:employees:read)
 */
const getEmployeeStats = async (req, res) => {
  try {
    const { companyId } = req;
    const prisma = getSharedPrismaClient();

    const [total, byStatusRaw, byDepartmentRaw] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true
      }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        where: { companyId, departmentId: { not: null } },
        _count: true
      })
    ]);

    const byStatus = byStatusRaw.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        total,
        byStatus: {
          ACTIVE: byStatus.ACTIVE || 0,
          PROBATION: byStatus.PROBATION || 0,
          ON_LEAVE: byStatus.ON_LEAVE || 0,
          TERMINATED: byStatus.TERMINATED || 0,
          SUSPENDED: byStatus.SUSPENDED || 0
        },
        counts: {
          active: byStatus.ACTIVE || 0,
          probation: byStatus.PROBATION || 0,
          onLeave: byStatus.ON_LEAVE || 0,
          terminated: byStatus.TERMINATED || 0
        },
        departmentsCount: byDepartmentRaw.length
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getEmployeeStats] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: الهيكل التنظيمي للموظفين
 * GET /employees/organization-chart (Scope: hr:employees:read)
 */
const getOrganizationChart = async (req, res) => {
  try {
    const { companyId } = req;
    let chart = null;

    try {
      const { employeeService } = require('../../services/hr');
      if (employeeService && typeof employeeService.getOrganizationChart === 'function') {
        chart = await employeeService.getOrganizationChart(companyId);
      }
    } catch (_svcErr) {
      chart = null;
    }

    if (chart) {
      return res.json({ success: true, data: chart });
    }

    // Direct fallback if service is unavailable
    const prisma = getSharedPrismaClient();
    const employees = await prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        managerId: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } }
      }
    });

    return res.json({ success: true, data: employees });
  } catch (error) {
    console.error('❌ [ExternalHrController.getOrganizationChart] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: قائمة طلبات الإجازات مع فلترة
 * GET /leaves (Scope: hr:leaves:read)
 * Query: status, employeeCode, from, to, page, limit
 */
const listLeaveRequests = async (req, res) => {
  try {
    const { companyId } = req;
    const { page = 1, limit = 50, status, employeeCode, from, to } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (status) where.status = status;

    if (employeeCode) {
      const emp = await prisma.employee.findFirst({
        where: {
          companyId,
          OR: [{ employeeNumber: employeeCode }, { id: employeeCode }]
        },
        select: { userId: true }
      });

      if (emp?.userId) {
        where.userId = emp.userId;
      } else {
        const user = await prisma.user.findFirst({
          where: { companyId, OR: [{ employeeNumber: employeeCode }, { id: employeeCode }] },
          select: { id: true }
        });
        if (user) {
          where.userId = user.id;
        } else {
          return res.json({
            success: true,
            data: [],
            pagination: { page: Math.max(1, parseInt(page, 10)), limit: take, total: 0, totalPages: 0 }
          });
        }
      }
    }

    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          userId: true,
          type: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          reason: true,
          status: true,
          approvedBy: true,
          approvedAt: true,
          rejectionReason: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leaveRequest.count({ where })
    ]);

    const userIds = [...new Set(leaves.map(l => l.userId))];
    const employees = await prisma.employee.findMany({
      where: { companyId, userId: { in: userIds } },
      select: {
        userId: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        department: { select: { id: true, name: true } }
      }
    });
    const empMap = new Map(employees.map(e => [e.userId, e]));

    const formatted = leaves.map(l => {
      const emp = empMap.get(l.userId);
      return {
        id: l.id,
        employeeCode: emp?.employeeNumber || null,
        employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : null,
        department: emp?.department?.name || null,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: l.totalDays,
        reason: l.reason,
        status: l.status,
        approvedBy: l.approvedBy,
        approvedAt: l.approvedAt,
        rejectionReason: l.rejectionReason,
        createdAt: l.createdAt
      };
    });

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listLeaveRequests] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: أرصدة الإجازات
 * GET /leaves/balances (Scope: hr:leaves:read)
 * Query: employeeCode
 */
const getLeaveBalances = async (req, res) => {
  try {
    const { companyId } = req;
    const { employeeCode } = req.query;
    const prisma = getSharedPrismaClient();

    let targetEmployees = [];
    if (employeeCode) {
      const emp = await prisma.employee.findFirst({
        where: {
          companyId,
          OR: [{ employeeNumber: employeeCode }, { id: employeeCode }]
        },
        select: { id: true, userId: true, employeeNumber: true, firstName: true, lastName: true }
      });
      if (emp) targetEmployees = [emp];
    } else {
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        take: 50,
        select: { id: true, userId: true, employeeNumber: true, firstName: true, lastName: true }
      });
    }

    if (targetEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No matching employee found' }
      });
    }

    const { leaveService } = require('../../services/hr');

    const balances = await Promise.all(
      targetEmployees.map(async (emp) => {
        let bal = null;
        if (emp.userId && leaveService?.getLeaveBalance) {
          try {
            bal = await leaveService.getLeaveBalance(companyId, emp.userId);
          } catch (_e) {}
        }
        return {
          employeeId: emp.id,
          employeeCode: emp.employeeNumber,
          employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          annualRemaining: bal?.annualLeaveBalance ?? 21,
          sickRemaining: bal?.sickLeaveBalance ?? 7,
          balances: bal || { annual: 21, sick: 7 }
        };
      })
    );

    return res.json({
      success: true,
      data: employeeCode ? balances[0] : balances
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getLeaveBalances] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: ملخص وإحصائيات الحضور والغياب والتأخير
 * GET /attendance/summary (Scope: hr:attendance:read)
 * Query: from, to, month, year, employeeId, employeeCode, userId, departmentId
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { companyId } = req;
    const { from, to, month, year, employeeId, employeeCode, userId, departmentId } = req.query;
    const prisma = getSharedPrismaClient();

    let startDate, endDate;
    if (from) {
      startDate = new Date(from.includes('T') ? from : `${from}T00:00:00.000Z`);
    }
    if (to) {
      endDate = new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`);
    }

    const m = month ? parseInt(month, 10) : null;
    const y = year ? parseInt(year, 10) : null;

    if (!startDate && !endDate) {
      if (m && y) {
        startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      } else if (m && !y) {
        const currentYear = new Date().getFullYear();
        startDate = new Date(Date.UTC(currentYear, m - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(currentYear, m, 0, 23, 59, 59, 999));
      } else if (!m && y) {
        startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      } else {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date();
      }
    } else if (!startDate) {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (!endDate) {
      endDate = new Date();
    }

    const where = {
      companyId,
      date: { gte: startDate, lte: endDate }
    };

    const empParam = employeeId || employeeCode || userId;
    let targetUserId = null;
    let resolvedEmp = null;

    if (empParam) {
      resolvedEmp = await prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            { id: empParam },
            { employeeNumber: empParam },
            { userId: empParam }
          ]
        },
        select: { id: true, userId: true, employeeNumber: true, firstName: true, lastName: true, departmentId: true }
      });

      if (resolvedEmp?.userId) {
        targetUserId = resolvedEmp.userId;
      } else {
        const usr = await prisma.user.findFirst({
          where: {
            companyId,
            OR: [
              { id: empParam },
              { employeeNumber: empParam }
            ]
          },
          select: { id: true, employeeNumber: true, firstName: true, lastName: true, departmentId: true }
        });
        if (usr) {
          targetUserId = usr.id;
        }
      }

      if (targetUserId) {
        where.userId = targetUserId;
      } else {
        where.userId = '__NON_EXISTING_USER_ID__';
      }
    }

    if (departmentId) {
      const [deptEmployees, deptUsers] = await Promise.all([
        prisma.employee.findMany({
          where: { companyId, departmentId },
          select: { userId: true }
        }),
        prisma.user.findMany({
          where: {
            departmentId,
            OR: [
              { companyId },
              { userCompanies: { some: { companyId, isActive: true } } }
            ]
          },
          select: { id: true }
        })
      ]);

      const deptUserIds = Array.from(new Set([
        ...deptEmployees.map(e => e.userId).filter(Boolean),
        ...deptUsers.map(u => u.id).filter(Boolean)
      ]));

      if (deptUserIds.length === 0) {
        where.userId = '__NON_EXISTING_DEPT_USERS__';
      } else if (where.userId) {
        if (typeof where.userId === 'string') {
          if (!deptUserIds.includes(where.userId)) {
            where.userId = '__NO_USER_DEPT_INTERSECTION__';
          }
        } else if (where.userId.in) {
          where.userId = { in: where.userId.in.filter(id => deptUserIds.includes(id)) };
        }
      } else {
        where.userId = { in: deptUserIds };
      }
    }

    const [totalRecords, byStatusRaw, aggregates] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.attendance.aggregate({
        where,
        _avg: { workHours: true },
        _sum: { overtimeHours: true }
      })
    ]);

    const byStatus = byStatusRaw.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    // Calculate derived absence days via official attendanceService.getAbsentDaysReport
    let derivedAbsenceDays = null;
    let totalWorkingDays = null;
    let derivedAttendanceRate = null;
    let absentDates = [];

    try {
      const evalYear = (m && y) ? y : (y || startDate.getUTCFullYear());
      const evalMonth = (m && y) ? m : (m || (startDate.getUTCMonth() + 1));
      const validTargetUserId = (targetUserId && !targetUserId.startsWith('__')) ? targetUserId : null;

      const absentReport = await attendanceService.getAbsentDaysReport(
        companyId,
        evalYear,
        evalMonth,
        validTargetUserId,
        departmentId || null
      );

      if (absentReport) {
        totalWorkingDays = absentReport.totalWorkingDays ?? null;
        if (validTargetUserId) {
          const empData = absentReport.employees?.find(e => e.userId === validTargetUserId || e.id === validTargetUserId);
          if (empData) {
            derivedAbsenceDays = empData.absentDays;
            absentDates = empData.absentDates || [];
            derivedAttendanceRate = empData.attendanceRate;
          } else {
            derivedAbsenceDays = 0;
            absentDates = [];
            derivedAttendanceRate = 100;
          }
        } else {
          derivedAbsenceDays = absentReport.totalAbsentDays ?? 0;
          derivedAttendanceRate = absentReport.attendanceRate;
        }
      }
    } catch (e) {
      console.warn('⚠️ [ExternalHrController.getAttendanceSummary] getAbsentDaysReport error:', e.message);
    }

    const rowBasedAbsence = byStatus.ABSENT || 0;
    const effectiveDerivedAbsenceDays = derivedAbsenceDays !== null ? derivedAbsenceDays : rowBasedAbsence;

    return res.json({
      success: true,
      data: {
        period: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          ...(m && y ? { month: m, year: y } : {})
        },
        filters: {
          employeeId: empParam || null,
          employeeNumber: resolvedEmp?.employeeNumber || null,
          userId: (targetUserId && !targetUserId.startsWith('__')) ? targetUserId : null,
          departmentId: departmentId || null
        },
        totalRecords,
        present: byStatus.PRESENT || 0,
        late: byStatus.LATE || 0,
        absent: rowBasedAbsence,
        rowBasedAbsence,
        derivedAbsenceDays: effectiveDerivedAbsenceDays,
        absentDays: effectiveDerivedAbsenceDays,
        totalWorkingDays,
        attendanceRate: derivedAttendanceRate,
        absentDates: absentDates.length > 0 ? absentDates : undefined,
        onLeave: byStatus.ON_LEAVE || 0,
        halfDay: byStatus.HALF_DAY || 0,
        byStatus,
        avgWorkHours: Number((aggregates._avg?.workHours || 0).toFixed(2)),
        totalOvertimeHours: Number((aggregates._sum?.overtimeHours || 0).toFixed(2)),
        absenceBreakdown: {
          rowBasedAbsence,
          derivedAbsenceDays: effectiveDerivedAbsenceDays,
          explanation: 'rowBasedAbsence counts database rows with status=ABSENT. derivedAbsenceDays counts scheduled working days without check-in (excluding public holidays, approved leaves, and days prior to hire date).'
        }
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getAttendanceSummary] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: مسيرات الرواتب (مجمعة بالفترات والشهور)
 * GET /payroll/runs (Scope: hr:payroll:read)
 * Query: from, to, year, month, status, page, limit
 */
const listPayrollRuns = async (req, res) => {
  try {
    const { companyId } = req;
    const { page = 1, limit = 50, year, month, status } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (year) where.year = parseInt(year, 10);
    if (month) where.month = parseInt(month, 10);
    if (status) where.status = status;

    const groups = await prisma.payroll.groupBy({
      by: ['year', 'month', 'status'],
      where,
      _count: { userId: true },
      _sum: {
        grossSalary: true,
        netSalary: true,
        totalAllowances: true,
        totalDeductions: true
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    const total = groups.length;
    const paginatedGroups = groups.slice(skip, skip + take);

    const data = paginatedGroups.map(g => ({
      id: `${g.year}-${String(g.month).padStart(2, '0')}`,
      year: g.year,
      month: g.month,
      period: `${g.year}-${String(g.month).padStart(2, '0')}`,
      employeeCount: g._count?.userId || 0,
      totalGrossSalary: Number(g._sum?.grossSalary || 0),
      totalNetSalary: Number(g._sum?.netSalary || 0),
      totalAllowances: Number(g._sum?.totalAllowances || 0),
      totalDeductions: Number(g._sum?.totalDeductions || 0),
      status: g.status
    }));

    return res.json({
      success: true,
      data,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listPayrollRuns] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1: بنود مسير رواتب محدد (لكل موظف)
 * GET /payroll/runs/:id/items (Scope: hr:payroll:read)
 * Query: page, limit, status, employeeCode
 */
const getPayrollRunItems = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { page = 1, limit = 50, status, employeeCode } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (id && id.includes('-')) {
      const [yearStr, monthStr] = id.split('-');
      where.year = parseInt(yearStr, 10);
      where.month = parseInt(monthStr, 10);
    } else if (id) {
      where.id = id;
    }

    if (status) where.status = status;

    if (employeeCode) {
      const emp = await prisma.employee.findFirst({
        where: { companyId, OR: [{ employeeNumber: employeeCode }, { id: employeeCode }] },
        select: { userId: true }
      });
      if (emp?.userId) where.userId = emp.userId;
    }

    const [items, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip,
        take,
        orderBy: { netSalary: 'desc' }
      }),
      prisma.payroll.count({ where })
    ]);

    const userIds = items.map(i => i.userId);
    const employees = await prisma.employee.findMany({
      where: { companyId, userId: { in: userIds } },
      select: {
        userId: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } }
      }
    });
    const empMap = new Map(employees.map(e => [e.userId, e]));

    const formatted = items.map(item => {
      const emp = empMap.get(item.userId);
      return {
        id: item.id,
        employeeId: emp?.userId || item.userId,
        employeeCode: emp?.employeeNumber || null,
        employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : null,
        department: emp?.department?.name || null,
        position: emp?.position?.title || null,
        year: item.year,
        month: item.month,
        baseSalary: Number(item.baseSalary || 0),
        grossSalary: Number(item.grossSalary || 0),
        netSalary: Number(item.netSalary || 0),
        allowances: Number(item.totalAllowances || 0),
        deductions: Number(item.totalDeductions || 0),
        overtimeAmount: Number(item.overtimeAmount || 0),
        bonuses: Number(item.bonuses || 0),
        status: item.status,
        paidAt: item.paidAt
      };
    });

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getPayrollRunItems] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * D1b: معاينة مسير رواتب بدون كتابة في قاعدة البيانات (Dry-Run / Read-Only)
 * POST /payroll/preview (Scope: hr:payroll:read)
 * POST /payroll/runs?dryRun=true
 */
const previewPayroll = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      month,
      year,
      employeeId,
      employeeCode,
      employeeNumber,
      overrides
    } = {
      ...req.query,
      ...req.body
    };

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'month and year are required for payroll preview'
        }
      });
    }

    const preview = await payrollService.previewPayroll(companyId, {
      month,
      year,
      employeeId,
      employeeCode,
      employeeNumber,
      overrides
    });

    return res.json(preview);
  } catch (error) {
    console.error('❌ [ExternalHrController.previewPayroll] Error:', error);
    const status = error.statusCode || error.status || (error.code ? 400 : 500);
    return res.status(status).json({
      success: false,
      error: {
        code: error.code || 'PREVIEW_ERROR',
        message: error.message
      }
    });
  }
};

/**
 * D1c: إنشاء مسير رواتب فعلي أو تحويله لمعاينة إذا كان dryRun=true
 * POST /payroll/runs (Scope: hr:payroll:write)
 */
const createPayrollRun = async (req, res) => {
  try {
    const isDryRun = req.query?.dryRun === 'true' || req.body?.dryRun === true;
    if (isDryRun) {
      return previewPayroll(req, res);
    }

    const { companyId } = req;
    const { month, year, forceRegenerate = false } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'month and year are required to create a payroll run'
        }
      });
    }

    const result = await payrollService.generateMonthlyPayroll(
      companyId,
      parseInt(month, 10),
      parseInt(year, 10),
      forceRegenerate === true
    );

    await logExternalApiAction({
      req,
      action: 'CREATE_PAYROLL_RUN',
      description: `Generated payroll run for ${month}/${year} (Success: ${result?.success?.length || 0}, Regenerated: ${result?.regenerated?.length || 0})`,
      resourceType: 'PayrollRun',
      resourceId: `${year}-${String(month).padStart(2, '0')}`,
      targetName: `Payroll ${month}/${year}`,
      companyId
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createPayrollRun] Error:', error);
    const status = error.statusCode || error.status || 500;
    return res.status(status).json({
      success: false,
      error: {
        code: error.code || 'PAYROLL_GENERATION_FAILED',
        message: error.message
      }
    });
  }
};

/**
 * D2: اتخاذ قرار في طلب إجازة (قبول أو رفض)
 * POST /leaves/:id/decision (Scope: hr:leaves:approve)
 * Body: { action: "APPROVE" | "REJECT", note: "..." }
 */
const decideLeaveRequest = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { action, note = '' } = req.body;

    const normalizedAction = String(action || '').toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(normalizedAction)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DECISION_ACTION',
          message: 'action must be either APPROVE or REJECT'
        }
      });
    }

    const prisma = getSharedPrismaClient();
    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: { id, companyId }
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAVE_NOT_FOUND',
          message: 'Leave request not found'
        }
      });
    }

    // Reuse panel leaveService path
    const { leaveService } = require('../../services/hr');

    let approverEmployeeId = req.user?.id;
    let approverUserId = req.user?.id;

    if (leaveRequest.userId === approverEmployeeId) {
      const adminUser = await prisma.user.findFirst({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER'] },
          id: { not: leaveRequest.userId }
        },
        select: { id: true }
      });
      if (adminUser) {
        approverEmployeeId = adminUser.id;
        approverUserId = adminUser.id;
      }
    }

    let updatedLeave = null;
    if (normalizedAction === 'APPROVE') {
      if (leaveService && typeof leaveService.approveLeaveRequest === 'function') {
        updatedLeave = await leaveService.approveLeaveRequest(companyId, id, approverEmployeeId, approverUserId);
      } else {
        updatedLeave = await prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedBy: approverEmployeeId,
            approvedAt: new Date()
          }
        });
      }
    } else {
      if (leaveService && typeof leaveService.rejectLeaveRequest === 'function') {
        updatedLeave = await leaveService.rejectLeaveRequest(companyId, id, approverEmployeeId, note);
      } else {
        updatedLeave = await prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: note
          }
        });
      }
    }

    // D5: Audit Attribution
    await logExternalApiAction({
      req,
      action: `LEAVE_${normalizedAction}`,
      resourceType: 'LeaveRequest',
      resourceId: id,
      targetName: `Leave #${id}`,
      details: {
        action: normalizedAction,
        note,
        status: updatedLeave?.status || normalizedAction,
        credentialName: req.hrCredential?.name
      }
    });

    // Outbound Webhook
    dispatchHrWebhook(
      companyId,
      normalizedAction === 'APPROVE' ? 'hr.leave.approved' : 'hr.leave.rejected',
      {
        leaveId: id,
        status: updatedLeave?.status || (normalizedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED'),
        decidedBy: req.hrCredential?.name || 'EXTERNAL_HR_AGENT',
        note
      }
    );

    return res.json({
      success: true,
      data: updatedLeave,
      message: normalizedAction === 'APPROVE'
        ? 'Leave request approved successfully'
        : 'Leave request rejected successfully'
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.decideLeaveRequest] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing leave decision'
      }
    });
  }
};

/**
 * 17. قائمة طلبات السلف المالية (Advances)
 * GET /advances
 */
const listAdvances = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      employeeCode,
      status,
      from,
      to,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        where.createdAt.lte = toDate;
      }
    }

    const prisma = getSharedPrismaClient();

    if (employeeCode) {
      const code = String(employeeCode).trim();
      const [matchedEmps, matchedUsers] = await Promise.all([
        prisma.employee.findMany({
          where: {
            companyId,
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true, userId: true }
        }),
        prisma.user.findMany({
          where: {
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true }
        })
      ]);

      const relIds = matchedEmps.map((e) => e.id);
      const userIds = [
        ...matchedEmps.map((e) => e.userId),
        ...matchedUsers.map((u) => u.id)
      ].filter(Boolean);

      where.OR = [
        ...(relIds.length ? [{ employeeRelId: { in: relIds } }] : []),
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ];
    }

    if (search) {
      const searchConditions = [
        { reason: { contains: search, mode: 'insensitive' } },
        { repaymentType: { contains: search, mode: 'insensitive' } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [advances, total] = await Promise.all([
      prisma.advanceRequest.findMany({
        where,
        skip,
        take,
        include: {
          employeeRel: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: { select: { id: true, title: true } }
            }
          },
          user: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              departmentRelation: { select: { id: true, name: true } },
              positionRelation: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.advanceRequest.count({ where })
    ]);

    const formattedData = advances.map((item) => {
      let employee = item.employeeRel;
      if (!employee && item.user) {
        employee = {
          id: item.user.id,
          employeeNumber: item.user.employeeNumber || '',
          firstName: item.user.firstName || '',
          lastName: item.user.lastName || '',
          department: item.user.departmentRelation ? { id: item.user.departmentRelation.id, name: item.user.departmentRelation.name } : null,
          position: item.user.positionRelation ? { id: item.user.positionRelation.id, title: item.user.positionRelation.title } : null
        };
      }
      const { user, employeeRel, ...rest } = item;
      return {
        ...rest,
        employee
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listAdvances] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 18. قائمة الخصومات والجزاءات (Deductions)
 * GET /deductions
 */
const listDeductions = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      employeeCode,
      status,
      from,
      to,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const timezone = req.company?.timezone || 'Africa/Cairo';

    const where = { companyId };
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (from || to) {
      where.date = {};
      if (from) {
        const fromStr = /^\d{4}-\d{2}-\d{2}$/.test(String(from).trim())
          ? String(from).trim()
          : getDateStringInTimezone(new Date(from), timezone);
        where.date.gte = new Date(`${fromStr}T00:00:00.000Z`);
      }
      if (to) {
        const toStr = /^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())
          ? String(to).trim()
          : getDateStringInTimezone(new Date(to), timezone);
        where.date.lte = new Date(`${toStr}T00:00:00.000Z`);
      }
    }

    const prisma = getSharedPrismaClient();

    if (employeeCode) {
      const code = String(employeeCode).trim();
      const [matchedEmps, matchedUsers] = await Promise.all([
        prisma.employee.findMany({
          where: {
            companyId,
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true, userId: true }
        }),
        prisma.user.findMany({
          where: {
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true }
        })
      ]);

      const candidateIds = [
        ...matchedEmps.map((e) => e.id),
        ...matchedEmps.map((e) => e.userId),
        ...matchedUsers.map((u) => u.id)
      ].filter(Boolean);

      where.employeeId = { in: candidateIds };
    }

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [deductions, total] = await Promise.all([
      prisma.manualDeduction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.manualDeduction.count({ where })
    ]);

    const employeeIds = [...new Set(deductions.map((d) => d.employeeId).filter(Boolean))];
    const [employees, users] = await Promise.all([
      employeeIds.length
        ? prisma.employee.findMany({
            where: {
              companyId,
              OR: [{ id: { in: employeeIds } }, { userId: { in: employeeIds } }]
            },
            select: {
              id: true,
              userId: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: { select: { id: true, title: true } }
            }
          })
        : [],
      employeeIds.length
        ? prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              departmentRelation: { select: { id: true, name: true } },
              positionRelation: { select: { id: true, title: true } }
            }
          })
        : []
    ]);

    const empMap = new Map();
    for (const emp of employees) {
      if (emp.id) empMap.set(emp.id, emp);
      if (emp.userId) empMap.set(emp.userId, emp);
    }
    for (const u of users) {
      if (!empMap.has(u.id)) {
        empMap.set(u.id, {
          id: u.id,
          employeeNumber: u.employeeNumber || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          department: u.departmentRelation ? { id: u.departmentRelation.id, name: u.departmentRelation.name } : null,
          position: u.positionRelation ? { id: u.positionRelation.id, title: u.positionRelation.title } : null
        });
      }
    }

    const formattedData = deductions.map((item) => ({
      ...item,
      employee: empMap.get(item.employeeId) || null
    }));

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listDeductions] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 19. قائمة الإنذارات ولفتات النظر (Warnings)
 * GET /warnings
 */
const listWarnings = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      employeeCode,
      status,
      from,
      to,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (status && status !== 'all') {
      where.OR = [
        { severity: { equals: status, mode: 'insensitive' } },
        { type: { equals: status.toUpperCase() } }
      ];
    }

    if (from || to) {
      where.incidentDate = {};
      if (from) where.incidentDate.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        where.incidentDate.lte = toDate;
      }
    }

    const prisma = getSharedPrismaClient();

    if (employeeCode) {
      const code = String(employeeCode).trim();
      const [matchedEmps, matchedUsers] = await Promise.all([
        prisma.employee.findMany({
          where: {
            companyId,
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true, userId: true }
        }),
        prisma.user.findMany({
          where: {
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true }
        })
      ]);

      const relIds = matchedEmps.map((e) => e.id);
      const userIds = [
        ...matchedEmps.map((e) => e.userId),
        ...matchedUsers.map((u) => u.id)
      ].filter(Boolean);

      const codeFilter = [
        ...(relIds.length ? [{ employeeRelId: { in: relIds } }] : []),
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: codeFilter }];
        delete where.OR;
      } else {
        where.OR = codeFilter;
      }
    }

    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { actionTaken: { contains: search, mode: 'insensitive' } }
      ];
      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [warnings, total] = await Promise.all([
      prisma.employeeWarning.findMany({
        where,
        skip,
        take,
        include: {
          employeeRel: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employeeWarning.count({ where })
    ]);

    const missingUserIds = warnings
      .filter((w) => !w.employeeRel && w.userId)
      .map((w) => w.userId);
    const users = missingUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: missingUserIds } },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            departmentRelation: { select: { id: true, name: true } },
            positionRelation: { select: { id: true, title: true } }
          }
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const formattedData = warnings.map((item) => {
      let employee = item.employeeRel;
      if (!employee && item.userId && userMap.has(item.userId)) {
        const u = userMap.get(item.userId);
        employee = {
          id: u.id,
          employeeNumber: u.employeeNumber || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          department: u.departmentRelation ? { id: u.departmentRelation.id, name: u.departmentRelation.name } : null,
          position: u.positionRelation ? { id: u.positionRelation.id, title: u.positionRelation.title } : null
        };
      }
      const { employeeRel, ...rest } = item;
      return {
        ...rest,
        employee
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listWarnings] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 20. قائمة طلبات الاستقالة (Resignations)
 * GET /resignations
 */
const listResignations = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      employeeCode,
      status,
      from,
      to,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (from || to) {
      where.resignationDate = {};
      if (from) where.resignationDate.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        where.resignationDate.lte = toDate;
      }
    }

    const prisma = getSharedPrismaClient();

    if (employeeCode) {
      const code = String(employeeCode).trim();
      const [matchedEmps, matchedUsers] = await Promise.all([
        prisma.employee.findMany({
          where: {
            companyId,
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true, userId: true }
        }),
        prisma.user.findMany({
          where: {
            OR: [{ employeeNumber: code }, { id: code }]
          },
          select: { id: true }
        })
      ]);

      const relIds = matchedEmps.map((e) => e.id);
      const userIds = [
        ...matchedEmps.map((e) => e.userId),
        ...matchedUsers.map((u) => u.id)
      ].filter(Boolean);

      where.OR = [
        ...(relIds.length ? [{ employeeRelId: { in: relIds } }] : []),
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ];
    }

    if (search) {
      const searchConditions = [
        { reason: { contains: search, mode: 'insensitive' } },
        { exitInterview: { contains: search, mode: 'insensitive' } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [resignations, total] = await Promise.all([
      prisma.resignation.findMany({
        where,
        skip,
        take,
        include: {
          employeeRel: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.resignation.count({ where })
    ]);

    const missingUserIds = resignations
      .filter((r) => !r.employeeRel && r.userId)
      .map((r) => r.userId);
    const users = missingUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: missingUserIds } },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            departmentRelation: { select: { id: true, name: true } },
            positionRelation: { select: { id: true, title: true } }
          }
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const formattedData = resignations.map((item) => {
      let employee = item.employeeRel;
      if (!employee && item.userId && userMap.has(item.userId)) {
        const u = userMap.get(item.userId);
        employee = {
          id: u.id,
          employeeNumber: u.employeeNumber || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          department: u.departmentRelation ? { id: u.departmentRelation.id, name: u.departmentRelation.name } : null,
          position: u.positionRelation ? { id: u.positionRelation.id, title: u.positionRelation.title } : null
        };
      }
      const { employeeRel, ...rest } = item;
      return {
        ...rest,
        employee
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listResignations] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 21. إعدادات الموارد البشرية المقسمة مع تقنيع الحقول الحساسة
 * GET /settings
 */
const getHRSettings = async (req, res) => {
  try {
    const { companyId } = req;
    const prisma = getSharedPrismaClient();

    const [company, runtimeColumns, latenessRules, primaryShift] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, timezone: true, phone: true }
      }),
      getHRSettingsRuntimeColumns(prisma),
      prisma.latenessRules.findUnique({ where: { companyId } }),
      prisma.shift.findFirst({
        where: { companyId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
    ]);

    let settings = await readHRSettingsCompat(prisma, companyId, runtimeColumns);
    if (!settings) {
      settings = await upsertHRSettingsCompat(
        prisma,
        companyId,
        { workDays: JSON.stringify([1, 2, 3, 4, 5]) },
        runtimeColumns
      );
    }

    const maskedData = formatMaskedSettings(
      settings,
      company?.timezone || 'Africa/Cairo',
      latenessRules,
      primaryShift
    );

    return res.json({
      success: true,
      data: maskedData
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getHRSettings] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 22. تعديل إعدادات الموارد البشرية مع دمج الأقسام (Section Merge)
 * PUT /settings
 */
const updateHRSettings = async (req, res) => {
  try {
    const { companyId } = req;
    const prisma = getSharedPrismaClient();

    const [company, runtimeColumns, latenessRules, primaryShift] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, timezone: true, phone: true }
      }),
      getHRSettingsRuntimeColumns(prisma),
      prisma.latenessRules.findUnique({ where: { companyId } }),
      prisma.shift.findFirst({
        where: { companyId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
    ]);

    let currentSettings = await readHRSettingsCompat(prisma, companyId, runtimeColumns);
    if (!currentSettings) {
      currentSettings = await upsertHRSettingsCompat(
        prisma,
        companyId,
        { workDays: JSON.stringify([1, 2, 3, 4, 5]) },
        runtimeColumns
      );
    }

    const currentFormatted = formatMaskedSettings(
      currentSettings,
      company?.timezone || 'Africa/Cairo',
      latenessRules,
      primaryShift
    );

    // Section Merge: any section passed is merged with current section
    const body = req.body || {};
    const mergedWorkHours = { ...currentFormatted.workHours, ...(body.workHours || {}) };
    const mergedLeaves = { ...currentFormatted.leaves, ...(body.leaves || {}) };
    const mergedAttendance = { ...currentFormatted.attendance, ...(body.attendance || {}) };
    const mergedGeofence = { ...currentFormatted.geofence, ...(body.geofence || {}) };
    const mergedPayroll = { ...currentFormatted.payroll, ...(body.payroll || {}) };
    const mergedNotifications = { ...currentFormatted.notifications, ...(body.notifications || {}) };

    // Support flat body keys if passed at root
    const flatKeys = [
      'workStartTime', 'workEndTime', 'latestAllowedTime', 'monthlyAllowanceMinutes', 'allowanceResetDay',
      'lateThreshold', 'lateThresholdMinutes', 'lateGracePeriod', 'earlyLeaveThreshold',
      'earlyLeaveGracePeriod', 'earlyCheckoutEnabled', 'earlyCheckoutThresholdMinutes',
      'monthlyLateLimit', 'lateWarningThreshold', 'autoDeductionEnabled', 'gracePeriodMinutes',
      'maxDailyDeductionDays', 'deductionCalculationMethod', 'workingDaysPerMonth', 'workingHoursPerDay',
      'requireDeductionReview', 'absencePenaltyRate', 'deductAbsenceInCurrentMonth', 'geofenceEnabled',
      'officeLatitude', 'officeLongitude', 'geofenceRadius', 'payrollDay', 'taxRate',
      'socialInsuranceRate', 'overtimeRate', 'annualLeaveDefault', 'sickLeaveDefault', 'carryOverLimit'
    ];
    for (const key of flatKeys) {
      if (body[key] !== undefined) {
        if (key in mergedWorkHours) mergedWorkHours[key] = body[key];
        if (key in mergedAttendance) mergedAttendance[key] = body[key];
        if (key in mergedGeofence) mergedGeofence[key] = body[key];
        if (key in mergedPayroll) mergedPayroll[key] = body[key];
        if (key in mergedLeaves) mergedLeaves[key] = body[key];
      }
    }

    // Daily late allowance & grace period preservation
    const callerProvidedLateThreshold = body.lateThresholdMinutes !== undefined ? Number(body.lateThresholdMinutes)
      : (body.lateThreshold !== undefined ? Number(body.lateThreshold)
      : (body.attendance?.lateThresholdMinutes !== undefined ? Number(body.attendance.lateThresholdMinutes)
      : (body.attendance?.lateThreshold !== undefined ? Number(body.attendance.lateThreshold) : null)));

    const callerProvidedLateGrace = body.lateGracePeriod !== undefined ? Number(body.lateGracePeriod)
      : (body.attendance?.lateGracePeriod !== undefined ? Number(body.attendance.lateGracePeriod) : null);

    if (callerProvidedLateThreshold !== null && !isNaN(callerProvidedLateThreshold)) {
      mergedAttendance.lateThresholdMinutes = callerProvidedLateThreshold;
      mergedAttendance.lateThreshold = callerProvidedLateThreshold;
      // If caller provided threshold but not gracePeriod, synchronize gracePeriod if company is H2M (has latenessRules)
      if (callerProvidedLateGrace === null && latenessRules) {
        mergedAttendance.lateGracePeriod = callerProvidedLateThreshold;
      }
    }

    if (callerProvidedLateGrace !== null && !isNaN(callerProvidedLateGrace)) {
      mergedAttendance.lateGracePeriod = callerProvidedLateGrace;
      if (callerProvidedLateThreshold === null && latenessRules) {
        mergedAttendance.lateThresholdMinutes = callerProvidedLateGrace;
        mergedAttendance.lateThreshold = callerProvidedLateGrace;
      }
    }

    const unifiedDailyLateThreshold = Number(
      mergedAttendance.lateThresholdMinutes ?? mergedAttendance.lateGracePeriod ?? 10
    );

    let unifiedMonthlyGrace = null;
    if (body.gracePeriodMinutes !== undefined) unifiedMonthlyGrace = Number(body.gracePeriodMinutes);
    else if (body.monthlyAllowanceMinutes !== undefined) unifiedMonthlyGrace = Number(body.monthlyAllowanceMinutes);
    else if (body.attendance?.gracePeriodMinutes !== undefined) unifiedMonthlyGrace = Number(body.attendance.gracePeriodMinutes);
    else if (body.workHours?.monthlyAllowanceMinutes !== undefined) unifiedMonthlyGrace = Number(body.workHours.monthlyAllowanceMinutes);

    if (unifiedMonthlyGrace !== null && !isNaN(unifiedMonthlyGrace)) {
      mergedAttendance.gracePeriodMinutes = unifiedMonthlyGrace;
      mergedWorkHours.monthlyAllowanceMinutes = unifiedMonthlyGrace;
    }

    // Upsert lateness_rules with workStartTime, latestAllowedTime, monthlyAllowanceMinutes, allowanceResetDay
    const latenessUpdate = {};
    if (mergedWorkHours.workStartTime !== undefined && mergedWorkHours.workStartTime !== null) {
      latenessUpdate.workStartTime = String(mergedWorkHours.workStartTime).trim();
    }

    // Derive or set latestAllowedTime
    if (mergedWorkHours.latestAllowedTime !== undefined && mergedWorkHours.latestAllowedTime !== null) {
      latenessUpdate.latestAllowedTime = String(mergedWorkHours.latestAllowedTime).trim();
      // If user explicitly sent latestAllowedTime, update daily threshold diff as well
      const [allowedH, allowedM] = latenessUpdate.latestAllowedTime.split(':').map(Number);
      const startTimeStr = latenessUpdate.workStartTime || currentFormatted.workHours.workStartTime || '10:00';
      const [startH, startM] = startTimeStr.split(':').map(Number);
      if (!isNaN(allowedH) && !isNaN(allowedM) && !isNaN(startH) && !isNaN(startM)) {
        const diffMins = (allowedH * 60 + allowedM) - (startH * 60 + startM);
        if (diffMins > 0) {
          mergedAttendance.lateThresholdMinutes = diffMins;
          mergedAttendance.lateGracePeriod = diffMins;
          mergedAttendance.lateThreshold = diffMins;
        }
      }
    } else if (latenessUpdate.workStartTime || unifiedDailyLateThreshold !== null) {
      // Calculate latestAllowedTime = workStartTime + unifiedDailyLateThreshold
      const startTimeStr = latenessUpdate.workStartTime || currentFormatted.workHours.workStartTime || '10:00';
      const [startH, startM] = startTimeStr.split(':').map(Number);
      if (!isNaN(startH) && !isNaN(startM)) {
        const totalStartMins = startH * 60 + startM;
        const totalAllowedMins = totalStartMins + (unifiedDailyLateThreshold || 10);
        const allowedH = Math.floor(totalAllowedMins / 60) % 24;
        const allowedM = totalAllowedMins % 60;
        latenessUpdate.latestAllowedTime = `${String(allowedH).padStart(2, '0')}:${String(allowedM).padStart(2, '0')}`;
        mergedWorkHours.latestAllowedTime = latenessUpdate.latestAllowedTime;
      }
    }

    if (mergedWorkHours.monthlyAllowanceMinutes !== undefined && mergedWorkHours.monthlyAllowanceMinutes !== null) {
      latenessUpdate.monthlyAllowanceMinutes = Number(mergedWorkHours.monthlyAllowanceMinutes);
    } else if (mergedAttendance.gracePeriodMinutes !== undefined && mergedAttendance.gracePeriodMinutes !== null) {
      latenessUpdate.monthlyAllowanceMinutes = Number(mergedAttendance.gracePeriodMinutes);
    }

    if (mergedWorkHours.allowanceResetDay !== undefined && mergedWorkHours.allowanceResetDay !== null) {
      latenessUpdate.allowanceResetDay = Number(mergedWorkHours.allowanceResetDay);
    }

    const hasExplicitLatenessUpdate = Boolean(
      body.workHours?.latestAllowedTime !== undefined ||
      body.workHours?.monthlyAllowanceMinutes !== undefined ||
      body.workHours?.allowanceResetDay !== undefined ||
      body.latestAllowedTime !== undefined ||
      body.monthlyAllowanceMinutes !== undefined ||
      body.allowanceResetDay !== undefined
    );

    // Only upsert lateness_rules if the company already had a latenessRules row OR explicit lateness rule fields were sent
    if ((latenessRules || hasExplicitLatenessUpdate) && Object.keys(latenessUpdate).length > 0) {
      await prisma.latenessRules.upsert({
        where: { companyId },
        create: {
          companyId,
          workStartTime: latenessUpdate.workStartTime || '10:00',
          latestAllowedTime: latenessUpdate.latestAllowedTime || '10:10',
          monthlyAllowanceMinutes: latenessUpdate.monthlyAllowanceMinutes ?? 60,
          allowanceResetDay: latenessUpdate.allowanceResetDay ?? 5,
          ...latenessUpdate
        },
        update: latenessUpdate
      });
    }

    // Sync workEndTime / workStartTime with primary company shift in hr_shifts
    if ((mergedWorkHours.workEndTime || mergedWorkHours.workStartTime) && primaryShift) {
      const shiftData = {};
      if (mergedWorkHours.workEndTime) shiftData.endTime = String(mergedWorkHours.workEndTime).trim();
      if (mergedWorkHours.workStartTime) shiftData.startTime = String(mergedWorkHours.workStartTime).trim();
      await prisma.shift.update({
        where: { id: primaryShift.id },
        data: shiftData
      });
    }

    // Convert workingDays to workDays numbers if provided
    let workDaysJson = currentSettings.workDays;
    const rawDays = body.workHours?.workingDays || body.workHours?.workDays;
    if (rawDays && Array.isArray(rawDays)) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const numbers = rawDays
        .map((d) => (typeof d === 'number' ? d : dayNames.indexOf(String(d).toLowerCase())))
        .filter((d) => d >= 0 && d <= 6);
      if (numbers.length > 0) {
        workDaysJson = JSON.stringify([...new Set(numbers)]);
      }
    }

    // Handle Timezone update on Company
    if (mergedWorkHours.timezone && mergedWorkHours.timezone !== company?.timezone) {
      await prisma.company.update({
        where: { id: companyId },
        data: { timezone: mergedWorkHours.timezone }
      });
    }

    // Preserve real ownerWhatsAppNumber if caller passed back masked value
    let ownerPhoneToSave = currentSettings.ownerWhatsAppNumber;
    if (body.notifications?.ownerWhatsAppNumber !== undefined) {
      const newPhone = String(body.notifications.ownerWhatsAppNumber).trim();
      if (!newPhone.includes('•••')) {
        ownerPhoneToSave = newPhone || null;
      }
    }

    // Map merged sections back to DB columns
    const dbUpdateData = {
      workDays: workDaysJson,
      annualLeaveDefault: Number(mergedLeaves.annualLeaveDefault),
      sickLeaveDefault: Number(mergedLeaves.sickLeaveDefault),
      carryOverLimit: Number(mergedLeaves.carryOverLimit),
      payrollDay: Number(mergedPayroll.payrollDay),
      taxRate: Number(mergedPayroll.taxRate),
      socialInsuranceRate: Number(mergedPayroll.socialInsuranceRate),
      overtimeRate: Number(mergedPayroll.overtimeRate),
      maxAdvancePercentage: Number(mergedPayroll.maxAdvancePercentage),
      maxActiveAdvances: Number(mergedPayroll.maxActiveAdvances),
      minMonthsForAdvance: Number(mergedPayroll.minMonthsForAdvance),
      advanceRepaymentMonths: Number(mergedPayroll.advanceRepaymentMonths),
      lateGracePeriod: Number(mergedAttendance.lateGracePeriod ?? 15),
      lateThresholdMinutes: Number(mergedAttendance.lateThresholdMinutes ?? 10),
      earlyLeaveGracePeriod: Number(mergedAttendance.earlyLeaveGracePeriod || mergedAttendance.earlyLeaveThreshold || 15),
      monthlyLateLimit: Number(mergedAttendance.monthlyLateLimit || 3),
      lateWarningThreshold: Number(mergedAttendance.lateWarningThreshold || 3),
      lateWarningLevels: Array.isArray(mergedAttendance.lateWarningLevels)
        ? JSON.stringify(mergedAttendance.lateWarningLevels)
        : mergedAttendance.lateWarningLevels,
      autoDeductionEnabled: Boolean(mergedAttendance.autoDeductionEnabled),
      gracePeriodMinutes: Number(mergedAttendance.gracePeriodMinutes || 60),
      maxDailyDeductionDays: Number(mergedAttendance.maxDailyDeductionDays || 1.0),
      earlyCheckoutEnabled: Boolean(mergedAttendance.earlyCheckoutEnabled),
      earlyCheckoutThresholdMinutes: Number(mergedAttendance.earlyCheckoutThresholdMinutes || 0),
      deductionCalculationMethod: String(mergedAttendance.deductionCalculationMethod || 'minute'),
      workingDaysPerMonth: Number(mergedAttendance.workingDaysPerMonth || 22),
      workingHoursPerDay: Number(mergedAttendance.workingHoursPerDay || 8),
      requireDeductionReview: Boolean(mergedAttendance.requireDeductionReview),
      absencePenaltyRate: Number(mergedAttendance.absencePenaltyRate || 1.0),
      deductAbsenceInCurrentMonth: Boolean(mergedAttendance.deductAbsenceInCurrentMonth),
      delayPenaltyTiers: Array.isArray(mergedAttendance.delayPenaltyTiers)
        ? JSON.stringify(mergedAttendance.delayPenaltyTiers)
        : mergedAttendance.delayPenaltyTiers,
      geofenceEnabled: Boolean(mergedGeofence.geofenceEnabled),
      officeLatitude: mergedGeofence.officeLatitude ? parseFloat(mergedGeofence.officeLatitude) : null,
      officeLongitude: mergedGeofence.officeLongitude ? parseFloat(mergedGeofence.officeLongitude) : null,
      geofenceRadius: mergedGeofence.geofenceRadius ? parseInt(mergedGeofence.geofenceRadius, 10) : 200,
      notifyOnLeaveRequest: Boolean(mergedNotifications.notifyOnLeaveRequest),
      notifyOnAttendanceIssue: Boolean(mergedNotifications.notifyOnAttendanceIssue),
      notifyOnPayrollGeneration: Boolean(mergedNotifications.notifyOnPayrollGeneration),
      notifyManagers: Boolean(mergedNotifications.notifyManagers),
      notifyOnWarning: Boolean(mergedNotifications.notifyOnWarning),
      notifyOnProbationEnd: Boolean(mergedNotifications.notifyOnProbationEnd),
      notifyOnContractExpiry: Boolean(mergedNotifications.notifyOnContractExpiry),
      aiOwnerNotificationsEnabled: Boolean(mergedNotifications.aiOwnerNotificationsEnabled),
      ownerWhatsAppNumber: ownerPhoneToSave,
      aiNotificationTone: String(mergedNotifications.aiNotificationTone || 'PROFESSIONAL')
    };

    if (body.permissions?.paidPermissionMinutesPerMonth !== undefined || body.paidPermissionMinutesPerMonth !== undefined) {
      dbUpdateData.paidPermissionMinutesPerMonth = Number(body.permissions?.paidPermissionMinutesPerMonth ?? body.paidPermissionMinutesPerMonth);
    }
    if (body.permissions?.permissionLeadDays !== undefined || body.permissionLeadDays !== undefined) {
      dbUpdateData.permissionLeadDays = Number(body.permissions?.permissionLeadDays ?? body.permissionLeadDays);
    }
    if (body.permissions?.permissionWarningAfter !== undefined || body.permissionWarningAfter !== undefined) {
      dbUpdateData.permissionWarningAfter = Number(body.permissions?.permissionWarningAfter ?? body.permissionWarningAfter);
    }
    if (body.permissions?.permissionExtraMode !== undefined || body.permissionExtraMode !== undefined) {
      dbUpdateData.permissionExtraMode = String(body.permissions?.permissionExtraMode ?? body.permissionExtraMode);
    }

    if (body.notifications?.aiNotificationTypes) {
      dbUpdateData.aiNotificationTypes = Array.isArray(body.notifications.aiNotificationTypes)
        ? JSON.stringify(body.notifications.aiNotificationTypes)
        : String(body.notifications.aiNotificationTypes);
    }

    if (body.notifications?.notificationRecipients && Array.isArray(body.notifications.notificationRecipients)) {
      const currentRecipients = safeParseSettingsArray(currentSettings.notificationRecipients || '[]');
      const sanitizedRecipients = body.notifications.notificationRecipients.map((rec, i) => {
        let phone = rec.phone;
        if (phone && phone.includes('•••') && currentRecipients[i]?.phone) {
          phone = currentRecipients[i].phone;
        }
        return { ...rec, phone };
      });
      dbUpdateData.notificationRecipients = JSON.stringify(sanitizedRecipients);
    }

    await upsertHRSettingsCompat(prisma, companyId, dbUpdateData, runtimeColumns);

    const [freshSettings, freshCompany, freshLateness, freshShift] = await Promise.all([
      readHRSettingsCompat(prisma, companyId, runtimeColumns),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true }
      }),
      prisma.latenessRules.findUnique({ where: { companyId } }),
      prisma.shift.findFirst({
        where: { companyId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
    ]);

    await logExternalApiAction({
      req,
      action: 'UPDATE_SETTINGS',
      description: `Updated HR Settings with section merge`,
      resourceType: 'HRSettings',
      resourceId: freshSettings?.id || companyId,
      targetName: 'HR Settings',
      details: { sectionsUpdated: Object.keys(body || {}) }
    });

    const maskedOutput = formatMaskedSettings(
      freshSettings,
      freshCompany?.timezone || 'Africa/Cairo',
      freshLateness,
      freshShift
    );

    return res.json({
      success: true,
      message: 'HR settings updated successfully',
      data: maskedOutput
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateHRSettings] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 23. إنشاء خصم يدوي لموظف
 * POST /deductions
 */
const createDeduction = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeNumber,
      employeeId,
      employeeCode,
      amount,
      type = 'OTHER',
      category = 'MANUAL',
      reason,
      description,
      notes,
      date,
      status = 'PENDING'
    } = req.body || {};

    const code = String(employeeCode || employeeNumber || employeeId || '').trim();
    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'employeeCode, employeeNumber, or employeeId is required'
        }
      });
    }

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'amount must be a positive number'
        }
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'reason is required'
        }
      });
    }

    const normalizedType = String(type).trim().toUpperCase();
    if (!VALID_MANUAL_DEDUCTION_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid deduction type: ${type}`,
          allowedValues: VALID_MANUAL_DEDUCTION_TYPES
        }
      });
    }

    const normalizedStatus = String(status).trim().toUpperCase();
    if (!VALID_MANUAL_DEDUCTION_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid deduction status: ${status}`,
          allowedValues: VALID_MANUAL_DEDUCTION_STATUSES
        }
      });
    }

    const prisma = getSharedPrismaClient();

    // Resolve employee
    const [emp, user] = await Promise.all([
      prisma.employee.findFirst({
        where: {
          companyId,
          OR: [{ employeeNumber: code }, { id: code }, { userId: code }]
        },
        select: { id: true, userId: true, employeeNumber: true, firstName: true, lastName: true }
      }),
      prisma.user.findFirst({
        where: {
          OR: [{ employeeNumber: code }, { id: code }]
        },
        select: { id: true, employeeNumber: true, firstName: true, lastName: true }
      })
    ]);

    if (!emp && !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `Employee not found with identifier: ${code}`
        }
      });
    }

    const targetEmployeeId = emp?.id || emp?.userId || user?.id;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });
    const timezone = company?.timezone || 'Africa/Cairo';

    const dateStr = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())
      ? String(date).trim()
      : getDateStringInTimezone(date ? new Date(date) : new Date(), timezone);

    const deductionDate = new Date(`${dateStr}T00:00:00.000Z`);
    const effectiveMonth = deductionDate.getUTCMonth() + 1;
    const effectiveYear = deductionDate.getUTCFullYear();

    const deduction = await prisma.manualDeduction.create({
      data: {
        companyId,
        employeeId: targetEmployeeId,
        type: normalizedType,
        category: category ? String(category).trim() : 'MANUAL',
        amount: numericAmount,
        reason: String(reason).trim(),
        description: description ? String(description).trim() : null,
        notes: notes ? String(notes).trim() : null,
        date: deductionDate,
        effectiveMonth,
        effectiveYear,
        status: normalizedStatus,
        createdBy: req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API'
      }
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_DEDUCTION',
      description: `Created manual deduction of ${numericAmount} for employee ${code}`,
      resourceType: 'ManualDeduction',
      resourceId: deduction.id,
      targetName: deduction.reason,
      details: { amount: numericAmount, type: normalizedType, employeeId: targetEmployeeId }
    });

    return res.status(201).json({
      success: true,
      message: 'Deduction created successfully',
      data: deduction
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createDeduction] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 24. تعديل خصم يدوي
 * PATCH /deductions/:id
 */
const updateDeduction = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { amount, reason, type, notes, description, category, status, date } = req.body || {};

    const prisma = getSharedPrismaClient();

    const existing = await prisma.manualDeduction.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEDUCTION_NOT_FOUND',
          message: `Deduction not found with ID: ${id}`
        }
      });
    }

    const updateData = {};

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'amount must be a positive number'
          }
        });
      }
      updateData.amount = numericAmount;
    }

    if (reason !== undefined) {
      if (!String(reason).trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'reason cannot be empty'
          }
        });
      }
      updateData.reason = String(reason).trim();
    }

    if (type !== undefined) {
      const normalizedType = String(type).trim().toUpperCase();
      if (!VALID_MANUAL_DEDUCTION_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid deduction type: ${type}`,
            allowedValues: VALID_MANUAL_DEDUCTION_TYPES
          }
        });
      }
      updateData.type = normalizedType;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toUpperCase();
      if (!VALID_MANUAL_DEDUCTION_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid deduction status: ${status}`,
            allowedValues: VALID_MANUAL_DEDUCTION_STATUSES
          }
        });
      }
      updateData.status = normalizedStatus;
    }

    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (category !== undefined) updateData.category = category ? String(category).trim() : null;

    if (date !== undefined) {
      const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())
        ? String(date).trim()
        : getDateStringInTimezone(new Date(date), 'Africa/Cairo');
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      updateData.date = d;
      updateData.effectiveMonth = d.getUTCMonth() + 1;
      updateData.effectiveYear = d.getUTCFullYear();
    }

    const updated = await prisma.manualDeduction.update({
      where: { id },
      data: updateData
    });

    await logExternalApiAction({
      req,
      action: 'UPDATE_DEDUCTION',
      description: `Updated deduction ${id}`,
      resourceType: 'ManualDeduction',
      resourceId: updated.id,
      targetName: updated.reason,
      details: updateData
    });

    return res.json({
      success: true,
      message: 'Deduction updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateDeduction] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 25. قائمة المكافآت والحوافز
 * GET /rewards
 */
const listRewards = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      employeeCode,
      status,
      from,
      to,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (from || to) {
      where.periodEnd = {};
      if (from) where.periodEnd.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).trim())) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        where.periodEnd.lte = toDate;
      }
    }

    const prisma = getSharedPrismaClient();

    if (employeeCode) {
      const code = String(employeeCode).trim();
      const [matchedEmps, matchedUsers] = await Promise.all([
        prisma.employee.findMany({
          where: { companyId, OR: [{ employeeNumber: code }, { id: code }] },
          select: { id: true, userId: true }
        }),
        prisma.user.findMany({
          where: { OR: [{ employeeNumber: code }, { id: code }] },
          select: { id: true }
        })
      ]);

      const candidateUserIds = [
        ...matchedEmps.map((e) => e.userId),
        ...matchedUsers.map((u) => u.id)
      ].filter(Boolean);

      where.userId = { in: candidateUserIds };
    }

    if (search) {
      where.OR = [
        { rewardName: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [rewards, total] = await Promise.all([
      prisma.rewardRecord.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              departmentRelation: { select: { id: true, name: true } },
              positionRelation: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rewardRecord.count({ where })
    ]);

    const formattedData = rewards.map((item) => {
      const user = item.user;
      return {
        ...item,
        employee: user
          ? {
              id: user.id,
              employeeNumber: user.employeeNumber || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              department: user.departmentRelation ? { id: user.departmentRelation.id, name: user.departmentRelation.name } : null,
              position: user.positionRelation ? { id: user.positionRelation.id, title: user.positionRelation.title } : null
            }
          : null
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listRewards] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 26. إنشاء مكافأة لموظف
 * POST /rewards
 */
const createReward = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeNumber,
      employeeId,
      employeeCode,
      userId,
      rewardName,
      rewardCategory = 'OTHER',
      amount,
      calculatedValue,
      reason,
      periodStart,
      periodEnd,
      status = 'APPROVED'
    } = req.body || {};

    const code = String(employeeCode || employeeNumber || employeeId || userId || '').trim();
    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'employeeCode, employeeNumber, employeeId, or userId is required'
        }
      });
    }

    if (!rewardName || !String(rewardName).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'rewardName is required'
        }
      });
    }

    const rewardAmount = Number(calculatedValue !== undefined ? calculatedValue : amount);
    if (!rewardAmount || isNaN(rewardAmount) || rewardAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'amount or calculatedValue must be a positive number'
        }
      });
    }

    const normalizedCategory = String(rewardCategory).trim().toUpperCase();
    if (!VALID_REWARD_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid reward category: ${rewardCategory}`,
          allowedValues: VALID_REWARD_CATEGORIES
        }
      });
    }

    const normalizedStatus = String(status).trim().toUpperCase();
    if (!VALID_REWARD_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid reward status: ${status}`,
          allowedValues: VALID_REWARD_STATUSES
        }
      });
    }

    const prisma = getSharedPrismaClient();

    // Resolve user (RewardRecord has foreign key to User table)
    let targetUser = await prisma.user.findFirst({
      where: {
        companyId,
        OR: [{ id: code }, { employeeNumber: code }]
      },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true }
    });

    if (!targetUser) {
      const emp = await prisma.employee.findFirst({
        where: {
          companyId,
          OR: [{ id: code }, { employeeNumber: code }]
        },
        select: { id: true, userId: true }
      });
      if (emp?.userId) {
        targetUser = await prisma.user.findUnique({
          where: { id: emp.userId },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });
      }
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `No active user account found for employee: ${code}`
        }
      });
    }

    const now = new Date();
    const startDate = periodStart ? new Date(periodStart) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDate = periodEnd ? new Date(periodEnd) : now;
    const appliedMonth = endDate.getUTCMonth() + 1;
    const appliedYear = endDate.getUTCFullYear();

    const reward = await prisma.rewardRecord.create({
      data: {
        companyId,
        userId: targetUser.id,
        rewardName: String(rewardName).trim(),
        rewardCategory: normalizedCategory,
        calculatedValue: rewardAmount,
        reason: reason ? String(reason).trim() : null,
        periodStart: startDate,
        periodEnd: endDate,
        appliedMonth,
        appliedYear,
        status: normalizedStatus,
        approvedAt: normalizedStatus === 'APPROVED' ? now : null,
        approvedBy: normalizedStatus === 'APPROVED' ? (req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API') : null
      }
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_REWARD',
      description: `Created reward "${reward.rewardName}" with value ${rewardAmount} for employee ${targetUser.employeeNumber || targetUser.id}`,
      resourceType: 'RewardRecord',
      resourceId: reward.id,
      targetName: reward.rewardName,
      details: { amount: rewardAmount, category: normalizedCategory, userId: targetUser.id }
    });

    return res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      data: reward
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createReward] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * إلغاء مكافأة مسجلة
 * POST /rewards/:id/void
 */
const voidReward = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reason is required to void a reward record' }
      });
    }

    const voidedBy = req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API';

    const record = await rewardApplicationService.voidReward(
      companyId,
      id,
      voidedBy,
      String(reason).trim()
    );

    await logExternalApiAction({
      req,
      action: 'VOID_REWARD',
      description: `Voided reward record "${record.rewardName}" (${record.id}) - Reason: ${reason}`,
      resourceType: 'RewardRecord',
      resourceId: record.id,
      targetName: record.rewardName,
      details: {
        rewardRecordId: record.id,
        rewardTypeId: record.rewardTypeId,
        userId: record.userId,
        amount: Number(record.calculatedValue),
        reason
      }
    });

    return res.json({
      success: true,
      message: `Reward record ${record.id} voided successfully`,
      data: {
        id: record.id,
        status: record.status,
        voidedBy: record.voidedBy,
        voidedAt: record.voidedAt,
        voidReason: record.voidReason,
        isLocked: record.isLocked
      }
    });
  } catch (error) {
    if (error.statusCode === 404 || error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }
    if (error.statusCode === 409 || error.name === 'ConflictError') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: error.message }
      });
    }
    console.error('❌ [ExternalHrController.voidReward] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 27. قائمة المناوبات (الورديات)
 * GET /shifts
 */
const listShifts = async (req, res) => {
  try {
    const { companyId } = req;
    const { includeInactive } = req.query;

    const shifts = await shiftService.getShifts(companyId, {
      includeInactive: includeInactive === 'true'
    });

    return res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listShifts] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 28. إنشاء مناوبة جديدة
 * POST /shifts
 */
const createShift = async (req, res) => {
  try {
    const { companyId } = req;
    const { name, startTime, endTime, breakDuration, color, isActive } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name is required'
        }
      });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!startTime || !timeRegex.test(String(startTime).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startTime is required in HH:MM format (e.g. 09:00)'
        }
      });
    }

    if (!endTime || !timeRegex.test(String(endTime).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endTime is required in HH:MM format (e.g. 17:00)'
        }
      });
    }

    const shift = await shiftService.createShift(companyId, {
      name: String(name).trim(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      breakDuration: breakDuration !== undefined ? Number(breakDuration) : 60,
      color: color || '#3B82F6',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_SHIFT',
      description: `Created shift ${shift.name} (${shift.startTime}-${shift.endTime})`,
      resourceType: 'Shift',
      resourceId: shift.id,
      targetName: shift.name,
      details: { startTime: shift.startTime, endTime: shift.endTime }
    });

    return res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createShift] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 29. تعديل مناوبة
 * PATCH /shifts/:id
 */
const updateShift = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { name, startTime, endTime, breakDuration, color, isActive } = req.body || {};

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(String(startTime).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startTime must be in HH:MM format (e.g. 09:00)'
        }
      });
    }

    if (endTime && !timeRegex.test(String(endTime).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endTime must be in HH:MM format (e.g. 17:00)'
        }
      });
    }

    const updated = await shiftService.updateShift(companyId, id, req.body);

    await logExternalApiAction({
      req,
      action: 'UPDATE_SHIFT',
      description: `Updated shift ${updated.name}`,
      resourceType: 'Shift',
      resourceId: updated.id,
      targetName: updated.name,
      details: { name, startTime, endTime, isActive }
    });

    return res.json({
      success: true,
      message: 'Shift updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateShift] Error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 30. تعيين مناوبة لموظف
 * PATCH /employees/:id/shift
 */
const assignEmployeeShift = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { shiftId, date, notes } = req.body || {};

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'shiftId is required'
        }
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'date is required in YYYY-MM-DD format'
        }
      });
    }

    const prisma = getSharedPrismaClient();

    // Resolve employee
    const [emp, user] = await Promise.all([
      prisma.employee.findFirst({
        where: {
          companyId,
          OR: [{ id }, { employeeNumber: id }, { userId: id }]
        },
        select: { id: true, userId: true, firstName: true, lastName: true, employeeNumber: true }
      }),
      prisma.user.findFirst({
        where: {
          companyId,
          OR: [{ id }, { employeeNumber: id }]
        },
        select: { id: true, firstName: true, lastName: true, employeeNumber: true }
      })
    ]);

    if (!emp && !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `Employee not found with identifier: ${id}`
        }
      });
    }

    const targetUserId = emp?.userId || user?.id;
    const employeeRelId = emp?.id || null;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_ACCOUNT_REQUIRED',
          message: 'Employee does not have an associated system user account for shift assignment'
        }
      });
    }

    // Assign via shiftService
    const assignment = await shiftService.assignShift(companyId, targetUserId, shiftId, date);

    if (employeeRelId && !assignment.employeeRelId) {
      await prisma.shiftAssignment.update({
        where: { id: assignment.id },
        data: { employeeRelId, notes: notes ? String(notes).trim() : null }
      });
    }

    await logExternalApiAction({
      req,
      action: 'ASSIGN_SHIFT',
      description: `Assigned shift ${shiftId} to employee ${emp?.employeeNumber || user?.employeeNumber || id} on ${date}`,
      resourceType: 'ShiftAssignment',
      resourceId: assignment.id,
      targetName: `Shift Assignment`,
      details: { shiftId, date, targetUserId }
    });

    return res.json({
      success: true,
      message: 'Shift assigned successfully',
      data: assignment
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.assignEmployeeShift] Error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 31. تصحيح سجل الحضور والانصراف
 * PATCH /attendance/:id
 */
const updateAttendanceRecord = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { checkIn, checkOut, status, notes, lateMinutes, earlyLeaveMinutes, workMode, date } = req.body || {};

    if (date !== undefined) {
      const dateStr = String(date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'date must be in YYYY-MM-DD format'
          }
        });
      }
      req.body.date = dateStr;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toUpperCase();
      if (!VALID_ATTENDANCE_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid attendance status: ${status}`,
            allowedValues: VALID_ATTENDANCE_STATUSES
          }
        });
      }
    }

    const companyTimezone = req.company?.timezone || 'Africa/Cairo';

    if (checkIn !== undefined) {
      const checkInResult = validateAndNormalizeTime(checkIn, 'checkIn', companyTimezone);
      if (!checkInResult.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: checkInResult.error
          }
        });
      }
      req.body.checkIn = checkInResult.value;
    }

    if (checkOut !== undefined) {
      const checkOutResult = validateAndNormalizeTime(checkOut, 'checkOut', companyTimezone);
      if (!checkOutResult.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: checkOutResult.error
          }
        });
      }
      req.body.checkOut = checkOutResult.value;
    }

    const prisma = getSharedPrismaClient();

    const existing = await prisma.attendance.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_NOT_FOUND',
          message: `Attendance record not found with ID: ${id}`
        }
      });
    }

    // Call panel attendanceService.updateAttendance
    const updated = await attendanceService.updateAttendance(companyId, id, req.body);

    await logExternalApiAction({
      req,
      action: 'UPDATE_ATTENDANCE',
      description: `Corrected attendance record ${id}`,
      resourceType: 'Attendance',
      resourceId: updated.id,
      targetName: `Attendance Record ${id}`,
      details: { checkIn: req.body.checkIn, checkOut: req.body.checkOut, status, lateMinutes, date: req.body.date }
    });

    return res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateAttendanceRecord] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 31b. إلغاء/حذف سجل الحضور والانصراف
 * DELETE /attendance/:id
 * POST /attendance/:id/void
 * Scope: hr:attendance:write
 */
const voidAttendanceRecord = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const reason = req.body?.reason || req.query?.reason;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'reason is required to void/delete an attendance record'
        }
      });
    }

    const prisma = getSharedPrismaClient();

    const existing = await prisma.attendance.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_NOT_FOUND',
          message: `Attendance record not found with ID: ${id}`
        }
      });
    }

    const employeeName = existing.user
      ? `${existing.user.firstName || ''} ${existing.user.lastName || ''}`.trim()
      : existing.userId;

    const formattedDate = existing.date
      ? (existing.date.toISOString ? existing.date.toISOString().split('T')[0] : String(existing.date).split('T')[0])
      : null;

    // Delete attendance record
    await prisma.attendance.delete({
      where: { id }
    });

    // Cancel any linked auto deductions (use REJECTED status for Prisma enum validity)
    try {
      await prisma.manualDeduction.updateMany({
        where: {
          companyId,
          notes: { contains: id },
          category: 'AUTO_DEDUCTION',
          status: { in: ['PENDING', 'APPROVED'] }
        },
        data: {
          status: 'REJECTED',
          rejectedBy: req.user?.id || 'EXTERNAL_API',
          rejectedAt: new Date(),
          rejectionReason: `Attendance record ${id} was voided`,
          notes: `Cancelled automatically: Attendance record ${id} was voided`
        }
      });
    } catch (dedErr) {
      console.warn(`[voidAttendanceRecord] Warning cancelling linked deductions for ${id}:`, dedErr?.message);
    }

    await logExternalApiAction({
      req,
      action: 'VOID_ATTENDANCE',
      description: `Voided attendance record ${id} for ${employeeName} on ${formattedDate} - Reason: ${String(reason).trim()}`,
      resourceType: 'Attendance',
      resourceId: id,
      targetName: employeeName,
      details: {
        attendanceId: id,
        userId: existing.userId,
        employeeNumber: existing.user?.employeeNumber,
        date: formattedDate,
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        previousStatus: existing.status,
        reason: String(reason).trim()
      }
    });

    return res.json({
      success: true,
      message: `Attendance record ${id} voided and removed successfully`,
      data: {
        id,
        userId: existing.userId,
        employeeNumber: existing.user?.employeeNumber,
        employeeName,
        date: formattedDate,
        previousStatus: existing.status,
        voidReason: String(reason).trim(),
        voidedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.voidAttendanceRecord] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 32. إنشاء موظف جديد
 * POST /employees
 */
const createEmployee = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      nationalId,
      departmentId,
      positionId,
      managerId,
      status = 'ACTIVE',
      contractType = 'FULL_TIME',
      hireDate,
      baseSalary,
      userId
    } = req.body || {};

    if (!employeeNumber || !String(employeeNumber).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'employeeNumber is required' }
      });
    }

    if (!firstName || !String(firstName).trim() || !lastName || !String(lastName).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'firstName and lastName are required' }
      });
    }

    const cleanEmpNumber = String(employeeNumber).trim();

    // Validate status
    let normalizedStatus = 'ACTIVE';
    if (status !== undefined && status !== null) {
      normalizedStatus = String(status).trim().toUpperCase();
      if (!VALID_EMPLOYEE_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status: '${status}'. Allowed values are: ${VALID_EMPLOYEE_STATUSES.join(', ')}`,
            allowedValues: VALID_EMPLOYEE_STATUSES
          }
        });
      }
    }
    const dbStatus = normalizedStatus === 'PROBATION' ? 'ACTIVE' : normalizedStatus;

    // Validate contractType
    let normContract = 'FULL_TIME';
    if (contractType !== undefined && contractType !== null) {
      normContract = String(contractType).trim().toUpperCase();
      if (!VALID_CONTRACT_TYPES.includes(normContract)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid contractType: '${contractType}'. Allowed values are: ${VALID_CONTRACT_TYPES.join(', ')}`,
            allowedValues: VALID_CONTRACT_TYPES
          }
        });
      }
    }

    // Validate hireDate
    let parsedHireDate = new Date();
    if (hireDate) {
      const d = new Date(hireDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid hireDate format. Expected YYYY-MM-DD' }
        });
      }
      parsedHireDate = d;
    }

    // Validate baseSalary
    let numericSalary = null;
    if (baseSalary !== undefined && baseSalary !== null && baseSalary !== '') {
      numericSalary = Number(baseSalary);
      if (isNaN(numericSalary) || numericSalary < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'baseSalary must be a non-negative number' }
        });
      }
    }

    const prisma = getSharedPrismaClient();

    // Check duplicate employeeNumber
    const existing = await prisma.employee.findUnique({
      where: {
        companyId_employeeNumber: { companyId, employeeNumber: cleanEmpNumber }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EMPLOYEE_NUMBER',
          message: `Employee with number ${cleanEmpNumber} already exists in this company`
        }
      });
    }

    // Validate departmentId
    if (departmentId) {
      const dept = await prisma.department.findFirst({ where: { id: departmentId, companyId } });
      if (!dept) {
        return res.status(400).json({
          success: false,
          error: { code: 'DEPARTMENT_NOT_FOUND', message: `Department not found: ${departmentId}` }
        });
      }
    }

    // Validate positionId
    if (positionId) {
      const pos = await prisma.position.findFirst({ where: { id: positionId, companyId } });
      if (!pos) {
        return res.status(400).json({
          success: false,
          error: { code: 'POSITION_NOT_FOUND', message: `Position not found: ${positionId}` }
        });
      }
    }

    // Validate managerId
    if (managerId) {
      const mgr = await prisma.employee.findFirst({ where: { id: managerId, companyId } });
      if (!mgr) {
        return res.status(400).json({
          success: false,
          error: { code: 'MANAGER_NOT_FOUND', message: `Manager not found: ${managerId}` }
        });
      }
    }

    // Validate userId linking
    let targetUserId = null;
    if (userId !== undefined && userId !== null && userId !== '') {
      targetUserId = String(userId).trim();
      const user = await prisma.user.findFirst({ where: { id: targetUserId, companyId } });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: `User not found or does not belong to this company: ${targetUserId}` }
        });
      }

      const linkedEmp = await prisma.employee.findFirst({
        where: { userId: targetUserId, companyId }
      });
      if (linkedEmp) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_ALREADY_LINKED',
            message: `User ${targetUserId} is already linked to employee ${linkedEmp.employeeNumber} (${linkedEmp.firstName} ${linkedEmp.lastName})`
          }
        });
      }
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeNumber: cleanEmpNumber,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: email ? String(email).trim().toLowerCase() : null,
        phone: phone ? String(phone).trim() : null,
        nationalId: nationalId ? String(nationalId).trim() : null,
        departmentId: departmentId || null,
        positionId: positionId || null,
        managerId: managerId || null,
        status: dbStatus,
        contractType: normContract,
        hireDate: parsedHireDate,
        baseSalary: numericSalary,
        userId: targetUserId
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } }
      }
    });

    // Record initial salary history if baseSalary provided
    if (numericSalary !== null && numericSalary > 0) {
      await prisma.salaryHistory.create({
        data: {
          companyId,
          userId: targetUserId || employee.id,
          employeeRelId: employee.id,
          previousSalary: 0,
          newSalary: numericSalary,
          changeType: 'INITIAL',
          changePercentage: 100,
          effectiveDate: parsedHireDate,
          reason: 'Initial salary on employee creation',
          approvedBy: req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API'
        }
      });
    }

    await logExternalApiAction({
      req,
      action: 'CREATE_EMPLOYEE',
      description: `Created employee ${employee.employeeNumber} (${employee.firstName} ${employee.lastName})`,
      resourceType: 'Employee',
      resourceId: employee.id,
      targetName: `${employee.firstName} ${employee.lastName}`,
      details: { employeeNumber: employee.employeeNumber, status: employee.status, baseSalary: numericSalary }
    });

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createEmployee] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 33. تعديل موظف كامل (الراتب وتاريخ الرواتب وربط المستخدمين)
 * PATCH /employees/:id
 */
const updateEmployee = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const {
      baseSalary,
      departmentId,
      positionId,
      status,
      hireDate,
      contractType,
      managerId,
      phone,
      email,
      nationalId,
      userId,
      reason
    } = req.body || {};

    // Input validations before DB query
    let newSalary = null;
    if (baseSalary !== undefined && baseSalary !== null && baseSalary !== '') {
      newSalary = Number(baseSalary);
      if (isNaN(newSalary) || newSalary < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'baseSalary must be a non-negative number' }
        });
      }
    }

    let normStatus = null;
    if (status !== undefined && status !== null) {
      const s = String(status).trim().toUpperCase();
      if (!VALID_EMPLOYEE_STATUSES.includes(s)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status: '${status}'. Allowed values are: ${VALID_EMPLOYEE_STATUSES.join(', ')}`,
            allowedValues: VALID_EMPLOYEE_STATUSES
          }
        });
      }
      normStatus = s === 'PROBATION' ? 'ACTIVE' : s;
    }

    let normContract = null;
    if (contractType !== undefined && contractType !== null) {
      const c = String(contractType).trim().toUpperCase();
      if (!VALID_CONTRACT_TYPES.includes(c)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid contractType: '${contractType}'. Allowed values are: ${VALID_CONTRACT_TYPES.join(', ')}`,
            allowedValues: VALID_CONTRACT_TYPES
          }
        });
      }
      normContract = c;
    }

    let parsedHireDate = null;
    if (hireDate !== undefined && hireDate !== null) {
      const d = new Date(hireDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid hireDate format. Expected YYYY-MM-DD' }
        });
      }
      parsedHireDate = d;
    }

    const prisma = getSharedPrismaClient();

    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [{ id }, { employeeNumber: id }]
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: `Employee not found with ID or code: ${id}` }
      });
    }

    const updateData = {};

    // 1. baseSalary & SalaryHistory
    if (newSalary !== null) {
      const previousSalary = employee.baseSalary ? Number(employee.baseSalary) : 0;
      if (newSalary !== previousSalary) {
        updateData.baseSalary = newSalary;

        const changePercentage = previousSalary > 0
          ? Number(((newSalary - previousSalary) / previousSalary) * 100)
          : 0;

        await prisma.salaryHistory.create({
          data: {
            companyId,
            userId: employee.userId || employee.id,
            employeeRelId: employee.id,
            previousSalary,
            newSalary,
            changeType: 'ADJUSTMENT',
            changePercentage,
            effectiveDate: new Date(),
            reason: reason || 'Salary updated via External HR API',
            approvedBy: req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API'
          }
        });

        if (employee.userId) {
          await prisma.user.update({
            where: { id: employee.userId },
            data: { baseSalary: newSalary }
          }).catch(() => {});
        }
      }
    }

    // 2. departmentId
    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === '') {
        updateData.departmentId = null;
      } else {
        const dept = await prisma.department.findFirst({ where: { id: departmentId, companyId } });
        if (!dept) {
          return res.status(400).json({
            success: false,
            error: { code: 'DEPARTMENT_NOT_FOUND', message: `Department not found: ${departmentId}` }
          });
        }
        updateData.departmentId = departmentId;
      }
    }

    // 3. positionId
    if (positionId !== undefined) {
      if (positionId === null || positionId === '') {
        updateData.positionId = null;
      } else {
        const pos = await prisma.position.findFirst({ where: { id: positionId, companyId } });
        if (!pos) {
          return res.status(400).json({
            success: false,
            error: { code: 'POSITION_NOT_FOUND', message: `Position not found: ${positionId}` }
          });
        }
        updateData.positionId = positionId;
      }
    }

    // 4. managerId
    if (managerId !== undefined) {
      if (managerId === null || managerId === '') {
        updateData.managerId = null;
      } else {
        const mgr = await prisma.employee.findFirst({ where: { id: managerId, companyId } });
        if (!mgr) {
          return res.status(400).json({
            success: false,
            error: { code: 'MANAGER_NOT_FOUND', message: `Manager not found: ${managerId}` }
          });
        }
        updateData.managerId = managerId;
      }
    }

    // 5. status
    if (normStatus !== null) {
      updateData.status = normStatus;
    }

    // 6. contractType
    if (normContract !== null) {
      updateData.contractType = normContract;
    }

    // 7. hireDate
    if (parsedHireDate !== null) {
      updateData.hireDate = parsedHireDate;
    }

    // 8. phone, email, nationalId
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (email !== undefined) updateData.email = email ? String(email).trim().toLowerCase() : null;
    if (nationalId !== undefined) updateData.nationalId = nationalId ? String(nationalId).trim() : null;

    // 9. userId (link / unlink)
    if (userId !== undefined) {
      if (userId === null || userId === '') {
        updateData.userId = null;
      } else {
        const targetUserId = String(userId).trim();
        const user = await prisma.user.findFirst({ where: { id: targetUserId, companyId } });
        if (!user) {
          return res.status(400).json({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: `User not found or does not belong to this company: ${targetUserId}` }
          });
        }

        const conflictEmp = await prisma.employee.findFirst({
          where: { userId: targetUserId, companyId, id: { not: employee.id } }
        });
        if (conflictEmp) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'USER_ALREADY_LINKED',
              message: `User ${targetUserId} is already linked to employee ${conflictEmp.employeeNumber} (${conflictEmp.firstName} ${conflictEmp.lastName})`
            }
          });
        }

        updateData.userId = targetUserId;
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } }
      }
    });

    await logExternalApiAction({
      req,
      action: 'UPDATE_EMPLOYEE',
      description: `Updated employee ${updated.employeeNumber} (${updated.firstName} ${updated.lastName})`,
      resourceType: 'Employee',
      resourceId: updated.id,
      targetName: `${updated.firstName} ${updated.lastName}`,
      details: { fieldsUpdated: Object.keys(updateData) }
    });

    return res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateEmployee] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 34. إنهاء خدمة موظف
 * POST /employees/:id/terminate
 */
const terminateEmployee = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { lastWorkingDay, reason } = req.body || {};

    let terminationDate = new Date();
    if (lastWorkingDay) {
      const d = new Date(lastWorkingDay);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid lastWorkingDay format. Expected YYYY-MM-DD' }
        });
      }
      terminationDate = d;
    }

    const prisma = getSharedPrismaClient();

    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [{ id }, { employeeNumber: id }]
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: `Employee not found with ID or code: ${id}` }
      });
    }

    const terminated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        status: 'TERMINATED',
        terminationDate,
        terminationReason: reason ? String(reason).trim() : null
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } }
      }
    });

    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive: false }
      }).catch(() => {});
    }

    await logExternalApiAction({
      req,
      action: 'TERMINATE_EMPLOYEE',
      description: `Terminated employee ${terminated.employeeNumber} (${terminated.firstName} ${terminated.lastName}). Reason: ${reason || 'Not specified'}`,
      resourceType: 'Employee',
      resourceId: terminated.id,
      targetName: `${terminated.firstName} ${terminated.lastName}`,
      details: { terminationDate, reason: reason || null }
    });

    return res.json({
      success: true,
      message: 'Employee terminated successfully',
      data: terminated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.terminateEmployee] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 35. استعلام أنواع المكافآت والحوافز
 * GET /reward-types
 */
const listRewardTypes = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      page = 1,
      limit = 50,
      search,
      category,
      triggerType,
      frequency,
      isActive
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = { companyId };
    if (category) where.category = category;
    if (triggerType) where.triggerType = triggerType;
    if (frequency) where.frequency = frequency;
    if (isActive !== undefined && isActive !== 'all') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const prisma = getSharedPrismaClient();
    const [types, total] = await Promise.all([
      prisma.rewardType.findMany({
        where,
        skip,
        take,
        orderBy: { priority: 'asc' }
      }),
      prisma.rewardType.count({ where })
    ]);

    const formatted = types.map((item) => {
      let parsedConditions = null;
      if (item.eligibilityConditions) {
        try {
          parsedConditions = JSON.parse(item.eligibilityConditions);
        } catch (_e) {
          parsedConditions = item.eligibilityConditions;
        }
      }
      return {
        ...item,
        targetEmployeeId: parsedConditions?.targetEmployeeId || null,
        targetEmployeeNumber: parsedConditions?.targetEmployeeNumber || null,
        targetUserId: parsedConditions?.targetUserId || null,
        eligibilityConditions: parsedConditions
      };
    });

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listRewardTypes] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 35b. جلب نوع مكافأة محدد بالمعرف
 * GET /reward-types/:id
 */
const getRewardTypeById = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const rewardType = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!rewardType) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_TYPE_NOT_FOUND', message: `Reward type not found with ID: ${id}` }
      });
    }

    let parsedConditions = null;
    if (rewardType.eligibilityConditions) {
      try {
        parsedConditions = JSON.parse(rewardType.eligibilityConditions);
      } catch (_e) {
        parsedConditions = rewardType.eligibilityConditions;
      }
    }

    return res.json({
      success: true,
      data: {
        ...rewardType,
        targetEmployeeId: parsedConditions?.targetEmployeeId || null,
        targetEmployeeNumber: parsedConditions?.targetEmployeeNumber || null,
        targetUserId: parsedConditions?.targetUserId || null,
        eligibilityConditions: parsedConditions
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getRewardTypeById] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 36. إنشاء نوع مكافأة جديد
 * POST /reward-types
 */
const createRewardType = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      name,
      nameAr,
      description,
      category,
      calculationMethod,
      value,
      maxCap,
      triggerType = 'MANUAL',
      frequency = 'MONTHLY',
      eligibilityConditions,
      isActive = true,
      priority = 1
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' }
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `category is required. Allowed values are: ${VALID_REWARD_TYPE_CATEGORIES.join(', ')}`,
          allowedValues: VALID_REWARD_TYPE_CATEGORIES
        }
      });
    }

    const normCategory = String(category).trim().toUpperCase();
    if (!VALID_REWARD_TYPE_CATEGORIES.includes(normCategory)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid category: '${category}'. Allowed values are: ${VALID_REWARD_TYPE_CATEGORIES.join(', ')}`,
          allowedValues: VALID_REWARD_TYPE_CATEGORIES
        }
      });
    }

    if (!calculationMethod) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `calculationMethod is required. Allowed values are: ${VALID_REWARD_CALCULATION_METHODS.join(', ')}`,
          allowedValues: VALID_REWARD_CALCULATION_METHODS
        }
      });
    }

    const normCalc = String(calculationMethod).trim().toUpperCase();
    if (!VALID_REWARD_CALCULATION_METHODS.includes(normCalc)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid calculationMethod: '${calculationMethod}'. Allowed values are: ${VALID_REWARD_CALCULATION_METHODS.join(', ')}`,
          allowedValues: VALID_REWARD_CALCULATION_METHODS
        }
      });
    }

    if (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'value is required and must be a non-negative number' }
      });
    }

    let normTrigger = 'MANUAL';
    if (triggerType !== undefined && triggerType !== null) {
      normTrigger = String(triggerType).trim().toUpperCase();
      if (!VALID_REWARD_TRIGGER_TYPES.includes(normTrigger)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid triggerType: '${triggerType}'. Allowed values are: ${VALID_REWARD_TRIGGER_TYPES.join(', ')}`,
            allowedValues: VALID_REWARD_TRIGGER_TYPES
          }
        });
      }
    }

    let normFrequency = 'MONTHLY';
    if (frequency !== undefined && frequency !== null) {
      normFrequency = String(frequency).trim().toUpperCase();
      if (!VALID_REWARD_FREQUENCIES.includes(normFrequency)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid frequency: '${frequency}'. Allowed values are: ${VALID_REWARD_FREQUENCIES.join(', ')}`,
            allowedValues: VALID_REWARD_FREQUENCIES
          }
        });
      }
    }

    let conditionsStr = null;
    if (eligibilityConditions !== undefined && eligibilityConditions !== null) {
      conditionsStr = typeof eligibilityConditions === 'string'
        ? eligibilityConditions
        : JSON.stringify(eligibilityConditions);
    }

    const prisma = getSharedPrismaClient();
    const rewardType = await prisma.rewardType.create({
      data: {
        companyId,
        name: String(name).trim(),
        nameAr: nameAr ? String(nameAr).trim() : null,
        description: description ? String(description).trim() : null,
        category: normCategory,
        calculationMethod: normCalc,
        value: Number(value),
        maxCap: maxCap !== undefined && maxCap !== null ? Number(maxCap) : null,
        triggerType: normTrigger,
        frequency: normFrequency,
        eligibilityConditions: conditionsStr,
        isActive: Boolean(isActive),
        priority: Number(priority) || 1,
        createdBy: req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API'
      }
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_REWARD_TYPE',
      description: `Created reward type "${rewardType.name}" (${rewardType.category}/${rewardType.calculationMethod})`,
      resourceType: 'RewardType',
      resourceId: rewardType.id,
      targetName: rewardType.name,
      details: { value: rewardType.value, triggerType: rewardType.triggerType, frequency: rewardType.frequency }
    });

    let parsedConditions = null;
    if (rewardType.eligibilityConditions) {
      try { parsedConditions = JSON.parse(rewardType.eligibilityConditions); } catch (_e) { parsedConditions = rewardType.eligibilityConditions; }
    }

    return res.status(201).json({
      success: true,
      message: 'Reward type created successfully',
      data: {
        ...rewardType,
        targetEmployeeId: parsedConditions?.targetEmployeeId || null,
        targetEmployeeNumber: parsedConditions?.targetEmployeeNumber || null,
        targetUserId: parsedConditions?.targetUserId || null,
        eligibilityConditions: parsedConditions
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createRewardType] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 37. تعديل نوع مكافأة
 * PATCH /reward-types/:id
 */
const updateRewardType = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const {
      name,
      nameAr,
      description,
      category,
      calculationMethod,
      value,
      maxCap,
      triggerType,
      frequency,
      eligibilityConditions,
      isActive,
      priority
    } = req.body || {};

    let normCategory = undefined;
    if (category !== undefined) {
      normCategory = String(category).trim().toUpperCase();
      if (!VALID_REWARD_TYPE_CATEGORIES.includes(normCategory)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid category: '${category}'. Allowed values are: ${VALID_REWARD_TYPE_CATEGORIES.join(', ')}`,
            allowedValues: VALID_REWARD_TYPE_CATEGORIES
          }
        });
      }
    }

    let normCalc = undefined;
    if (calculationMethod !== undefined) {
      normCalc = String(calculationMethod).trim().toUpperCase();
      if (!VALID_REWARD_CALCULATION_METHODS.includes(normCalc)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid calculationMethod: '${calculationMethod}'. Allowed values are: ${VALID_REWARD_CALCULATION_METHODS.join(', ')}`,
            allowedValues: VALID_REWARD_CALCULATION_METHODS
          }
        });
      }
    }

    let numVal = undefined;
    if (value !== undefined) {
      numVal = Number(value);
      if (isNaN(numVal) || numVal < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'value must be a non-negative number' }
        });
      }
    }

    let normTrigger = undefined;
    if (triggerType !== undefined) {
      normTrigger = String(triggerType).trim().toUpperCase();
      if (!VALID_REWARD_TRIGGER_TYPES.includes(normTrigger)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid triggerType: '${triggerType}'. Allowed values are: ${VALID_REWARD_TRIGGER_TYPES.join(', ')}`,
            allowedValues: VALID_REWARD_TRIGGER_TYPES
          }
        });
      }
    }

    let normFrequency = undefined;
    if (frequency !== undefined) {
      normFrequency = String(frequency).trim().toUpperCase();
      if (!VALID_REWARD_FREQUENCIES.includes(normFrequency)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid frequency: '${frequency}'. Allowed values are: ${VALID_REWARD_FREQUENCIES.join(', ')}`,
            allowedValues: VALID_REWARD_FREQUENCIES
          }
        });
      }
    }

    const prisma = getSharedPrismaClient();

    const existing = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_TYPE_NOT_FOUND', message: `Reward type not found with ID: ${id}` }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (nameAr !== undefined) updateData.nameAr = nameAr ? String(nameAr).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (normCategory !== undefined) updateData.category = normCategory;
    if (normCalc !== undefined) updateData.calculationMethod = normCalc;
    if (numVal !== undefined) updateData.value = numVal;
    if (maxCap !== undefined) updateData.maxCap = maxCap !== null ? Number(maxCap) : null;
    if (normTrigger !== undefined) updateData.triggerType = normTrigger;
    if (normFrequency !== undefined) updateData.frequency = normFrequency;

    if (eligibilityConditions !== undefined) {
      updateData.eligibilityConditions = eligibilityConditions
        ? (typeof eligibilityConditions === 'string' ? eligibilityConditions : JSON.stringify(eligibilityConditions))
        : null;
    }

    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (priority !== undefined) updateData.priority = Number(priority);

    const updated = await prisma.rewardType.update({
      where: { id: existing.id },
      data: updateData
    });

    await logExternalApiAction({
      req,
      action: 'UPDATE_REWARD_TYPE',
      description: `Updated reward type "${updated.name}"`,
      resourceType: 'RewardType',
      resourceId: updated.id,
      targetName: updated.name,
      details: updateData
    });

    let parsedConditions = null;
    if (updated.eligibilityConditions) {
      try { parsedConditions = JSON.parse(updated.eligibilityConditions); } catch (_e) { parsedConditions = updated.eligibilityConditions; }
    }

    return res.json({
      success: true,
      message: 'Reward type updated successfully',
      data: {
        ...updated,
        targetEmployeeId: parsedConditions?.targetEmployeeId || null,
        targetEmployeeNumber: parsedConditions?.targetEmployeeNumber || null,
        targetUserId: parsedConditions?.targetUserId || null,
        eligibilityConditions: parsedConditions
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateRewardType] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 38. استعلام إعدادات المكافآت والحوافز
 * GET /reward-settings
 */
const getRewardSettings = async (req, res) => {
  try {
    const { companyId } = req;
    const prisma = getSharedPrismaClient();

    let settings = await prisma.rewardSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      settings = await prisma.rewardSettings.create({
        data: {
          companyId,
          autoEvaluationEnabled: true,
          evaluationDayOfMonth: 1,
          requireManagerApproval: false,
          requireHRApproval: true,
          applyRewardsBeforeTax: true,
          allowRewardDeductionOffset: false,
          notifyEmployeeOnReward: true,
          notifyManagerOnReward: true
        }
      });
    }

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getRewardSettings] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 39. تعديل إعدادات المكافآت والحوافز
 * PUT /reward-settings
 */
const updateRewardSettings = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      autoEvaluationEnabled,
      evaluationDayOfMonth,
      requireManagerApproval,
      requireHRApproval,
      applyRewardsBeforeTax,
      allowRewardDeductionOffset,
      notifyEmployeeOnReward,
      notifyManagerOnReward
    } = req.body || {};

    const prisma = getSharedPrismaClient();

    const updateData = {};
    if (autoEvaluationEnabled !== undefined) updateData.autoEvaluationEnabled = Boolean(autoEvaluationEnabled);
    if (evaluationDayOfMonth !== undefined) updateData.evaluationDayOfMonth = Math.max(1, Math.min(28, Number(evaluationDayOfMonth) || 1));
    if (requireManagerApproval !== undefined) updateData.requireManagerApproval = Boolean(requireManagerApproval);
    if (requireHRApproval !== undefined) updateData.requireHRApproval = Boolean(requireHRApproval);
    if (applyRewardsBeforeTax !== undefined) updateData.applyRewardsBeforeTax = Boolean(applyRewardsBeforeTax);
    if (allowRewardDeductionOffset !== undefined) updateData.allowRewardDeductionOffset = Boolean(allowRewardDeductionOffset);
    if (notifyEmployeeOnReward !== undefined) updateData.notifyEmployeeOnReward = Boolean(notifyEmployeeOnReward);
    if (notifyManagerOnReward !== undefined) updateData.notifyManagerOnReward = Boolean(notifyManagerOnReward);

    const updated = await prisma.rewardSettings.upsert({
      where: { companyId },
      update: updateData,
      create: { companyId, ...updateData }
    });

    await logExternalApiAction({
      req,
      action: 'UPDATE_REWARD_SETTINGS',
      description: 'Updated reward settings',
      resourceType: 'RewardSettings',
      resourceId: updated.id,
      targetName: 'Reward Settings',
      details: updateData
    });

    return res.json({
      success: true,
      message: 'Reward settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateRewardSettings] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 40. تشغيل التقييم الآلي يدويًا لنوع مكافأة محدد
 * POST /reward-types/:id/evaluate?month=&year=&dryRun=true|false&employeeId=
 */
const evaluateRewardType = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    const rawMonth = req.query.month || req.body?.month;
    const rawYear = req.query.year || req.body?.year;
    let targetMonth;
    let targetYear;

    if (rawMonth && typeof rawMonth === 'string' && rawMonth.includes('-')) {
      const parts = rawMonth.split('-');
      if (parts[0].length === 4) {
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
      } else {
        targetMonth = parseInt(parts[0], 10);
        targetYear = parseInt(parts[1], 10);
      }
    } else {
      const now = new Date();
      targetMonth = rawMonth ? parseInt(rawMonth, 10) : (now.getMonth() + 1);
      targetYear = rawYear ? parseInt(rawYear, 10) : now.getFullYear();
    }

    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'month parameter must be an integer between 1 and 12 (or YYYY-MM format)' }
      });
    }

    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2035) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'year parameter must be a valid 4-digit year' }
      });
    }

    const isDryRun = req.query.dryRun === 'true' || req.query.dryRun === true || req.body?.dryRun === true || req.body?.dryRun === 'true';
    const targetId = req.query.employeeId || req.query.targetEmployeeId || req.query.userId || req.body?.employeeId || req.body?.targetEmployeeId || req.body?.userId;

    const prisma = getSharedPrismaClient();

    const rewardType = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!rewardType) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_TYPE_NOT_FOUND', message: `Reward type not found with ID: ${id}` }
      });
    }

    if (!rewardType.isActive) {
      return res.status(400).json({
        success: false,
        error: { code: 'REWARD_TYPE_INACTIVE', message: `Reward type "${rewardType.name}" is deactivated` }
      });
    }

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    // Parse eligibility conditions from rule
    let ruleConditions = {};
    if (rewardType.eligibilityConditions) {
      try {
        ruleConditions = typeof rewardType.eligibilityConditions === 'string'
          ? JSON.parse(rewardType.eligibilityConditions)
          : rewardType.eligibilityConditions;
      } catch (_e) {
        ruleConditions = {};
      }
    }

    // Get active employees in company (filtered by caller override or rule target)
    const employeeWhere = {
      companyId,
      status: 'ACTIVE'
    };

    if (targetId) {
      // Explicit caller filter override for testing
      employeeWhere.OR = [
        { id: targetId },
        { userId: targetId },
        { employeeNumber: targetId }
      ];
    } else if (ruleConditions.targetEmployeeId || ruleConditions.targetUserId || ruleConditions.targetEmployeeNumber) {
      // Rule is targeted to a specific employee
      const targetConditions = [];
      if (ruleConditions.targetEmployeeId) targetConditions.push({ id: ruleConditions.targetEmployeeId });
      if (ruleConditions.targetUserId) targetConditions.push({ userId: ruleConditions.targetUserId });
      if (ruleConditions.targetEmployeeNumber) targetConditions.push({ employeeNumber: ruleConditions.targetEmployeeNumber });
      employeeWhere.OR = targetConditions;
    }

    const activeEmployees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        userId: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    const results = [];
    const createdRecords = [];
    let eligibleCount = 0;
    let alreadyExistedCount = 0;

    for (const emp of activeEmployees) {
      const employeeName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') ||
        (emp.user ? [emp.user.firstName, emp.user.lastName].filter(Boolean).join(' ') : 'Unknown');

      if (!emp.userId) {
        const detailsObj = {
          absentDays: 0,
          checkedDays: 0,
          totalWorkingDays: 0,
          maxAllowedAbsenceDays: ruleConditions.maxAllowedAbsenceDays !== undefined ? Number(ruleConditions.maxAllowedAbsenceDays) : null,
          threshold: ruleConditions.maxAllowedAbsenceDays !== undefined ? Number(ruleConditions.maxAllowedAbsenceDays) : null,
          absentDates: []
        };
        results.push({
          employeeId: emp.id,
          userId: null,
          employeeNumber: emp.employeeNumber,
          employeeName,
          isEligible: false,
          absentDays: 0,
          checkedDays: 0,
          totalWorkingDays: 0,
          maxAllowedAbsenceDays: detailsObj.maxAllowedAbsenceDays,
          absentDates: [],
          details: detailsObj,
          status: 'NOT_ELIGIBLE',
          reason: 'الموظف غير مربوط بحساب مستخدم في النظام'
        });
        continue;
      }

      let eligibility = { isEligible: true, details: {} };
      try {
        eligibility = await rewardEligibilityService.evaluateEligibility(
          companyId,
          emp.userId,
          rewardType.id,
          periodStart,
          periodEnd
        );
      } catch (e) {
        eligibility = { isEligible: false, reason: e.message, details: {} };
      }

      const att = eligibility.details?.attendance || eligibility.details || {};
      const absentDays = att.absentDays !== undefined ? att.absentDays : (att.actualAbsentDays !== undefined ? att.actualAbsentDays : 0);
      const maxAllowed = att.maxAllowedAbsenceDays !== undefined
        ? att.maxAllowedAbsenceDays
        : (att.threshold !== undefined
          ? att.threshold
          : (ruleConditions.maxAllowedAbsenceDays !== undefined ? Number(ruleConditions.maxAllowedAbsenceDays) : null));
      const checkedDays = att.checkedDays || att.totalWorkingDays || 0;
      const absentDates = att.absentDates || [];

      const detailsObj = {
        absentDays,
        checkedDays,
        totalWorkingDays: checkedDays,
        maxAllowedAbsenceDays: maxAllowed,
        threshold: maxAllowed,
        absentDates
      };

      let reasonText = eligibility.reason || '';
      if (!reasonText && att.hasAbsenceCondition) {
        if (eligibility.isEligible) {
          reasonText = `مستحق — غياب ${absentDays} يوم (الحد الأقصى ${maxAllowed})`;
        } else {
          reasonText = `غياب ${absentDays} يوم والمسموح ${maxAllowed}`;
        }
      } else if (!reasonText && eligibility.isEligible) {
        reasonText = 'مستحق للشروط المحددة';
      }

      if (eligibility.isEligible) {
        eligibleCount++;

        if (isDryRun) {
          results.push({
            employeeId: emp.id,
            userId: emp.userId,
            employeeNumber: emp.employeeNumber,
            employeeName,
            isEligible: true,
            absentDays,
            checkedDays,
            totalWorkingDays: checkedDays,
            maxAllowedAbsenceDays: maxAllowed,
            absentDates,
            details: detailsObj,
            status: 'ELIGIBLE',
            calculatedValue: Number(rewardType.value || 0),
            reason: reasonText
          });
          continue;
        }

        // Check if employee already received this reward type for this month/year
        const existingRecord = await prisma.rewardRecord.findFirst({
          where: {
            companyId,
            userId: emp.userId,
            rewardTypeId: rewardType.id,
            appliedMonth: targetMonth,
            appliedYear: targetYear,
            status: { not: 'CANCELLED' }
          }
        });

        if (existingRecord) {
          alreadyExistedCount++;
          results.push({
            employeeId: emp.id,
            userId: emp.userId,
            employeeNumber: emp.employeeNumber,
            employeeName,
            isEligible: true,
            absentDays,
            checkedDays,
            totalWorkingDays: checkedDays,
            maxAllowedAbsenceDays: maxAllowed,
            absentDates,
            details: detailsObj,
            status: 'ALREADY_EXISTS',
            recordId: existingRecord.id,
            calculatedValue: Number(existingRecord.calculatedValue),
            reason: `تم صرف أو تسجيل المكافأة مسبقاً (${existingRecord.status})`
          });
        } else {
          try {
            const initialStatus = rewardType.requireHRApproval ? 'PENDING' : 'APPROVED';
            const record = await rewardApplicationService.applyReward(
              companyId,
              emp.userId,
              rewardType.id,
              periodStart,
              periodEnd,
              req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API',
              {
                status: initialStatus,
                reason: `Attendance Commitment Bonus - Month ${targetYear}-${String(targetMonth).padStart(2, '0')}: ${reasonText}`
              }
            );
            createdRecords.push(record);
            results.push({
              employeeId: emp.id,
              userId: emp.userId,
              employeeNumber: emp.employeeNumber,
              employeeName,
              isEligible: true,
              absentDays,
              checkedDays,
              totalWorkingDays: checkedDays,
              maxAllowedAbsenceDays: maxAllowed,
              absentDates,
              details: detailsObj,
              status: 'CREATED',
              recordId: record.id,
              recordStatus: record.status,
              calculatedValue: Number(record.calculatedValue),
              reason: reasonText
            });
          } catch (appErr) {
            results.push({
              employeeId: emp.id,
              userId: emp.userId,
              employeeNumber: emp.employeeNumber,
              employeeName,
              isEligible: true,
              absentDays,
              checkedDays,
              totalWorkingDays: checkedDays,
              maxAllowedAbsenceDays: maxAllowed,
              absentDates,
              details: detailsObj,
              status: 'ERROR',
              error: appErr.message,
              reason: reasonText
            });
          }
        }
      } else {
        results.push({
          employeeId: emp.id,
          userId: emp.userId,
          employeeNumber: emp.employeeNumber,
          employeeName,
          isEligible: false,
          absentDays,
          checkedDays,
          totalWorkingDays: checkedDays,
          maxAllowedAbsenceDays: maxAllowed,
          absentDates,
          details: detailsObj,
          status: 'NOT_ELIGIBLE',
          reason: reasonText || 'لم يستوفِ شروط الاستحقاق'
        });
      }
    }

    if (!isDryRun) {
      await logExternalApiAction({
        req,
        action: 'EVALUATE_REWARD_TYPE',
        description: `Executed evaluation for reward type "${rewardType.name}" (${targetMonth}/${targetYear}): ${createdRecords.length} created, ${alreadyExistedCount} existed, ${eligibleCount} eligible out of ${activeEmployees.length}`,
        resourceType: 'RewardType',
        resourceId: rewardType.id,
        targetName: rewardType.name,
        details: {
          month: targetMonth,
          year: targetYear,
          totalEvaluated: activeEmployees.length,
          eligibleCount,
          createdCount: createdRecords.length,
          alreadyExistedCount
        }
      });
    }

    return res.json({
      success: true,
      message: isDryRun
        ? `Simulation completed for "${rewardType.name}" for period ${targetMonth}/${targetYear}`
        : `Evaluation completed for "${rewardType.name}" for period ${targetMonth}/${targetYear}`,
      data: {
        isDryRun,
        rewardType: {
          id: rewardType.id,
          name: rewardType.name,
          category: rewardType.category,
          calculationMethod: rewardType.calculationMethod,
          value: Number(rewardType.value),
          targetEmployeeId: ruleConditions.targetEmployeeId || null,
          targetEmployeeNumber: ruleConditions.targetEmployeeNumber || null,
          targetUserId: ruleConditions.targetUserId || null,
          maxAllowedAbsenceDays: ruleConditions.maxAllowedAbsenceDays !== undefined ? Number(ruleConditions.maxAllowedAbsenceDays) : null
        },
        period: {
          month: targetMonth,
          year: targetYear,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0]
        },
        summary: {
          totalEvaluated: activeEmployees.length,
          eligibleCount,
          createdCount: isDryRun ? 0 : createdRecords.length,
          alreadyExistedCount
        },
        createdRecords: isDryRun ? [] : createdRecords,
        results
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.evaluateRewardType] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 28. استعلام قواعد مكافآت الالتزام بالدوام
 * GET /reward-rules
 */
const listRewardRules = async (req, res) => {
  try {
    const { companyId } = req;
    const { isActive, page = 1, limit = 20 } = req.query;
    const prisma = getSharedPrismaClient();

    const skip = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {
      companyId,
      category: 'FINANCIAL'
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [rules, total] = await Promise.all([
      prisma.rewardType.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rewardType.count({ where })
    ]);

    const formattedData = rules.map((r) => {
      let conditions = {};
      try {
        conditions = r.eligibilityConditions ? JSON.parse(r.eligibilityConditions) : {};
      } catch {}

      return {
        id: r.id,
        name: r.name,
        nameAr: r.nameAr,
        description: r.description,
        value: Number(r.value),
        maxAllowedAbsenceDays: conditions.maxAllowedAbsenceDays !== undefined ? Number(conditions.maxAllowedAbsenceDays) : null,
        targetEmployeeId: conditions.targetEmployeeId || null,
        targetEmployeeNumber: conditions.targetEmployeeNumber || null,
        targetUserId: conditions.targetUserId || null,
        disburseAsPayrollBonus: conditions.disburseAsPayrollBonus !== false,
        category: r.category,
        calculationMethod: r.calculationMethod,
        triggerType: r.triggerType,
        frequency: r.frequency,
        isActive: r.isActive,
        conditions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listRewardRules] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 29. جلب قاعدة مكافأة محددة بالمعرف
 * GET /reward-rules/:id
 */
const getRewardRuleById = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const rule = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_RULE_NOT_FOUND', message: `Reward rule not found with ID: ${id}` }
      });
    }

    let conditions = {};
    try {
      conditions = rule.eligibilityConditions ? JSON.parse(rule.eligibilityConditions) : {};
    } catch {}

    return res.json({
      success: true,
      data: {
        id: rule.id,
        name: rule.name,
        nameAr: rule.nameAr,
        description: rule.description,
        value: Number(rule.value),
        maxAllowedAbsenceDays: conditions.maxAllowedAbsenceDays !== undefined ? Number(conditions.maxAllowedAbsenceDays) : null,
        targetEmployeeId: conditions.targetEmployeeId || null,
        targetEmployeeNumber: conditions.targetEmployeeNumber || null,
        targetUserId: conditions.targetUserId || null,
        disburseAsPayrollBonus: conditions.disburseAsPayrollBonus !== false,
        category: rule.category,
        calculationMethod: rule.calculationMethod,
        triggerType: rule.triggerType,
        frequency: rule.frequency,
        isActive: rule.isActive,
        conditions,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.getRewardRuleById] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 30. إنشاء قاعدة مكافأة التزام بالدوام
 * POST /reward-rules
 */
const createRewardRule = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      name,
      nameAr,
      description,
      value,
      amount,
      maxAllowedAbsenceDays = 2,
      targetEmployeeId,
      disburseAsPayrollBonus = true,
      isActive = true
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rule name is required' }
      });
    }

    const numericValue = Number(value !== undefined ? value : amount);
    if (isNaN(numericValue) || numericValue <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reward value must be a positive number' }
      });
    }

    const numericMaxAbsences = parseInt(maxAllowedAbsenceDays, 10);
    if (isNaN(numericMaxAbsences) || numericMaxAbsences < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'maxAllowedAbsenceDays must be a non-negative integer' }
      });
    }

    const prisma = getSharedPrismaClient();

    let resolvedUserId = null;
    let resolvedEmployeeNumber = null;

    if (targetEmployeeId) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: targetEmployeeId }, { employeeNumber: targetEmployeeId }],
          companyId
        },
        select: { id: true, employeeNumber: true }
      });

      if (user) {
        resolvedUserId = user.id;
        resolvedEmployeeNumber = user.employeeNumber;
      } else {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [{ id: targetEmployeeId }, { employeeNumber: targetEmployeeId }],
            companyId
          },
          select: { id: true, userId: true, employeeNumber: true }
        });

        if (emp && emp.userId) {
          resolvedUserId = emp.userId;
          resolvedEmployeeNumber = emp.employeeNumber;
        } else {
          return res.status(404).json({
            success: false,
            error: { code: 'EMPLOYEE_NOT_FOUND', message: `Target employee not found in this company with ID: ${targetEmployeeId}` }
          });
        }
      }
    }

    const conditions = {
      type: 'ATTENDANCE_COMMITMENT',
      maxAllowedAbsenceDays: numericMaxAbsences,
      targetEmployeeId: targetEmployeeId || null,
      targetUserId: resolvedUserId,
      targetEmployeeNumber: resolvedEmployeeNumber,
      disburseAsPayrollBonus: disburseAsPayrollBonus !== false
    };

    const newRule = await prisma.rewardType.create({
      data: {
        companyId,
        name: name.trim(),
        nameAr: nameAr ? nameAr.trim() : null,
        description: description ? description.trim() : null,
        category: 'FINANCIAL',
        calculationMethod: 'FIXED',
        value: numericValue,
        triggerType: 'AUTOMATIC',
        frequency: 'MONTHLY',
        isActive: isActive !== false,
        eligibilityConditions: JSON.stringify(conditions),
        createdBy: req.externalApiCredential?.id || req.hrCredential?.id || 'EXTERNAL_API'
      }
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_REWARD_RULE',
      description: `إنشاء قاعدة مكافأة الالتزام بالدوام "${newRule.name}" بقيمة ${numericValue} ج شهرياً بشرط غياب <= ${numericMaxAbsences} يوم`,
      resourceType: 'RewardRule',
      resourceId: newRule.id,
      targetName: newRule.name,
      details: {
        value: numericValue,
        maxAllowedAbsenceDays: numericMaxAbsences,
        targetEmployeeId: targetEmployeeId || null,
        targetUserId: resolvedUserId,
        disburseAsPayrollBonus: disburseAsPayrollBonus !== false
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Reward rule created successfully',
      data: {
        id: newRule.id,
        name: newRule.name,
        nameAr: newRule.nameAr,
        description: newRule.description,
        value: Number(newRule.value),
        maxAllowedAbsenceDays: numericMaxAbsences,
        targetEmployeeId: targetEmployeeId || null,
        targetUserId: resolvedUserId,
        disburseAsPayrollBonus: disburseAsPayrollBonus !== false,
        category: newRule.category,
        calculationMethod: newRule.calculationMethod,
        triggerType: newRule.triggerType,
        frequency: newRule.frequency,
        isActive: newRule.isActive,
        conditions,
        createdAt: newRule.createdAt
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createRewardRule] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 31. تعديل قاعدة مكافأة الالتزام بالدوام
 * PATCH /reward-rules/:id
 */
const updateRewardRule = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existingRule = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_RULE_NOT_FOUND', message: `Reward rule not found with ID: ${id}` }
      });
    }

    const {
      name,
      nameAr,
      description,
      value,
      amount,
      maxAllowedAbsenceDays,
      targetEmployeeId,
      disburseAsPayrollBonus,
      isActive
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (nameAr !== undefined) updateData.nameAr = nameAr ? String(nameAr).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const numericValue = value !== undefined ? Number(value) : (amount !== undefined ? Number(amount) : undefined);
    if (numericValue !== undefined) {
      if (isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Reward value must be a positive number' }
        });
      }
      updateData.value = numericValue;
    }

    let existingConditions = {};
    try {
      existingConditions = existingRule.eligibilityConditions ? JSON.parse(existingRule.eligibilityConditions) : {};
    } catch {}

    const conditions = { ...existingConditions };

    if (maxAllowedAbsenceDays !== undefined) {
      const parsedAbsences = parseInt(maxAllowedAbsenceDays, 10);
      if (isNaN(parsedAbsences) || parsedAbsences < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'maxAllowedAbsenceDays must be a non-negative integer' }
        });
      }
      conditions.maxAllowedAbsenceDays = parsedAbsences;
    }

    if (targetEmployeeId !== undefined) {
      if (targetEmployeeId === null || targetEmployeeId === '') {
        conditions.targetEmployeeId = null;
        conditions.targetUserId = null;
        conditions.targetEmployeeNumber = null;
      } else {
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ id: targetEmployeeId }, { employeeNumber: targetEmployeeId }],
            companyId
          },
          select: { id: true, employeeNumber: true }
        });

        if (user) {
          conditions.targetUserId = user.id;
          conditions.targetEmployeeNumber = user.employeeNumber;
          conditions.targetEmployeeId = targetEmployeeId;
        } else {
          const emp = await prisma.employee.findFirst({
            where: {
              OR: [{ id: targetEmployeeId }, { employeeNumber: targetEmployeeId }],
              companyId
            },
            select: { id: true, userId: true, employeeNumber: true }
          });

          if (emp && emp.userId) {
            conditions.targetUserId = emp.userId;
            conditions.targetEmployeeNumber = emp.employeeNumber;
            conditions.targetEmployeeId = targetEmployeeId;
          } else {
            return res.status(404).json({
              success: false,
              error: { code: 'EMPLOYEE_NOT_FOUND', message: `Target employee not found in this company with ID: ${targetEmployeeId}` }
            });
          }
        }
      }
    }

    if (disburseAsPayrollBonus !== undefined) {
      conditions.disburseAsPayrollBonus = Boolean(disburseAsPayrollBonus);
    }

    updateData.eligibilityConditions = JSON.stringify(conditions);

    const updated = await prisma.rewardType.update({
      where: { id: existingRule.id },
      data: updateData
    });

    await logExternalApiAction({
      req,
      action: 'UPDATE_REWARD_RULE',
      description: `تعديل قاعدة مكافأة الالتزام "${updated.name}"`,
      resourceType: 'RewardRule',
      resourceId: updated.id,
      targetName: updated.name,
      details: { updatedFields: Object.keys(req.body) }
    });

    return res.json({
      success: true,
      message: 'Reward rule updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        nameAr: updated.nameAr,
        description: updated.description,
        value: Number(updated.value),
        maxAllowedAbsenceDays: conditions.maxAllowedAbsenceDays !== undefined ? Number(conditions.maxAllowedAbsenceDays) : null,
        targetEmployeeId: conditions.targetEmployeeId || null,
        targetUserId: conditions.targetUserId || null,
        disburseAsPayrollBonus: conditions.disburseAsPayrollBonus !== false,
        category: updated.category,
        calculationMethod: updated.calculationMethod,
        triggerType: updated.triggerType,
        frequency: updated.frequency,
        isActive: updated.isActive,
        conditions,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.updateRewardRule] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 32. تقييم شهري لقاعدة مكافأة الالتزام بالدوام (Attendance Commitment Bonus Evaluation)
 * POST /reward-rules/:id/evaluate?month=YYYY-MM&dryRun=true|false
 */
const evaluateRewardRule = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    const isDryRun = req.query.dryRun === 'true' || req.query.dryRun === true || req.body?.dryRun === true || req.body?.dryRun === 'true';

    // Parse Month & Year (supports ?month=YYYY-MM or ?month=9&year=2026)
    const rawMonth = req.query.month || req.body?.month;
    const rawYear = req.query.year || req.body?.year;

    let targetMonth, targetYear;
    if (typeof rawMonth === 'string' && rawMonth.includes('-')) {
      const parts = rawMonth.trim().split('-');
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10);
    } else {
      const now = new Date();
      targetMonth = rawMonth ? parseInt(rawMonth, 10) : (now.getMonth() + 1);
      targetYear = rawYear ? parseInt(rawYear, 10) : now.getFullYear();
    }

    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'month parameter must be between 1 and 12 or in YYYY-MM format' }
      });
    }

    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2035) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'year parameter must be a valid 4-digit year' }
      });
    }

    const prisma = getSharedPrismaClient();

    const rule = await prisma.rewardType.findFirst({
      where: { id, companyId }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: { code: 'REWARD_RULE_NOT_FOUND', message: `Reward rule not found with ID: ${id}` }
      });
    }

    if (!rule.isActive) {
      return res.status(400).json({
        success: false,
        error: { code: 'REWARD_RULE_INACTIVE', message: `Reward rule "${rule.name}" is deactivated` }
      });
    }

    // Parse eligibility conditions
    let conditions = {};
    try {
      conditions = rule.eligibilityConditions ? JSON.parse(rule.eligibilityConditions) : {};
    } catch {}

    const maxAllowedAbsenceDays = Number(conditions.maxAllowedAbsenceDays ?? 2);
    const queryOverride = req.query.employeeId || req.query.targetEmployeeId || req.query.userId || req.body?.employeeId || req.body?.targetEmployeeId || req.body?.userId;
    let targetUserId = conditions.targetUserId || null;

    if (queryOverride) {
      const u = await prisma.user.findFirst({
        where: { OR: [{ id: queryOverride }, { employeeNumber: queryOverride }], companyId },
        select: { id: true }
      });
      if (u) {
        targetUserId = u.id;
      } else {
        const e = await prisma.employee.findFirst({
          where: { OR: [{ id: queryOverride }, { employeeNumber: queryOverride }], companyId },
          select: { userId: true }
        });
        if (e && e.userId) targetUserId = e.userId;
      }
    }

    // Use official system attendance service to get real absence days respecting workDays, publicHolidays, leaves, and hireDate
    const absentReport = await attendanceService.getAbsentDaysReport(
      companyId,
      targetYear,
      targetMonth,
      targetUserId || null
    );

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const evaluatedEmployees = absentReport?.employees || [];
    const results = [];
    const createdRecords = [];
    let eligibleCount = 0;
    let alreadyExistedCount = 0;

    // Read reward settings for approval workflow
    const rewardSettings = await prisma.rewardSettings.findUnique({
      where: { companyId }
    });
    const defaultStatus = (rewardSettings && rewardSettings.requireManagerApproval) ? 'PENDING' : 'APPROVED';

    for (const emp of evaluatedEmployees) {
      const absentDays = Number(emp.absentDays || 0);
      const isEligible = absentDays <= maxAllowedAbsenceDays;

      let reason = '';
      if (isEligible) {
        reason = `مستحق: غياب ${absentDays} يوم <= الحد المسموح (${maxAllowedAbsenceDays} يوم)`;
      } else {
        reason = `غير مستحق: غياب ${absentDays} يوم > الحد المسموح (${maxAllowedAbsenceDays} يوم)`;
      }

      const detailsObj = {
        absentDays,
        checkedDays: absentReport?.totalWorkingDays || 0,
        totalWorkingDays: absentReport?.totalWorkingDays || 0,
        maxAllowedAbsenceDays,
        threshold: maxAllowedAbsenceDays,
        absentDates: emp.absentDates || []
      };

      if (isDryRun) {
        if (isEligible) eligibleCount++;
        results.push({
          userId: emp.userId || emp.id,
          employeeNumber: emp.employeeNumber,
          employeeName: emp.name,
          absentDays,
          checkedDays: absentReport?.totalWorkingDays || 0,
          totalWorkingDays: absentReport?.totalWorkingDays || 0,
          maxAllowedAbsenceDays,
          absentDates: emp.absentDates || [],
          details: detailsObj,
          isEligible,
          reason,
          rewardValue: Number(rule.value),
          status: 'DRY_RUN'
        });
      } else {
        if (isEligible) {
          eligibleCount++;

          // Check if employee already received this reward type for this month/year
          const existingRecord = await prisma.rewardRecord.findFirst({
            where: {
              companyId,
              userId: emp.userId || emp.id,
              rewardTypeId: rule.id,
              appliedMonth: targetMonth,
              appliedYear: targetYear,
              status: { not: 'CANCELLED' }
            }
          });

          if (existingRecord) {
            alreadyExistedCount++;
            results.push({
              userId: emp.userId || emp.id,
              employeeNumber: emp.employeeNumber,
              employeeName: emp.name,
              absentDays,
              checkedDays: absentReport?.totalWorkingDays || 0,
              totalWorkingDays: absentReport?.totalWorkingDays || 0,
              maxAllowedAbsenceDays,
              absentDates: emp.absentDates || [],
              details: detailsObj,
              isEligible: true,
              reason,
              rewardValue: Number(rule.value),
              status: 'ALREADY_EXISTS',
              recordId: existingRecord.id,
              calculatedValue: Number(existingRecord.calculatedValue)
            });
          } else {
            try {
              const record = await prisma.rewardRecord.create({
                data: {
                  companyId,
                  userId: emp.userId || emp.id,
                  rewardTypeId: rule.id,
                  rewardName: rule.name,
                  rewardCategory: 'ATTENDANCE',
                  calculatedValue: rule.value,
                  calculationDetails: JSON.stringify({
                    absentDays,
                    maxAllowedAbsenceDays,
                    totalWorkingDays: absentReport?.totalWorkingDays || 0,
                    absentDates: emp.absentDates || []
                  }),
                  periodStart,
                  periodEnd,
                  appliedMonth: targetMonth,
                  appliedYear: targetYear,
                  reason: `مكافأة التزام بالحضور (${targetMonth}/${targetYear}): غياب ${absentDays} يوم (الحد المسموح ${maxAllowedAbsenceDays} يوم)`,
                  status: defaultStatus,
                  isIncludedInPayroll: false
                }
              });

              createdRecords.push(record);
              results.push({
                userId: emp.userId || emp.id,
                employeeNumber: emp.employeeNumber,
                employeeName: emp.name,
                absentDays,
                checkedDays: absentReport?.totalWorkingDays || 0,
                totalWorkingDays: absentReport?.totalWorkingDays || 0,
                maxAllowedAbsenceDays,
                absentDates: emp.absentDates || [],
                details: detailsObj,
                isEligible: true,
                reason,
                rewardValue: Number(rule.value),
                status: 'CREATED',
                recordId: record.id,
                calculatedValue: Number(record.calculatedValue)
              });
            } catch (createErr) {
              results.push({
                userId: emp.userId || emp.id,
                employeeNumber: emp.employeeNumber,
                employeeName: emp.name,
                absentDays,
                checkedDays: absentReport?.totalWorkingDays || 0,
                totalWorkingDays: absentReport?.totalWorkingDays || 0,
                maxAllowedAbsenceDays,
                absentDates: emp.absentDates || [],
                details: detailsObj,
                isEligible: true,
                reason,
                status: 'ERROR',
                error: createErr.message
              });
            }
          }
        } else {
          results.push({
            userId: emp.userId || emp.id,
            employeeNumber: emp.employeeNumber,
            employeeName: emp.name,
            absentDays,
            checkedDays: absentReport?.totalWorkingDays || 0,
            totalWorkingDays: absentReport?.totalWorkingDays || 0,
            maxAllowedAbsenceDays,
            absentDates: emp.absentDates || [],
            details: detailsObj,
            isEligible: false,
            reason,
            rewardValue: 0,
            status: 'NOT_ELIGIBLE'
          });
        }
      }
    }

    const periodStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    await logExternalApiAction({
      req,
      action: isDryRun ? 'EVALUATE_REWARD_RULE_DRY_RUN' : 'EVALUATE_REWARD_RULE',
      description: `${isDryRun ? '[DryRun] ' : ''}تقييم قاعدة مكافأة الالتزام بالدوام "${rule.name}" لشهر ${periodStr}: تم تقييم ${evaluatedEmployees.length}، مستحق ${eligibleCount}، منشأ ${createdRecords.length}`,
      resourceType: 'RewardRule',
      resourceId: rule.id,
      targetName: rule.name,
      details: {
        month: targetMonth,
        year: targetYear,
        dryRun: isDryRun,
        totalEvaluated: evaluatedEmployees.length,
        eligibleCount,
        createdCount: createdRecords.length,
        alreadyExistedCount
      }
    });

    return res.json({
      success: true,
      message: `${isDryRun ? '[DryRun] ' : ''}Attendance commitment bonus evaluation completed for "${rule.name}" for period ${periodStr}`,
      data: {
        rule: {
          id: rule.id,
          name: rule.name,
          value: Number(rule.value),
          maxAllowedAbsenceDays,
          targetEmployeeId: conditions.targetEmployeeId || null,
          targetEmployeeNumber: conditions.targetEmployeeNumber || null,
          targetUserId: conditions.targetUserId || null,
          disburseAsPayrollBonus: conditions.disburseAsPayrollBonus !== false
        },
        period: {
          month: targetMonth,
          year: targetYear,
          period: periodStr,
          totalWorkingDays: absentReport?.totalWorkingDays || 0
        },
        dryRun: isDryRun,
        summary: {
          totalEvaluated: evaluatedEmployees.length,
          eligibleCount,
          createdCount: createdRecords.length,
          alreadyExistedCount
        },
        createdRecords,
        results
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.evaluateRewardRule] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 40. استعلام طلبات الأذونات الخارجية
 * GET /permissions
 */
const listPermissions = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeId,
      employeeNumber,
      status,
      type,
      month,
      year,
      from,
      to,
      page = 1,
      limit = 20
    } = req.query;

    const prisma = getSharedPrismaClient();

    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && employeeNumber) {
      const emp = await prisma.employee.findFirst({
        where: { companyId, employeeNumber: String(employeeNumber).trim() },
        select: { id: true }
      });
      if (emp) targetEmployeeId = emp.id;
    }

    const where = { companyId };

    if (targetEmployeeId) {
      where.OR = [
        { employeeId: targetEmployeeId },
        { employee: { userId: targetEmployeeId } }
      ];
    }

    if (status) {
      where.status = String(status).trim().toUpperCase();
    }

    if (type) {
      where.type = String(type).trim().toUpperCase();
    }

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59)
      };
    } else if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

    const [permissions, total] = await Promise.all([
      prisma.hrPermissionRequest.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              department: { select: { name: true } }
            }
          }
        }
      }),
      prisma.hrPermissionRequest.count({ where })
    ]);

    const formatted = permissions.map(p => ({
      id: p.id,
      companyId: p.companyId,
      employeeId: p.employeeId,
      employeeNumber: p.employee?.employeeNumber || null,
      employeeName: p.employee ? `${p.employee.firstName || ''} ${p.employee.lastName || ''}`.trim() : null,
      department: p.employee?.department?.name || null,
      type: p.type,
      date: p.date ? new Date(p.date).toISOString().split('T')[0] : null,
      startTime: p.startTime,
      endTime: p.endTime,
      totalHours: Number(p.totalHours),
      totalMinutes: Math.round(Number(p.totalHours) * 60),
      reason: p.reason,
      details: p.details,
      status: p.status,
      isCompensated: Boolean(p.isCompensated),
      compensationDate: p.compensationDate ? new Date(p.compensationDate).toISOString().split('T')[0] : null,
      compensationNotes: p.compensationNotes || null,
      isUrgent: Boolean(p.isUrgent),
      approvedById: p.approvedById,
      approvedAt: p.approvedAt,
      rejectionReason: p.rejectionReason,
      notes: p.notes,
      createdAt: p.createdAt
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.listPermissions] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 41. إنشاء طلب إذن خارجي (تأخير / انصراف مبكر)
 * POST /permissions
 */
const createPermission = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      employeeId,
      employeeNumber,
      date,
      startTime,
      endTime,
      reason,
      details,
      notes,
      type,
      permissionType,
      extraOption,
      isCompensated,
      compensationDate,
      compensationNotes,
      isExceptional,
      isUrgent
    } = req.body;

    if (!date || !startTime || !endTime || !reason || (!employeeId && !employeeNumber)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'employeeId/employeeNumber, date, startTime, endTime, and reason are required'
        }
      });
    }

    const rawType = permissionType || type;
    if (rawType) {
      const normalizedType = String(rawType).trim().toUpperCase();
      if (!VALID_PERMISSION_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid permissionType: '${rawType}'. Allowed values are: ${VALID_PERMISSION_TYPES.join(', ')}`,
            allowedValues: VALID_PERMISSION_TYPES
          }
        });
      }
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(String(startTime).trim()) || !timeRegex.test(String(endTime).trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startTime and endTime must be in HH:mm format (e.g. 10:00, 11:30)'
        }
      });
    }

    const reqDate = new Date(date);
    if (isNaN(reqDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format. Expected YYYY-MM-DD'
        }
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الموظف
    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          ...(employeeId ? [{ id: employeeId }, { userId: employeeId }] : []),
          ...(employeeNumber ? [{ employeeNumber: String(employeeNumber).trim() }] : [])
        ]
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `Employee not found in company: ${employeeId || employeeNumber}`
        }
      });
    }

    // فحص مهلة التقديم (48 ساعة قبل الموعد ما لم يكن استثنائياً)
    const settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });
    const leadDays = (settings?.permissionLeadDays !== undefined && settings?.permissionLeadDays !== null)
      ? Number(settings.permissionLeadDays)
      : 2;
    const minLeadHours = leadDays * 24;

    const requestDateTime = new Date(date);
    const [sh, sm] = startTime.split(':').map(Number);
    requestDateTime.setHours(sh, sm, 0, 0);

    const now = new Date();
    const diffHours = (requestDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isEx = Boolean(isExceptional || isUrgent);
    let finalNotes = notes || '';

    if (diffHours < minLeadHours) {
      if (!isEx) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `يجب تقديم طلب الإذن قبل الموعد بـ ${minLeadHours} ساعة على الأقل (${leadDays} يوم). الطلبات المتأخرة تتطلب موافقة أو تحديد استثنائي.`
          }
        });
      } else {
        finalNotes = (finalNotes ? finalNotes + ' ' : '') + '[طلب استثنائي بتجاوز مهلة الـ 48 ساعة]';
      }
    }

    // حساب عدد الساعات
    const [eh, em] = endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const totalHours = parseFloat(((endMins - startMins) / 60).toFixed(2));

    if (totalHours <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endTime must be strictly after startTime'
        }
      });
    }

    let finalType = type || 'NON_DEDUCTIBLE';
    let finalIsCompensated = Boolean(isCompensated);
    if (extraOption === 'compensate') {
      finalType = 'COMPENSATORY';
      finalIsCompensated = true;
    } else if (extraOption === 'deduct') {
      finalType = 'DEDUCTIBLE';
    }

    const created = await prisma.hrPermissionRequest.create({
      data: {
        companyId,
        employeeId: employee.id,
        type: finalType,
        date: reqDate,
        startTime,
        endTime,
        totalHours,
        reason,
        details: details || null,
        notes: finalNotes || null,
        isUrgent: isEx,
        isCompensated: finalIsCompensated,
        compensationDate: compensationDate ? new Date(compensationDate) : null,
        compensationNotes: compensationNotes || null,
        status: 'PENDING'
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        }
      }
    });

    await logExternalApiAction({
      req,
      action: 'CREATE_PERMISSION',
      description: `إنشاء طلب إذن للموظف ${employee.employeeNumber} (${totalHours} ساعة - ${reason})`,
      resourceType: 'HrPermissionRequest',
      resourceId: created.id,
      targetName: `طلب إذن ${employee.employeeNumber}`
    });

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        employeeId: created.employeeId,
        employeeNumber: created.employee?.employeeNumber,
        employeeName: `${created.employee?.firstName || ''} ${created.employee?.lastName || ''}`.trim(),
        date: created.date ? new Date(created.date).toISOString().split('T')[0] : null,
        startTime: created.startTime,
        endTime: created.endTime,
        totalHours: Number(created.totalHours),
        totalMinutes: Math.round(Number(created.totalHours) * 60),
        type: created.type,
        status: created.status,
        reason: created.reason,
        isCompensated: created.isCompensated,
        compensationDate: created.compensationDate ? new Date(created.compensationDate).toISOString().split('T')[0] : null,
        compensationNotes: created.compensationNotes,
        isUrgent: created.isUrgent,
        createdAt: created.createdAt
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.createPermission] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 42. الموافقة على طلب إذن
 * POST /permissions/:id/approve
 */
const approvePermission = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { notes, isCompensated, compensationDate, compensationNotes } = req.body || {};

    const prisma = getSharedPrismaClient();
    const existing = await prisma.hrPermissionRequest.findFirst({
      where: { id, companyId },
      include: { employee: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Permission request not found: ${id}` }
      });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot approve permission with status: ${existing.status}` }
      });
    }

    const updateData = {
      status: 'APPROVED',
      approvedById: req.user?.id || req.externalApi?.actingUserId || null,
      approvedAt: new Date()
    };

    if (isCompensated !== undefined) {
      updateData.isCompensated = Boolean(isCompensated);
      if (isCompensated) updateData.type = 'COMPENSATORY';
    }
    if (compensationDate) {
      updateData.compensationDate = new Date(compensationDate);
    }
    if (compensationNotes) {
      updateData.compensationNotes = compensationNotes;
    }
    if (notes) {
      updateData.notes = (existing.notes ? existing.notes + ' ' : '') + notes;
    }

    const updated = await prisma.hrPermissionRequest.update({
      where: { id },
      data: updateData,
      include: { employee: true }
    });

    // فحص إنذار الـ 4 إذونات إضافية بعد استنفاد الـ 120 دقيقة
    try {
      const permissionService = require('../../services/hr/permissionService');
      await permissionService.checkAndIssueExtraPermissionWarning(
        companyId,
        updated.employeeId,
        updated.employee?.userId,
        updated.date
      );
    } catch (warnErr) {
      console.warn('⚠️ [ExternalHrController.approvePermission] Warning check error:', warnErr.message);
    }

    await logExternalApiAction({
      req,
      action: 'APPROVE_PERMISSION',
      description: `الموافقة على طلب إذن ${updated.employee?.employeeNumber || updated.id}`,
      resourceType: 'HrPermissionRequest',
      resourceId: updated.id,
      targetName: `إذن ${updated.employee?.employeeNumber || updated.id}`
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        approvedAt: updated.approvedAt,
        type: updated.type,
        isCompensated: updated.isCompensated,
        compensationDate: updated.compensationDate ? new Date(updated.compensationDate).toISOString().split('T')[0] : null,
        compensationNotes: updated.compensationNotes
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.approvePermission] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 43. رفض طلب إذن
 * POST /permissions/:id/reject
 */
const rejectPermission = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required' }
      });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.hrPermissionRequest.findFirst({
      where: { id, companyId },
      include: { employee: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Permission request not found: ${id}` }
      });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot reject permission with status: ${existing.status}` }
      });
    }

    const updated = await prisma.hrPermissionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: String(reason).trim(),
        approvedById: req.user?.id || req.externalApi?.actingUserId || null,
        approvedAt: new Date()
      }
    });

    await logExternalApiAction({
      req,
      action: 'REJECT_PERMISSION',
      description: `رفض طلب إذن ${existing.employee?.employeeNumber || updated.id}: ${reason}`,
      resourceType: 'HrPermissionRequest',
      resourceId: updated.id,
      targetName: `إذن ${existing.employee?.employeeNumber || updated.id}`
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        rejectedAt: updated.approvedAt
      }
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.rejectPermission] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = {
  listEmployees,
  getEmployeeById,
  upsertEmployee,
  createEmployee,
  updateEmployee,
  terminateEmployee,
  recordPunchesBatch,
  getTodayAttendance,
  createLeaveRequest,
  listWebhookEndpoints,
  createWebhookEndpoint,
  listApiCredentials,
  createApiCredential,
  revokeApiCredential,
  // D1 & D2 new endpoints
  listDepartments,
  listPositions,
  getEmployeeStats,
  getOrganizationChart,
  listLeaveRequests,
  getLeaveBalances,
  getAttendanceSummary,
  listPayrollRuns,
  getPayrollRunItems,
  previewPayroll,
  createPayrollRun,
  decideLeaveRequest,
  // New read endpoints
  listAdvances,
  listDeductions,
  listWarnings,
  listResignations,
  // New management endpoints
  getHRSettings,
  updateHRSettings,
  createDeduction,
  updateDeduction,
  listRewards,
  createReward,
  voidReward,
  listShifts,
  createShift,
  updateShift,
  assignEmployeeShift,
  updateAttendanceRecord,
  voidAttendanceRecord,
  // Phase 4 endpoints
  listRewardTypes,
  getRewardTypeById,
  createRewardType,
  updateRewardType,
  getRewardSettings,
  updateRewardSettings,
  evaluateRewardType,
  // Item 7 Attendance Commitment Bonus Rule Engine
  listRewardRules,
  getRewardRuleById,
  createRewardRule,
  updateRewardRule,
  evaluateRewardRule,
  // Permissions Endpoints
  listPermissions,
  createPermission,
  approvePermission,
  rejectPermission
};
