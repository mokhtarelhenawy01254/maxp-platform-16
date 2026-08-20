/**
 * Partial Return Service
 * ╪╣┘å╪» ┘ê╪╡┘ê┘ä ╪┤╪¡┘å╪⌐ R (╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è)╪î ╪¿┘å╪╣┘à┘ä ╪ú┘ê╪▒╪»╪▒ ╪¼╪»┘è╪» ┘ä┘ä┘à╪▒╪¬╪¼╪╣
 */
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

async function ensureReturnOrder(originalOrder, rCode, turboStatus) {
  const prisma = getSharedPrismaClient();
  const returnOrderNum = `R-${originalOrder.orderNumber}`;

  // Check if return order already exists by order number
  const existing = await safeQuery(() =>
    prisma.order.findFirst({
      where: { companyId: originalOrder.companyId, orderNumber: returnOrderNum }
    }), 2
  );
  if (existing) return existing;

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

  console.log(`Γ£à [PARTIAL-RETURN] Created return order ${returnOrderNum} for ${rCode}`);
  return newOrder;
}

module.exports = { ensureReturnOrder };
