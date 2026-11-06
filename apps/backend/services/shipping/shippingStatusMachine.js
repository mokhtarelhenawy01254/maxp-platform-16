/**
 * Shipping Status Machine & Returns Cycle Service (SHIP-T1 / Turbo Reference)
 *
 * Implements strict, directed status lifecycle transitions:
 * INCOMPLETE (مسودة)
 * PENDING -> ASSIGNED -> PICKED_UP (مسلمة للمندوب) -> OUT_FOR_DELIVERY
 * OUT_FOR_DELIVERY -> DELIVERED | FAILED | POSTPONED (مؤجلة مع المندوب)
 * FAILED -> OUT_FOR_DELIVERY (محاولة جديدة) | RETURNED_AT_COMPANY
 * RETURNED_AT_COMPANY -> RETURNED_RECEIVED (مرتجعات وصلتني) | RETURNED_DAMAGED (معدومة) | RETURNED_LOST (مفقودة)
 * RETURNED_RECEIVED -> RESHIPPED (معاد إرسالها) | CLOSED
 * DELIVERED -> REMITTED (تم التوريد)
 * CANCELLED from PENDING, ASSIGNED, INCOMPLETE only
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { recordShipmentEvent } = require('./shipmentEventService');

/**
 * Full status catalog (12 Turbo statuses + legacy/terminal)
 */
const STATUS_CATALOG = {
  INCOMPLETE: {
    code: 'INCOMPLETE',
    labelAr: 'غير مكتملة (مسودة)',
    labelEn: 'Incomplete / Draft',
    customerLabelAr: 'تم تسجيل الطلب',
    customerLabelEn: 'Order Registered',
    category: 'DRAFT',
    color: 'slate',
  },
  PENDING: {
    code: 'PENDING',
    labelAr: 'قيد الانتظار',
    labelEn: 'Pending',
    customerLabelAr: 'قيد المراجعة والتجهيز',
    customerLabelEn: 'Processing Order',
    category: 'INTAKE',
    color: 'amber',
  },
  ASSIGNED: {
    code: 'ASSIGNED',
    labelAr: 'قيد التنفيذ / مسندة للمندوب',
    labelEn: 'Assigned to Courier',
    customerLabelAr: 'جاري التجهيز والتسليم لشركة الشحن',
    customerLabelEn: 'Preparing for Dispatch',
    category: 'DISPATCH',
    color: 'indigo',
  },
  PICKED_UP: {
    code: 'PICKED_UP',
    labelAr: 'مسلمة للمندوب',
    labelEn: 'Handed to Courier',
    customerLabelAr: 'تم استلام الشحنة من التاجر',
    customerLabelEn: 'Picked Up by Courier',
    category: 'DISPATCH',
    color: 'blue',
  },
  OUT_FOR_DELIVERY: {
    code: 'OUT_FOR_DELIVERY',
    labelAr: 'خرجت للتوصيل',
    labelEn: 'Out for Delivery',
    customerLabelAr: 'خرجت للتوصيل مع المندوب',
    customerLabelEn: 'Out for Delivery',
    category: 'TRANSIT',
    color: 'sky',
  },
  POSTPONED: {
    code: 'POSTPONED',
    labelAr: 'مؤجلة مع المندوب',
    labelEn: 'Postponed with Courier',
    customerLabelAr: 'تم تأجيل موعد التسليم بناءً على طلب العميل',
    customerLabelEn: 'Delivery Postponed by Customer Request',
    category: 'POSTPONED',
    color: 'orange',
  },
  DELIVERED: {
    code: 'DELIVERED',
    labelAr: 'تم التسليم',
    labelEn: 'Delivered',
    customerLabelAr: 'تم التسليم بنجاح',
    customerLabelEn: 'Delivered Successfully',
    category: 'COMPLETED',
    color: 'emerald',
  },
  PARTIALLY_DELIVERED: {
    code: 'PARTIALLY_DELIVERED',
    labelAr: 'تسليم جزئي',
    labelEn: 'Partially Delivered',
    customerLabelAr: 'تم الاستلام الجزئي للطلب',
    customerLabelEn: 'Partially Delivered',
    category: 'COMPLETED',
    color: 'teal',
  },
  FAILED: {
    code: 'FAILED',
    labelAr: 'فشل التسليم / معلقة',
    labelEn: 'Delivery Failed',
    customerLabelAr: 'تعذر التسليم - جاري التنسيق',
    customerLabelEn: 'Delivery Attempt Incomplete',
    category: 'EXCEPTION',
    color: 'rose',
  },
  RETURNED_AT_COMPANY: {
    code: 'RETURNED_AT_COMPANY',
    labelAr: 'مرتجعات في الشركة',
    labelEn: 'Returned at Company Hub',
    customerLabelAr: 'عادت الشحنة إلى مقر الشركة',
    customerLabelEn: 'Returned to Company Hub',
    category: 'RETURN',
    color: 'purple',
  },
  RETURNED_RECEIVED: {
    code: 'RETURNED_RECEIVED',
    labelAr: 'مرتجعات وصلتني',
    labelEn: 'Returns Received by Merchant',
    customerLabelAr: 'تم تسليم المرتجع للتاجر',
    customerLabelEn: 'Returned to Merchant',
    category: 'RETURN',
    color: 'violet',
  },
  RETURNED_DAMAGED: {
    code: 'RETURNED_DAMAGED',
    labelAr: 'مرتجعات معدومة',
    labelEn: 'Damaged / Write-off',
    customerLabelAr: 'مرتجع تالف (تسوية)',
    customerLabelEn: 'Returned Damaged',
    category: 'LOSS',
    color: 'red',
  },
  RETURNED_LOST: {
    code: 'RETURNED_LOST',
    labelAr: 'مرتجعات مفقودة',
    labelEn: 'Lost in Transit',
    customerLabelAr: 'شحنة مفقودة (تسوية)',
    customerLabelEn: 'Lost in Transit',
    category: 'LOSS',
    color: 'stone',
  },
  RESHIPPED: {
    code: 'RESHIPPED',
    labelAr: 'معاد إرسالها',
    labelEn: 'Reshipped',
    customerLabelAr: 'أعيد شحنها بإرسالية جديدة',
    customerLabelEn: 'Reshipped with New Waybill',
    category: 'RESHIPPED',
    color: 'cyan',
  },
  REMITTED: {
    code: 'REMITTED',
    labelAr: 'تم التوريد',
    labelEn: 'Remitted / Settled',
    customerLabelAr: 'تم التسليم وتوريد التحصيل',
    customerLabelEn: 'Delivered and Remitted',
    category: 'SETTLED',
    color: 'green',
  },
  CLOSED: {
    code: 'CLOSED',
    labelAr: 'مغلقة',
    labelEn: 'Closed',
    customerLabelAr: 'مكتملة ومغلقة',
    customerLabelEn: 'Closed',
    category: 'TERMINAL',
    color: 'gray',
  },
  CANCELLED: {
    code: 'CANCELLED',
    labelAr: 'ملغاة',
    labelEn: 'Cancelled',
    customerLabelAr: 'تم إلغاء الشحنة',
    customerLabelEn: 'Cancelled',
    category: 'TERMINAL',
    color: 'zinc',
  },
  // Legacy states support
  IN_TRANSIT: {
    code: 'IN_TRANSIT',
    labelAr: 'في الطريق',
    labelEn: 'In Transit',
    customerLabelAr: 'الشحنة في طريقها للتسليم',
    customerLabelEn: 'In Transit',
    category: 'TRANSIT',
    color: 'blue',
  },
  DELAYED: {
    code: 'DELAYED',
    labelAr: 'مؤجلة',
    labelEn: 'Delayed',
    customerLabelAr: 'تم تأجيل موعد التسليم',
    customerLabelEn: 'Delayed',
    category: 'POSTPONED',
    color: 'amber',
  },
  RETURNED: {
    code: 'RETURNED',
    labelAr: 'مرتجع',
    labelEn: 'Returned',
    customerLabelAr: 'مرتجع إلى المصدر',
    customerLabelEn: 'Returned to Origin',
    category: 'RETURN',
    color: 'rose',
  },
};

/**
 * Strict transition matrix
 */
const ALLOWED_TRANSITIONS = {
  INCOMPLETE: ['PENDING', 'CANCELLED'],
  PENDING: ['ASSIGNED', 'CANCELLED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'],
  ASSIGNED: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'CANCELLED', 'PENDING'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'RETURNED_AT_COMPANY', 'ASSIGNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'POSTPONED'],
  POSTPONED: ['OUT_FOR_DELIVERY', 'RETURNED_AT_COMPANY', 'FAILED'],
  DELIVERED: ['REMITTED', 'CLOSED'],
  PARTIALLY_DELIVERED: ['REMITTED', 'RETURNED_RECEIVED', 'CLOSED'],
  FAILED: ['OUT_FOR_DELIVERY', 'RETURNED_AT_COMPANY', 'POSTPONED'],
  RETURNED_AT_COMPANY: ['RETURNED_RECEIVED', 'RETURNED_DAMAGED', 'RETURNED_LOST'],
  RETURNED_RECEIVED: ['RESHIPPED', 'CLOSED'],
  RETURNED_DAMAGED: ['CLOSED'],
  RETURNED_LOST: ['CLOSED'],
  RESHIPPED: ['CLOSED'],
  REMITTED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],

  // Legacy mappings
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED_AT_COMPANY'],
  DELAYED: ['OUT_FOR_DELIVERY', 'POSTPONED', 'FAILED'],
  RETURNED: ['RETURNED_RECEIVED', 'RETURNED_DAMAGED', 'RETURNED_LOST', 'CLOSED'],
};

/**
 * Check if a status transition is allowed
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {Object} [ctx]
 * @returns {{ allowed: boolean, currentStatus: string, targetStatus: string, allowedTransitions: string[], code?: string, error?: string }}
 */
function validateTransition(fromStatus, toStatus, ctx = {}) {
  const normFrom = String(fromStatus || 'PENDING').trim().toUpperCase();
  const normTo = String(toStatus || '').trim().toUpperCase();

  const allowedList = ALLOWED_TRANSITIONS[normFrom] || [];

  if (normFrom === normTo) {
    return {
      allowed: true,
      noop: true,
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList,
    };
  }

  if (!allowedList.includes(normTo)) {
    return {
      allowed: false,
      code: 'INVALID_TRANSITION',
      error: `لا يمكن تحويل الشحنة من ${normFrom} إلى ${normTo} مباشرة. الحالات المسموحة: ${allowedList.join(', ')}`,
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList,
    };
  }

  // Policy restrictions on optional statuses
  const policy = ctx?.policy || {};
  if (normTo === 'INCOMPLETE' && policy.allowIncompleteStatus === false) {
    return {
      allowed: false,
      code: 'STATUS_DISABLED_BY_POLICY',
      error: 'حالة المسودة (غير مكتملة) معطلة في سياسة شحن الشركة',
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList,
    };
  }
  if (normTo === 'POSTPONED' && policy.allowPostponedStatus === false) {
    return {
      allowed: false,
      code: 'STATUS_DISABLED_BY_POLICY',
      error: 'حالة التأجيل مع المندوب معطلة في سياسة شحن الشركة',
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList,
    };
  }
  if (normTo === 'RESHIPPED' && policy.allowReshippedStatus === false) {
    return {
      allowed: false,
      code: 'STATUS_DISABLED_BY_POLICY',
      error: 'حالة إعادة الإرسال معطلة في سياسة شحن الشركة',
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList,
    };
  }

  // Special rule: REMITTED allowed only once
  if (normTo === 'REMITTED' && ctx?.remittedAt) {
    return {
      allowed: false,
      code: 'ALREADY_REMITTED',
      error: 'تم توريد هذه الشحنة بالفعل سابقاً',
      currentStatus: normFrom,
      targetStatus: normTo,
      allowedTransitions: allowedList.filter((s) => s !== 'REMITTED'),
    };
  }

  return {
    allowed: true,
    currentStatus: normFrom,
    targetStatus: normTo,
    allowedTransitions: allowedList,
  };
}

function canTransition(fromStatus, toStatus, ctx = {}) {
  const v = validateTransition(fromStatus, toStatus, ctx);
  return Boolean(v.allowed);
}

/**
 * Returns allowed next statuses from current status
 */
function getAllowedTransitions(currentStatus, ctx = {}) {
  const normFrom = String(currentStatus || 'PENDING').trim().toUpperCase();
  const list = ALLOWED_TRANSITIONS[normFrom] || [];
  const policy = ctx?.policy || {};

  return list.filter((target) => {
    if (target === 'INCOMPLETE' && policy.allowIncompleteStatus === false) return false;
    if (target === 'POSTPONED' && policy.allowPostponedStatus === false) return false;
    if (target === 'RESHIPPED' && policy.allowReshippedStatus === false) return false;
    return true;
  });
}

/**
 * Customer-facing simplified status descriptor
 */
function getCustomerFacingStatus(status) {
  const norm = String(status || 'PENDING').trim().toUpperCase();
  const item = STATUS_CATALOG[norm] || STATUS_CATALOG.PENDING;
  return {
    code: norm,
    labelAr: item.labelAr,
    labelEn: item.labelEn,
    customerLabelAr: item.customerLabelAr,
    customerLabelEn: item.customerLabelEn,
    category: item.category,
    color: item.color,
  };
}

/**
 * Apply status transition with strict atomic database updates and financial effects
 * @param {string|Object} shipmentOrId
 * @param {string} toStatus
 * @param {Object} ctx
 * @returns {Promise<{ shipment: Object, newShipment?: Object, event: Object }>}
 */
async function applyTransition(shipmentOrId, toStatus, ctx = {}) {
  const targetStatus = String(toStatus || '').trim().toUpperCase();
  if (!targetStatus) {
    const err = new Error('الحالة المستهدفة مطلوبة');
    err.statusCode = 400;
    throw err;
  }

  const prisma = ctx.prisma || getSharedPrismaClient();

  // 1. Resolve shipment
  let shipment = null;
  if (typeof shipmentOrId === 'object' && shipmentOrId !== null && shipmentOrId.id) {
    shipment = shipmentOrId;
  } else {
    shipment = await prisma.shipment.findFirst({
      where: {
        id: String(shipmentOrId),
        ...(ctx.companyId ? { companyId: ctx.companyId } : {}),
      },
      include: {
        courier: true,
      },
    });
  }

  if (!shipment) {
    const err = new Error('الشحنة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  const companyId = shipment.companyId || ctx.companyId;

  // 2. Resolve policy if not provided
  let policy = ctx.policy;
  if (!policy && companyId) {
    try {
      const policyService = require('./policyService');
      policy = await policyService.getPolicy(companyId, prisma);
    } catch (_) {
      policy = {};
    }
  }

  // 3. Validate transition
  const check = validateTransition(shipment.status, targetStatus, { ...ctx, policy });
  if (!check.allowed) {
    const err = new Error(check.error);
    err.statusCode = 409;
    err.code = check.code || 'INVALID_TRANSITION';
    err.currentStatus = check.currentStatus;
    err.targetStatus = check.targetStatus;
    err.allowedTransitions = check.allowedTransitions;
    throw err;
  }

  // 4. Atomic transaction application
  const executeInTransaction = async (tx) => {
    const updateData = {
      status: targetStatus,
    };
    let createdChildShipment = null;
    let eventMetadata = {};

    // 4.1 DELIVERED / PARTIALLY_DELIVERED
    if (targetStatus === 'DELIVERED' || targetStatus === 'PARTIALLY_DELIVERED') {
      let collected = null;
      if (ctx.collectedAmount !== undefined && ctx.collectedAmount !== null && ctx.collectedAmount !== '') {
        collected = Number(ctx.collectedAmount);
      } else if (shipment.codAmount !== null && shipment.codAmount !== undefined) {
        collected = Number(shipment.codAmount);
      }
      if (collected !== null) {
        updateData.collectedAmount = collected;
      }
      updateData.collectedAt = new Date();
      eventMetadata.collectedAmount = collected;
    }

    // 4.2 FAILED
    if (targetStatus === 'FAILED') {
      const reasonCode = String(ctx.failureReasonCode || shipment.failureReasonCode || 'FAILED_OTHER').trim();
      updateData.failureReasonCode = reasonCode;
      updateData.attemptCount = { increment: 1 };

      const nextAttempt = ctx.nextAttemptDate ? new Date(ctx.nextAttemptDate) : new Date(Date.now() + 24 * 3600 * 1000);
      updateData.nextAttemptDate = nextAttempt;
      eventMetadata.failureReasonCode = reasonCode;
      eventMetadata.nextAttemptDate = nextAttempt;

      // Check RTO trigger: if current attempt + 1 >= policy.deliveryAttempts (or threshold 3)
      const currentAttempts = Number(shipment.attemptCount || 0);
      const maxAttempts = Number(policy?.deliveryAttempts || 3);
      if (currentAttempts + 1 >= maxAttempts && String(policy?.afterAttemptsAction || 'REVIEW').toUpperCase() === 'RTO') {
        // Auto mark as RETURNED_AT_COMPANY on 3rd failure under RTO policy
        updateData.status = 'RETURNED_AT_COMPANY';
        eventMetadata.autoRto = true;
        eventMetadata.maxAttempts = maxAttempts;
      }
    }

    // 4.3 RETURNED_AT_COMPANY
    if (updateData.status === 'RETURNED_AT_COMPANY' || targetStatus === 'RETURNED_AT_COMPANY') {
      if (policy?.rtoChargeReturnLeg) {
        const rtoFee = Number(policy.rtoReturnLegPrice || 0);
        const cost = Number(shipment.cost || 0);
        const courierCost = Number(shipment.courierCost || 0);
        updateData.rtoCost = rtoFee;
        updateData.marginAmount = Math.round((cost - rtoFee - courierCost) * 100) / 100;
        eventMetadata.rtoCost = rtoFee;
      }
    }

    // 4.4 LOSS SETTLEMENT: RETURNED_DAMAGED / RETURNED_LOST
    if (targetStatus === 'RETURNED_DAMAGED' || targetStatus === 'RETURNED_LOST') {
      const isDamaged = targetStatus === 'RETURNED_DAMAGED';
      const lossValue = Number(ctx.lossAmount !== undefined ? ctx.lossAmount : (shipment.declaredValue || shipment.codAmount || shipment.cost || 0));
      eventMetadata.lossType = isDamaged ? 'DAMAGED' : 'LOST';
      eventMetadata.lossValue = lossValue;

      // If courier was assigned, record automatic loss deduction against courier custody
      if (shipment.courierId && lossValue > 0) {
        await tx.courierCommission.create({
          data: {
            companyId,
            courierId: shipment.courierId,
            deliveryRunId: shipment.deliveryRunId || null,
            shipmentId: shipment.id,
            orderId: shipment.orderId || null,
            commissionType: 'DEDUCTION',
            amount: -Math.abs(lossValue),
            status: 'DUE',
            notes: `خصم عهدة شحنة (${isDamaged ? 'مرتجع معدوم' : 'مرتجع مفقود'}) - بوليصة: ${shipment.barcode || shipment.trackingNumber || shipment.id}`,
          },
        });
        eventMetadata.courierDeductionApplied = true;
        eventMetadata.courierId = shipment.courierId;
        eventMetadata.deductionAmount = lossValue;
      }
    }

    // 4.5 RESHIPPED: Create child shipment linked via parentShipmentId
    if (targetStatus === 'RESHIPPED') {
      const newTracking = `SHP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      createdChildShipment = await tx.shipment.create({
        data: {
          companyId,
          orderId: shipment.orderId || null,
          merchantId: shipment.merchantId || null,
          fulfillmentSource: shipment.fulfillmentSource || 'MERCHANT',
          warehouseId: shipment.warehouseId || null,
          shippingCompanyId: shipment.shippingCompanyId || null,
          carrierType: shipment.carrierType || 'MANUAL',
          status: 'PENDING',
          trackingNumber: newTracking,
          barcode: newTracking,
          recipientName: shipment.recipientName,
          recipientPhone: shipment.recipientPhone,
          recipientPhone2: shipment.recipientPhone2,
          destinationGovernorate: shipment.destinationGovernorate,
          destinationCity: shipment.destinationCity,
          destinationAddress: shipment.destinationAddress,
          weight: shipment.weight,
          pieces: shipment.pieces || 1,
          codAmount: shipment.codAmount,
          declaredValue: shipment.declaredValue,
          contentDescription: shipment.contentDescription,
          isFragile: shipment.isFragile,
          allowOpenPackage: shipment.allowOpenPackage,
          parentShipmentId: shipment.id,
          source: 'RESHIPMENT',
        },
      });

      eventMetadata.newShipmentId = createdChildShipment.id;
      eventMetadata.newTrackingNumber = newTracking;

      await recordShipmentEvent(tx, {
        companyId,
        shipmentId: createdChildShipment.id,
        fromStatus: null,
        toStatus: 'PENDING',
        reasonCode: 'RESHIPPED_FROM_ORIGIN',
        notes: `شحنة جديدة منشأة كإعادة إرسال للشحنة الأصلية: ${shipment.barcode || shipment.trackingNumber || shipment.id}`,
        actorType: ctx.actorType || 'ADMIN',
        actorId: ctx.actorId || null,
        actorName: ctx.actorName || 'OPERATIONS',
        metadata: { parentShipmentId: shipment.id },
      });
    }

    // 4.6 REMITTED: Financial flag on delivered shipment
    if (targetStatus === 'REMITTED') {
      updateData.remittedAt = new Date();
      updateData.settlementStatus = 'REMITTED';
      eventMetadata.remittedAt = updateData.remittedAt;
    }

    // 4.7 Merge any custom fields
    if (ctx.customData && typeof ctx.customData === 'object') {
      Object.assign(updateData, ctx.customData);
    }

    // Apply shipment update
    const updatedShipment = await tx.shipment.update({
      where: { id: shipment.id },
      data: updateData,
      include: {
        merchant: { select: { id: true, name: true, phone: true } },
        shippingCompany: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true, phone: true } },
      },
    });

    // Record timeline event
    const recordedEvent = await recordShipmentEvent(tx, {
      companyId,
      shipmentId: shipment.id,
      fromStatus: shipment.status,
      toStatus: updatedShipment.status,
      reasonCode: ctx.reasonCode || ctx.failureReasonCode || (eventMetadata.autoRto ? 'AUTO_RTO' : null),
      notes: ctx.notes || (eventMetadata.autoRto ? 'تحويل تلقائي بعد 3 محاولات تسليم فاشلة' : null),
      actorType: ctx.actorType || 'ADMIN',
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'OPERATIONS',
      metadata: Object.keys(eventMetadata).length > 0 ? eventMetadata : null,
    });

    // Apply profit calculation if delivered
    if (updatedShipment.status === 'DELIVERED' || updatedShipment.status === 'PARTIALLY_DELIVERED') {
      try {
        const { applyProfitToShipment } = require('./profitService');
        await applyProfitToShipment(tx, updatedShipment.id);
      } catch (profitErr) {
        console.warn('⚠️ [StatusMachine] Profit apply notice:', profitErr.message);
      }
    }

    return {
      shipment: updatedShipment,
      childShipment: createdChildShipment,
      newShipment: createdChildShipment,
      event: recordedEvent,
      lossSettlement: eventMetadata.courierDeductionApplied ? { amount: eventMetadata.deductionAmount, courierId: eventMetadata.courierId } : null,
    };
  };

  // Run in provided transaction or create new one
  if (ctx.prisma && typeof ctx.prisma.$transaction !== 'function') {
    return executeInTransaction(ctx.prisma);
  }
  return prisma.$transaction(executeInTransaction);
}

module.exports = {
  STATUS_CATALOG,
  validateTransition,
  ALLOWED_TRANSITIONS,
  canTransition,
  getAllowedTransitions,
  getCustomerFacingStatus,
  applyTransition,
};
