const sharedDatabase = require('./sharedDatabase');

/**
 * Education Audit Service
 * Central audit logging engine for all events occurring in the Educational System.
 * Records actions into the ActivityLog table with category = 'EDUCATION'.
 */

// Mapping of action types to Arabic descriptions and severity levels
const ACTION_DEFINITIONS = {
  // Subjects
  CREATE_SUBJECT: { label: 'إضافة مادة دراسية', severity: 'LOW', entity: 'SUBJECT' },
  UPDATE_SUBJECT: { label: 'تعديل مادة دراسية', severity: 'LOW', entity: 'SUBJECT' },
  DELETE_SUBJECT: { label: 'حذف مادة دراسية', severity: 'MEDIUM', entity: 'SUBJECT' },

  // Packages
  CREATE_PACKAGE: { label: 'إنشاء باقة حصص', severity: 'LOW', entity: 'PACKAGE' },
  UPDATE_PACKAGE: { label: 'تعديل باقة حصص', severity: 'LOW', entity: 'PACKAGE' },
  DELETE_PACKAGE: { label: 'حذف باقة حصص', severity: 'MEDIUM', entity: 'PACKAGE' },

  // Students
  CREATE_STUDENT: { label: 'تسجيل طالب جديد', severity: 'LOW', entity: 'STUDENT' },
  UPDATE_STUDENT: { label: 'تعديل بيانات طالب', severity: 'LOW', entity: 'STUDENT' },
  DELETE_STUDENT: { label: 'حذف طالب', severity: 'HIGH', entity: 'STUDENT' },

  // Teachers / Instructors
  CREATE_TEACHER: { label: 'إضافة مدرس/معلم', severity: 'LOW', entity: 'TEACHER' },
  UPDATE_TEACHER: { label: 'تحديث بيانات مدرس/معلم', severity: 'LOW', entity: 'TEACHER' },
  DELETE_TEACHER: { label: 'حذف مدرس/معلم', severity: 'HIGH', entity: 'TEACHER' },
  UPDATE_TEACHER_AVAILABILITY: { label: 'تحديث جدول توفر المدرس/المعلم', severity: 'LOW', entity: 'TEACHER' },
  TEACHER_LOGIN: { label: 'تسجيل دخول مدرس/معلم', severity: 'LOW', entity: 'PORTAL' },

  // Enrollments
  CREATE_ENROLLMENT: { label: 'تسجيل اشتراك جديد', severity: 'MEDIUM', entity: 'ENROLLMENT' },
  UPDATE_ENROLLMENT: { label: 'تعديل اشتراك طالب', severity: 'LOW', entity: 'ENROLLMENT' },
  DELETE_ENROLLMENT: { label: 'إلغاء اشتراك طالب', severity: 'HIGH', entity: 'ENROLLMENT' },

  // Sessions
  SCHEDULE_SESSION: { label: 'جدولة حصة جديدة', severity: 'LOW', entity: 'SESSION' },
  UPDATE_SESSION: { label: 'تعديل موعد/بيانات حصة', severity: 'LOW', entity: 'SESSION' },
  CONFIRM_SESSION: { label: 'تأكيد إتمام الحصة', severity: 'MEDIUM', entity: 'SESSION' },
  CANCEL_SESSION: { label: 'إلغاء حصة دراسية', severity: 'MEDIUM', entity: 'SESSION' },
  DELETE_SESSION: { label: 'حذف حصة دراسية', severity: 'HIGH', entity: 'SESSION' },

  // Teacher Payments / Salaries
  CREATE_PAYMENT: { label: 'إنشاء مسير استحقاق مدرس/معلم', severity: 'MEDIUM', entity: 'PAYMENT' },
  PAY_TEACHER: { label: 'صرف مرتب/استحقاق مدرس/معلم', severity: 'HIGH', entity: 'PAYMENT' },
  CANCEL_PAYMENT: { label: 'إلغاء استحقاق مالي', severity: 'MEDIUM', entity: 'PAYMENT' },

  // Portals & Guardians
  PARENT_LOGIN: { label: 'تسجيل دخول ولي أمر', severity: 'LOW', entity: 'PORTAL' },
  PARENT_SESSION_REQUEST: { label: 'طلب حجز حصة من ولي الأمر', severity: 'LOW', entity: 'SESSION' },
  PARENT_ENROLL: { label: 'اشتراك باقة من ولي الأمر', severity: 'MEDIUM', entity: 'ENROLLMENT' },

  // Notifications & Funnel
  SEND_NOTIFICATION: { label: 'إرسال إشعار تعليمي', severity: 'LOW', entity: 'NOTIFICATION' },
  DISPATCH_REMINDER: { label: 'إرسال تذكير بالحصة', severity: 'LOW', entity: 'NOTIFICATION' },
  FUNNEL_UPDATE: { label: 'تحديث إعدادات الفانل التعليمي', severity: 'LOW', entity: 'FUNNEL' },

  // Settings
  UPDATE_EDUCATION_SETTINGS: { label: 'تحديث إعدادات النظام التعليمي', severity: 'MEDIUM', entity: 'SETTINGS' },

  // Demo Day (Events & Leads)
  CREATE_DEMO_DAY: { label: 'إنشاء فعالية ديمو داي', severity: 'LOW', entity: 'DEMO_DAY' },
  UPDATE_DEMO_DAY: { label: 'تعديل فعالية ديمو داي', severity: 'LOW', entity: 'DEMO_DAY' },
  DELETE_DEMO_DAY: { label: 'حذف فعالية ديمو داي', severity: 'MEDIUM', entity: 'DEMO_DAY' },
  REGISTER_DEMO_ATTENDEE: { label: 'تسجيل حاضر في الديمو داي', severity: 'LOW', entity: 'DEMO_DAY' },
  UPDATE_DEMO_ATTENDEE: { label: 'تحديث حالة حاضر في الديمو داي', severity: 'LOW', entity: 'DEMO_DAY' },
  CONVERT_DEMO_LEAD: { label: 'تحويل عميل محتمل من الديمو داي لطالب', severity: 'MEDIUM', entity: 'DEMO_DAY' },

  // AI & Automation
  AI_ACTION: { label: 'إجراء آلي من المساعد الذكي', severity: 'LOW', entity: 'AI_AGENT' },
};

/**
 * Parse client IP safely
 */
function extractClientIp(req) {
  if (!req) return null;
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    'Unknown'
  );
}

/**
 * Log an event in the Education Module
 */
async function logEducationEvent({
  companyId,
  userId = null,
  userName = null,
  userRole = null,
  action,
  entityType = null,
  entityId = null,
  entityName = null,
  description = null,
  details = null,
  severity = null,
  isSuccess = true,
  errorMessage = null,
  req = null,
  actorType = 'USER', // 'USER' | 'TEACHER' | 'PARENT' | 'AI_AGENT' | 'SYSTEM'
}) {
  try {
    if (!companyId) return null;

    const def = ACTION_DEFINITIONS[action] || {};
    const finalEntityType = entityType || def.entity || 'EDUCATION';
    const finalSeverity = severity || def.severity || 'LOW';

    // Resolve user info from req if available
    let resolvedUserId = userId;
    let resolvedUserName = userName;
    let resolvedUserRole = userRole;

    if (req?.user) {
      resolvedUserId = resolvedUserId || req.user.id;
      resolvedUserName =
        resolvedUserName ||
        req.user.name ||
        [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') ||
        req.user.email ||
        'مستخدم النظام';
      resolvedUserRole = resolvedUserRole || req.user.role || 'USER';
    }

    // Default human-readable description if not provided
    let finalDescription = description;
    if (!finalDescription) {
      const actionLabel = def.label || action;
      if (entityName) {
        finalDescription = `${actionLabel}: ${entityName}`;
      } else {
        finalDescription = actionLabel;
      }
    }

    // Prepare metadata
    const metadata = {
      actor: {
        id: resolvedUserId,
        name: resolvedUserName || 'النظام',
        role: resolvedUserRole || 'SYSTEM',
        type: actorType,
      },
      entityType: finalEntityType,
      entityId: entityId ? String(entityId) : null,
      entityName: entityName ? String(entityName) : null,
      details: details || null,
      client: req ? {
        ip: extractClientIp(req),
        userAgent: req.headers?.['user-agent'] || null,
        method: req.method,
        path: req.originalUrl || req.url,
      } : null,
      timestamp: new Date().toISOString(),
    };

    const tags = ['education', finalEntityType.toLowerCase(), (action || '').toLowerCase()];

    const prisma = sharedDatabase.getSharedPrismaClient();
    const createdLog = await prisma.activityLog.create({
      data: {
        userId: resolvedUserId,
        companyId,
        category: 'EDUCATION',
        action: action || 'EDUCATION_ACTIVITY',
        description: finalDescription,
        targetType: finalEntityType,
        targetId: entityId ? String(entityId) : null,
        targetName: entityName ? String(entityName) : null,
        metadata: JSON.stringify(metadata),
        severity: finalSeverity,
        isSuccess,
        errorMessage: errorMessage ? String(errorMessage) : null,
        tags: JSON.stringify(tags),
      },
    });

    return createdLog;
  } catch (err) {
    // Audit logging failure should NEVER crash user flow, but log for diagnosis
    console.error('[EducationAuditService] Failed to record audit log:', err.message);
    return null;
  }
}

/**
 * Query education logs with pagination & filters
 */
async function getEducationLogs({
  companyId,
  page = 1,
  limit = 25,
  search = '',
  action = '',
  targetType = '',
  severity = '',
  startDate = '',
  endDate = '',
  userId = '',
  isSuccess = undefined,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

  // Multi-tenant defense in depth: reject any query missing companyId
  if (!companyId) {
    return {
      logs: [],
      pagination: { total: 0, page: pageNum, limit: pageSize, totalPages: 0 },
    };
  }

  const prisma = sharedDatabase.getSharedPrismaClient();
  const skip = (pageNum - 1) * pageSize;

  const where = {
    companyId,
    category: 'EDUCATION',
  };

  if (action && action !== 'ALL') {
    where.action = action;
  }

  if (targetType && targetType !== 'ALL') {
    where.targetType = targetType;
  }

  if (severity && severity !== 'ALL') {
    where.severity = severity;
  }

  if (userId) {
    where.userId = userId;
  }

  if (isSuccess !== undefined && isSuccess !== null && isSuccess !== '') {
    where.isSuccess = isSuccess === 'true' || isSuccess === true;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { targetName: { contains: q, mode: 'insensitive' } },
      { action: { contains: q, mode: 'insensitive' } },
      { metadata: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [rawLogs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const logs = rawLogs.map((log) => {
    let parsedMetadata = null;
    let parsedTags = null;
    try {
      parsedMetadata = log.metadata ? JSON.parse(log.metadata) : null;
    } catch {
      parsedMetadata = null;
    }
    try {
      parsedTags = log.tags ? JSON.parse(log.tags) : null;
    } catch {
      parsedTags = null;
    }

    return {
      ...log,
      metadata: parsedMetadata,
      tags: parsedTags,
      actorName:
        parsedMetadata?.actor?.name ||
        (log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : null) ||
        log.user?.email ||
        'مستخدم غير معروف',
      actorRole: parsedMetadata?.actor?.role || log.user?.role || 'SYSTEM',
      actorType: parsedMetadata?.actor?.type || 'USER',
      actorAvatar: log.user?.avatar || null,
    };
  });

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

/**
 * Get aggregate statistics for Education logs
 */
async function getEducationLogsStats(companyId) {
  if (!companyId) {
    return {
      totalLogs: 0,
      todayLogs: 0,
      weekLogs: 0,
      targetTypeCounts: {},
      actionCounts: {},
      recent: [],
    };
  }

  const prisma = sharedDatabase.getSharedPrismaClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere = { companyId, category: 'EDUCATION' };

  const [totalLogs, todayLogs, weekLogs, targetTypeGroups, actionGroups, recentRaw] = await Promise.all([
    prisma.activityLog.count({ where: baseWhere }),
    prisma.activityLog.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
    prisma.activityLog.count({ where: { ...baseWhere, createdAt: { gte: sevenDaysAgo } } }),
    prisma.activityLog.groupBy({
      by: ['targetType'],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.activityLog.groupBy({
      by: ['action'],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.activityLog.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      },
    }),
  ]);

  const targetTypeCounts = {};
  targetTypeGroups.forEach((g) => {
    if (g.targetType) targetTypeCounts[g.targetType] = g._count.id;
  });

  const actionCounts = {};
  actionGroups.forEach((g) => {
    if (g.action) actionCounts[g.action] = g._count.id;
  });

  const recent = recentRaw.map((r) => {
    let parsedMetadata = null;
    try {
      parsedMetadata = r.metadata ? JSON.parse(r.metadata) : null;
    } catch {}
    return {
      id: r.id,
      action: r.action,
      description: r.description,
      targetType: r.targetType,
      targetName: r.targetName,
      createdAt: r.createdAt,
      actorName:
        parsedMetadata?.actor?.name ||
        (r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() : null) ||
        r.user?.email ||
        'مستخدم',
      isSuccess: r.isSuccess,
    };
  });

  return {
    totalLogs,
    todayLogs,
    weekLogs,
    targetTypeCounts,
    actionCounts,
    recent,
  };
}

/**
 * Generate CSV export for education logs
 */
async function exportEducationLogsCsv(companyId, filters = {}) {
  if (!companyId) return '\uFEFF';
  const { logs } = await getEducationLogs({
    companyId,
    page: 1,
    limit: 5000,
    ...filters,
  });

  // UTF-8 BOM so Excel opens Arabic correctly
  let csv = '\uFEFF';
  csv += 'التاريخ والوقت,نوع الإجراء,القسم,العنصر المستهدف,الوصف,المنفذ,الدور,الحالة,مستوى الأهمية,عنوان IP\n';

  // Helper to prevent CSV formula injection (=, +, -, @, tab, newline)
  const sanitizeCsvField = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return str.replace(/"/g, '""');
  };

  logs.forEach((log) => {
    const dateStr = new Date(log.createdAt).toLocaleString('ar-EG');
    const actionLabel = sanitizeCsvField(ACTION_DEFINITIONS[log.action]?.label || log.action);
    const targetType = sanitizeCsvField(log.targetType || 'عام');
    const targetName = sanitizeCsvField(log.targetName || '');
    const description = sanitizeCsvField(log.description || '');
    const actor = sanitizeCsvField(log.actorName || '');
    const role = sanitizeCsvField(log.actorRole || '');
    const status = log.isSuccess ? 'ناجح' : 'فشل';
    const severity = sanitizeCsvField(log.severity || 'LOW');
    const ip = sanitizeCsvField(log.metadata?.client?.ip || '');

    csv += `"${dateStr}","${actionLabel}","${targetType}","${targetName}","${description}","${actor}","${role}","${status}","${severity}","${ip}"\n`;
  });

  return csv;
}

module.exports = {
  ACTION_DEFINITIONS,
  logEducationEvent,
  getEducationLogs,
  getEducationLogsStats,
  exportEducationLogsCsv,
};
