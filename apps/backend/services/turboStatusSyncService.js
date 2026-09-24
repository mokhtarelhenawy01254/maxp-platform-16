/**
 * 🚀 Unified Turbo Status Sync Service
 * Single Source of Truth for updating Order and GuestOrder statuses from Turbo Express
 */

const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getSystemStatusFromTurbo, getSystemStatusFromTurboWithCustomMapping } = require('../utils/statusNormalizer');
const { GUEST_ORDER_STATUS_MAP } = require('../utils/turbo/constants');
const { ensureReturnOrder } = require('./partialReturnService');
const { isValidOrderStatusEnum, resolveOrderStatusForStorage } = require('../utils/orderStatusEnum');
const orderService = require('./orderService');

/**
 * Fetch per-company turboStatusMapping from company settings.
 * Returns null if no custom mapping is configured.
 */
async function getCompanyTurboMapping(companyId) {
  if (!companyId) return null;
  try {
    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });
    if (!company?.settings) return null;
    const parsed = typeof company.settings === 'string' ? JSON.parse(company.settings) : company.settings;
    return parsed.turboStatusMapping || null;
  } catch (e) {
    console.warn(`⚠️ [TURBO-SYNC] Failed to fetch company turbo mapping for ${companyId}:`, e.message);
    return null;
  }
}

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
  isGuestOrder = false,
  isReturnOrderSync = false
}) {
  const prisma = getSharedPrismaClient();

  const turboCode = payload?.code || payload?.order_number || '';
  const isPartialReturn = /R$/i.test(turboCode) && !isReturnOrderSync;

  const locationText = payload?.currentLocation || payload?.statusText || payload?.status_name || payload?.statusName || '';
  const rawStatusInput = (locationText && (locationText.includes('انتظار') || locationText.includes('بانتظار') || locationText.includes('التسليم لتربو') || locationText.includes('تأجيل') || locationText.includes('مؤجل') || locationText.includes('مرتجع')))
    ? locationText
    : rawStatus;

  // Fetch per-company custom mapping if companyId is available
  const customMapping = companyId ? await getCompanyTurboMapping(companyId) : null;

  let { canonicalTurboStatus, orderStatus, paymentStatus } = customMapping
    ? getSystemStatusFromTurboWithCustomMapping(rawStatusInput, customMapping)
    : getSystemStatusFromTurbo(rawStatusInput);

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
  // ⚠️ ONLY downgrade processing→turbo_sent when we have CONFIRMED branch info from Webhook.
  // During API sync (fetchAllStatuses), branch=null does NOT mean "not in branch" —
  // Turbo's get-status API often omits branch even for status_code=3 orders.
  // Guard: only fire if payload has explicit 'isWebhook' marker OR branch has a non-null VALUE.
  const hasBranchFieldInPayload = payload && ('branch' in payload || 'expected_branch' in payload);
  const isWebhookPayload = payload?.isWebhook === true || payload?.source === 'webhook';
  const branchValue = payload?.branch || payload?.expected_branch;
  const hasExplicitBranch = branchValue && String(branchValue).trim().length > 0;
  if (
    canonicalTurboStatus === 'processing' &&
    hasBranchFieldInPayload &&
    !hasExplicitBranch &&      // branch is null/empty
    !isWebhookPayload          // AND not from a trusted Webhook source
  ) {
    // API sync with null branch — do NOT downgrade processing to turbo_sent.
    // The absence of branch in get-status API doesn't mean the order left the branch.
    console.warn(`⚠️ [TURBO-SYNC] Skipping processing→turbo_sent downgrade (null branch from API sync, not webhook).`);
    // Keep canonicalTurboStatus as 'processing'
  }

  console.log(`📦 [TURBO-SYNC] Syncing order ${orderNumber || orderId}: rawStatus="${rawStatus}" -> canonical="${canonicalTurboStatus}", systemOrderStatus="${orderStatus}", systemPaymentStatus="${paymentStatus}", companyId=${companyId || 'global'}`);

  // Helper to build flexible lookup filters
  const buildLookupWhere = () => {
    const rawValues = [
      orderId,
      orderNumber,
      payload.remote_order_id,
      payload.order_number
    ];

    const searchValues = Array.from(new Set(
      rawValues
        .filter(v => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0 && v !== 'undefined' && v !== 'null')
        .map(v => String(v).trim())
    ));

    // Also try without 'R' suffix for each value
    const rSuffixValues = searchValues.flatMap(val => [
      val,
      val.replace(/R$/i, ''),
      val + 'R'
    ]);
    const allValues = Array.from(new Set(rSuffixValues));

    const orConditions = allValues.flatMap(val => [
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
    let existingGuestOrder = await safeQuery(() => prisma.guestOrder.findFirst({
      where: buildLookupWhere()
    }), 3);

    // 🚨 Fallback: If not found under the provided companyId, search globally
    if (!existingGuestOrder && companyId) {
      const globalWhere = { OR: buildLookupWhere().OR };
      const globalGuest = await safeQuery(() => prisma.guestOrder.findFirst({
        where: globalWhere
      }), 3);
      if (globalGuest) {
        console.log(`🔄 [TURBO-SYNC] GuestOrder found in company ${globalGuest.companyId} (falling back from ${companyId})`);
        existingGuestOrder = globalGuest;
        companyId = globalGuest.companyId;
      }
    }

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
      turboCaptainName: payload.captain_name || payload.captain || null,
      turboCaptainPhone: payload.captain_number1 || null,
      turboBranchName: payload.branch_name || payload.branch || null,
      turboBranchPhone: payload.branch_number1 || null,
      turboDelayReason: payload.delay_reason || null,
      turboReturnReason: payload.return_reason || payload.return_status_text || null,
      turboExpectedBranch: payload.expected_branch || null,
      updatedAt: new Date()
    };

    if (orderStatus && GUEST_ORDER_STATUS_MAP[orderStatus]) {
      updateData.status = GUEST_ORDER_STATUS_MAP[orderStatus];
    }

    if (payload.order_number) {
      updateData.turboTrackingNumber = String(payload.order_number);
      updateData.turboShipmentId = String(payload.order_number);
    }

    // 🚨 PRODUCTION-FIX (turbo-notification-gap): قبل التحديث المباشر لحقول تربو،
    // مرّر تغيير حالة الطلب عبر orderService.updateGuestOrderStatus — لأنه المسار الوحيد
    // اللي بيكتب statusHistory وبيبعث إشعار WhatsApp (sendOrderStatusNotification) وبيشغّل
    // side-effects (كاش باك/ولاء عند DELIVERED). كان السينك القديم بيعدّل guestOrder.status
    // مباشرة في الـ DB من غير أي إشعار — فالأوردرات اللي بتتحرك تلقائياً من تربو
    // (webhook / sync-status / refresh) كانت بتفضل من غير رسالة للعميل.
    const guestTargetStatus = orderStatus && GUEST_ORDER_STATUS_MAP[orderStatus] ? GUEST_ORDER_STATUS_MAP[orderStatus] : null;
    const guestStatusChanged = Boolean(guestTargetStatus) && guestTargetStatus !== existingGuestOrder.status;
    if (guestStatusChanged) {
      try {
        const turboReason = payload.return_reason || payload.return_status_text || payload.delay_reason;
        const noteText = turboReason
          ? `${turboReason} (تحديث تلقائي من تربو - ${canonicalTurboStatus})`
          : `تحديث تلقائي من تربو (${canonicalTurboStatus})`;
        await orderService.updateGuestOrderStatus(
          existingGuestOrder.orderNumber,
          companyId,
          guestTargetStatus,
          noteText,
          'SYSTEM',
          'Turbo Sync',
          null,
          { skipCallAttemptGuard: true, skipTransitionValidation: true }
        );
        console.log(`✅ [TURBO-SYNC] GuestOrder ${existingGuestOrder.orderNumber} status -> ${guestTargetStatus} via orderService (notification + history).`);
      } catch (guestStatusErr) {
        console.warn(`⚠️ [TURBO-SYNC] GuestOrder status update via orderService failed for ${existingGuestOrder.orderNumber}:`, guestStatusErr.message);
      }
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
  let existingOrder = await safeQuery(() => prisma.order.findFirst({
    where: buildLookupWhere()
  }), 3);

  // 🚨 Fallback: If not found under the provided companyId, search globally
  if (!existingOrder && companyId) {
    const globalWhere = { OR: buildLookupWhere().OR };
    const globalOrder = await safeQuery(() => prisma.order.findFirst({
      where: globalWhere
    }), 3);
    if (globalOrder) {
      console.log(`🔄 [TURBO-SYNC] Order ${orderNumber || orderId} found in company ${globalOrder.companyId} (falling back from ${companyId})`);
      existingOrder = globalOrder;
      companyId = globalOrder.companyId;
    }
  }

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

  // 🔁 Check if this is a partial return (R suffix shipment) — always create return order
  if (isPartialReturn && existingOrder.status === 'DELIVERED') {
    console.log(`🔁 [TURBO-SYNC] Partial return detected for ${existingOrder.orderNumber} via ${turboCode} — creating return order`);
    try {
      const returnOrder = await ensureReturnOrder(existingOrder, turboCode, canonicalTurboStatus);
      if (returnOrder && returnOrder.orderNumber !== existingOrder.orderNumber) {
        // IMPORTANT: sync the return order with a CLEAN payload so the recursive
        // lookup can't re-match the original DELIVERED order via remote_order_id /
        // order_number (this previously caused an infinite recursion loop).
        const { remote_order_id, order_number, ...cleanPayload } = payload;
        const returnSyncResult = await syncTurboStatusToOrder({
          orderId: returnOrder.id,
          orderNumber: returnOrder.orderNumber,
          companyId,
          rawStatus,
          payload: cleanPayload,
          isGuestOrder: false,
          isReturnOrderSync: true
        });
        console.log(`✅ [TURBO-SYNC] Return order ${returnOrder.orderNumber} synced: ${returnSyncResult.turboStatus}`);
      }
    } catch (e) {
      console.error(`❌ [TURBO-SYNC] Failed to create return order for ${turboCode}:`, e.message);
    }
  }

  // 🔒 FINAL STATUS PROTECTION: Never downgrade an already-DELIVERED order
  const DOWNGRADE_STATUSES = new Set(['returned', 'returned_to_company', 'turbo_sent', 'turbo_saved', 'created', 'delayed']);
  if (existingOrder.status === 'DELIVERED' && DOWNGRADE_STATUSES.has(canonicalTurboStatus)) {
    console.warn(`🔒 [TURBO-SYNC] PROTECTED: Order ${existingOrder.orderNumber} is DELIVERED — refusing to set turboShipmentStatus to "${canonicalTurboStatus}". Keeping as "delivered".`);
    canonicalTurboStatus = 'delivered';
    orderStatus = 'DELIVERED';
    paymentStatus = 'COMPLETED';
  }

  const updateData = {
    turboShipmentStatus: canonicalTurboStatus,
    turboMetadata: JSON.stringify(turboMetaObj),
    turboCaptainName: payload.captain_name || payload.captain || null,
    turboCaptainPhone: payload.captain_number1 || null,
    turboBranchName: payload.branch_name || payload.branch || null,
    turboBranchPhone: payload.branch_number1 || null,
    turboDelayReason: payload.delay_reason || null,
    turboReturnReason: payload.return_reason || payload.return_status_text || null,
    turboExpectedBranch: payload.expected_branch || null,
    updatedAt: new Date()
  };

  if (payload.order_number && String(payload.order_number) !== String(existingOrder.turboTrackingNumber)) {
    updateData.turboTrackingNumber = String(payload.order_number);
    updateData.turboShipmentId = String(payload.order_number);
  }

  // 🛡️ PRODUCTION-FIX (custom-status-enum): حالة التعيين ممكن تكون حالة مخصصة مش في الـ enum
  // (مثال حقيقي: تعيين swan `delayed → DELAYED-WITH-CAPTAIN`). بنحلّها عبر mapsToSystem:
  // نخزّن القيمة الصالحة في order.status، ونحتفظ بالكود المخصص (orderStatus) للإشعار.
  // 🛡️ PRODUCTION-FIX (turbo-custom-gate): بوابة statusChanged كانت بتقارن الـ enum بس —
  // لو الطلب واقف بالفعل في قيمة الـ mapping (SHIPPED) والمابينج لحالة مخصصة
  // (WITH_THE_CAPTAIN)، كانت البوابة false والمسار كله بيتخطى: الحالة المخصصة
  // عمرها ما تتطبق من التربو. القياس بقى على "الحالة الفعلية" (الكود المخصص).
  let storedOrderStatus = null;
  let statusChanged = false;
  let turboRequestedCustom = null;
  if (orderStatus) {
    const resolved = await resolveOrderStatusForStorage(prisma, companyId, orderStatus);
    storedOrderStatus = resolved.stored;
    if (storedOrderStatus) {
      updateData.status = storedOrderStatus;
      turboRequestedCustom = resolved.notify !== storedOrderStatus ? resolved.notify : null;
    } else {
      console.warn(`⚠️ [TURBO-SYNC] Skipping un-storable OrderStatus "${orderStatus}" for ${existingOrder.orderNumber} (not in enum and no valid mapsToSystem) — turbo fields updated, order status unchanged.`);
    }
    const currentCustomCode = existingOrder.customStatusCode
      ? String(existingOrder.customStatusCode).toUpperCase()
      : null;
    statusChanged = Boolean(storedOrderStatus) && (
      storedOrderStatus !== existingOrder.status ||
      (turboRequestedCustom && currentCustomCode !== turboRequestedCustom)
    );
  }

  if (paymentStatus) {
    updateData.paymentStatus = paymentStatus;
  }

  // 🚨 PRODUCTION-FIX (turbo-notification-gap): قبل التحديث المباشر لحقول تربو،
  // مرّر تغيير حالة الطلب عبر orderService.updateOrderStatus — لأنه المسار الوحيد
  // اللي بيكتب statusHistory وبيبعث إشعار WhatsApp (sendOrderStatusNotification) وبيشغّل
  // side-effects (كاش باك/ولاء عند DELIVERED، إرجاع عند RETURNED...). كان السينك القديم
  // بيعدّل order.status مباشرة في الـ DB من غير أي إشعار — فالأوردرات اللي بتتحرك تلقائياً
  // من تربو (webhook / sync-status / refresh) كانت بتفضل من غير رسالة للعميل.
  // ملاحظة: updateOrderStatus بيجيب الطلب تاني بكل العلاقات (customer/orderItems) وبيشغّل
  // الإشعار في الخلفية (fire-and-forget) + بيخصم الـ dedup — فيتماشى مع مسار الزرار اليدوي.
  // نمرّر له الكود الأصلي (orderStatus) — وهو هيحلّ mapsToSystem ويتأكد إن storage صالح.
  if (statusChanged) {
    try {
      const turboReason = payload.return_reason || payload.return_status_text || payload.delay_reason;
      const noteText = turboReason
        ? `${turboReason} (تحديث تلقائي من تربو - ${canonicalTurboStatus})`
        : `تحديث تلقائي من تربو (${canonicalTurboStatus})`;
      await orderService.updateOrderStatus(
        existingOrder.orderNumber,
        companyId,
        orderStatus,
        noteText,
        'SYSTEM',
        'Turbo Sync',
        null,
        true,
        { skipCallAttemptGuard: true, skipTransitionValidation: true }
      );
      // 🛡️ PRODUCTION-FIX (turbo-custom-wipe): المسار الموحد كتب status +
      // customStatusCode بالفعل — لو سيبنا updateData.status هنا، التحديث المباشر
      // الجاي كان بيمسح الكود المخصص اللي لسه اتكتب. نشيل status من ال payload.
      delete updateData.status;
      console.log(`✅ [TURBO-SYNC] Order ${existingOrder.orderNumber} status -> ${storedOrderStatus} (custom "${turboRequestedCustom || orderStatus}") via orderService (notification + history).`);
    } catch (statusErr) {
      console.warn(`⚠️ [TURBO-SYNC] Status update via orderService failed for ${existingOrder.orderNumber}:`, statusErr.message);
      // fallback: التحديث المباشر هياخد updateData.status + يمسح الكود المخصص القديم
    }
  }

  await safeQuery(() => prisma.order.update({
    where: { id: existingOrder.id },
    data: {
      ...updateData,
      // 🛡️ PRODUCTION-FIX (custom-status-persist): المسار الاحتياطي المباشر لما
      // يغيّر status (بعد فشل مسار orderService) لازم يمسح أي كود مخصص قديم —
      // وإلا الطلب هيفضل يعرض الحالة المخصصة الميتة بعد ما الحالة الفعلية اتغيرت.
      ...(updateData.status && updateData.status !== existingOrder.status
        ? { customStatusCode: null }
        : {}),
    }
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
