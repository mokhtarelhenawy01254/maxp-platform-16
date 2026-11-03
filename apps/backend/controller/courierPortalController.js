const courierPortalService = require('../services/courierPortalService');

const getCourierContext = (req) => {
  const courierId = req.user?.courierId || req.user?.id;
  const companyId = req.user?.companyId || req.user?.effectiveCompanyId || req.headers['x-company-id'];
  return { courierId, companyId };
};

/**
 * POST /api/v1/courier-portal/login
 */
async function login(req, res) {
  try {
    const { phone, pin } = req.body || {};
    const result = await courierPortalService.loginCourier({ phone, pin });
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
    const { courierId, companyId } = getCourierContext(req);
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
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId || req.query.companyId || req.headers['x-company-id'];
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
    const { courierId, companyId } = getCourierContext(req);
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
