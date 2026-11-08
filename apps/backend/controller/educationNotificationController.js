const educationNotificationService = require('../services/educationNotificationService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Rate limiting in-memory store for test notifications: max 5 requests per 60 seconds per company/user
const testRateLimits = new Map();

// Periodically clean up expired rate limit entries to prevent memory leaks
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of testRateLimits.entries()) {
    const valid = timestamps.filter((t) => now - t < 60000);
    if (valid.length === 0) testRateLimits.delete(key);
    else testRateLimits.set(key, valid);
  }
}, 300000);
if (cleanupTimer?.unref) cleanupTimer.unref();

function checkTestRateLimit(key, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const timestamps = (testRateLimits.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retrySec = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retrySec: Math.max(1, retrySec) };
  }
  timestamps.push(now);
  testRateLimits.set(key, timestamps);
  return { allowed: true };
}

function resolveCompanyId(req) {
  return (
    req.user?.companyId ||
    req.user?.effectiveCompanyId ||
    req.headers['x-company-id'] ||
    req.headers['X-Company-Id'] ||
    req.query?.companyId ||
    req.body?.companyId ||
    null
  );
}

function sanitizePhone(phone) {
  return String(phone || '').trim().replace(/[\s\-\(\)]/g, '');
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const clean = sanitizePhone(phone);
  return /^\+?[0-9]{8,15}$/.test(clean);
}

function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 6) return clean;
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

const ERROR_TRANSLATIONS = {
  no_session: 'لا توجد جلسة واتساب متصلة حالياً للشركة — يرجى ربط حساب واتساب (Meta Cloud أو مسح رمز QR) من إعدادات الشركة أولاً.',
  notifications_disabled: 'إشعارات الواتساب معطلة في إعدادات المنصة للشركة.',
  module_disabled: 'إشعارات وحدة التعليم معطلة في إعدادات المنصة.',
  event_type_disabled: 'نوع الإشعار المحدد معطل في إعدادات إشعارات الواتساب.',
  invalid_phone: 'رقم الهاتف غير صالح للإرسال عبر واتساب (تأكد من كتابة الرقم بشكل صحيح).',
  no_template: 'لم يتم العثور على نص القالب للإشعار.',
  template_not_found: 'قالب واتساب المطلوب غير مسجل أو غير معتمد لدى مزود الخدمة.',
  rate_limit_exceeded: 'تم تجاوز الحد المسموح للإرسال التجريبي (5 رسائل في الدقيقة).',
  template_param_mismatch: 'متغيرات القالب لا تطابق متطلبات الواتساب.',
};

function getReadableError(result) {
  if (result?.error && typeof result.error === 'string' && result.error.length > 5 && !ERROR_TRANSLATIONS[result.error]) {
    return result.error;
  }
  const code = result?.reason || result?.errorCode || result?.error;
  return ERROR_TRANSLATIONS[code] || result?.error || result?.reason || 'فشل إرسال الإشعار عبر مزود الخدمة';
}

const getFunnel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح - يرجى تحديد الشركة' });

    const { period = 'all' } = req.query;
    const stats = await educationNotificationService.getFunnelStats(companyId, { period });
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching education funnel:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الفانل' });
  }
};

const getLogs = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح - يرجى تحديد الشركة' });

    const { eventType, limit = 50, status, search } = req.query;
    const where = { companyId };

    if (eventType) {
      const cleanEvent = String(eventType).trim();
      where.OR = [
        { rawEventType: { equals: cleanEvent, mode: 'insensitive' } },
        { rawEventType: cleanEvent },
        { rawEventType: cleanEvent.toLowerCase() },
        { rawEventType: cleanEvent.toUpperCase() },
        { rawEventType: { contains: cleanEvent, mode: 'insensitive' } },
      ];
    } else {
      where.OR = [
        { rawEventType: { startsWith: 'education', mode: 'insensitive' } },
        { rawEventType: { startsWith: 'EDUCATION' } },
        { rawEventType: { startsWith: 'education_' } },
      ];
    }

    if (status === 'success') {
      where.status = { in: ['SENT', 'DELIVERED', 'READ'] };
    } else if (status === 'failed') {
      where.status = 'FAILED';
    }

    if (search && typeof search === 'string') {
      const cleanSearch = search.trim();
      if (cleanSearch) {
        where.recipientPhone = { contains: cleanSearch };
      }
    }

    const prisma = getSharedPrismaClient();
    const data = await prisma.whatsAppNotificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 50, 200),
    });

    const maskedData = (data || []).map((log) => ({
      ...log,
      eventType: log.rawEventType || log.eventType,
      success: ['SENT', 'DELIVERED', 'READ'].includes(log.status),
      reason: log.failureReason || log.reason || null,
      recipientPhone: maskPhoneNumber(log.recipientPhone),
    }));

    res.json({ success: true, data: maskedData });
  } catch (error) {
    console.error('Error fetching education logs:', error);
    res.json({ success: true, data: [] });
  }
};

const sendTest = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح - يرجى تحديد الشركة' });

    // Rate Limiting check
    const rateLimitKey = `${companyId}:${req.user?.id || req.ip}`;
    const rateCheck = checkTestRateLimit(rateLimitKey, 5, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `تم تجاوز الحد المسموح للإرسال التجريبي (5 رسائل في الدقيقة). يرجى الانتظار ${rateCheck.retrySec} ثانية.`,
        retryAfter: rateCheck.retrySec,
      });
    }

    const { phone, eventType } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
    if (!eventType) return res.status(400).json({ success: false, error: 'نوع الإشعار مطلوب' });

    const cleanPhone = sanitizePhone(phone);
    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة رقم الهاتف غير صالحة. يرجى إدخال رقم صحيح (مثل 01012345678 أو 0512345678)',
      });
    }

    const template = educationNotificationService.NOTIFICATION_TEMPLATES[eventType];
    if (!template) return res.status(400).json({ success: false, error: 'القالب غير موجود' });

    const result = await educationNotificationService.sendEducationNotification({
      companyId,
      eventType,
      templates: template.parent || template,
      variables: {
        parentName: 'وليّ الأمر',
        studentName: 'الطالب',
        packageName: 'الباقة التجريبية',
        subjectName: 'المادة التعليمية',
        totalHours: '20',
        amountPaid: '500',
        currency: 'ج.م',
        sessionDate: new Date().toLocaleDateString('ar-EG'),
        sessionTime: '15:00',
        duration: '60',
        teacherName: 'المدرس',
        actualDuration: '60',
        remainingHours: '15',
        expiryDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString('ar-EG'),
      },
      recipientPhone: cleanPhone,
      recipientName: 'اختبار',
    });

    if (!result || result.success === false) {
      const errorMsg = getReadableError(result);
      return res.status(400).json({
        success: false,
        error: errorMsg,
        details: result,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الإشعار' });
  }
};

module.exports = { getFunnel, getLogs, sendTest };
