/**
 * Shipping RTO Service (SHIP-W3)
 * Evaluates failed shipments against company delivery policy
 * Automates Return-to-Origin (AUTO_RTO) or flags for operations review (NEEDS_RTO_REVIEW).
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const policyService = require('./policyService');
const { recordShipmentEvent } = require('./shipmentEventService');

/**
 * Evaluate failed shipments for a company and apply policy (AUTO_RTO or REVIEW)
 * @param {string} companyId
 * @returns {Promise<{ success: boolean, evaluatedCount: number, rtoCount: number, reviewCount: number, details: Array }>}
 */
async function evaluate(companyId) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب لتقييم RTO');
    err.statusCode = 400;
    throw err;
  }

  const prisma = getSharedPrismaClient();
  const policy = await policyService.getPolicy(companyId, prisma);

  const maxAttempts = Number(policy.deliveryAttempts || policy.maxAttempts || 3);
  const rawAction = String(policy.afterAttemptsAction || policy.afterMaxAttempts || 'REVIEW').toUpperCase();
  const isAutoRto = rawAction === 'AUTO_RTO' || rawAction === 'RTO';

  // Find candidate shipments that are FAILED with attemptCount >= maxAttempts
  // and are not already in terminal status (RETURNED, DELIVERED, CANCELLED)
  const candidateShipments = await prisma.shipment.findMany({
    where: {
      companyId,
      status: 'FAILED',
      attemptCount: { gte: maxAttempts }
    },
    include: {
      order: true,
      events: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  const details = [];
  let rtoCount = 0;
  let reviewCount = 0;

  for (const shipment of candidateShipments) {
    if (isAutoRto) {
      // AUTO_RTO: Change status to RETURNED + record AUTO_RTO event
      await prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'RETURNED'
          }
        });

        await recordShipmentEvent(tx, {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: 'RETURNED',
          reasonCode: 'AUTO_RTO',
          notes: `تحويل تلقائي إلى مرتجع (AUTO_RTO) لتجاوز الحد الأقصى للمحاولات (${shipment.attemptCount}/${maxAttempts})`,
          actorType: 'SYSTEM',
          metadata: {
            autoRto: true,
            attemptCount: shipment.attemptCount,
            maxAttempts
          }
        });

        // Optional: Create ReturnRequest if order and customer exist
        if (shipment.orderId && shipment.order?.customerId) {
          try {
            const existingReturn = await tx.returnRequest.findFirst({
              where: { companyId, orderId: shipment.orderId }
            });
            if (!existingReturn) {
              await tx.returnRequest.create({
                data: {
                  companyId,
                  orderId: shipment.orderId,
                  customerId: shipment.order.customerId,
                  adminNotes: `إنشاء تلقائي عبر نظام RTO للشحنة ${shipment.trackingNumber || shipment.id}`,
                  trackingNumber: shipment.trackingNumber || shipment.barcode
                }
              });
            }
          } catch (retErr) {
            console.warn('[RTO-SERVICE] Optional ReturnRequest creation skipped:', retErr.message);
          }
        }
      });

      rtoCount++;
      details.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        action: 'AUTO_RTO',
        previousStatus: shipment.status,
        newStatus: 'RETURNED',
        attemptCount: shipment.attemptCount
      });
    } else {
      // REVIEW mode: Do not change status, tag with NEEDS_RTO_REVIEW event if not already tagged
      const alreadyTagged = shipment.events.some(e => e.reasonCode === 'NEEDS_RTO_REVIEW');

      if (!alreadyTagged) {
        await recordShipmentEvent(prisma, {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: shipment.status,
          reasonCode: 'NEEDS_RTO_REVIEW',
          notes: `شحنة بحاجة لمراجعة RTO بعد استنفاد الحد الأقصى للمحاولات (${shipment.attemptCount}/${maxAttempts})`,
          actorType: 'SYSTEM',
          metadata: {
            needsRtoReview: true,
            attemptCount: shipment.attemptCount,
            maxAttempts
          }
        });
      }

      reviewCount++;
      details.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        action: 'NEEDS_RTO_REVIEW',
        status: shipment.status,
        attemptCount: shipment.attemptCount,
        alreadyTagged
      });
    }
  }

  return {
    success: true,
    evaluatedCount: candidateShipments.length,
    rtoCount,
    reviewCount,
    isAutoRto,
    maxAttempts,
    details
  };
}

module.exports = {
  evaluate
};
