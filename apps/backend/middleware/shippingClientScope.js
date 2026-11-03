/**
 * Shipping Client Scope Middleware (SHIP-W2C)
 * 
 * Ensures the authenticated user is linked to an active Merchant belonging
 * to the same company, verifies client portal is enabled, sets req.shippingClientId,
 * and forbids passing a different merchantId in body or query.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getPolicy } = require('../services/shipping/policyService');

const shippingClientScope = async (req, res, next) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح: جلسة المستخدم غير صالحة',
      });
    }

    const prisma = getSharedPrismaClient();

    // 1. Resolve merchantId from req.user or database
    let merchantId = req.user.merchantId;
    if (!merchantId && req.user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { merchantId: true, role: true },
      });
      if (dbUser?.merchantId) {
        merchantId = dbUser.merchantId;
        req.user.merchantId = merchantId;
      }
    }

    if (!merchantId) {
      return res.status(403).json({
        success: false,
        message: 'حساب المستخدم غير مربوط بسجل عميل شحن (merchantId مفقود)',
      });
    }

    // 2. Verify merchant exists, belongs to same company, and is active
    const merchant = await prisma.merchant.findFirst({
      where: {
        id: merchantId,
        companyId: req.user.companyId,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        defaultWarehouseId: true,
      },
    });

    if (!merchant) {
      return res.status(403).json({
        success: false,
        message: 'سجل عميل الشحن غير موجود في هذه الشركة',
      });
    }

    if (!merchant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'حساب العميل موقوف حالياً، يرجى التواصل مع إدارة شركة الشحن',
      });
    }

    // 3. Verify client portal is enabled in shipping policy
    const policy = await getPolicy(req.user.companyId, prisma);
    if (policy && policy.clientPortalEnabled === false) {
      return res.status(403).json({
        success: false,
        code: 'PORTAL_DISABLED',
        message: 'بوابة عملاء الشحن معطلة حالياً من قِبل إدارة الشركة',
      });
    }

    // 4. Forbid different merchantId in query or body
    if (req.query && req.query.merchantId && String(req.query.merchantId) !== String(merchant.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول إلى بيانات عميل آخر',
      });
    }

    if (req.body && req.body.merchantId && String(req.body.merchantId) !== String(merchant.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بإنشاء أو تعديل بيانات لحساب عميل آخر',
      });
    }

    // 5. Auto-bind shippingClientId and force body.merchantId
    req.shippingClientId = merchant.id;
    req.merchant = merchant;

    if (req.body && typeof req.body === 'object') {
      req.body.merchantId = merchant.id;
    }

    next();
  } catch (error) {
    console.error('[shippingClientScope] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من نطاق عميل الشحن',
      error: error.message,
    });
  }
};

module.exports = shippingClientScope;
