const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DEFAULT_FREE_SHIPPING_MESSAGE =
  'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر';

const getPrisma = () => getSharedPrismaClient();

/**
 * 📦 Public Store Info Controller
 * Provides lightweight store metadata for storefront runtime.
 */
exports.getPublicStoreInfo = async (req, res) => {
  try {
    const company = req.company;

    if (!company?.id) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }

    const prisma = getPrisma();
    const promotionSettings = await prisma.storePromotionSettings.findUnique({
      where: { companyId: company.id },
      select: {
        freeShippingEnabled: true,
        freeShippingThreshold: true,
        freeShippingMessage: true
      }
    });

    const freeShippingSettings = {
      enabled: !!promotionSettings?.freeShippingEnabled,
      minAmount: Number(promotionSettings?.freeShippingThreshold || 0),
      message:
        promotionSettings?.freeShippingMessage ||
        DEFAULT_FREE_SHIPPING_MESSAGE
    };

    return res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        email: company.email,
        phone: company.phone,
        website: company.website,
        currency: company.currency,
        freeShippingSettings
      }
    });
  } catch (error) {
    console.error('❌ [STORE-INFO] Error fetching store info:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات المتجر',
      error: error.message
    });
  }
};
