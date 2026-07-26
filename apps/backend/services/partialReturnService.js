/**
 * Partial Return Service
 * عند وصول شحنة R (تسليم جزئي)، بنعمل أوردر جديد للمرتجع
 */
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

async function ensureReturnOrder(originalOrder, rCode, turboStatus) {
  const prisma = getSharedPrismaClient();

  // Check if return order already exists for this R code
  const existing = await safeQuery(() =>
    prisma.order.findFirst({
      where: { companyId: originalOrder.companyId, turboShipmentId: rCode }
    }), 2
  );
  if (existing) return existing;

  // Create new return order
  const returnOrderNum = `R-${originalOrder.orderNumber}`;

  const newOrder = await safeQuery(() =>
    prisma.order.create({
      data: {
        orderNumber: returnOrderNum,
        companyId: originalOrder.companyId,
        customerId: originalOrder.customerId,
        status: 'RETURNED',
        turboShipmentId: rCode,
        turboTrackingNumber: rCode,
        turboShipmentStatus: turboStatus || 'returned_received',
        customerName: originalOrder.customerName,
        customerPhone: originalOrder.customerPhone,
        customerEmail: originalOrder.customerEmail,
        shippingAddress: originalOrder.shippingAddress,
        billingAddress: originalOrder.billingAddress,
        city: originalOrder.city,
        governorate: originalOrder.governorate,
        customerAddress: originalOrder.customerAddress,
        total: 0,
        subtotal: 0,
        shipping: 0,
        paymentMethod: 'CASH',
        metadata: JSON.stringify({
          isPartialReturn: true,
          originalOrderId: originalOrder.id,
          originalOrderNumber: originalOrder.orderNumber,
          rTurboCode: rCode,
          createdAt: new Date().toISOString()
        }),
        turboMetadata: JSON.stringify({
          isPartialReturn: true,
          originalOrderNumber: originalOrder.orderNumber,
          rTurboCode: rCode
        })
      }
    }), 2
  );

  console.log(`✅ [PARTIAL-RETURN] Created return order ${returnOrderNum} for ${rCode}`);
  return newOrder;
}

module.exports = { ensureReturnOrder };
