/**
 * 🚀 Unified Turbo Status Sync Service
 * Single Source of Truth for updating Order and GuestOrder statuses from Turbo Express
 */

const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getSystemStatusFromTurbo } = require('../utils/statusNormalizer');
const { GUEST_ORDER_STATUS_MAP } = require('../utils/turbo/constants');

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

  // 🚨 CRITICAL GUARD: "returned" text alone (without status_code 5/14/20) is AMBIGUOUS in Turbo API.
  // Turbo returns "returned" text for is_order=1 shipments even when they are actually DELIVERED.
  // Only trust "returned_to_company" when:
  //   - status_code is explicitly 5, 14, or 20 (official Turbo return codes), OR
  //   - Arabic return phrase is confirmed in locationText/statusText
  // Without this, delivered orders with is_order=1 get wrongly marked as RETURNED.
  const statusCode = payload?.status_code || payload?.statusCode || payload?.internal_status;
  const rawStatusStr = String(rawStatus || '').toLowerCase().trim();
  const TURBO_RETURN_CODES = new Set(['5', '14', '20', 5, 14, 20]);
  const hasReturnCode = statusCode && TURBO_RETURN_CODES.has(String(statusCode));
  const hasArabicReturnPhrase = locationText && (locationText.includes('مرتجع') || locationText.includes('مرتجعات') || locationText.includes('مسترجع'));

  if (
    canonicalTurboStatus === 'returned_to_company' &&
    rawStatusStr === 'returned' &&        // ambiguous English text (not Arabic 'مرتجع')
    !hasReturnCode &&                      // no explicit return status_code
    !hasArabicReturnPhrase                 // no Arabic confirmation
  ) {
    // Cannot confirm this is a genuine return — keep it as a non-final status
    // so it can be corrected later when more info arrives (webhook/manual)
    console.warn(`⚠️ [TURBO-SYNC] Ambiguous "returned" status for order (no status_code 5/14/20 and no Arabic phrase). Skipping RETURNED update to avoid is_order=1 misclassification.`);
    canonicalTurboStatus = 'processing'; // treat as still in progress
    orderStatus = null;
    paymentStatus = null;
  }

  // 🎯 التمييز الجوهري بين (قيد الانتظار) و (قيد التنفيذ بالفرع):
  // ⚠️ ONLY apply branch-presence check when branch info is EXPLICITLY available in the payload
  // (e.g., from Webhook which always includes branch field). During manual sync/API calls,
  // branch is often missing from the response — absence of branch ≠ "not in branch".
  // Without this guard, all processing orders get wrongly downgraded to turbo_sent during sync.
  const hasBranchFieldInPayload = payload && ('branch' in payload || 'expected_branch' in payload);
  if (canonicalTurboStatus === 'processing' && hasBranchFieldInPayload && (!payload?.branch || !String(payload.branch).trim())) {
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
