/**
 * Shipment Event Recording Service (Timeline)
 * Tracks all status transitions and operational events for shipments
 */

/**
 * Record a shipment event in the timeline
 * @param {Object} prismaClient - Prisma client or transaction instance
 * @param {Object} params - Event parameters
 */
async function recordShipmentEvent(prismaClient, {
  companyId,
  shipmentId,
  fromStatus = null,
  toStatus,
  reasonCode = null,
  notes = null,
  actorType = 'SYSTEM',
  actorId = null,
  actorName = null,
  branchId = null,
  metadata = null,
}) {
  if (!prismaClient || !companyId || !shipmentId || !toStatus) {
    return null;
  }

  const metaString = metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || null);

  return prismaClient.shipmentEvent.create({
    data: {
      companyId,
      shipmentId,
      fromStatus: fromStatus || null,
      toStatus: String(toStatus),
      reasonCode: reasonCode ? String(reasonCode) : null,
      notes: notes ? String(notes) : null,
      actorType: String(actorType || 'SYSTEM').toUpperCase(),
      actorId: actorId ? String(actorId) : null,
      actorName: actorName ? String(actorName) : null,
      branchId: branchId ? String(branchId) : null,
      metadata: metaString,
    },
  });
}

module.exports = {
  recordShipmentEvent,
};
