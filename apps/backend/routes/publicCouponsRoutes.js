const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');

const router = express.Router();

// ⚠️ مطبّقة على مستوى الـ routes وليس router.use — الـ router متركّب على
// /api/v1/public بالكامل، وأي router.use(requireCompany) هنا كان بيمنع
// كل مسارات /api/v1/public/* المركّبة بعده لو الشركة مش متحددة.
const withCompanyContext = [extractSubdomainMiddleware, requireCompany];

router.post('/coupons/validate', ...withCompanyContext, async (req, res) => {
  try {
    const companyId = req.company?.id || req.companyId;
    const { orderAmount, customerId } = req.body || {};
    const rawCode = req.body?.code || req.body?.couponCode;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد المتجر',
      });
    }

    if (!rawCode || orderAmount === undefined || orderAmount === null || orderAmount === '') {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كود الكوبون وقيمة الطلب',
      });
    }

    const parsedOrderAmount = Number(orderAmount);
    if (!Number.isFinite(parsedOrderAmount) || parsedOrderAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'قيمة الطلب غير صالحة',
      });
    }

    const prisma = await getSharedPrismaClientAsync();
    const coupon = await prisma.coupon.findFirst({
      where: {
        companyId,
        code: String(rawCode).trim().toUpperCase(),
        isActive: true,
      },
      include: {
        couponUsages: customerId
          ? {
              where: { customerId },
            }
          : false,
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'الكوبون غير صحيح أو غير نشط',
      });
    }

    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
      return res.status(400).json({
        success: false,
        error: 'الكوبون منتهي الصلاحية',
      });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'تم استنفاد عدد مرات استخدام الكوبون',
      });
    }

    if (customerId && coupon.userUsageLimit && Array.isArray(coupon.couponUsages)) {
      if (coupon.couponUsages.length >= coupon.userUsageLimit) {
        return res.status(400).json({
          success: false,
          error: 'لقد استخدمت هذا الكوبون الحد الأقصى من المرات',
        });
      }
    }

    if (coupon.minOrderAmount && parsedOrderAmount < Number(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        error: `الحد الأدنى لقيمة الطلب هو ${coupon.minOrderAmount} جنيه`,
      });
    }

    let discountAmount = 0;
    const isFreeShipping = coupon.type === 'FREE_SHIPPING';
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parsedOrderAmount * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === 'FIXED' || coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Number(coupon.value);
    }

    discountAmount = Math.max(0, Math.min(parsedOrderAmount, Number(discountAmount.toFixed(2))));

    return res.json({
      success: true,
      discount: discountAmount,
      discountAmount,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
        },
        discountAmount,
        discount: discountAmount,
        isFreeShipping,
        finalAmount: Number((parsedOrderAmount - discountAmount).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('❌ [PUBLIC-COUPONS] Error validating coupon:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في التحقق من الكوبون',
    });
  }
});

module.exports = router;
