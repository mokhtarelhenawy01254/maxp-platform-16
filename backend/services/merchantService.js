const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fulfillmentService = require('./fulfillmentService');
const {
  ensureMerchantWarehouse,
  resolveCompanyWarehouseForMerchant,
  syncMerchantProductStock
} = require('../utils/merchantAccountScope');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const toNumber = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const parseMerchantOrderItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
const isCompanyWarehouseMode = (mode) =>
  fulfillmentService.normalizeFulfillmentMode(mode) === 'COMPANY_WAREHOUSE';

const DELIVERED_STATUSES = new Set([
  'DELIVERED',
  'COMPLETED',
  'DONE',
  'RECEIVED',
  'FULFILLED_DELIVERED'
]);

const NOT_DELIVERED_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'FAILED',
  'DELIVERY_FAILED',
  'RETURNED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'REJECTED',
  'LOST'
]);

const IN_SHIPPING_STATUSES = new Set([
  'FULFILLED',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'PICKED_UP',
  'WITH_CARRIER'
]);

const classifyMerchantOperation = ({ merchantOrderStatus, shipmentStatus, orderStatus }) => {
  const statuses = [
    normalizeStatus(orderStatus),
    normalizeStatus(shipmentStatus),
    normalizeStatus(merchantOrderStatus)
  ].filter(Boolean);

  if (statuses.some((status) => DELIVERED_STATUSES.has(status))) {
    return 'DELIVERED';
  }

  if (statuses.some((status) => NOT_DELIVERED_STATUSES.has(status))) {
    return 'NOT_DELIVERED';
  }

  if (statuses.some((status) => IN_SHIPPING_STATUSES.has(status))) {
    return 'IN_SHIPPING';
  }

  return 'PREPARATION';
};

const sumCommissionAmountByStatus = (commissions, predicate) =>
  commissions.reduce((sum, commission) => (
    predicate(normalizeStatus(commission.status))
      ? sum + toNumber(commission.amount)
      : sum
  ), 0);

const createMerchantOperationsSummaryTotals = () => ({
  assignedOrdersCount: 0,
  assignedPieces: 0,
  preparationOrdersCount: 0,
  preparationPieces: 0,
  inShippingOrdersCount: 0,
  inShippingPieces: 0,
  deliveredOrdersCount: 0,
  deliveredPieces: 0,
  notDeliveredOrdersCount: 0,
  notDeliveredPieces: 0,
  payablePieces: 0,
  pendingPayablePieces: 0,
  expectedReceivableAmount: 0,
  inShippingAmount: 0,
  deliveredPayableAmount: 0,
  notDeliveredAmount: 0,
  shippingCostAmount: 0,
  confirmedCommissionAmount: 0,
  pendingCommissionAmount: 0,
  paidAmount: 0
});

const createMerchantInventorySummaryTotals = () => ({
  linkedProducts: 0,
  availableForSale: 0,
  merchantProductStock: 0,
  physicalQuantity: 0,
  physicalAvailable: 0,
  reservedQuantity: 0,
  stockLocation: 'MERCHANT',
  warehouseNames: []
});

const buildMerchantInventorySnapshot = ({
  merchant,
  merchantProduct,
  inventoryRecords = []
}) => {
  const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
    merchant?.fulfillmentMode
  );
  const stockLocation =
    fulfillmentMode === 'COMPANY_WAREHOUSE' ? 'COMPANY_WAREHOUSE' : 'MERCHANT';
  const merchantProductStock = Math.max(0, Math.trunc(toNumber(merchantProduct?.stock)));
  const physicalQuantity = inventoryRecords.reduce(
    (sum, inventory) => sum + toNumber(inventory.quantity),
    0
  );
  const physicalAvailable = inventoryRecords.reduce(
    (sum, inventory) => sum + toNumber(inventory.available),
    0
  );
  const reservedQuantity = inventoryRecords.reduce(
    (sum, inventory) => sum + toNumber(inventory.reserved),
    0
  );
  const warehouses = inventoryRecords
    .map((inventory) => inventory.warehouse)
    .filter(Boolean);
  const warehouseNames = Array.from(
    new Set(warehouses.map((warehouse) => warehouse.name).filter(Boolean))
  );
  const availableForSale =
    stockLocation === 'COMPANY_WAREHOUSE'
      ? Math.max(0, Math.trunc(physicalAvailable))
      : merchantProductStock;

  return {
    fulfillmentMode,
    stockLocation,
    stockLocationLabel:
      stockLocation === 'COMPANY_WAREHOUSE'
        ? 'في مخزن الشركة'
        : 'عند التاجر',
    canEditStock: stockLocation === 'MERCHANT',
    warehouseIds: Array.from(
      new Set(inventoryRecords.map((inventory) => inventory.warehouseId).filter(Boolean))
    ),
    warehouseNames,
    warehouseName: warehouseNames[0] || null,
    merchantProductStock,
    physicalQuantity: Math.max(0, Math.trunc(physicalQuantity)),
    physicalAvailable: Math.max(0, Math.trunc(physicalAvailable)),
    reservedQuantity: Math.max(0, Math.trunc(reservedQuantity)),
    availableForSale
  };
};

const buildMerchantInventorySummaryFromProducts = (merchant, merchantProducts = []) => {
  const totals = createMerchantInventorySummaryTotals();
  const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
    merchant?.fulfillmentMode
  );
  totals.stockLocation =
    fulfillmentMode === 'COMPANY_WAREHOUSE' ? 'COMPANY_WAREHOUSE' : 'MERCHANT';

  const warehouseNames = new Set();
  merchantProducts.forEach((merchantProduct) => {
    const snapshot = merchantProduct.inventorySnapshot;
    if (!snapshot) return;

    totals.linkedProducts += 1;
    totals.availableForSale += toNumber(snapshot.availableForSale);
    totals.merchantProductStock += toNumber(snapshot.merchantProductStock);
    totals.physicalQuantity += toNumber(snapshot.physicalQuantity);
    totals.physicalAvailable += toNumber(snapshot.physicalAvailable);
    totals.reservedQuantity += toNumber(snapshot.reservedQuantity);
    (snapshot.warehouseNames || []).forEach((name) => {
      if (name) warehouseNames.add(name);
    });
  });

  totals.warehouseNames = Array.from(warehouseNames);
  totals.stockLocationLabel =
    totals.stockLocation === 'COMPANY_WAREHOUSE'
      ? 'في مخزن الشركة'
      : 'عند التاجر';

  return totals;
};

const buildCustomerName = (order) => {
  if (order?.customerName) return order.customerName;
  const firstName = order?.customer?.firstName || '';
  const lastName = order?.customer?.lastName || '';
  return `${firstName} ${lastName}`.trim();
};

const upsertWarehouseInventoryQuantity = async (
  prisma,
  { productId, warehouseId, stock, cost = null }
) => {
  const nextQuantity = Math.max(0, Number.parseInt(stock, 10) || 0);
  const existingInventory = await prisma.inventory.findFirst({
    where: {
      productId,
      warehouseId,
      batchNumber: null
    }
  });

  if (existingInventory) {
    const reserved = Math.max(0, Number(existingInventory.reserved || 0));
    const available = Math.max(0, nextQuantity - reserved);

    return prisma.inventory.update({
      where: { id: existingInventory.id },
      data: {
        quantity: nextQuantity,
        available,
        ...(cost !== null ? { cost } : {}),
        updatedAt: new Date()
      }
    });
  }

  return prisma.inventory.create({
    data: {
      productId,
      warehouseId,
      quantity: nextQuantity,
      available: nextQuantity,
      reserved: 0,
      ...(cost !== null ? { cost } : {})
    }
  });
};

class MerchantService {
  get prisma() {
    return getSharedPrismaClient();
  }

  constructor() {
  }

  async decorateMerchantProductsWithInventorySnapshot(merchant, merchantProducts = []) {
    if (!merchant || !Array.isArray(merchantProducts) || merchantProducts.length === 0) {
      return [];
    }

    const productIds = Array.from(
      new Set(
        merchantProducts
          .map((merchantProduct) => merchantProduct.productId || merchantProduct.product?.id)
          .filter(Boolean)
      )
    );

    if (productIds.length === 0) {
      return merchantProducts.map((merchantProduct) => ({
        ...merchantProduct,
        inventorySnapshot: buildMerchantInventorySnapshot({
          merchant,
          merchantProduct,
          inventoryRecords: []
        })
      }));
    }

    const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
      merchant.fulfillmentMode
    );
    const warehouseWhere =
      fulfillmentMode === 'COMPANY_WAREHOUSE'
        ? {
            companyId: merchant.companyId,
            isActive: true,
            ...(merchant.defaultWarehouseId
              ? { id: merchant.defaultWarehouseId }
              : { merchantId: null })
          }
        : {
            companyId: merchant.companyId,
            merchantId: merchant.id,
            isActive: true
          };

    const inventoryRecords = await this.prisma.inventory.findMany({
      where: {
        productId: { in: productIds },
        warehouse: warehouseWhere
      },
      select: {
        productId: true,
        warehouseId: true,
        quantity: true,
        available: true,
        reserved: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
            merchantId: true,
            type: true
          }
        }
      }
    });

    const inventoryByProductId = new Map();
    inventoryRecords.forEach((inventory) => {
      const rows = inventoryByProductId.get(inventory.productId) || [];
      rows.push(inventory);
      inventoryByProductId.set(inventory.productId, rows);
    });

    return merchantProducts.map((merchantProduct) => {
      const productId = merchantProduct.productId || merchantProduct.product?.id;
      const productInventory = inventoryByProductId.get(productId) || [];

      return {
        ...merchantProduct,
        inventorySnapshot: buildMerchantInventorySnapshot({
          merchant,
          merchantProduct,
          inventoryRecords: productInventory
        })
      };
    });
  }

  buildMerchantInventorySummary(merchant, merchantProducts = []) {
    return buildMerchantInventorySummaryFromProducts(merchant, merchantProducts);
  }

  async decorateMerchantRecordWithInventorySnapshot(merchant) {
    if (!merchant) return merchant;

    const merchantProducts = merchant.merchantProducts || merchant.products || [];
    const decoratedProducts = await this.decorateMerchantProductsWithInventorySnapshot(
      merchant,
      merchantProducts
    );

    return {
      ...merchant,
      merchantProducts: decoratedProducts,
      products: decoratedProducts,
      inventorySummary: this.buildMerchantInventorySummary(merchant, decoratedProducts)
    };
  }

  applyPlatformMargin(merchantPrice, settings) {
    let basePrice = Number(merchantPrice);

    if (settings) {
      if (settings.platformMarginType === 'FIXED') {
        basePrice += Number(settings.platformMarginValue || 0);
      } else if (settings.platformMarginType === 'PERCENTAGE') {
        basePrice *= (1 + (Number(settings.platformMarginValue || 0) / 100));
      }
    }

    return Number(basePrice.toFixed(2));
  }

  async updateProductDropshippingPrice(productId) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { companyId: true }
    });

    const merchantProducts = await this.prisma.merchantProduct.findMany({
      where: {
        productId,
        isActive: true,
        syncEnabled: true
      },
      include: {
        merchant: true
      }
    });

    const activeMerchantProducts = merchantProducts.filter((merchantProduct) => (
      merchantProduct.merchant?.isActive &&
      (
        Number(merchantProduct.stock || 0) > 0 ||
        fulfillmentService.normalizeFulfillmentMode(merchantProduct.merchant.fulfillmentMode) === 'COMPANY_WAREHOUSE'
      )
    ));

    if (!product || activeMerchantProducts.length === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { isDropshipped: merchantProducts.length > 0 }
      });
      return;
    }

    const settings = await this.prisma.affiliateSetting.findUnique({
      where: { companyId: product.companyId }
    });

    // Use the highest active supplier cost so the public price never undercharges
    // when a cheaper supplier cannot satisfy the requested quantity later.
    const safestMerchantProduct = activeMerchantProducts.sort(
      (left, right) => Number(right.merchantPrice) - Number(left.merchantPrice)
    )[0];
    const basePrice = this.applyPlatformMargin(safestMerchantProduct.merchantPrice, settings);

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        isDropshipped: true,
        price: basePrice,
        basePrice
      }
    });
  }

  /**
   * إنشاء تاجر جديد
   */
  async createMerchant(companyId, data) {
    try {
      const {
        name,
        email,
        password,
        phone,
        address,
        commissionRate = 10.0,
        autoFulfill = false,
        fulfillmentMode = 'MERCHANT',
        defaultWarehouseId,
        defaultShippingCompanyId,
        webhookUrl,
        settings,
        isActive = true
      } = data;
      const normalizedEmail = normalizeEmail(email);

      if (!name || !normalizedEmail) {
        throw new Error('اسم التاجر والبريد الإلكتروني مطلوبان');
      }

      if (password && String(password).length < 8) {
        throw new Error('كلمة المرور يجب ألا تقل عن 8 أحرف');
      }

      // إنشاء API key فريد
      const apiKey = crypto.randomBytes(32).toString('hex');

      const merchant = await this.prisma.$transaction(async (tx) => {
        const existingMerchant = await tx.merchant.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          },
          select: { id: true }
        });

        if (existingMerchant) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل');
        }

        const normalizedFulfillmentMode =
          fulfillmentService.normalizeFulfillmentMode(fulfillmentMode);

        const createdMerchant = await tx.merchant.create({
          data: {
            companyId,
            name,
            email: normalizedEmail,
            phone,
            address,
            isActive: Boolean(isActive),
            commissionRate,
            autoFulfill,
            fulfillmentMode: normalizedFulfillmentMode,
            defaultWarehouseId: defaultWarehouseId || null,
            defaultShippingCompanyId: defaultShippingCompanyId || null,
            apiKey,
            webhookUrl,
            settings: settings ? JSON.stringify(settings) : null
          }
        });

        const merchantWarehouse = isCompanyWarehouseMode(normalizedFulfillmentMode)
          ? await resolveCompanyWarehouseForMerchant(tx, createdMerchant, {
              preferredWarehouseId: defaultWarehouseId || null
            })
          : await ensureMerchantWarehouse(tx, createdMerchant, {
              preferredWarehouseId: defaultWarehouseId || null
            });

        if (password) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: {
                equals: normalizedEmail,
                mode: 'insensitive'
              }
            },
            select: { id: true }
          });

          if (existingUser) {
            throw new Error('البريد الإلكتروني مستخدم بالفعل كمستخدم');
          }

          const nameParts = String(name || '').trim().split(/\s+/).filter(Boolean);
          await tx.user.create({
            data: {
              email: normalizedEmail,
              password: await bcrypt.hash(password, 10),
              firstName: nameParts[0] || 'Merchant',
              lastName: nameParts.slice(1).join(' ') || 'Portal',
              phone: phone || null,
              role: 'MERCHANT',
              companyId,
              isActive: Boolean(isActive)
            }
          });
        }

        return {
          ...createdMerchant,
          defaultWarehouseId: merchantWarehouse.id,
          defaultWarehouse: merchantWarehouse
        };
      });

      console.log('✅ [MERCHANT] Created merchant:', merchant.id);
      return merchant;
    } catch (error) {
      console.error('❌ [MERCHANT] Error creating merchant:', error);
      throw error;
    }
  }

  /**
   * تحديث تاجر
   */
  async updateMerchant(merchantId, data) {
    try {
      const updateData = { ...data };
      const shouldSyncUserActive = Object.prototype.hasOwnProperty.call(updateData, 'isActive');
      const nextUserActive = Boolean(updateData.isActive);

      if (updateData.settings) {
        updateData.settings = JSON.stringify(updateData.settings);
      }

      if (updateData.fulfillmentMode !== undefined) {
        updateData.fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(updateData.fulfillmentMode);
      }

      if (updateData.defaultWarehouseId === '') {
        updateData.defaultWarehouseId = null;
      }

      if (updateData.defaultShippingCompanyId === '') {
        updateData.defaultShippingCompanyId = null;
      }

      const merchant = await this.prisma.$transaction(async (tx) => {
        const existingMerchant = shouldSyncUserActive
          ? await tx.merchant.findUnique({
            where: { id: merchantId },
            select: {
              companyId: true,
              email: true
            }
          })
          : null;

        let updatedMerchant = await tx.merchant.update({
          where: { id: merchantId },
          data: updateData
        });

        if (
          updateData.fulfillmentMode !== undefined ||
          updateData.defaultWarehouseId !== undefined
        ) {
          const warehouse = isCompanyWarehouseMode(updatedMerchant.fulfillmentMode)
            ? await resolveCompanyWarehouseForMerchant(tx, updatedMerchant, {
                preferredWarehouseId: updatedMerchant.defaultWarehouseId || null
              })
            : await ensureMerchantWarehouse(tx, updatedMerchant, {
                preferredWarehouseId: updatedMerchant.defaultWarehouseId || null
              });

          if (updatedMerchant.defaultWarehouseId !== warehouse.id) {
            updatedMerchant = await tx.merchant.update({
              where: { id: merchantId },
              data: { defaultWarehouseId: warehouse.id }
            });
          }
        }

        if (shouldSyncUserActive && existingMerchant?.email) {
          await tx.user.updateMany({
            where: {
              companyId: existingMerchant.companyId,
              role: 'MERCHANT',
              email: {
                equals: existingMerchant.email,
                mode: 'insensitive'
              }
            },
            data: {
              isActive: nextUserActive
            }
          });
        }

        return updatedMerchant;
      });

      console.log('✅ [MERCHANT] Updated merchant:', merchantId);
      return merchant;
    } catch (error) {
      console.error('❌ [MERCHANT] Error updating merchant:', error);
      throw error;
    }
  }

  /**
   * إضافة منتج للتاجر
   */
  async addMerchantProduct(merchantId, productId, data) {
    try {
      const {
        merchantSku,
        merchantPrice,
        stock = 0,
        syncEnabled = true
      } = data;

      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        throw new Error('التاجر غير موجود');
      }

      const nextStock = Math.max(0, Number.parseInt(stock, 10) || 0);
      const merchantProduct = await this.prisma.merchantProduct.upsert({
        where: {
          merchantId_productId: {
            merchantId,
            productId
          }
        },
        update: {
          merchantSku,
          merchantPrice,
          stock: nextStock,
          syncEnabled,
          isActive: true
        },
        create: {
          merchantId,
          productId,
          merchantSku,
          merchantPrice,
          stock: nextStock,
          syncEnabled,
          isActive: true
        },
        include: {
          merchant: true
        }
      });

      const merchantWarehouse = isCompanyWarehouseMode(merchant.fulfillmentMode)
        ? await resolveCompanyWarehouseForMerchant(this.prisma, merchant)
        : await ensureMerchantWarehouse(this.prisma, merchant);

      const inventory = await upsertWarehouseInventoryQuantity(this.prisma, {
        productId,
        warehouseId: merchantWarehouse.id,
        stock: nextStock,
        cost: merchantPrice
      });

      if (isCompanyWarehouseMode(merchant.fulfillmentMode)) {
        await this.prisma.merchantProduct.update({
          where: { id: merchantProduct.id },
          data: {
            stock: Number(inventory.available || 0),
            lastSyncedAt: new Date()
          }
        });
      } else {
        await syncMerchantProductStock(this.prisma, merchant, productId);
      }

      await this.updateProductDropshippingPrice(productId);

      console.log('✅ [MERCHANT] Added/updated merchant product with platform margin');
      return merchantProduct;
    } catch (error) {
      console.error('❌ [MERCHANT] Error adding merchant product:', error);
      throw error;
    }
  }

  /**
   * مزامنة المخزون مع التاجر
   */
  async syncMerchantInventory(merchantId) {
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          merchantProducts: {
            where: {
              syncEnabled: true
            }
          }
        }
      });

      if (!merchant) {
        throw new Error('التاجر غير موجود');
      }

      // هنا يمكن إضافة منطق مزامنة مع API التاجر
      // حالياً سنقوم بتحديث lastSyncedAt فقط
      for (const product of merchant.merchantProducts) {
        await this.prisma.merchantProduct.update({
          where: { id: product.id },
          data: {
            lastSyncedAt: new Date()
          }
        });
      }

      console.log('✅ [MERCHANT] Synced inventory for merchant:', merchantId);
      return {
        synced: merchant.merchantProducts.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ [MERCHANT] Error syncing inventory:', error);
      throw error;
    }
  }

  /**
   * إنشاء طلب عند التاجر
   */
  async createMerchantOrder(orderId, merchantId, selectedItems = null) {
    try {
      const merchantOrder = await this.prisma.$transaction(async (prisma) => {
        const [order, merchant] = await Promise.all([
          prisma.order.findUnique({
            where: { id: orderId },
            include: {
              orderItems: {
                include: {
                  product: {
                    include: {
                      merchantProducts: {
                        where: {
                          merchantId,
                          isActive: true,
                          syncEnabled: true
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
          }),
          prisma.merchant.findUnique({
            where: { id: merchantId }
          })
        ]);

        if (!order) {
          throw new Error('الطلب غير موجود');
        }

        if (!merchant || merchant.isActive === false) {
          throw new Error('التاجر غير موجود أو غير مفعل');
        }

        // جمع المنتجات المرتبطة بهذا التاجر
        const merchantItems = [];
        let totalAmount = 0;

        const sourceItems = Array.isArray(selectedItems) && selectedItems.length > 0
          ? selectedItems
          : order.orderItems;

        for (const item of sourceItems) {
          const merchantProduct = item.merchantProduct || item.product?.merchantProducts?.[0];

          if (merchantProduct?.merchantId === merchantId) {
            const fulfillmentSource = fulfillmentService.normalizeFulfillmentMode(
              item.fulfillmentSource || merchant.fulfillmentMode
            );

            merchantItems.push({
              productId: item.productId,
              merchantProductId: merchantProduct.id || null,
              merchantSku: merchantProduct.merchantSku,
              quantity: item.quantity,
              price: merchantProduct.merchantPrice,
              fulfillmentSource,
              warehouseId: item.warehouseId || merchant.defaultWarehouseId || null
            });
            totalAmount += Number(merchantProduct.merchantPrice) * item.quantity;
          }
        }

        if (merchantItems.length === 0) {
          throw new Error('لا توجد منتجات مرتبطة بهذا التاجر');
        }

        const existingMerchantOrder = await prisma.merchantOrder.findUnique({
          where: {
            merchantId_orderId: {
              merchantId,
              orderId
            }
          }
        });

        const reservedItems = existingMerchantOrder
          ? merchantItems
          : await fulfillmentService.reserveFulfillmentItems(prisma, {
              companyId: order.companyId,
              orderId,
              merchantOrderId: null,
              items: merchantItems
            });

        const fulfillmentSources = Array.from(
          new Set(reservedItems.map((item) => item.fulfillmentSource || 'MERCHANT'))
        );
        const warehouseIds = Array.from(
          new Set(reservedItems.map((item) => item.warehouseId).filter(Boolean))
        );
        const fulfillmentSource = fulfillmentSources.length === 1 ? fulfillmentSources[0] : 'MIXED';
        const warehouseId = warehouseIds.length === 1 ? warehouseIds[0] : null;
        const serializedItems = JSON.stringify(reservedItems);

        // إنشاء أو تحديث طلب التاجر، مع السماح بأكثر من تاجر على نفس الطلب
        const createdMerchantOrder = await prisma.merchantOrder.upsert({
          where: {
            merchantId_orderId: {
              merchantId,
              orderId
            }
          },
          update: {
            items: serializedItems,
            totalAmount,
            shippingAddress: order.shippingAddress,
            fulfillmentSource,
            warehouseId,
            shippingCompanyId: merchant.defaultShippingCompanyId || null
          },
          create: {
            merchantId,
            orderId,
            items: serializedItems,
            totalAmount,
            shippingAddress: order.shippingAddress,
            status: 'PENDING',
            fulfillmentSource,
            warehouseId,
            shippingCompanyId: merchant.defaultShippingCompanyId || null
          }
        });

        await fulfillmentService.createOrUpdateShipmentForMerchantOrder(prisma, {
          order,
          merchant,
          merchantOrder: createdMerchantOrder,
          items: reservedItems
        });

        // تعليم الطلب الأصلي كـ dropshipped، والاحتفاظ بأول merchantOrder كمرجع legacy عند الحاجة
        const orderUpdateData = {
          isDropshipped: true
        };

        if (!order.merchantOrderId) {
          orderUpdateData.merchantOrderId = createdMerchantOrder.id;
        }

        await prisma.order.update({
          where: { id: orderId },
          data: orderUpdateData
        });

        return createdMerchantOrder;
      });

      console.log('✅ [MERCHANT] Created merchant order:', merchantOrder.id);
      return merchantOrder;
    } catch (error) {
      console.error('❌ [MERCHANT] Error creating merchant order:', error);
      throw error;
    }
  }

  /**
   * تنفيذ طلب التاجر
   */
  async fulfillMerchantOrder(merchantOrderId, trackingData) {
    try {
      const { trackingNumber, merchantOrderId: externalOrderId, notes } = trackingData;

      const merchantOrder = await this.prisma.$transaction(async (prisma) => {
        const existingMerchantOrder = await prisma.merchantOrder.findUnique({
          where: { id: merchantOrderId },
          include: {
            order: true
          }
        });

        if (!existingMerchantOrder) {
          throw new Error('طلب التاجر غير موجود');
        }

        const updatedMerchantOrder = await prisma.merchantOrder.update({
          where: { id: merchantOrderId },
          data: {
            status: 'FULFILLED',
            trackingNumber,
            merchantOrderId: externalOrderId,
            fulfilledAt: new Date(),
            notes
          },
          include: {
            order: true
          }
        });

        if (
          existingMerchantOrder.status !== 'FULFILLED' &&
          existingMerchantOrder.fulfillmentSource !== 'MERCHANT'
        ) {
          await fulfillmentService.finalizeCompanyWarehouseReservations(prisma, {
            merchantOrder: existingMerchantOrder,
            actor: null
          });
        }

        await fulfillmentService.updateShipmentOnFulfillment(prisma, {
          merchantOrder: updatedMerchantOrder,
          trackingNumber,
          externalShipmentId: externalOrderId
        });

        const relatedMerchantOrdersCount = await prisma.merchantOrder.count({
          where: { orderId: updatedMerchantOrder.orderId }
        });

        const orderUpdateData = {
          turboShipmentStatus: 'FULFILLED'
        };

        if (trackingNumber && relatedMerchantOrdersCount <= 1) {
          orderUpdateData.turboTrackingNumber = trackingNumber;
        }

        // تحديث حالة الطلب الأصلي
        await prisma.order.update({
          where: { id: updatedMerchantOrder.orderId },
          data: orderUpdateData
        });

        return updatedMerchantOrder;
      });

      console.log('✅ [MERCHANT] Fulfilled merchant order:', merchantOrderId);
      return merchantOrder;
    } catch (error) {
      console.error('❌ [MERCHANT] Error fulfilling merchant order:', error);
      throw error;
    }
  }

  /**
   * الحصول على طلبات التاجر
   */
  async getMerchantOrders(merchantId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      const where = { merchantId };
      if (status) {
        where.status = status;
      }

      const orders = await this.prisma.merchantOrder.findMany({
        where,
        include: {
          shipments: {
            include: {
              shippingCompany: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  phone: true,
                  providerKey: true,
                  integrationMode: true
                }
              },
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  location: true
                }
              }
            }
          },
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return orders;
    } catch (error) {
      console.error('❌ [MERCHANT] Error getting merchant orders:', error);
      throw error;
    }
  }

  async getMerchantOperationsSummary(merchantId, filters = {}) {
    try {
      const { limit = 50, offset = 0, status } = filters;
      const normalizedFilterStatus = String(status || 'all').trim().toUpperCase();

      const merchantOrders = await this.prisma.merchantOrder.findMany({
        where: { merchantId },
        include: {
          shipments: {
            include: {
              shippingCompany: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  providerKey: true
                }
              },
              warehouse: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          order: {
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              },
              commissions: {
                where: {
                  merchantId
                },
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  paidAt: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const totals = createMerchantOperationsSummaryTotals();
      const rows = [];

      merchantOrders.forEach((merchantOrder) => {
        const items = parseMerchantOrderItems(merchantOrder.items);
        const pieces = items.reduce((sum, item) => sum + toNumber(item.quantity || 0), 0);
        const merchantAmount = toNumber(merchantOrder.totalAmount);
        const shipment = Array.isArray(merchantOrder.shipments)
          ? merchantOrder.shipments[0] || null
          : null;
        const commissions = merchantOrder.order?.commissions || [];
        const operationStatus = classifyMerchantOperation({
          merchantOrderStatus: merchantOrder.status,
          shipmentStatus: shipment?.status,
          orderStatus: merchantOrder.order?.status
        });
        const shippingCost = toNumber(shipment?.cost);
        const commissionAmount = commissions.reduce(
          (sum, commission) => sum + toNumber(commission.amount),
          0
        );

        totals.assignedOrdersCount += 1;
        totals.assignedPieces += pieces;
        totals.shippingCostAmount += shippingCost;
        totals.confirmedCommissionAmount += sumCommissionAmountByStatus(
          commissions,
          (commissionStatus) => commissionStatus === 'CONFIRMED'
        );
        totals.pendingCommissionAmount += sumCommissionAmountByStatus(
          commissions,
          (commissionStatus) => commissionStatus === 'PENDING'
        );
        totals.paidAmount += sumCommissionAmountByStatus(
          commissions,
          (commissionStatus) => commissionStatus === 'PAID'
        );

        if (operationStatus === 'DELIVERED') {
          totals.deliveredOrdersCount += 1;
          totals.deliveredPieces += pieces;
          totals.payablePieces += pieces;
          totals.expectedReceivableAmount += merchantAmount;
          totals.deliveredPayableAmount += merchantAmount;
        } else if (operationStatus === 'IN_SHIPPING') {
          totals.inShippingOrdersCount += 1;
          totals.inShippingPieces += pieces;
          totals.pendingPayablePieces += pieces;
          totals.expectedReceivableAmount += merchantAmount;
          totals.inShippingAmount += merchantAmount;
        } else if (operationStatus === 'NOT_DELIVERED') {
          totals.notDeliveredOrdersCount += 1;
          totals.notDeliveredPieces += pieces;
          totals.notDeliveredAmount += merchantAmount;
        } else {
          totals.preparationOrdersCount += 1;
          totals.preparationPieces += pieces;
          totals.expectedReceivableAmount += merchantAmount;
        }

        rows.push({
          id: merchantOrder.id,
          orderId: merchantOrder.orderId,
          orderNumber: merchantOrder.order?.orderNumber || merchantOrder.id,
          createdAt: merchantOrder.createdAt,
          customerName: buildCustomerName(merchantOrder.order) || 'عميل غير محدد',
          customerPhone: merchantOrder.order?.customer?.phone || merchantOrder.order?.customerPhone || '',
          fulfillmentSource: merchantOrder.fulfillmentSource || 'MERCHANT',
          warehouseName: shipment?.warehouse?.name || null,
          shippingCompanyName: shipment?.shippingCompany?.name || null,
          trackingNumber: shipment?.trackingNumber || merchantOrder.trackingNumber || null,
          merchantOrderStatus: normalizeStatus(merchantOrder.status),
          shipmentStatus: normalizeStatus(shipment?.status),
          orderStatus: normalizeStatus(merchantOrder.order?.status),
          operationStatus,
          pieces,
          merchantAmount: roundMoney(merchantAmount),
          commissionAmount: roundMoney(commissionAmount),
          shippingCost: roundMoney(shippingCost),
          payablePieces: operationStatus === 'DELIVERED' ? pieces : 0,
          pendingPayablePieces: operationStatus === 'IN_SHIPPING' ? pieces : 0,
          payableAmount: operationStatus === 'DELIVERED' ? roundMoney(merchantAmount) : 0,
          expectedAmount: operationStatus === 'NOT_DELIVERED' ? 0 : roundMoney(merchantAmount)
        });
      });

      Object.keys(totals).forEach((key) => {
        if (key.endsWith('Amount')) {
          totals[key] = roundMoney(totals[key]);
        }
      });

      const filteredRows = normalizedFilterStatus === 'ALL'
        ? rows
        : rows.filter((row) => row.operationStatus === normalizedFilterStatus);
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
      const safeOffset = Math.max(0, Number(offset) || 0);

      return {
        summary: totals,
        rows: filteredRows.slice(safeOffset, safeOffset + safeLimit),
        pagination: {
          total: filteredRows.length,
          limit: safeLimit,
          offset: safeOffset
        }
      };
    } catch (error) {
      console.error('❌ [MERCHANT] Error getting merchant operations summary:', error);
      throw error;
    }
  }
}

module.exports = new MerchantService();
