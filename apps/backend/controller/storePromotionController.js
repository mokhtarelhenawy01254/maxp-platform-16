const { safeQuery, initializeSharedDatabase } = require('../services/sharedDatabase');
const { calculateDiscount, parseTiers } = require('../utils/storePromotionUtils');
const redisCacheService = require('../services/redisCacheService');

function isPrismaConnectionError(error) {
  const msg = String(error?.message || '');
  return msg.includes('Engine is not yet connected') ||
    msg.includes('Response from the Engine was empty') ||
    msg.includes('PrismaClientInitializationError') ||
    msg.includes('PrismaClientRustPanicError') ||
    (typeof error?.code === 'string' && error.code.startsWith('P1'));
}

async function safePromotionQuery(operation, label = 'unknown') {
  try {
    return await safeQuery(operation);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn(`⚠️ [STORE-PROMOTION] Prisma connection error (${label}). Reinitializing and retrying...`);
      await initializeSharedDatabase();
      return await safeQuery(operation);
    }
    throw error;
  }
}

exports.getPromotion = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }
    let promotion = await safePromotionQuery(
      (p) => p.storePromotion.findUnique({ where: { companyId } }),
      'findUnique'
    );
    if (!promotion) {
      promotion = {
        companyId,
        isActive: false,
        title: '',
        tiers: '[]',
        startDate: null,
        endDate: null,
      };
    }
    return res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    console.error('❌ [STORE-PROMOTION] Error fetching:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات العرض',
      error: error.message,
    });
  }
};

exports.upsertPromotion = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }
    const { isActive, title, tiers, disableOtherDiscounts, startDate, endDate, barVisible, barSticky, barPages } = req.body;
    const validatedTiers = parseTiers(tiers);
    if (isActive && validatedTiers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تفعيل عرض بدون مستويات خصم صحيحة',
      });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
      });
    }
    const promotion = await safePromotionQuery(
      (p) => p.storePromotion.upsert({
        where: { companyId },
        create: {
          companyId,
          isActive: Boolean(isActive),
          title: String(title || ''),
          tiers: JSON.stringify(validatedTiers),
          disableOtherDiscounts: Boolean(disableOtherDiscounts),
          barVisible: barVisible !== false,
          barSticky: Boolean(barSticky),
          barPages: String(barPages || 'all'),
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
        update: {
          isActive: Boolean(isActive),
          title: String(title || ''),
          tiers: JSON.stringify(validatedTiers),
          disableOtherDiscounts: Boolean(disableOtherDiscounts),
          barVisible: barVisible !== false,
          barSticky: Boolean(barSticky),
          barPages: String(barPages || 'all'),
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      }),
      'upsert'
    );
    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (cacheErr) {
      console.warn('⚠️ [STORE-PROMOTION] Could not invalidate storefront settings cache:', cacheErr);
    }
    return res.status(200).json({
      success: true,
      message: 'تم حفظ العرض بنجاح',
      data: promotion,
    });
  } catch (error) {
    console.error('❌ [STORE-PROMOTION] Error upserting:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حفظ العرض',
      error: error.message,
    });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }
    await safePromotionQuery(
      (p) => p.storePromotion.deleteMany({ where: { companyId } }),
      'deleteMany'
    );
    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (cacheErr) {
      console.warn('⚠️ [STORE-PROMOTION] Could not invalidate storefront settings cache:', cacheErr);
    }
    return res.status(200).json({
      success: true,
      message: 'تم حذف العرض بنجاح',
    });
  } catch (error) {
    console.error('❌ [STORE-PROMOTION] Error deleting:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف العرض',
      error: error.message,
    });
  }
};

exports.getPublicPromotion = async (req, res) => {
  try {
    const companyId = req.company?.id || req.params?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }
    const promotion = await safePromotionQuery(
      (p) => p.storePromotion.findFirst({
        where: {
          companyId,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
            { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
          ],
        },
      }),
      'findFirst-public'
    );
    return res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    console.error('❌ [STORE-PROMOTION] Error fetching public:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب العرض',
      error: error.message,
    });
  }
};

exports.calculateDiscount = async (req, res) => {
  try {
    const companyId = req.company?.id || req.params?.companyId || req.body?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }
    const { cartItems } = req.body;
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(200).json({ success: true, data: { discount: 0, discountDetails: [], tier: null, totalQuantity: 0 } });
    }
    const promotion = await safePromotionQuery(
      (p) => p.storePromotion.findFirst({
        where: {
          companyId,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
            { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
          ],
        },
      }),
      'findFirst-calc'
    );
    if (!promotion) {
      return res.status(200).json({ success: true, data: { discount: 0, discountDetails: [], tier: null, totalQuantity: 0 } });
    }
    const result = calculateDiscount({
      cartItems,
      tiers: promotion.tiers,
      disableOtherDiscounts: promotion.disableOtherDiscounts,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [STORE-PROMOTION] Error calculating:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حساب الخصم',
      error: error.message,
    });
  }
};
