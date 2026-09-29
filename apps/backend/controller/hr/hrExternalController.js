/**
 * 🌐 External HR Controller
 * معالج الطلبات الخارجية لأنظمة ERP وأجهزة البصمة وأدوات الذكاء الاصطناعي
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  dispatchHrWebhook,
  generateHrApiKey,
  normalizeScopes,
  HR_WEBHOOK_EVENTS
} = require('../../services/hrIntegrationService');

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
          status: status || existing.status,
          hireDate: hireDate ? new Date(hireDate) : existing.hireDate
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
          status,
          hireDate: hireDate ? new Date(hireDate) : new Date()
        }
      });
    }

    // Trigger Outbound Webhook
    dispatchHrWebhook(
      companyId,
      isCreated ? 'hr.employee.created' : 'hr.employee.updated',
      { employeeId: employee.id, employeeNumber: employee.employeeNumber, status: employee.status }
    );

    return res.status(isCreated ? 201 : 200).json({
      success: true,
      data: employee,
      action: isCreated ? 'CREATED' : 'UPDATED'
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.upsertEmployee] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
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

      const punchDate = new Date(punchTime);
      const dayStart = new Date(punchDate);
      dayStart.setUTCHours(0, 0, 0, 0);

      try {
        const attendance = await prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: employee.userId,
              date: dayStart
            }
          }
        });

        const isCheckIn = type.toUpperCase() === 'CHECK_IN';

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
          type,
          deviceId: deviceId || 'EXTERNAL'
        });
      } catch (err) {
        results.failed++;
        results.errors.push({ punch, error: err.message });
      }
    }

    return res.json({
      success: true,
      summary: results
    });
  } catch (error) {
    console.error('❌ [ExternalHrController.recordPunchesBatch] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * 5. استعلام حضور اليوم (Today Attendance Status for AI / Dashboards)
 */
const getTodayAttendance = async (req, res) => {
  try {
    const { companyId } = req;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

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
        }
      }
    });

    return res.json({
      success: true,
      date: targetDate.toISOString().slice(0, 10),
      count: records.length,
      data: records
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leaveRequest.create({
      data: {
        companyId,
        userId: employee.userId,
        type,
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

    return res.status(201).json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ [ExternalHrController.createLeaveRequest] Error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
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
  revokeApiCredential
};
