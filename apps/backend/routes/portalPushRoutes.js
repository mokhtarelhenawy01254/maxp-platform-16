const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const browserPushService = require('../services/browserPushService');
const tenantContext = require('../services/tenantContext');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');
const sharedDatabase = require('../services/sharedDatabase');
const { getJwtSecret, isMissingAuthSecretError } = require('../utils/jwtSecret');

const TENANT_MISMATCH_MESSAGE = 'الجلسة تخص مؤسسة أخرى';

const getPrismaClient = async () => {
  if (typeof sharedDatabase.getSharedPrismaClientAsync === 'function') {
    return sharedDatabase.getSharedPrismaClientAsync();
  }
  return sharedDatabase.getSharedPrismaClient();
};

const extractBearerToken = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader !== 'string' || !authHeader.trim()) {
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length >= 2 && /^bearer$/i.test(parts[0])) {
    return parts[1].trim() || null;
  }

  return null;
};

/**
 * Resolve company context from Host / x-subdomain while ignoring any spoofable
 * companyId passed in the JSON request body on portal push endpoints.
 */
const resolvePortalTenantHost = (req, res, next) => {
  if (req.company?.id) {
    return next();
  }

  const originalBody = req.body;
  if (
    originalBody &&
    typeof originalBody === 'object' &&
    Object.prototype.hasOwnProperty.call(originalBody, 'companyId')
  ) {
    const sanitizedBody = { ...originalBody };
    delete sanitizedBody.companyId;
    req.body = sanitizedBody;
    return extractSubdomainMiddleware(req, res, (err) => {
      req.body = originalBody;
      return next(err);
    });
  }

  return extractSubdomainMiddleware(req, res, next);
};

const findUserRecord = async (prisma, userId) => {
  if (!prisma?.user) return null;
  if (typeof prisma.user.findFirst === 'function') {
    return prisma.user.findFirst({
      where: { id: String(userId) },
      select: { id: true, companyId: true, isActive: true },
    });
  }
  if (typeof prisma.user.findUnique === 'function') {
    return prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, companyId: true, isActive: true },
    });
  }
  return null;
};

const authenticateAnyPortalOrStaffToken = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'رمز المصادقة مطلوب',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (isMissingAuthSecretError(error)) {
      return res.status(500).json({
        success: false,
        code: 'AUTH_CONFIGURATION_ERROR',
        message: 'إعدادات المصادقة غير مكتملة',
      });
    }
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'رمز المصادقة غير صحيح',
    });
  }

  const role = String(decoded?.role || '').trim().toUpperCase();
  const decodedCompanyId = decoded?.companyId || decoded?.effectiveCompanyId || null;

  if (
    req.company?.id &&
    decodedCompanyId &&
    String(req.company.id) !== String(decodedCompanyId)
  ) {
    return res.status(403).json({
      success: false,
      code: 'TENANT_MISMATCH',
      message: TENANT_MISMATCH_MESSAGE,
    });
  }

  const effectiveCompanyId = decodedCompanyId
    ? String(decodedCompanyId)
    : req.company?.id
      ? String(req.company.id)
      : null;

  try {
    let portalActor = null;

    if (role === 'STUDENT') {
      const studentPhone = decoded?.studentPhone || decoded?.phone || null;
      const actorId =
        decoded?.id ||
        decoded?.userId ||
        (studentPhone ? `student_${String(studentPhone).trim()}` : null);

      if (!actorId || !effectiveCompanyId) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN_PAYLOAD',
          message: 'بيانات جلسة الطالب غير مكتملة',
        });
      }

      portalActor = {
        companyId: effectiveCompanyId,
        actorType: 'STUDENT',
        actorId: String(actorId),
        role: decoded.role,
      };
    } else {
      const prisma = await getPrismaClient();

      if (role === 'PARENT') {
        const parentId = decoded?.parentId || decoded?.id;
        if (!parentId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.customer.findFirst({
          where: { id: String(parentId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, status: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (record.status === 'BLOCKED' || record.status === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'PARENT',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'TEACHER') {
        const teacherId = decoded?.teacherId || decoded?.id;
        if (!teacherId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.educationTeacher.findFirst({
          where: { id: String(teacherId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, isActive: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (!record.isActive) {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'TEACHER',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'PATIENT') {
        const patientId = decoded?.patientId || decoded?.id;
        if (!patientId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.patient.findFirst({
          where: { id: String(patientId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, isActive: true, status: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (record.isActive === false || record.status === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'PATIENT',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'DOCTOR') {
        const doctorId = decoded?.doctorId || decoded?.id;
        if (!doctorId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.bookingDoctor.findFirst({
          where: { id: String(doctorId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, isActive: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (!record.isActive) {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'DOCTOR',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'DENTAL_DOCTOR' || role === 'DENTIST') {
        const dentistId = decoded?.dentistId || decoded?.id;
        if (!dentistId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.dentalLabDoctor.findFirst({
          where: { id: String(dentistId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, isActive: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (!record.isActive) {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'DENTIST',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'COURIER') {
        const courierId = decoded?.courierId || decoded?.id || decoded?.userId;
        if (!courierId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.courier.findFirst({
          where: { id: String(courierId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, isActive: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (!record.isActive) {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'COURIER',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else if (role === 'CUSTOMER') {
        const customerId = decoded?.customerId || decoded?.userId || decoded?.id;
        if (!customerId || !effectiveCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const record = await prisma.customer.findFirst({
          where: { id: String(customerId), companyId: effectiveCompanyId },
          select: { id: true, companyId: true, status: true },
        });
        if (!record) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'الحساب غير موجود',
          });
        }
        if (record.status === 'BLOCKED' || record.status === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        portalActor = {
          companyId: String(record.companyId || effectiveCompanyId),
          actorType: 'CUSTOMER',
          actorId: String(record.id),
          role: decoded.role,
        };
      } else {
        const staffId = decoded?.userId || decoded?.id;
        if (!staffId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'رمز المصادقة غير صحيح',
          });
        }

        const user = await findUserRecord(prisma, staffId);
        if (!user) {
          return res.status(401).json({
            success: false,
            code: 'ACTOR_NOT_FOUND',
            message: 'المستخدم غير موجود',
          });
        }
        if (user.isActive === false) {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_INACTIVE',
            message: 'الحساب غير نشط',
          });
        }

        const resolvedStaffCompanyId = effectiveCompanyId || user.companyId;
        if (!resolvedStaffCompanyId) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'معرف المؤسسة غير متاح',
          });
        }
        if (
          req.company?.id &&
          String(req.company.id) !== String(resolvedStaffCompanyId)
        ) {
          return res.status(403).json({
            success: false,
            code: 'TENANT_MISMATCH',
            message: TENANT_MISMATCH_MESSAGE,
          });
        }

        portalActor = {
          companyId: String(resolvedStaffCompanyId),
          actorType: 'USER',
          actorId: String(user.id),
          role: decoded?.role || 'USER',
        };
      }
    }

    req.portalActor = portalActor;
    req.companyId = portalActor.companyId;
    return tenantContext.run(portalActor.companyId, () => next());
  } catch (error) {
    console.error('❌ [PORTAL-PUSH] Authentication resolution error:', error);
    return res.status(500).json({
      success: false,
      code: 'AUTHENTICATION_ERROR',
      message: 'خطأ في التحقق من الجلسة',
    });
  }
};

router.use(resolvePortalTenantHost);

router.get('/public-key', (_req, res) => {
  try {
    let publicKey = null;
    if (typeof browserPushService.getPortalPushPublicKey === 'function') {
      publicKey = browserPushService.getPortalPushPublicKey();
    } else {
      try {
        publicKey = browserPushService.getBrowserPushPublicKey();
      } catch (_) {
        publicKey = null;
      }
    }

    return res.json({
      success: true,
      data: {
        configured: Boolean(publicKey),
        publicKey: publicKey || null,
      },
    });
  } catch (error) {
    console.error('❌ [PORTAL-PUSH] Error reading public VAPID key:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تجهيز مفتاح الإشعارات',
    });
  }
});

router.post('/subscribe', authenticateAnyPortalOrStaffToken, async (req, res) => {
  try {
    const { companyId, actorType, actorId } = req.portalActor;
    const {
      platform = 'WEB_PUSH',
      subscription,
      fcmToken,
      userAgent,
    } = req.body || {};

    const record = await browserPushService.upsertPortalPushSubscription({
      companyId,
      actorType,
      actorId,
      platform,
      subscription,
      fcmToken,
      userAgent: userAgent || req.get('User-Agent') || null,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: record.id,
        actorType: record.actorType || actorType,
        platform: record.platform || browserPushService.normalizePortalPlatform(platform),
      },
    });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error('❌ [PORTAL-PUSH] Subscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تفعيل الإشعارات الفورية',
    });
  }
});

router.post('/unsubscribe', authenticateAnyPortalOrStaffToken, async (req, res) => {
  try {
    const { companyId, actorType, actorId } = req.portalActor;
    const { endpoint, fcmToken } = req.body || {};

    const result = await browserPushService.deactivatePortalPushSubscription({
      companyId,
      actorType,
      actorId,
      endpoint,
      fcmToken,
    });

    return res.json({
      success: true,
      data: {
        updated: result?.count ?? 0,
      },
    });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error('❌ [PORTAL-PUSH] Unsubscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر إيقاف الإشعارات الفورية',
    });
  }
});

router.post('/test', authenticateAnyPortalOrStaffToken, async (req, res) => {
  try {
    const { companyId, actorType, actorId } = req.portalActor;
    const {
      title = 'إشعار تجريبي',
      body = 'تم تفعيل الإشعارات الفورية بنجاح على هذا الجهاز.',
      url = '/',
      data = {},
      tag,
    } = req.body || {};

    const result = await browserPushService.sendToPortalActor({
      companyId,
      actorType,
      actorId,
      typeId: 'portal_test',
      title,
      body,
      url,
      data,
      tag,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [PORTAL-PUSH] Test push error:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر إرسال الإشعار التجريبي',
    });
  }
});

module.exports = router;
module.exports.authenticateAnyPortalOrStaffToken = authenticateAnyPortalOrStaffToken;
module.exports.resolvePortalTenantHost = resolvePortalTenantHost;
