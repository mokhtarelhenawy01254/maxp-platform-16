const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const merchantService = require('../services/merchantService');
const fulfillmentService = require('../services/fulfillmentService');
const commissionService = require('../services/commissionService');
const { cacheMiddleware, invalidateMerchantPortalCache } = require('../middleware/performanceOptimization');

const MERCHANT_ORDER_STATUSES = new Set([
  'PENDING',
  'SENT',
  'CONFIRMED',
  'FULFILLED',
  'CANCELLED',
  'FAILED'
]);

const sanitizeLimit = (value, fallback = 50, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const sanitizeOffset = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const parseOptionalBoolean = (value) => {
  if (value === undefined) return undefined;
  return Boolean(value);
};

const isCompanyWarehouseMerchant = (merchant) =>
  fulfillmentService.normalizeFulfillmentMode(merchant?.fulfillmentMode) ===
  'COMPANY_WAREHOUSE';

const requireMerchantAccount = async (req, res, next) => {
  try {
    if (req.user?.role !== 'MERCHANT') {
      return res.status(403).json({
        success: false,
        message: 'هذه الصفحة مخصصة للتجار فقط'
      });
    }

    if (!req.user.companyId || !req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'حساب التاجر غير مكتمل'
      });
    }

    const prisma = getSharedPrismaClient();
    const merchant = await prisma.merchant.findFirst({
      where: {
        companyId: req.user.companyId,
        email: {
          equals: req.user.email,
          mode: 'insensitive'
        }
      }
    });

    if (!merchant || merchant.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'حساب التاجر غير مفعل أو غير مرتبط بهذه الشركة'
      });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Account resolution failed:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر التحقق من حساب التاجر'
    });
  }
};

router.use(verifyToken.authenticateToken, requireMerchantAccount);

router.get('/me', cacheMiddleware(60000), async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const merchant = await prisma.merchant.findFirst({
      where: {
        id: req.merchant.id,
        companyId: req.user.companyId
      },
      include: {
        _count: {
          select: {
            merchantOrders: true,
            merchantProducts: true,
            commissions: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: merchant
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load profile:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحميل بيانات التاجر'
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const products = await prisma.merchantProduct.findMany({
      where: { merchantId: req.merchant.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            images: true,
            mainImage: true,
            isActive: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const productsWithInventory =
      await merchantService.decorateMerchantProductsWithInventorySnapshot(
        req.merchant,
        products
      );

    res.json({
      success: true,
      data: productsWithInventory
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load products:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحميل منتجات التاجر'
    });
  }
});

router.patch('/products/:merchantProductId', async (req, res) => {
  try {
    const { merchantProductId } = req.params;
    const prisma = getSharedPrismaClient();
    const merchantProduct = await prisma.merchantProduct.findFirst({
      where: {
        id: merchantProductId,
        merchantId: req.merchant.id
      }
    });

    if (!merchantProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود لدى هذا التاجر'
      });
    }

    const updateData = {};
    if (req.body.merchantSku !== undefined) {
      updateData.merchantSku = String(req.body.merchantSku || '').trim() || null;
    }

    if (req.body.merchantPrice !== undefined) {
      const merchantPrice = Number(req.body.merchantPrice);
      if (!Number.isFinite(merchantPrice) || merchantPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'سعر التاجر غير صالح'
        });
      }
      updateData.merchantPrice = merchantPrice;
    }

    if (req.body.stock !== undefined) {
      if (isCompanyWarehouseMerchant(req.merchant)) {
        return res.status(400).json({
          success: false,
          message: 'مخزون منتجات مخزن الشركة يتم تحديثه من شاشة المخزن أو مسئول الشركة'
        });
      }

      const stock = Number.parseInt(req.body.stock, 10);
      if (!Number.isFinite(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'قيمة المخزون غير صالحة'
        });
      }
      updateData.stock = stock;
    }

    const syncEnabled = parseOptionalBoolean(req.body.syncEnabled);
    if (syncEnabled !== undefined) {
      updateData.syncEnabled = syncEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث'
      });
    }

    const updated = await prisma.merchantProduct.update({
      where: { id: merchantProduct.id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });

    await merchantService.updateProductDropshippingPrice(merchantProduct.productId);
    invalidateMerchantPortalCache(req.user?.id, req.user?.companyId);

    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to update product:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحديث المنتج'
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !MERCHANT_ORDER_STATUSES.has(String(status))) {
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صالحة'
      });
    }

    const orders = await merchantService.getMerchantOrders(req.merchant.id, {
      status,
      limit: sanitizeLimit(req.query.limit),
      offset: sanitizeOffset(req.query.offset)
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load orders:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحميل طلبات التاجر'
    });
  }
});

router.get('/operations-summary', cacheMiddleware(30000), async (req, res) => {
  try {
    const summary = await merchantService.getMerchantOperationsSummary(
      req.merchant.id,
      {
        status: req.query.status,
        limit: sanitizeLimit(req.query.limit, 50, 100),
        offset: sanitizeOffset(req.query.offset)
      }
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load operations summary:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحميل ملخص الشحن والتسويات'
    });
  }
});

router.get('/payout-summary', cacheMiddleware(30000), async (req, res) => {
  try {
    const summary = await commissionService.getMerchantPayoutSummary(req.merchant.id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load payout summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'تعذر تحميل مستحقات التاجر'
    });
  }
});

router.post('/payout-request', async (req, res) => {
  try {
    const payout = await commissionService.processMerchantPayout(
      req.merchant.id,
      req.body.amount,
      {
        method: req.body.paymentMethod,
        details: req.body.paymentDetails || null
      }
    );

    invalidateMerchantPortalCache(req.user?.id, req.user?.companyId);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب سحب مستحقات التاجر بنجاح',
      data: payout
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to request payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'تعذر إنشاء طلب السحب'
    });
  }
});

router.get('/payouts', cacheMiddleware(30000), async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const payouts = await prisma.merchantPayout.findMany({
      where: { merchantId: req.merchant.id },
      orderBy: { createdAt: 'desc' },
      take: sanitizeLimit(req.query.limit, 50, 100),
      skip: sanitizeOffset(req.query.offset)
    });

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to load payouts:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحميل طلبات سحب التاجر'
    });
  }
});

router.patch('/orders/:merchantOrderId/status', async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const { status, trackingNumber, externalOrderId, notes } = req.body;

    if (!MERCHANT_ORDER_STATUSES.has(String(status))) {
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صالحة'
      });
    }

    const prisma = getSharedPrismaClient();
    const merchantOrder = await prisma.merchantOrder.findFirst({
      where: {
        id: merchantOrderId,
        merchantId: req.merchant.id
      }
    });

    if (!merchantOrder) {
      return res.status(404).json({
        success: false,
        message: 'طلب التاجر غير موجود'
      });
    }

    let updated;
    if (status === 'FULFILLED') {
      updated = await merchantService.fulfillMerchantOrder(merchantOrder.id, {
        trackingNumber: trackingNumber || merchantOrder.trackingNumber || null,
        merchantOrderId: externalOrderId || merchantOrder.merchantOrderId || null,
        notes: notes || merchantOrder.notes || 'تم تنفيذ الطلب من بورتال التاجر'
      });
    } else {
      updated = await prisma.merchantOrder.update({
        where: { id: merchantOrder.id },
        data: {
          status,
          ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
          ...(externalOrderId !== undefined ? { merchantOrderId: externalOrderId || null } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
          ...(status === 'CANCELLED' || status === 'FAILED' ? { fulfilledAt: null } : {})
        },
        include: {
          order: true
        }
      });

      await fulfillmentService.updateShipmentOnFulfillment(prisma, {
        merchantOrder: updated,
        trackingNumber: trackingNumber || updated.trackingNumber || null,
        externalShipmentId: externalOrderId || updated.merchantOrderId || null
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-PORTAL] Failed to update order status:', error);
    res.status(500).json({
      success: false,
      message: 'تعذر تحديث حالة الطلب'
    });
  }
});

module.exports = router;
