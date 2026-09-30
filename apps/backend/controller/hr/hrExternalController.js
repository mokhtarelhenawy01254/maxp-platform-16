/**
 * 🌐 External HR Controller
 * معالج الطلبات الخارجية لأنظمة ERP وأجهزة البصمة وأدوات الذكاء الاصطناعي
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getDateStringInTimezone } = require('../../utils/dateUtils');
const {
  dispatchHrWebhook,
  generateHrApiKey,
  normalizeScopes,
  HR_WEBHOOK_EVENTS,
  logExternalApiAction
} = require('../../services/hrIntegrationService');
const { attendanceService, shiftService } = require('../../services/hr');

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

function formatMaskedSettings(settings, companyTimezone = 'Africa/Cairo') {
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

  return {
    workHours: {
      workingDays,
      workDays: workDaysNums,
      workStartTime: settings?.workStartTime || '09:00',
      workEndTime: settings?.workEndTime || '17:00',
      breakDuration: settings?.breakDuration ?? 60,
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
      lateThreshold: settings?.lateThresholdMinutes || settings?.lateGracePeriod || 15,
      lateThresholdMinutes: settings?.lateThresholdMinutes ?? 10,
      lateGracePeriod: settings?.lateGracePeriod ?? 15,
      earlyLeaveThreshold: settings?.earlyLeaveGracePeriod ?? 15,
      earlyLeaveGracePeriod: settings?.earlyLeaveGracePeriod ?? 15,
      earlyCheckoutEnabled: settings?.earlyCheckoutEnabled !== false,
      earlyCheckoutThresholdMinutes: settings?.earlyCheckoutThresholdMinutes ?? 0,
      monthlyLateLimit: settings?.monthlyLateLimit ?? 3,
      lateWarningThreshold: settings?.lateWarningThreshold ?? 3,
      lateWarningLevels: safeParseSettingsArray(settings?.lateWarningLevels, []),
      autoDeductionEnabled: settings?.autoDeductionEnabled || false,
      gracePeriodMinutes: settings?.gracePeriodMinutes ?? 60,
      maxDailyDeductionDays: Number(settings?.maxDailyDeductionDays) || 1.0,
      deductionCalculationMethod: settings?.deductionCalculationMethod || 'minute',
      workingDaysPerMonth: settings?.workingDaysPerMonth ?? 22,
      workingHoursPerDay: settings?.workingHoursPerDay ?? 8,
      requireDeductionReview: settings?.requireDeductionReview !== false,
      absencePenaltyRate: Number(settings?.absencePenaltyRate) || 1.0,
      deductAbsenceInCurrentMonth: settings?.deductAbsenceInCurrentMonth !== false,
      delayPenaltyTiers: safeParseSettingsArray(settings?.delayPenaltyTiers, [])
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
      taxRate: Number(settings?.taxRate) || 0,
      socialInsuranceRate: Number(settings?.socialInsuranceRate) || 14.0,
      overtimeRate: Number(settings?.overtimeRate) || 1.5,
      maxAdvancePercentage: Number(settings?.maxAdvancePercentage) || 50,
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
    }
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
        select: { id: true, userId: true, firstName: true, lastName: true }
      });

      if (!employee || !employee.userId) {
        results.failed++;
        results.errors.push({ punch, error: 'Employee not found or unlinked to User record' });
        continue;
      }

      // Calculate start of day in company timezone (Africa/Cairo default)
      const dateStr = getDateStringInTimezone(punchDate, timezone);
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);

      try {
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
          } else if (!isCheckIn && (!attendance.checkOut || punchDate > attendance.checkOut)) {
            updateData.checkOut = punchDate;
            updateData.checkOutMethod = deviceId ? `BIOMETRIC_${deviceId}` : 'BIOMETRIC_API';
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.attendance.update({
              where: { id: attendance.id },
              data: updateData
            });
          }
        } else {
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
              status: 'PRESENT'
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
 * Query: from, to, employeeCode
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { companyId } = req;
    const { from, to, employeeCode } = req.query;
    const prisma = getSharedPrismaClient();

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const where = {
      companyId,
      date: { gte: startDate, lte: endDate }
    };

    if (employeeCode) {
      const emp = await prisma.employee.findFirst({
        where: { companyId, OR: [{ employeeNumber: employeeCode }, { id: employeeCode }] },
        select: { userId: true }
      });
      if (emp?.userId) where.userId = emp.userId;
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

    return res.json({
      success: true,
      data: {
        period: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        totalRecords,
        present: byStatus.PRESENT || 0,
        late: byStatus.LATE || 0,
        absent: byStatus.ABSENT || 0,
        onLeave: byStatus.ON_LEAVE || 0,
        halfDay: byStatus.HALF_DAY || 0,
        byStatus,
        avgWorkHours: Number((aggregates._avg.workHours || 0).toFixed(2)),
        totalOvertimeHours: Number((aggregates._sum.overtimeHours || 0).toFixed(2))
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

    const [company, runtimeColumns] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, timezone: true, phone: true }
      }),
      getHRSettingsRuntimeColumns(prisma)
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

    const maskedData = formatMaskedSettings(settings, company?.timezone || 'Africa/Cairo');

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

    const [company, runtimeColumns] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, timezone: true, phone: true }
      }),
      getHRSettingsRuntimeColumns(prisma)
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

    const currentFormatted = formatMaskedSettings(currentSettings, company?.timezone || 'Africa/Cairo');

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
        if (key in mergedAttendance) mergedAttendance[key] = body[key];
        if (key in mergedGeofence) mergedGeofence[key] = body[key];
        if (key in mergedPayroll) mergedPayroll[key] = body[key];
        if (key in mergedLeaves) mergedLeaves[key] = body[key];
      }
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
      lateGracePeriod: Number(mergedAttendance.lateGracePeriod || mergedAttendance.lateThreshold || 15),
      lateThresholdMinutes: Number(mergedAttendance.lateThresholdMinutes || 10),
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

    const freshSettings = await readHRSettingsCompat(prisma, companyId, runtimeColumns);
    const freshCompany = await prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });

    await logExternalApiAction(req, {
      action: 'UPDATE_SETTINGS',
      description: `Updated HR Settings with section merge`,
      targetType: 'HRSettings',
      targetId: freshSettings?.id || companyId,
      targetName: 'HR Settings'
    });

    const maskedOutput = formatMaskedSettings(freshSettings, freshCompany?.timezone || 'Africa/Cairo');

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
        createdBy: req.externalApiCredential?.id || 'EXTERNAL_API'
      }
    });

    await logExternalApiAction(req, {
      action: 'CREATE_DEDUCTION',
      description: `Created manual deduction of ${numericAmount} for employee ${code}`,
      targetType: 'ManualDeduction',
      targetId: deduction.id,
      targetName: deduction.reason,
      metadata: { amount: numericAmount, type: normalizedType, employeeId: targetEmployeeId }
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

    await logExternalApiAction(req, {
      action: 'UPDATE_DEDUCTION',
      description: `Updated deduction ${id}`,
      targetType: 'ManualDeduction',
      targetId: updated.id,
      targetName: updated.reason,
      metadata: updateData
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
        approvedBy: normalizedStatus === 'APPROVED' ? (req.externalApiCredential?.id || 'EXTERNAL_API') : null
      }
    });

    await logExternalApiAction(req, {
      action: 'CREATE_REWARD',
      description: `Created reward "${reward.rewardName}" with value ${rewardAmount} for employee ${targetUser.employeeNumber || targetUser.id}`,
      targetType: 'RewardRecord',
      targetId: reward.id,
      targetName: reward.rewardName,
      metadata: { amount: rewardAmount, category: normalizedCategory, userId: targetUser.id }
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

    await logExternalApiAction(req, {
      action: 'CREATE_SHIFT',
      description: `Created shift ${shift.name} (${shift.startTime}-${shift.endTime})`,
      targetType: 'Shift',
      targetId: shift.id,
      targetName: shift.name
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

    await logExternalApiAction(req, {
      action: 'UPDATE_SHIFT',
      description: `Updated shift ${updated.name}`,
      targetType: 'Shift',
      targetId: updated.id,
      targetName: updated.name
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

    await logExternalApiAction(req, {
      action: 'ASSIGN_SHIFT',
      description: `Assigned shift ${shiftId} to employee ${emp?.employeeNumber || user?.employeeNumber || id} on ${date}`,
      targetType: 'ShiftAssignment',
      targetId: assignment.id,
      targetName: `Shift Assignment`
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
    const { checkIn, checkOut, status, notes, lateMinutes, earlyLeaveMinutes, workMode } = req.body || {};

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

    await logExternalApiAction(req, {
      action: 'UPDATE_ATTENDANCE',
      description: `Corrected attendance record ${id}`,
      targetType: 'Attendance',
      targetId: updated.id,
      targetName: `Attendance Record ${id}`,
      metadata: { checkIn, checkOut, status, lateMinutes }
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

module.exports = {
  listEmployees,
  getEmployeeById,
  upsertEmployee,
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
  listShifts,
  createShift,
  updateShift,
  assignEmployeeShift,
  updateAttendanceRecord
};
