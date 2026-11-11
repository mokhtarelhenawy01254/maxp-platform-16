const courierPortalService = require('../services/courierPortalService');

const getCourierContext = (req) => {
  const courierId = req.user?.courierId || req.user?.id;
  const authCompanyId = req.user?.companyId || req.user?.effectiveCompanyId || null;
  if (authCompanyId) {
    if (req.company?.id && req.company.id !== authCompanyId) {
      return { courierId, companyId: null, tenantMismatch: true };
    }
    return { courierId, companyId: authCompanyId, tenantMismatch: false };
  }
  return { courierId, companyId: req.company?.id || null, tenantMismatch: false };
};

/**
 * POST /api/v1/courier-portal/login
 */
async function login(req, res) {
  try {
    const { phone, pin, companyId: rawBodyCompanyId } = req.body || {};
    const bodyCompanyId = rawBodyCompanyId ? String(rawBodyCompanyId).trim() : null;

    if (req.company?.id && bodyCompanyId && bodyCompanyId !== req.company.id) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_HOST_MISMATCH',
        message: 'تعارض في معرف الشركة مع النطاق الحالي',
      });
    }

    const targetCompanyId = req.company?.id || bodyCompanyId || null;
    const result = await courierPortalService.loginCourier({
      phone,
      pin,
      ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
    });

    if (result?.requiresCompanySelection) {
      return res.status(200).json({
        success: false,
        requiresCompanySelection: true,
        code: result.code || 'COMPANY_SELECTION_REQUIRED',
        companies: result.companies || [],
        message: 'حساب المندوب مرتبط بأكثر من شركة — اختر الشركة للمتابعة',
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    console.error('❌ [COURIER-PORTAL-CTRL] Login error:', error);
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'بيانات الدخول غير صحيحة',
      code: error.code || 'LOGIN_FAILED'
    });
  }
}

/**
 * POST /api/v1/courier-portal/logout
 */
async function logout(req, res) {
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
}

/**
 * GET /api/v1/courier-portal/me
 */
async function getMe(req, res) {
  try {
    const { courierId, companyId, tenantMismatch } = getCourierContext(req);
    if (tenantMismatch) {
      return res.status(403).json({
        success: false,
        message: 'الجلسة تخص شركة أخرى — يرجى تسجيل الدخول على هذا النطاق',
        code: 'TENANT_MISMATCH'
      });
    }
    if (!courierId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالوصول',
        code: 'UNAUTHORIZED'
      });
    }

    const result = await courierPortalService.getCourierMe(courierId, companyId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [COURIER-PORTAL-CTRL] getMe error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'تعذر جلب بيانات المندوب',
      code: error.code || 'COURIER_FETCH_FAILED'
    });
  }
}

/**
 * POST /api/v1/courier-portal/verify-link-pin
 */
async function verifyLinkPin(req, res) {
  try {
    const { runId, pin, token } = req.body || {};
    const providedToken = token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

    const result = await courierPortalService.verifyLinkPin({
      runId,
      pin,
      token: providedToken
    });

    res.json({
      success: true,
      data: result,
      message: 'تم التحقق من رمز PIN بنجاح'
    });
  } catch (error) {
    console.error('❌ [COURIER-PORTAL-CTRL] verifyLinkPin error:', error);
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'رمز PIN غير صحيح',
      code: error.code || 'PIN_VERIFICATION_FAILED'
    });
  }
}

/**
 * GET /api/v1/courier-portal/failure-reasons
 */
async function getFailureReasons(req, res) {
  try {
    const authCompanyId = req.user?.companyId || req.user?.effectiveCompanyId || null;
    if (authCompanyId && req.company?.id && req.company.id !== authCompanyId) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_MISMATCH',
        message: 'الجلسة تخص شركة أخرى — يرجى تسجيل الدخول على هذا النطاق'
      });
    }

    const headerCompanyId = req.headers?.['x-company-id'] || req.headers?.['X-Company-Id'];
    const explicitQueryOrHeader = req.query?.companyId || headerCompanyId || null;
    if (!authCompanyId && req.company?.id && explicitQueryOrHeader && String(explicitQueryOrHeader).trim() !== req.company.id) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_HOST_MISMATCH',
        message: 'تعارض في معرف الشركة مع النطاق الحالي'
      });
    }

    const companyId =
      authCompanyId ||
      req.company?.id ||
      (explicitQueryOrHeader ? String(explicitQueryOrHeader).trim() : null);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const reasons = await courierPortalService.getFailureReasons(companyId);
    res.json({
      success: true,
      data: reasons
    });
  } catch (error) {
    console.error('❌ [COURIER-PORTAL-CTRL] getFailureReasons error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'تعذر جلب أسباب التعذر'
    });
  }
}

/**
 * POST /api/v1/courier-portal/sync
 */
async function syncOffline(req, res) {
  try {
    const { courierId, companyId, tenantMismatch } = getCourierContext(req);
    if (tenantMismatch) {
      return res.status(403).json({
        success: false,
        message: 'الجلسة تخص شركة أخرى — يرجى تسجيل الدخول على هذا النطاق',
        code: 'TENANT_MISMATCH'
      });
    }
    if (!courierId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالوصول',
        code: 'UNAUTHORIZED'
      });
    }

    const events = Array.isArray(req.body) ? req.body : (req.body?.events || []);
    const result = await courierPortalService.syncOfflineEvents(companyId, courierId, events);

    res.json({
      success: true,
      data: result,
      message: 'تمت مزامنة البيانات بنجاح'
    });
  } catch (error) {
    console.error('❌ [COURIER-PORTAL-CTRL] syncOffline error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشلت عملية المزامنة'
    });
  }
}

module.exports = {
  login,
  logout,
  getMe,
  verifyLinkPin,
  getFailureReasons,
  syncOffline
};
