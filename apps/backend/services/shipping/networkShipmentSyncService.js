const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');
const tenantContext = require('../tenantContext');
const { recordShipmentEvent } = require('./shipmentEventService');

// AsyncLocalStorage to prevent recursive synchronization loops
const suppressionStorage = new AsyncLocalStorage();

function isSuppressed() {
  return Boolean(suppressionStorage.getStore());
}

function runSuppressed(fn) {
  return suppressionStorage.run(true, fn);
}

function mapCarrierStatusToStoreStatus(carrierStatus) {
  const norm = String(carrierStatus || '').trim().toUpperCase();
  if (norm === 'DELIVERED') {
    return { orderStatus: 'DELIVERED', paymentStatus: 'COMPLETED', isCancelled: false };
  }
  if (norm === 'RETURNED') {
    return { orderStatus: 'RETURNED', paymentStatus: null, isCancelled: false };
  }
  if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'SHIPPED'].includes(norm)) {
    return { orderStatus: 'SHIPPED', customStatusCode: 'OUT_FOR_DELIVERY', paymentStatus: null, isCancelled: false };
  }
  if (norm === 'DELAYED') {
    return { orderStatus: 'SHIPPED', customStatusCode: 'DELAYED_WITH_CAPTAIN', paymentStatus: null, isCancelled: false };
  }
  if (norm === 'CANCELLED') {
    // Policy: Cancelled shipment does NOT auto-cancel the order — requires manual store decision
    return { orderStatus: null, paymentStatus: null, isCancelled: true };
  }
  return { orderStatus: null, paymentStatus: null, isCancelled: false };
}

/**
 * Synchronize a shipment's status change from the shipping company tenant
 * back to the linked store's order and shipment records.
 *
 * @param {Object} prismaClient - Prisma instance
 * @param {Object|string} shipmentOrId - The carrier shipment or its ID
 * @param {string} toStatus - The new carrier status (DELIVERED, RETURNED, etc.)
 * @param {Object} [options] - Additional metadata, notes, actor
 */
async function syncNetworkShipmentToStore(prismaClient, shipmentOrId, toStatus, options = {}) {
  if (isSuppressed()) {
    return { success: true, skipped: true, reason: 'SUPPRESSED_LOOP_PREVENTION' };
  }

  const prisma = prismaClient || getSharedPrismaClient();

  // Load shipment if ID was passed
  let shipment = shipmentOrId;
  if (typeof shipmentOrId === 'string') {
    shipment = await prisma.shipment.findUnique({
      where: { id: shipmentOrId },
      include: { merchant: true },
    });
  }

  if (!shipment || !shipment.orderId || !shipment.merchantId) {
    return { success: false, skipped: true, reason: 'NOT_A_NETWORK_SHIPMENT' };
  }

  // Find merchant to discover the store's companyId
  let merchant = shipment.merchant;
  if (!merchant && shipment.merchantId) {
    merchant = await prisma.merchant.findUnique({
      where: { id: shipment.merchantId },
    });
  }

  const storeCompanyId = merchant?.linkedCompanyId;
  if (!storeCompanyId || storeCompanyId === shipment.companyId) {
    return { success: false, skipped: true, reason: 'NO_LINKED_STORE_COMPANY' };
  }

  const normalizedStatus = String(toStatus || shipment.status || '').trim().toUpperCase();
  const { orderStatus, paymentStatus, isCancelled } = mapCarrierStatusToStoreStatus(normalizedStatus);

  return runSuppressed(async () => {
    return tenantContext.run(storeCompanyId, async () => {
      // Find the store's order
      const storeOrder = await prisma.order.findFirst({
        where: { id: shipment.orderId, companyId: storeCompanyId },
      });

      if (!storeOrder) {
        return { success: false, skipped: true, reason: 'STORE_ORDER_NOT_FOUND' };
      }

      // Check if update is needed
      const orderNeedsUpdate = orderStatus && storeOrder.status !== orderStatus && !isCancelled;
      const paymentNeedsUpdate = paymentStatus && storeOrder.paymentStatus !== paymentStatus;

      if (orderNeedsUpdate || paymentNeedsUpdate) {
        const updateData = {};
        if (orderNeedsUpdate) updateData.status = orderStatus;
        if (paymentNeedsUpdate) updateData.paymentStatus = paymentStatus;

        await prisma.order.update({
          where: { id: storeOrder.id },
          data: updateData,
        });

        await prisma.orderStatusHistory.create({
          data: {
            orderId: storeOrder.id,
            status: orderStatus || storeOrder.status,
            oldStatus: storeOrder.status,
            changedBy: options.actorId || 'SYSTEM',
            reason: options.reason || `تحديث حالة الشحنة عبر شبكة MaxP (${normalizedStatus})`,
          },
        });
      } else if (isCancelled) {
        // Record event for cancellation without changing order status
        await prisma.orderStatusHistory.create({
          data: {
            orderId: storeOrder.id,
            status: storeOrder.status,
            oldStatus: storeOrder.status,
            changedBy: options.actorId || 'SYSTEM',
            reason: options.reason || 'تم إلغاء الشحنة لدى شركة الشحن (يحتاج قرار يدوي لإلغاء الطلب)',
          },
        });
      }

      // Also update the store's local Shipment record if one exists
      const storeShipment = await prisma.shipment.findFirst({
        where: { orderId: storeOrder.id, companyId: storeCompanyId },
      });

      if (storeShipment && storeShipment.status !== normalizedStatus) {
        const shipmentUpdateData = {
          status: normalizedStatus,
        };

        // COD: collectedAmount remains owned by the shipping company; store reflects it
        if (shipment.collectedAmount !== undefined && shipment.collectedAmount !== null) {
          shipmentUpdateData.collectedAmount = shipment.collectedAmount;
        }

        await prisma.shipment.update({
          where: { id: storeShipment.id },
          data: shipmentUpdateData,
        });

        await recordShipmentEvent(prisma, {
          companyId: storeCompanyId,
          shipmentId: storeShipment.id,
          fromStatus: storeShipment.status,
          toStatus: normalizedStatus,
          reasonCode: options.reasonCode || null,
          notes: options.notes || `تحديث تلقائي من شركة الشحن عبر شبكة MaxP: ${normalizedStatus}`,
          actorType: options.actorType || 'SYSTEM',
          actorId: options.actorId || null,
        });
      }

      return {
        success: true,
        orderUpdated: Boolean(orderNeedsUpdate),
        storeOrder: { id: storeOrder.id, status: orderStatus || storeOrder.status },
        normalizedStatus,
      };
    });
  });
}

module.exports = {
  isSuppressed,
  runSuppressed,
  mapCarrierStatusToStoreStatus,
  syncNetworkShipmentToStore,
};
