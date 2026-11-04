/**
 * Shipping RTO Service (SHIP-W3 / SHIP-W11.1)
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
  // or already RETURNED shipments where attemptCount >= maxAttempts and rtoCost is not yet set
  const candidateShipments = await prisma.shipment.findMany({
    where: {
      companyId,
      OR: [
        {
          status: 'FAILED',
          attemptCount: { gte: maxAttempts }
        },
        {
          status: 'RETURNED',
          attemptCount: { gte: maxAttempts },
          rtoCost: null
        }
      ]
    },
    include: {
      order: true,
      courier: true,
      events: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  const details = [];
  let rtoCount = 0;
  let reviewCount = 0;

  for (const shipment of candidateShipments) {
    if (isAutoRto) {
      // 1. Determine RTO return leg cost according to policy (SHIP-W11.1 / SHP-30)
      let rtoCostToApply = null;
      let priceSource = 'NONE';

      if (policy.rtoChargeReturnLeg) {
        if (policy.rtoReturnLegPrice !== null && policy.rtoReturnLegPrice !== undefined && !isNaN(Number(policy.rtoReturnLegPrice))) {
          rtoCostToApply = Number(policy.rtoReturnLegPrice);
          priceSource = 'POLICY_FIXED';
        } else {
          try {
            const { resolveShippingQuoteForGovernorate } = require('../../controller/shippingZoneController');
            const zoneQuote = await resolveShippingQuoteForGovernorate(companyId, shipment.destinationGovernorate);
            if (zoneQuote && zoneQuote.price) {
              rtoCostToApply = Number(zoneQuote.price);
              priceSource = 'ZONE_RETURN_LEG';
            }
          } catch (zErr) {
            console.warn('[RTO-SERVICE] Zone quote fallback warning:', zErr.message);
          }
        }
      }

      // Idempotence: if shipment already has rtoCost set, keep it (never double)
      const finalRtoCost = shipment.rtoCost !== null && shipment.rtoCost !== undefined
        ? Number(shipment.rtoCost)
        : rtoCostToApply;

      const currentCost = Number(shipment.cost || 0);
      let courierCost = shipment.courierCost !== null && shipment.courierCost !== undefined
        ? Number(shipment.courierCost)
        : 0;

      if (shipment.courierCost === null || shipment.courierCost === undefined) {
        try {
          const profitService = require('./profitService');
          const computed = await profitService.computeCourierCost(shipment, shipment.courier);
          courierCost = computed.courierCost;
        } catch (cErr) {
          console.warn('[RTO-SERVICE] Courier cost compute notice:', cErr.message);
        }
      }

      const effectiveRtoCost = finalRtoCost !== null ? Number(finalRtoCost) : 0;
      const marginAmount = Math.round((currentCost - courierCost - effectiveRtoCost) * 100) / 100;

      // AUTO_RTO: Change status to RETURNED + persist rtoCost & recalculated margin
      await prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'RETURNED',
            rtoCost: finalRtoCost,
            courierCost,
            marginAmount
          }
        });

        // Record AUTO_RTO event if fromStatus is not already RETURNED
        if (shipment.status !== 'RETURNED') {
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
        }

        // Record RTO_COST_APPLIED event if cost applied and not already recorded (no duplicates)
        if (effectiveRtoCost > 0) {
          const existingRtoEvent = await tx.shipmentEvent.findFirst({
            where: {
              shipmentId: shipment.id,
              reasonCode: 'RTO_COST_APPLIED'
            }
          });

          if (!existingRtoEvent) {
            await recordShipmentEvent(tx, {
              companyId,
              shipmentId: shipment.id,
              fromStatus: shipment.status,
              toStatus: 'RETURNED',
              reasonCode: 'RTO_COST_APPLIED',
              notes: `تطبيق تكلفة رحلة العودة (RTO): ${effectiveRtoCost} ج.م`,
              actorType: 'SYSTEM',
              metadata: {
                rtoCost: effectiveRtoCost,
                priceSource,
                marginAmount,
                courierCost
              }
            });
          }
        }

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
        attemptCount: shipment.attemptCount,
        rtoCost: finalRtoCost,
        marginAmount
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
