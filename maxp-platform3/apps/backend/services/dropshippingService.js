const { getSharedPrismaClient } = require('./sharedDatabase');
const merchantService = require('./merchantService');
const fulfillmentService = require('./fulfillmentService');

class DropshippingService {
  get prisma() {
    return getSharedPrismaClient();
  }

  constructor() {
  }

  selectBestMerchantProduct(merchantProducts = [], quantity = 1) {
    return merchantProducts
      .filter((merchantProduct) => {
        return (
          merchantProduct?.isActive &&
          merchantProduct?.syncEnabled &&
          merchantProduct?.merchant?.isActive &&
          Number(merchantProduct.stock || 0) >= Number(quantity || 1)
        );
      })
      .sort((left, right) => {
        const priceDiff = Number(left.merchantPrice) - Number(right.merchantPrice);
        if (priceDiff !== 0) return priceDiff;

        const stockDiff = Number(right.stock || 0) - Number(left.stock || 0);
        if (stockDiff !== 0) return stockDiff;

        return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
      })[0] || null;
  }

  getMaxAvailableStock(merchantProducts = []) {
    return merchantProducts
      .filter((merchantProduct) => (
        merchantProduct?.isActive &&
        merchantProduct?.syncEnabled &&
        merchantProduct?.merchant?.isActive
      ))
      .reduce((maxStock, merchantProduct) => Math.max(maxStock, Number(merchantProduct.stock || 0)), 0);
  }

  async resolveBestMerchantProduct(productId, companyId, merchantProducts = [], quantity = 1) {
    const requestedQuantity = Number(quantity || 1);
    const candidates = [];

    for (const merchantProduct of merchantProducts) {
      if (
        !merchantProduct?.isActive ||
        !merchantProduct?.syncEnabled ||
        !merchantProduct?.merchant?.isActive
      ) {
        continue;
      }

      const fulfillmentSource = fulfillmentService.normalizeFulfillmentMode(
        merchantProduct.merchant.fulfillmentMode
      );

      if (fulfillmentSource === 'COMPANY_WAREHOUSE') {
        const allocation = await fulfillmentService.findWarehouseAllocation(this.prisma, {
          productId,
          companyId,
          quantity: requestedQuantity,
          preferredWarehouseId: merchantProduct.merchant.defaultWarehouseId
        });

        if (allocation) {
          candidates.push({
            ...merchantProduct,
            fulfillmentSource,
            warehouseId: allocation.warehouseId,
            availableStock: allocation.available
          });
        }
        continue;
      }

      if (Number(merchantProduct.stock || 0) >= requestedQuantity) {
        candidates.push({
          ...merchantProduct,
          fulfillmentSource: 'MERCHANT',
          availableStock: Number(merchantProduct.stock || 0)
        });
      }
    }

    return candidates
      .sort((left, right) => {
        const priceDiff = Number(left.merchantPrice) - Number(right.merchantPrice);
        if (priceDiff !== 0) return priceDiff;

        const stockDiff = Number(right.availableStock || 0) - Number(left.availableStock || 0);
        if (stockDiff !== 0) return stockDiff;

        return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
      })[0] || null;
  }

  buildAutoFulfillmentPayload(orderId, merchantId, itemCount) {
    const orderToken = String(orderId || '').slice(-6).toUpperCase() || 'ORDER';
    const merchantToken = String(merchantId || '').slice(-4).toUpperCase() || 'MRCH';
    const timestampToken = Date.now().toString().slice(-6);

    return {
      trackingNumber: `AUTO-${orderToken}-${merchantToken}`,
      merchantOrderId: `AUTO-${merchantToken}-${timestampToken}`,
      notes: `تم تنفيذ الطلب تلقائياً عبر مسار الدروب شيبنج لعدد ${itemCount} عنصر`
    };
  }

  /**
   * توجيه الطلب للتاجر
   */
  async routeOrderToMerchant(orderId) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: {
                    where: {
                      isActive: true,
                      syncEnabled: true
                    },
                    include: {
                      merchant: true
                    },
                    orderBy: [
                      { merchantPrice: 'asc' },
                      { stock: 'desc' },
                      { createdAt: 'asc' }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      // تجميع المنتجات حسب التاجر
      const merchantGroups = new Map();

      for (const item of order.orderItems) {
        if (item.product.merchantProducts && item.product.merchantProducts.length > 0) {
          const merchantProduct = await this.resolveBestMerchantProduct(
            item.productId,
            order.companyId,
            item.product.merchantProducts,
            item.quantity
          );

          if (!merchantProduct) {
            throw new Error(`المنتج ${item.productId} غير متوفر لدى تاجر نشط بالمخزون المطلوب`);
          }

          const merchantId = merchantProduct.merchantId;

          if (!merchantGroups.has(merchantId)) {
            merchantGroups.set(merchantId, {
              merchant: merchantProduct.merchant,
              items: []
            });
          }

          merchantGroups.get(merchantId).items.push({
            productId: item.productId,
            quantity: item.quantity,
            merchantProduct,
            fulfillmentSource: merchantProduct.fulfillmentSource,
            warehouseId: merchantProduct.warehouseId || null
          });
        }
      }

      // إنشاء طلب لكل تاجر
      const merchantOrders = [];
      for (const [merchantId, group] of merchantGroups) {
        const merchantOrder = await merchantService.createMerchantOrder(orderId, merchantId, group.items);

        // إذا كان التاجر يدعم التنفيذ التلقائي
        if (group.merchant.autoFulfill && merchantOrder.status !== 'FULFILLED') {
          const fulfilledMerchantOrder = await merchantService.fulfillMerchantOrder(
            merchantOrder.id,
            this.buildAutoFulfillmentPayload(orderId, merchantId, group.items.length)
          );
          merchantOrders.push(fulfilledMerchantOrder);
          console.log('🔄 [DROPSHIPPING] Auto-fulfilled merchant order:', merchantId);
          continue;
        }

        merchantOrders.push(merchantOrder);
      }

      console.log('✅ [DROPSHIPPING] Routed order to merchants:', merchantOrders.length);
      return merchantOrders;
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error routing order to merchant:', error);
      throw error;
    }
  }

  /**
   * التحقق من توفر المنتج عند التاجر
   */
  async checkMerchantAvailability(productId, quantity) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          merchantProducts: {
            where: {
              isActive: true,
            syncEnabled: true
          },
          include: {
            merchant: true
          }
        }
      }
    });

      const activeMerchantProducts = (product?.merchantProducts || []).filter((merchantProduct) => (
        merchantProduct?.isActive &&
        merchantProduct?.syncEnabled &&
        merchantProduct.merchant?.isActive
      ));

      if (!product || activeMerchantProducts.length === 0) {
        return {
          available: false,
          reason: 'المنتج غير متوفر للدروب شيبنج'
        };
      }

      // التحقق من المخزون
      const merchantProduct = await this.resolveBestMerchantProduct(
        productId,
        product.companyId,
        activeMerchantProducts,
        quantity
      );
      if (!merchantProduct) {
        return {
          available: false,
          reason: 'المخزون غير كافي',
          availableStock: this.getMaxAvailableStock(activeMerchantProducts),
          requestedQuantity: quantity
        };
      }

      return {
        available: true,
        merchant: merchantProduct.merchant,
        merchantProduct,
        price: merchantProduct.merchantPrice
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error checking availability:', error);
      throw error;
    }
  }

  /**
   * مزامنة منتجات التاجر
   */
  async syncMerchantProducts(merchantId) {
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          merchantProducts: {
            where: {
              syncEnabled: true
            },
            include: {
              product: true
            }
          }
        }
      });

      if (!merchant) {
        throw new Error('التاجر غير موجود');
      }

      // هنا يمكن إضافة منطق مزامنة مع API التاجر
      // حالياً سنقوم بتحديث lastSyncedAt فقط
      const syncedProducts = [];
      for (const merchantProduct of merchant.merchantProducts) {
        await this.prisma.merchantProduct.update({
          where: { id: merchantProduct.id },
          data: {
            lastSyncedAt: new Date()
          }
        });
        syncedProducts.push(merchantProduct.productId);
      }

      console.log('✅ [DROPSHIPPING] Synced products for merchant:', merchantId);
      return {
        merchantId,
        syncedCount: syncedProducts.length,
        productIds: syncedProducts,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error syncing merchant products:', error);
      throw error;
    }
  }

  /**
   * التحقق من أن جميع منتجات الطلب متوفرة
   */
  async validateOrderItems(orderItems) {
    try {
      const validationResults = [];

      for (const item of orderItems) {
        const availability = await this.checkMerchantAvailability(
          item.productId,
          item.quantity
        );

        validationResults.push({
          productId: item.productId,
          quantity: item.quantity,
          ...availability
        });
      }

      const allAvailable = validationResults.every(r => r.available);

      return {
        allAvailable,
        results: validationResults
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error validating order items:', error);
      throw error;
    }
  }
}

module.exports = new DropshippingService();
