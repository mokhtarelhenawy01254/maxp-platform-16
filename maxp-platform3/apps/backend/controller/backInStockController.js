const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { trackStorefrontAppUsage } = require('../services/storefrontAppUsageService');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

async function logConversionUsage(payload) {
  try {
    await trackStorefrontAppUsage(payload);
  } catch (error) {
    console.error('Failed to track conversion app usage:', error);
  }
}

/**
 * 🔔 Controller لإدارة إشعارات العودة للمخزون
 */

/**
 * الاشتراك في إشعارات العودة للمخزون
 * POST /api/v1/public/products/:productId/back-in-stock
 */
exports.subscribe = async (req, res) => {
  try {
    const { company } = req;
    const { productId } = req.params;
    const { customerName, customerEmail, customerPhone, notifyEmail, notifySMS } = req.body;

    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: 'الاسم مطلوب'
      });
    }

    if (!notifyEmail && !notifySMS) {
      return res.status(400).json({
        success: false,
        error: 'يجب اختيار وسيلة إشعار واحدة على الأقل'
      });
    }

    const prisma = getPrisma();

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        companyId: company.id,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Check if already subscribed
    const existing = await prisma.backInStockNotification.findFirst({
      where: {
        productId,
        companyId: company.id,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        isNotified: false
      }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'أنت مسجل بالفعل في قائمة الانتظار',
        data: existing
      });
    }

    // Create notification subscription
    const notification = await prisma.backInStockNotification.create({
      data: {
        productId,
        companyId: company.id,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        notifyEmail: notifyEmail || false,
        notifySMS: notifySMS || false
      }
    });

    await logConversionUsage({
      companyId: company.id,
      slug: 'conversion-suite',
      feature: 'back_in_stock_signup',
      metadata: {
        productId: product.id,
        notifyEmail: Boolean(notifyEmail),
        notifySMS: Boolean(notifySMS),
      },
    });

    res.json({
      success: true,
      message: 'تم تسجيل طلب الإشعار بنجاح',
      data: notification
    });
  } catch (error) {
    console.error('Error subscribing to back in stock:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

