const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');

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
  async initiateCall({ companyId, userId, orderId }) {
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
      throw new Error('يرجى الانتظار 20 ثانية بين محاولات الاتصال');
    }

    // 2. البحث عن الطلب مع عزل الشركات الصارم
    const order = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderId }, { orderNumber: orderId }]
      }
    });
    if (!order) {
      throw new Error('الطلب غير موجود أو غير تابع لشركتك');
    }
    if (!order.customerPhone) {
      throw new Error('الطلب لا يحتوي على رقم هاتف مسجل للعميل');
    }

    // 3. تنظيف والتحقق من صحة رقم العميل (E.164)
    const cleanPhone = normalizeEgyptianPhone(order.customerPhone);

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
    const callLog = await prisma.callAttemptLog.create({
      data: {
        sessionId,
        orderId: order.id,
        userId,
        companyId,
        direction: 'OUTBOUND',
        callStatus: 'INITIATED',
        customerPhone: cleanPhone,
        startedAt: new Date()
      }
    });

    // 7. إرسال أمر الاتصال لهاتف الموظف عبر Socket.IO
    const io = socketService.io;
    if (io) {
      io.to(`user_${userId}`).emit('telephony:dial', {
        sessionId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: cleanPhone,
        deviceId: device.deviceId
      });
    }

    return {
      success: true,
      sessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
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
      throw new Error('جلسة المكالمة غير موجودة');
    }
    if (callLog.companyId && callLog.companyId !== companyId) {
      throw new Error('غير مصرح بتعديل هذه الجلسة');
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

    // تحديث بيانات محاولات الاتصال بالطلب
    if (callLog.orderId) {
      await prisma.order.update({
        where: { id: callLog.orderId },
        data: {
          callAttempts: { increment: 1 },
          lastCallAttemptAt: new Date()
        }
      });
    }

    // إشعار شاشة الأوردر على الكمبيوتر عبر Socket.IO
    const io = socketService.io;
    if (io) {
      io.to(`company_${companyId}`).emit('telephony:call_ended', {
        sessionId,
        orderId: callLog.orderId,
        durationSeconds: duration,
        callStatus: finalStatus,
        result: updatedLog.result
      });
    }

    return updatedLog;
  }

  /**
   * جلب سجل مكالمات الطلب
   */
  async getOrderCallLogs({ companyId, orderId }) {
    if (!companyId || !orderId) {
      return [];
    }
    const prisma = getSharedPrismaClient();

    return await prisma.callAttemptLog.findMany({
      where: {
        companyId,
        OR: [{ orderId }, { order: { orderNumber: orderId } }]
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
