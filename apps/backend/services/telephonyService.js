const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');

// نفس القائمة المسموحة في agentWorkspaceController — نتائج موثقة فقط تُقبل من العميل
const ALLOWED_CALL_RESULTS = ['unreached', 'reached', 'busy', 'wrong_number', 'callback'];

// أخطاء تحمل كود HTTP صحيح بدل ضغط كل شيء في 400 (المسارات تستخدم error.statusCode || 400)
const telephonyError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * دالة تنظيف والتحقق من رقم الهاتف بصيغة E.164 المصرية
 * تمنع الـ Toll Fraud والاتصال بأرقام غير مصرح بها
 */
function normalizeEgyptianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new Error('رقم الهاتف غير صالح أو مفقود');
  }
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('002')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (cleaned.startsWith('20') && !cleaned.startsWith('+20')) {
    cleaned = '+' + cleaned;
  }
  if (cleaned.startsWith('01')) {
    cleaned = '+2' + cleaned;
  }
  if (!cleaned.startsWith('+20')) {
    if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      throw new Error('رقم الهاتف غير صالح بصيغة الاتصال الدولية E.164');
    }
  } else {
    // رقم محمول مصري: +20 متبوع بـ 10 أو 11 أو 12 أو 15 ثم 8 أرقام (إجمالي 13 حرفاً)
    if (!/^\+201[0125]\d{8}$/.test(cleaned)) {
      throw new Error('رقم الهاتف ليس رقماً مصرياً صالحاً (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 وبطول 11 رقماً)');
    }
  }
  return cleaned;
}

class TelephonyService {
  /**
   * تسجيل جهاز الموظف أو تحديث نبض الاتصال (Presence Heartbeat)
   */
  async registerOrHeartbeatDevice({ companyId, userId, deviceId, deviceName, socketId, appVersion, socketConnected }) {
    if (!companyId || !userId || !deviceId) {
      throw new Error('بيانات الجهاز غير مكتملة');
    }
    const prisma = getSharedPrismaClient();
    const isOnline = socketConnected !== undefined ? Boolean(socketConnected) : true;
    return await prisma.employeeDevice.upsert({
      where: { deviceId },
      update: {
        companyId,
        userId,
        deviceName: deviceName || undefined,
        socketId: socketId || undefined,
        appVersion: appVersion || undefined,
        isOnline,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        companyId,
        userId,
        deviceId,
        deviceName: deviceName || 'Android Device',
        socketId: socketId || null,
        appVersion: appVersion || null,
        isOnline,
        lastSeenAt: new Date()
      }
    });
  }

  /**
   * فحص حالة اتصال الهاتف للموظف (Device Presence)
   */
  async getDevicePresence(companyId, userId) {
    const prisma = getSharedPrismaClient();
    // يُعتبر الهاتف متصلاً إذا كان آخر ظهور خلال 3 دقائق
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const device = await prisma.employeeDevice.findFirst({
      where: {
        companyId,
        userId,
        isOnline: true,
        lastSeenAt: { gte: threeMinutesAgo }
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    return {
      isOnline: !!device,
      device: device
        ? {
            id: device.id,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            lastSeenAt: device.lastSeenAt,
            appVersion: device.appVersion
          }
        : null
    };
  }

  /**
   * بدء مكالمة صادرة من الكمبيوتر (Outbound Click-to-Call)
   * مع حماية Rate Limit، عزل الشركات، ومنع الـ Toll Fraud
   */
  async initiateCall({ companyId, userId, orderId, targetPhone }) {
    if (!companyId || !userId || !orderId) {
      throw new Error('البيانات المطلوبة للاتصال غير مكتملة');
    }
    const prisma = getSharedPrismaClient();

    // 1. فحص الـ Rate Limit (حد أقصى مكالمة كل 20 ثانية للموظف)
    const twentySecondsAgo = new Date(Date.now() - 20 * 1000);
    const recentAttempt = await prisma.callAttemptLog.findFirst({
      where: {
        companyId,
        userId,
        createdAt: { gte: twentySecondsAgo }
      }
    });
    if (recentAttempt) {
      throw telephonyError('يرجى الانتظار 20 ثانية بين محاولات الاتصال', 429);
    }

    // 2. البحث عن الطلب (سواء كان طلباً مسجلاً، طلب زائر GuestOrder، أو سلة متروكة GuestCart)
    let order = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderId }, { orderNumber: orderId }]
      }
    });
    let isGuest = false;
    let isCart = false;

    if (!order && prisma.guestOrder?.findFirst) {
      order = await prisma.guestOrder.findFirst({
        where: {
          companyId,
          OR: [{ id: orderId }, { orderNumber: orderId }]
        }
      });
      if (order) isGuest = true;
    }

    if (!order && prisma.guestCart?.findFirst) {
      const cleanCartId = String(orderId).replace(/^CART-/i, '');
      const cartRecord = await prisma.guestCart.findFirst({
        where: {
          companyId,
          OR: [
            { id: orderId },
            { cartId: orderId },
            { cartId: cleanCartId },
            { id: cleanCartId }
          ]
        }
      });
      if (cartRecord) {
        let checkoutData = {};
        try {
          checkoutData = typeof cartRecord.checkoutData === 'string'
            ? JSON.parse(cartRecord.checkoutData)
            : (cartRecord.checkoutData || {});
        } catch {
          checkoutData = {};
        }
        order = {
          id: cartRecord.cartId || cartRecord.id,
          orderNumber: `CART-${(cartRecord.cartId || cartRecord.id).slice(-6).toUpperCase()}`,
          guestName: checkoutData.customerName || checkoutData.guestName || checkoutData.name || 'عميل محتمل',
          guestPhone: checkoutData.customerPhone || checkoutData.phone || ''
        };
        isCart = true;
      }
    }

    if (!order) {
      throw telephonyError('الطلب غير موجود أو غير تابع لشركتك', 404);
    }

    const candidatePhone = targetPhone || (isGuest || isCart ? order.guestPhone : order.customerPhone);
    if (!candidatePhone) {
      throw new Error('الطلب لا يحتوي على رقم هاتف مسجل للعميل');
    }

    // 3. تنظيف والتحقق من صحة رقم العميل (E.164)
    const cleanPhone = normalizeEgyptianPhone(candidatePhone);

    // 4. التحقق من اتصال هاتف الموظف (Presence Check)
    const { isOnline, device } = await this.getDevicePresence(companyId, userId);
    if (!isOnline || !device) {
      throw new Error(
        'لا يوجد هاتف أندرويد متصل حالياً لحسابك. يرجى فتح تطبيق MaxP على الهاتف لربط الاتصال أولاً.'
      );
    }

    // 5. إنشاء معرّف جلسة فريد (sessionId)
    const sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 6. تسجيل الجلسة في قاعدة البيانات بحالة INITIATED
    const logData = {
      sessionId,
      userId,
      companyId,
      direction: 'OUTBOUND',
      callStatus: 'INITIATED',
      customerPhone: cleanPhone,
      startedAt: new Date()
    };
    if (isGuest) {
      logData.guestOrderId = order.id;
    } else if (isCart) {
      logData.notes = `CART:${order.id}`;
    } else {
      logData.orderId = order.id;
    }
    const callLog = await prisma.callAttemptLog.create({
      data: logData
    });

    const orderNumber = order.orderNumber || (isGuest ? `GUEST-${order.id.slice(-6)}` : order.id);
    const customerName = (isGuest ? order.guestName : order.customerName) || 'عميل';

    // 7. إرسال أمر الاتصال لهاتف الموظف عبر Socket.IO
    const io = socketService.io;
    if (io) {
      io.to(`user_${userId}`).emit('telephony:dial', {
        sessionId,
        orderId: order.id,
        orderNumber,
        customerName,
        customerPhone: cleanPhone,
        deviceId: device.deviceId
      });
    }

    return {
      success: true,
      sessionId,
      orderId: order.id,
      orderNumber,
      customerName,
      customerPhone: cleanPhone,
      deviceName: device.deviceName
    };
  }

  /**
   * إنهاء وتوثيق المكالمة واستلام المدة الرسمية من TelephonyManager
   */
  async completeCall({
    companyId,
    userId,
    sessionId,
    durationSeconds,
    callStatus,
    callerPhone,
    result,
    notes
  }) {
    if (!sessionId) {
      throw new Error('معرف جلسة المكالمة مطلوب');
    }
    const prisma = getSharedPrismaClient();

    const callLog = await prisma.callAttemptLog.findUnique({
      where: { sessionId }
    });
    if (!callLog) {
      throw telephonyError('جلسة المكالمة غير موجودة', 404);
    }
    // الملكية: من بدأ الجلسة هو من ينهيها، والشركة لا تُتجاوز في أي اتجاه
    if (userId && callLog.userId && callLog.userId !== userId) {
      throw telephonyError('غير مصرح بتعديل جلسة مكالمة موظف آخر', 403);
    }
    if (companyId && callLog.companyId && String(callLog.companyId) !== String(companyId)) {
      throw telephonyError('غير مصرح بتعديل هذه الجلسة', 403);
    }
    if (result && !ALLOWED_CALL_RESULTS.includes(result)) {
      throw telephonyError('قيمة نتيجة مكالمة غير صالحة', 400);
    }

    const duration = Math.max(0, parseInt(durationSeconds, 10) || 0);
    const finalStatus =
      callStatus || (duration > 0 ? 'COMPLETED' : 'NO_ANSWER');

    const updatedLog = await prisma.callAttemptLog.update({
      where: { sessionId },
      data: {
        durationSeconds: duration,
        callStatus: finalStatus,
        callerPhone: callerPhone || callLog.callerPhone,
        result: result || (duration > 0 ? 'reached' : 'unreached'),
        notes: notes || callLog.notes,
        endedAt: new Date()
      }
    });

    // تحديث بيانات محاولات الاتصال بالطلب (عادي، زائر، أو سلة)
    let effectiveOrderId = callLog.orderId || callLog.guestOrderId;
    if (callLog.orderId && prisma.order?.update) {
      await prisma.order.update({
        where: { id: callLog.orderId },
        data: {
          callAttempts: { increment: 1 },
          lastCallAttemptAt: new Date()
        }
      });
    } else if (callLog.guestOrderId && prisma.guestOrder?.update) {
      await prisma.guestOrder.update({
        where: { id: callLog.guestOrderId },
        data: {
          callAttempts: { increment: 1 },
          lastCallAt: new Date()
        }
      });
    } else if (callLog.notes && callLog.notes.startsWith('CART:')) {
      const cartId = callLog.notes.replace('CART:', '').trim();
      effectiveOrderId = cartId;
      if (prisma.cartContactLog?.create) {
        try {
          await prisma.cartContactLog.create({
            data: {
              cartId,
              companyId: callLog.companyId,
              employeeId: userId,
              method: 'call',
              result: updatedLog.result,
              note: notes || null
            }
          });
        } catch (err) {
          console.warn('Could not record cartContactLog:', err.message);
        }
      }
    }

    // إشعار شاشة الأوردر على الكمبيوتر عبر Socket.IO
    const io = socketService.io;
    if (io) {
      io.to(`company_${companyId}`).emit('telephony:call_ended', {
        sessionId,
        orderId: effectiveOrderId,
        durationSeconds: duration,
        callStatus: finalStatus,
        result: updatedLog.result
      });
    }

    return updatedLog;
  }

  /**
   * جلب سجل مكالمات الطلب (عادي أو زائر أو سلة)
   */
  async getOrderCallLogs({ companyId, orderId }) {
    if (!companyId || !orderId) {
      return [];
    }
    const prisma = getSharedPrismaClient();

    const cleanCartId = String(orderId).replace(/^CART-/i, '');
    return await prisma.callAttemptLog.findMany({
      where: {
        companyId,
        OR: [
          { orderId },
          { guestOrderId: orderId },
          { order: { orderNumber: orderId } },
          { guestOrder: { orderNumber: orderId } },
          { notes: `CART:${orderId}` },
          { notes: `CART:${cleanCartId}` }
        ]
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new TelephonyService();
