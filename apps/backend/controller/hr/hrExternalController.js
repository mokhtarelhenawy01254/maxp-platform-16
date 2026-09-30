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
  listResignations
};
