const { getSharedPrismaClient } = require('./sharedDatabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getJwtSecret } = require('../utils/jwtSecret');
const { recordShipmentEvent } = require('./shipping/shipmentEventService');
const courierService = require('./courierService');

const DEFAULT_FAILURE_REASONS = [
  { code: 'CUSTOMER_ABSENT', labelAr: 'العميل غير متواجد', labelEn: 'Customer Absent', requiresReschedule: true },
  { code: 'WRONG_ADDRESS', labelAr: 'العنوان غير صحيح / غير واضح', labelEn: 'Wrong / Unclear Address', requiresReschedule: true },
  { code: 'PHONE_UNREACHABLE', labelAr: 'الهاتف مغلق أو لا يرد', labelEn: 'Phone Unreachable / No Answer', requiresReschedule: true },
  { code: 'REFUSED', labelAr: 'رفض الاستلام من قبل العميل', labelEn: 'Refused by Customer', requiresReschedule: false },
  { code: 'POSTPONED', labelAr: 'طلب تأجيل الموعد', labelEn: 'Postponed by Customer', requiresReschedule: true },
  { code: 'CASH_NOT_READY', labelAr: 'المبلغ غير جاهز', labelEn: 'Cash Not Ready', requiresReschedule: true },
];

const serviceError = (message, statusCode, code) => {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

/**
 * Get active failure reasons for a company, seeding defaults if none exist
 */
async function getFailureReasons(companyId) {
  const prisma = getSharedPrismaClient();

  let reasons = await prisma.deliveryFailureReason.findMany({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!reasons || reasons.length === 0) {
    try {
      await prisma.deliveryFailureReason.createMany({
        data: DEFAULT_FAILURE_REASONS.map((r) => ({
          ...r,
          companyId,
          isActive: true
        })),
        skipDuplicates: true
      });

      reasons = await prisma.deliveryFailureReason.findMany({
        where: { companyId, isActive: true },
        orderBy: { createdAt: 'asc' }
      });
    } catch (err) {
      console.warn('⚠️ [COURIER-PORTAL] Error seeding default failure reasons:', err.message);
      return DEFAULT_FAILURE_REASONS.map((r) => ({ ...r, companyId, isActive: true }));
    }
  }

  return reasons;
}

/**
 * Courier login with phone and PIN
 */
async function loginCourier({ phone, pin }) {
  const cleanPhone = String(phone || '').trim().replace(/[\s\-\+]/g, '');
  const rawPin = String(pin || '').trim();

  if (!cleanPhone || !rawPin) {
    throw serviceError('رقم الهاتف ورمز PIN مطلوبان', 400, 'MISSING_CREDENTIALS');
  }

  const prisma = getSharedPrismaClient();
  const phoneTail = cleanPhone.length > 9 ? cleanPhone.slice(-9) : cleanPhone;

  const couriers = await prisma.courier.findMany({
    where: {
      phone: { contains: phoneTail },
      isActive: true
    },
    include: {
      company: {
        select: { id: true, name: true, isActive: true, logo: true, currency: true }
      }
    }
  });

  if (!couriers || couriers.length === 0) {
    throw serviceError('بيانات الدخول غير صحيحة أو الحساب غير نشط', 401, 'INVALID_CREDENTIALS');
  }

  let matchedCourier = null;
  for (const c of couriers) {
    if (c.pinHash && bcrypt.compareSync(rawPin, c.pinHash)) {
      matchedCourier = c;
      break;
    }
  }

  if (!matchedCourier) {
    throw serviceError('بيانات الدخول غير صحيحة أو رمز PIN غير صحيح', 401, 'INVALID_CREDENTIALS');
  }

  if (matchedCourier.company && !matchedCourier.company.isActive) {
    throw serviceError('حساب الشركة غير نشط', 403, 'COMPANY_INACTIVE');
  }

  const tokenPayload = {
    role: 'COURIER',
    id: matchedCourier.id,
    courierId: matchedCourier.id,
    userId: matchedCourier.userId || matchedCourier.id,
    companyId: matchedCourier.companyId,
    name: matchedCourier.name,
    phone: matchedCourier.phone,
    pinVerified: true
  };

  const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: '12h' });

  return {
    token,
    courier: {
      id: matchedCourier.id,
      name: matchedCourier.name,
      phone: matchedCourier.phone,
      vehicleType: matchedCourier.vehicleType,
      companyId: matchedCourier.companyId,
      companyName: matchedCourier.company?.name || null
    }
  };
}

/**
 * Get authenticated courier profile and current active runs
 */
async function getCourierMe(courierId, companyId) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId },
    select: {
      id: true,
      name: true,
      phone: true,
      vehicleType: true,
      plateNumber: true,
      status: true,
      companyId: true,
      company: {
        select: { id: true, name: true, logo: true, currency: true }
      }
    }
  });

  if (!courier) {
    throw serviceError('المندوب غير موجود', 404, 'COURIER_NOT_FOUND');
  }

  const activeRuns = await prisma.deliveryRun.findMany({
    where: {
      courierId,
      companyId,
      status: { in: ['DISPATCHED', 'IN_PROGRESS', 'DRAFT'] }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      runNumber: true,
      status: true,
      dispatchDate: true,
      totalShipments: true,
      totalCODExpected: true,
      totalCODCollected: true,
      totalReturnedCount: true
    }
  });

  return {
    courier,
    activeRuns
  };
}

/**
 * Verify link PIN for a specific delivery run and issue an elevated short session token
 */
async function verifyLinkPin({ runId, pin, token }) {
  const prisma = getSharedPrismaClient();

  if (!runId) {
    throw serviceError('معرف المأمورية مطلوب', 400, 'MISSING_RUN_ID');
  }

  const run = await prisma.deliveryRun.findFirst({
    where: { id: runId },
    include: {
      courier: true,
      company: { select: { id: true, isActive: true } }
    }
  });

  if (!run) {
    throw serviceError('مأمورية التوصيل غير موجودة', 404, 'RUN_NOT_FOUND');
  }

  if (!run.courier) {
    throw serviceError('المندوب غير مسند لهذه المأمورية', 400, 'NO_COURIER_ASSIGNED');
  }

  if (run.courier.pinHash) {
    const rawPin = String(pin || '').trim();
    if (!rawPin || !bcrypt.compareSync(rawPin, run.courier.pinHash)) {
      throw serviceError('رمز PIN غير صحيح', 401, 'INVALID_PIN');
    }
  }

  let basePayload = {};
  if (token) {
    try {
      basePayload = jwt.verify(token, getJwtSecret());
    } catch {
      // If token expired or invalid, we still issue the pinVerified token for this run
    }
  }

  const sessionPayload = {
    role: 'COURIER',
    id: run.courierId,
    courierId: run.courierId,
    userId: basePayload.userId || run.courier.userId || run.courierId,
    runId: run.id,
    companyId: run.companyId,
    name: run.courier.name,
    phone: run.courier.phone,
    mobileTokenVersion: run.mobileTokenVersion || 0,
    pinVerified: true
  };

  const sessionToken = jwt.sign(sessionPayload, getJwtSecret(), { expiresIn: '30m' });

  return {
    success: true,
    token: sessionToken,
    run: {
      id: run.id,
      runNumber: run.runNumber,
      status: run.status
    }
  };
}

/**
 * Synchronize offline field delivery updates in batch with idempotency and conflict resolution
 */
async function syncOfflineEvents(companyId, courierId, events = []) {
  if (!Array.isArray(events)) {
    throw serviceError('قائمة الأحداث يجب أن تكون مصفوفة', 400, 'INVALID_EVENTS_ARRAY');
  }

  const prisma = getSharedPrismaClient();
  const results = [];

  for (const event of events) {
    const { localId, shipmentId, status, collectedAmount, otp, failureReasonCode, notes, occurredAt, pin, nextAttemptDate } = event;

    if (!localId && !shipmentId) {
      results.push({ localId, status: 'rejected', reason: 'معرف الشحنة أو المعرف المحلي مفقود' });
      continue;
    }

    try {
      // 1. Idempotency check: if localId was already recorded in an event for this shipment, accept without duplicate work
      if (localId && shipmentId) {
        const existingEvent = await prisma.shipmentEvent.findFirst({
          where: {
            companyId,
            shipmentId,
            metadata: { contains: `"localId":"${localId}"` }
          }
        });

        if (existingEvent) {
          results.push({ localId, status: 'accepted', reason: 'already_processed' });
          continue;
        }
      }

      // 2. Fetch shipment to verify existence and check for conflicts
      const shipment = await prisma.shipment.findFirst({
        where: { id: shipmentId, companyId },
        include: { courier: true, order: true, deliveryRun: true }
      });

      if (!shipment) {
        results.push({ localId, status: 'rejected', reason: 'الشحنة غير موجودة' });
        continue;
      }

      // 3. Conflict resolution: if shipment is CANCELLED but a valid OTP is provided, accept as DELIVERED
      if (shipment.status === 'CANCELLED') {
        const isDelivered = ['DELIVERED', 'COMPLETED', 'PARTIALLY_DELIVERED'].includes(String(status || '').toUpperCase());
        let validOtp = false;

        if (isDelivered && shipment.otpHash && otp) {
          if (bcrypt.compareSync(String(otp).trim(), shipment.otpHash)) {
            validOtp = true;
          }
        }

        if (isDelivered && validOtp) {
          const orderTotal = Number(shipment.order?.total || 0);
          let cash = collectedAmount !== undefined ? Number(collectedAmount) : orderTotal;
          cash = Math.max(0, orderTotal > 0 ? Math.min(cash, orderTotal) : cash);

          await prisma.$transaction(async (tx) => {
            await tx.shipment.update({
              where: { id: shipment.id },
              data: {
                status: 'DELIVERED',
                collectedAmount: cash,
                collectedAt: occurredAt ? new Date(occurredAt) : new Date(),
                deliveryNotes: notes ? String(notes).trim() : shipment.deliveryNotes
              }
            });

            if (shipment.orderId) {
              await tx.order.update({
                where: { id: shipment.orderId },
                data: { status: 'DELIVERED' }
              });
            }

            await recordShipmentEvent(tx, {
              companyId,
              shipmentId: shipment.id,
              fromStatus: shipment.status,
              toStatus: 'DELIVERED',
              notes: notes ? `${notes} (CONFLICT_OTP)` : 'CONFLICT_OTP',
              actorType: 'SYSTEM',
              actorId: courierId,
              actorName: shipment.courier?.name || 'COURIER',
              metadata: {
                localId,
                conflictResolution: 'CONFLICT_OTP',
                occurredAt: occurredAt || new Date().toISOString()
              }
            });
          });

          results.push({ localId, status: 'accepted' });
          continue;
        } else {
          results.push({ localId, status: 'rejected', reason: 'تم إلغاء الشحنة مسبقاً ولا يتوفر كود استلام صحيح' });
          continue;
        }
      }

      // 4. Standard update via courierService.updateDeliveryRunShipment
      await courierService.updateDeliveryRunShipment(companyId, {
        shipmentId,
        runId: shipment.deliveryRunId,
        status,
        collectedAmount,
        deliveryNotes: notes,
        courierId,
        pin,
        otp,
        failureReasonCode,
        nextAttemptDate,
        localId
      });

      results.push({ localId, status: 'accepted' });
    } catch (err) {
      results.push({ localId, status: 'rejected', reason: err.message || 'خطأ أثناء مزامنة الشحنة' });
    }
  }

  return { results };
}

module.exports = {
  getFailureReasons,
  loginCourier,
  getCourierMe,
  verifyLinkPin,
  syncOfflineEvents,
  DEFAULT_FAILURE_REASONS
};
