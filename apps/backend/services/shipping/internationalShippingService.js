/**
 * International Shipping & Customs Acknowledgment Service (SHIP-T4)
 * Handles international shipment conversions, customs acknowledgments, and approval workflows.
 * Scoped to companyId. Zero blast radius on existing flows.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { recordShipmentEvent } = require('./shipmentEventService');

function serviceError(message, statusCode, code) {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

/**
 * Converts a domestic shipment to an international shipment and creates/resets its customs acknowledgment.
 */
async function convertToInternational(companyId, shipmentId, data = {}, user = {}) {
  const prisma = getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
  });

  if (!shipment) {
    throw serviceError('الشحنة غير موجودة أو غير تابعة لهذه الشركة', 404, 'SHIPMENT_NOT_FOUND');
  }

  const destinationCountry = data.destinationCountry?.trim() || shipment.destinationGovernorate || 'International';
  const destinationCityIntl = data.destinationCityIntl?.trim() || data.destinationCity?.trim() || shipment.destinationCity || null;
  const rawCustoms = data.customsValue !== undefined && data.customsValue !== null ? Number(data.customsValue) : (shipment.declaredValue ? Number(shipment.declaredValue) : null);
  const customsValue = Number.isFinite(rawCustoms) ? rawCustoms : null;
  const customerName = data.customerName?.trim() || shipment.recipientName || 'عميل دولي';
  const contentDescription = data.contentDescription?.trim() || shipment.contentDescription || null;
  const notes = data.notes?.trim() || null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        isInternational: true,
        destinationCountry,
        destinationCityIntl,
        customsValue,
        intlAckStatus: 'PENDING',
      },
    });

    const acknowledgment = await tx.internationalAcknowledgment.upsert({
      where: { shipmentId: shipment.id },
      create: {
        companyId,
        shipmentId: shipment.id,
        customerName,
        contentDescription,
        customsValue,
        status: 'PENDING',
        notes,
      },
      update: {
        customerName,
        contentDescription,
        customsValue,
        status: 'PENDING',
        notes,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    try {
      await recordShipmentEvent(tx, {
        companyId,
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: shipment.status,
        reasonCode: 'INTERNATIONAL_CONVERTED',
        notes: `تحويل لشحنة دولية: ${destinationCountry} - الإقرار قيد المراجعة`,
        actorType: 'ADMIN',
        actorId: user.id || user.userId || null,
        actorName: user.name || 'إدارة الشحن',
      });
    } catch (_) {}

    return { shipment: updatedShipment, acknowledgment };
  });

  return result;
}

/**
 * Returns pending international acknowledgments for review.
 */
async function getPendingAcknowledgments(companyId, { page = 1, limit = 50 } = {}) {
  const prisma = getSharedPrismaClient();
  const take = Math.max(1, Math.min(Number(limit) || 50, 100));
  const skip = Math.max(0, ((Number(page) || 1) - 1) * take);

  const where = { companyId, status: 'PENDING' };

  const [total, items] = await Promise.all([
    prisma.internationalAcknowledgment.count({ where }),
    prisma.internationalAcknowledgment.findMany({
      where,
      include: {
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
            barcode: true,
            status: true,
            recipientName: true,
            recipientPhone: true,
            destinationCountry: true,
            destinationCityIntl: true,
            customsValue: true,
            codAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    total,
    page: Number(page) || 1,
    limit: take,
    acknowledgments: items,
  };
}

/**
 * Review an acknowledgment (APPROVE or REJECT).
 * Can be looked up by acknowledgment id OR shipmentId.
 */
async function reviewAcknowledgment(companyId, idOrShipmentId, { status, notes } = {}, user = {}) {
  const prisma = getSharedPrismaClient();

  const normalizedStatus = String(status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    throw serviceError('الحالة غير صحيحة، يجب أن تكون APPROVED أو REJECTED', 400, 'INVALID_STATUS');
  }

  const ack = await prisma.internationalAcknowledgment.findFirst({
    where: {
      companyId,
      OR: [
        { id: idOrShipmentId },
        { shipmentId: idOrShipmentId },
      ],
    },
    include: { shipment: true },
  });

  if (!ack) {
    throw serviceError('الإقرار الجمركي غير موجود', 404, 'ACKNOWLEDGMENT_NOT_FOUND');
  }

  const reviewerName = user.name || user.email || user.id || 'OPERATIONS';

  const result = await prisma.$transaction(async (tx) => {
    const updatedAck = await tx.internationalAcknowledgment.update({
      where: { id: ack.id },
      data: {
        status: normalizedStatus,
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        notes: notes ? String(notes).trim() : ack.notes,
      },
    });

    const updatedShipment = await tx.shipment.update({
      where: { id: ack.shipmentId },
      data: {
        intlAckStatus: normalizedStatus,
      },
    });

    try {
      await recordShipmentEvent(tx, {
        companyId,
        shipmentId: ack.shipmentId,
        fromStatus: ack.shipment?.status || 'PENDING',
        toStatus: ack.shipment?.status || 'PENDING',
        reasonCode: `INTL_ACK_${normalizedStatus}`,
        notes: `مراجعة الإقرار الجمركي: ${normalizedStatus} بواسطة ${reviewerName}`,
        actorType: 'ADMIN',
        actorId: user.id || null,
        actorName: reviewerName,
      });
    } catch (_) {}

    return { acknowledgment: updatedAck, shipment: updatedShipment };
  });

  return result;
}

module.exports = {
  convertToInternational,
  getPendingAcknowledgments,
  reviewAcknowledgment,
  serviceError,
};
