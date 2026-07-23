/**
 * 🚀 Unified Turbo Status Sync Service
 * Single Source of Truth for updating Order and GuestOrder statuses from Turbo Express
 */

const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getSystemStatusFromTurbo } = require('../utils/statusNormalizer');

/**
 * Mappings for GuestOrder string statuses
 */
const GUEST_ORDER_STATUS_MAP = {
  'DELIVERED': 'DELIVERED',
  'SHIPPED': 'SHIPPED',
  'PROCESSING': 'PROCESSING',
  'CANCELLED': 'CANCELLED',
  'RETURNED': 'RETURNED',
  'ON_HOLD': 'ON_HOLD'
};

/**
 * Synchronize Turbo shipment status update across Order / GuestOrder tables
 * 
 * @param {Object} params
 * @param {string} params.orderId - Database ID or orderNumber
 * @param {string} params.orderNumber - Order Number
 * @param {string} [params.companyId] - Company ID (optional for global webhook lookup)
 * @param {string|number} params.rawStatus - Raw status code/string from Turbo API/Webhook
 * @param {Object} [params.payload] - Additional payload/metadata from Webhook or API
 * @param {boolean} [params.isGuestOrder] - Whether the target is a GuestOrder
 * @returns {Promise<Object>} Updated status result
 */
async function syncTurboStatusToOrder({
  orderId,
  orderNumber,
  companyId = null,
  rawStatus,
  payload = {},
  isGuestOrder = false
}) {
  const prisma = getSharedPrismaClient();

  const locationText = payload?.currentLocation || payload?.statusText || payload?.status_name || payload?.statusName || '';
  let { canonicalTurboStatus, orderStatus, paymentStatus } = getSystemStatusFromTurbo(
    (locationText && (locationText.includes('انتظار') || locationText.includes('بانتظار') || locationText.includes('التسليم لتربو') || locationText.includes('تأجيل') || locationText.includes('مؤجل') || locationText.includes('مرتجع')))
      ? locationText
      : rawStatus
  );

  // 🎯 التمييز الجوهري بين (قيد الانتظار) و (قيد التنفيذ بالفرع):
  // إذا كانت الشحنة لم تدخل فرع تربو بعد (branch null/empty)، فإن حالتها في تربو هي "قيد الانتظار" (turbo_sent)
  if (canonicalTurboStatus === 'processing' && (!payload?.branch || !String(payload.branch).trim())) {
    canonicalTurboStatus = 'turbo_sent';
    orderStatus = null;
  }

  console.log(`📦 [TURBO-SYNC] Syncing order ${orderNumber || orderId}: rawStatus="${rawStatus}" -> canonical="${canonicalTurboStatus}", systemOrderStatus="${orderStatus}", systemPaymentStatus="${paymentStatus}", companyId=${companyId || 'global'}`);

  // Helper to build flexible lookup filters
  const buildLookupWhere = () => {
    const searchValues = Array.from(new Set([
      orderId,
      orderNumber,
      payload.remote_order_id,
      payload.order_number
    ].filter(Boolean).map(v => String(v).trim())));

    const orConditions = searchValues.flatMap(val => [
      { id: val },
      { orderNumber: val },
      { turboTrackingNumber: val },
      { turboShipmentId: val }
    ]);

    const where = { OR: orConditions };
    if (companyId) {
      where.companyId = companyId;
    }
    return where;
  };

  // Target 1: GuestOrder Table
  if (isGuestOrder) {
    const existingGuestOrder = await safeQuery(() => prisma.guestOrder.findFirst({
      where: buildLookupWhere()
    }), 3);

    if (!existingGuestOrder) {
      console.warn(`⚠️ [TURBO-SYNC] GuestOrder not found for orderNumber/ID: ${orderNumber || orderId}`);
      return { success: false, reason: 'GuestOrder not found' };
    }

    let existingMeta = {};
    try {
      if (existingGuestOrder.metadata) {
        existingMeta = typeof existingGuestOrder.metadata === 'object'
          ? existingGuestOrder.metadata
          : JSON.parse(existingGuestOrder.metadata);
      }
    } catch (e) {
      existingMeta = {};
    }

    const extractedGuestCost = payload.actual_shipping_cost ?? payload.shipping_cost ?? payload.delivery_cost ?? payload.shipping_fee ?? payload.total_shipping_cost ?? payload.delivery_fee ?? payload.cost;

    const updatedMetadata = {
      ...existingMeta,
      turboWebhook: payload,
      turboStatus: canonicalTurboStatus,
      turboStatusCode: rawStatus,
      updatedAt: new Date().toISOString()
    };

    if (extractedGuestCost !== undefined && extractedGuestCost !== null && !isNaN(parseFloat(extractedGuestCost))) {
      const realCost = parseFloat(extractedGuestCost);
      if (realCost > 0) {
        updatedMetadata.actualShippingCost = realCost;
        updatedMetadata.actualShippingCostSource = 'turbo-live-api';
      }
    }

    const updateData = {
      turboShipmentStatus: canonicalTurboStatus,
      turboMetadata: JSON.stringify(updatedMetadata),
      metadata: JSON.stringify(updatedMetadata),
      updatedAt: new Date()
    };

    if (orderStatus && GUEST_ORDER_STATUS_MAP[orderStatus]) {
      updateData.status = GUEST_ORDER_STATUS_MAP[orderStatus];
    }

    if (payload.order_number) {
      updateData.turboTrackingNumber = String(payload.order_number);
      updateData.turboShipmentId = String(payload.order_number);
    }

    await safeQuery(() => prisma.guestOrder.update({
      where: { id: existingGuestOrder.id },
      data: updateData
    }), 3);

    // Emit Socket.IO
    emitSocketEvent(existingGuestOrder.companyId, {
      orderNumber: existingGuestOrder.orderNumber,
      orderId: existingGuestOrder.id,
      status: canonicalTurboStatus,
      rawStatus,
      systemOrderStatus: updateData.status || existingGuestOrder.status,
      isGuestOrder: true,
      timestamp: new Date().toISOString(),
      data: payload
    });

    return {
      success: true,
      isGuestOrder: true,
      turboStatus: canonicalTurboStatus,
      orderStatus: updateData.status || existingGuestOrder.status
    };
  }

  // Target 2: Standard Order Table
  const existingOrder = await safeQuery(() => prisma.order.findFirst({
    where: buildLookupWhere()
  }), 3);

  if (!existingOrder) {
    // If not found in Order, check GuestOrder as fallback
    const guestFallback = await syncTurboStatusToOrder({
      orderId,
      orderNumber,
      companyId,
      rawStatus,
      payload,
      isGuestOrder: true
    });
    return guestFallback;
  }

  let turboMetaObj = {};
  try {
    if (existingOrder.turboMetadata) {
      turboMetaObj = typeof existingOrder.turboMetadata === 'object'
        ? existingOrder.turboMetadata
        : JSON.parse(existingOrder.turboMetadata);
    }
  } catch (e) {
    turboMetaObj = {};
  }

  const extractedCost = payload.actual_shipping_cost ?? payload.shipping_cost ?? payload.delivery_cost ?? payload.shipping_fee ?? payload.total_shipping_cost ?? payload.delivery_fee ?? payload.cost;

  turboMetaObj = {
    ...turboMetaObj,
    ...payload,
    statusCode: rawStatus,
    statusText: canonicalTurboStatus,
    updatedAt: new Date().toISOString()
  };

  if (extractedCost !== undefined && extractedCost !== null && !isNaN(parseFloat(extractedCost))) {
    const realCost = parseFloat(extractedCost);
    if (realCost > 0) {
      turboMetaObj.actualShippingCost = realCost;
      turboMetaObj.actualShippingCostSource = 'turbo-live-api';
    }
  }

  const updateData = {
    turboShipmentStatus: canonicalTurboStatus,
    turboMetadata: JSON.stringify(turboMetaObj),
    updatedAt: new Date()
  };

  if (payload.order_number && String(payload.order_number) !== String(existingOrder.turboTrackingNumber)) {
    updateData.turboTrackingNumber = String(payload.order_number);
    updateData.turboShipmentId = String(payload.order_number);
  }

  if (orderStatus) {
    updateData.status = orderStatus;
  }

  if (paymentStatus) {
    updateData.paymentStatus = paymentStatus;
  }

  await safeQuery(() => prisma.order.update({
    where: { id: existingOrder.id },
    data: updateData
  }), 3);

  console.log(`✅ [TURBO-SYNC] Updated Order ${existingOrder.orderNumber}: turboStatus="${canonicalTurboStatus}", status="${updateData.status || existingOrder.status}", paymentStatus="${updateData.paymentStatus || existingOrder.paymentStatus}"`);

  // Emit Socket.IO
  emitSocketEvent(existingOrder.companyId, {
    orderNumber: existingOrder.orderNumber,
    orderId: existingOrder.id,
    status: canonicalTurboStatus,
    rawStatus,
    systemOrderStatus: updateData.status || existingOrder.status,
    systemPaymentStatus: updateData.paymentStatus || existingOrder.paymentStatus,
    isGuestOrder: false,
    timestamp: new Date().toISOString(),
    data: payload
  });

  return {
    success: true,
    isGuestOrder: false,
    turboStatus: canonicalTurboStatus,
    orderStatus: updateData.status || existingOrder.status,
    paymentStatus: updateData.paymentStatus || existingOrder.paymentStatus
  };
}

function emitSocketEvent(companyId, eventData) {
  try {
    const socketService = require('./socketService');
    const io = socketService.getIO();
    if (io && companyId) {
      const roomName = `company_${companyId}`;
      io.to(roomName).emit('turbo_shipment_update', eventData);
      console.log(`📡 [TURBO-SYNC] Socket event emitted to room ${roomName}`);
    }
  } catch (err) {
    console.warn('⚠️ [TURBO-SYNC] Failed emitting socket event:', err.message);
  }
}

module.exports = {
  syncTurboStatusToOrder
};
