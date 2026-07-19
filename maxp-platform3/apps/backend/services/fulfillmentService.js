const FULFILLMENT_MODES = new Set(['MERCHANT', 'COMPANY_WAREHOUSE', 'MIXED']);

const normalizeFulfillmentMode = (value) => {
  const normalized = String(value || 'MERCHANT').trim().toUpperCase();
  return FULFILLMENT_MODES.has(normalized) ? normalized : 'MERCHANT';
};

const safeJsonParse = (value, fallback = null) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseOrderDestination = (order) => {
  const parsedAddress = safeJsonParse(order?.shippingAddress, null);
  const addressObject = parsedAddress && typeof parsedAddress === 'object' ? parsedAddress : {};

  return {
    governorate: order?.governorate || addressObject.governorate || null,
    city: order?.city || addressObject.city || null,
    address:
      order?.customerAddress ||
      addressObject.address ||
      (typeof order?.shippingAddress === 'string' ? order.shippingAddress : null),
  };
};

const resolveShippingCompany = async (prisma, { companyId, merchant, requestedShippingCompanyId }) => {
  const candidateId = requestedShippingCompanyId || merchant?.defaultShippingCompanyId || null;

  if (candidateId) {
    const selected = await prisma.shippingCompany.findFirst({
      where: {
        id: candidateId,
        companyId,
        isActive: true,
      },
    });

    if (selected) return selected;
  }

  return prisma.shippingCompany.findFirst({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: [
      { createdAt: 'asc' },
      { name: 'asc' },
    ],
  });
};

const findWarehouseAllocation = async (
  prisma,
  { productId, companyId, quantity, preferredWarehouseId = null },
) => {
  const requestedQuantity = Number(quantity || 0);
  if (!productId || !companyId || requestedQuantity <= 0) return null;

  const baseWhere = {
    productId,
    available: {
      gte: requestedQuantity,
    },
    warehouse: {
      companyId,
      isActive: true,
    },
  };

  if (preferredWarehouseId) {
    const preferred = await prisma.inventory.findFirst({
      where: {
        ...baseWhere,
        warehouseId: preferredWarehouseId,
      },
      orderBy: [
        { expiryDate: 'asc' },
        { updatedAt: 'asc' },
      ],
      include: {
        warehouse: true,
      },
    });

    if (preferred) return preferred;
  }

  return prisma.inventory.findFirst({
    where: baseWhere,
    orderBy: [
      { available: 'desc' },
      { expiryDate: 'asc' },
      { updatedAt: 'asc' },
    ],
    include: {
      warehouse: true,
    },
  });
};

const reserveMerchantStock = async (prisma, { merchantProductId, quantity }) => {
  const requestedQuantity = Number(quantity || 0);
  if (!merchantProductId || requestedQuantity <= 0) return null;

  const result = await prisma.merchantProduct.updateMany({
    where: {
      id: merchantProductId,
      stock: {
        gte: requestedQuantity,
      },
    },
    data: {
      stock: {
        decrement: requestedQuantity,
      },
    },
  });

  if (result.count !== 1) {
    throw new Error('مخزون التاجر لم يعد كافياً وقت حجز الطلب');
  }

  return { merchantProductId, quantity: requestedQuantity };
};

const reserveCompanyWarehouseStock = async (
  prisma,
  { productId, companyId, quantity, warehouseId, orderId, merchantOrderId },
) => {
  const requestedQuantity = Number(quantity || 0);
  const inventory = await findWarehouseAllocation(prisma, {
    productId,
    companyId,
    quantity: requestedQuantity,
    preferredWarehouseId: warehouseId,
  });

  if (!inventory) {
    throw new Error('مخزون الشركة غير كاف في أي مخزن نشط');
  }

  const result = await prisma.inventory.updateMany({
    where: {
      id: inventory.id,
      available: {
        gte: requestedQuantity,
      },
    },
    data: {
      available: {
        decrement: requestedQuantity,
      },
      reserved: {
        increment: requestedQuantity,
      },
    },
  });

  if (result.count !== 1) {
    throw new Error('تعذر حجز مخزون الشركة لهذا الطلب');
  }

  return {
    inventoryId: inventory.id,
    warehouseId: inventory.warehouseId,
    reservedQuantity: requestedQuantity,
    reference: merchantOrderId || orderId || null,
  };
};

const reserveFulfillmentItems = async (prisma, { companyId, orderId, merchantOrderId, items }) => {
  const reservedItems = [];

  for (const item of items) {
    if (item.fulfillmentSource === 'COMPANY_WAREHOUSE') {
      const reservation = await reserveCompanyWarehouseStock(prisma, {
        productId: item.productId,
        companyId,
        quantity: item.quantity,
        warehouseId: item.warehouseId,
        orderId,
        merchantOrderId,
      });

      reservedItems.push({
        ...item,
        warehouseId: reservation.warehouseId,
        inventoryId: reservation.inventoryId,
      });
      continue;
    }

    await reserveMerchantStock(prisma, {
      merchantProductId: item.merchantProductId,
      quantity: item.quantity,
    });

    reservedItems.push(item);
  }

  return reservedItems;
};

const finalizeCompanyWarehouseReservations = async (prisma, { merchantOrder, actor = null }) => {
  const items = safeJsonParse(merchantOrder?.items, []);
  if (!Array.isArray(items)) return { finalized: 0 };

  let finalized = 0;

  for (const item of items) {
    if (item.fulfillmentSource !== 'COMPANY_WAREHOUSE') continue;

    const quantity = Number(item.quantity || 0);
    if (!item.productId || quantity <= 0) continue;

    const inventory = item.inventoryId
      ? await prisma.inventory.findFirst({
          where: {
            id: item.inventoryId,
            reserved: {
              gte: quantity,
            },
          },
        })
      : await prisma.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: item.warehouseId,
            reserved: {
              gte: quantity,
            },
          },
          orderBy: [
            { expiryDate: 'asc' },
            { updatedAt: 'asc' },
          ],
        });

    if (!inventory) {
      throw new Error('لا يوجد مخزون محجوز كاف لإتمام تنفيذ طلب المخزن');
    }

    const result = await prisma.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: {
          gte: quantity,
        },
        reserved: {
          gte: quantity,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
        reserved: {
          decrement: quantity,
        },
      },
    });

    if (result.count !== 1) {
      throw new Error('تعذر خصم المخزون المحجوز عند تنفيذ الطلب');
    }

    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        warehouseId: inventory.warehouseId,
        type: 'OUT',
        reason: 'SALE',
        quantity,
        reference: merchantOrder.id,
        notes: `خصم مخزون لتنفيذ طلب تاجر ${merchantOrder.id}`,
        isApproved: true,
        userId: actor?.id || null,
        userName: actor?.name || actor?.email || 'Merchant Portal',
        approvedBy: actor?.id || null,
        approvedAt: new Date(),
      },
    });

    finalized += 1;
  }

  return { finalized };
};

const createOrUpdateShipmentForMerchantOrder = async (
  prisma,
  { order, merchant, merchantOrder, items, trackingNumber = null, externalShipmentId = null },
) => {
  const sourceSet = new Set(items.map((item) => item.fulfillmentSource || 'MERCHANT'));
  const warehouseIds = Array.from(new Set(items.map((item) => item.warehouseId).filter(Boolean)));
  const fulfillmentSource = sourceSet.size === 1 ? Array.from(sourceSet)[0] : 'MIXED';
  const warehouseId = warehouseIds.length === 1 ? warehouseIds[0] : null;
  const shippingCompany = await resolveShippingCompany(prisma, {
    companyId: order.companyId,
    merchant,
    requestedShippingCompanyId: merchantOrder.shippingCompanyId,
  });
  const destination = parseOrderDestination(order);

  const shipmentData = {
    companyId: order.companyId,
    orderId: order.id,
    merchantOrderId: merchantOrder.id,
    merchantId: merchant.id,
    fulfillmentSource,
    warehouseId,
    shippingCompanyId: shippingCompany?.id || null,
    carrierType: shippingCompany?.slug ? 'SHIPPING_COMPANY' : 'MANUAL',
    status: merchantOrder.status === 'FULFILLED' ? 'FULFILLED' : 'PENDING',
    trackingNumber: trackingNumber || merchantOrder.trackingNumber || null,
    externalShipmentId: externalShipmentId || merchantOrder.merchantOrderId || null,
    destinationGovernorate: destination.governorate,
    destinationCity: destination.city,
    destinationAddress: destination.address,
    metadata: JSON.stringify({
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      shippingCompanyName: shippingCompany?.name || null,
    }),
  };

  return prisma.shipment.upsert({
    where: {
      merchantOrderId: merchantOrder.id,
    },
    update: shipmentData,
    create: shipmentData,
  });
};

const updateShipmentOnFulfillment = async (
  prisma,
  { merchantOrder, trackingNumber = null, externalShipmentId = null },
) => prisma.shipment.updateMany({
  where: {
    merchantOrderId: merchantOrder.id,
  },
  data: {
    status: merchantOrder.status,
    trackingNumber: trackingNumber || merchantOrder.trackingNumber || null,
    externalShipmentId: externalShipmentId || merchantOrder.merchantOrderId || null,
  },
});

module.exports = {
  normalizeFulfillmentMode,
  findWarehouseAllocation,
  reserveFulfillmentItems,
  finalizeCompanyWarehouseReservations,
  createOrUpdateShipmentForMerchantOrder,
  updateShipmentOnFulfillment,
};
