const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getEffectiveShiftAssignmentForDate } = require('../services/hr/shiftAssignmentResolver');
const socketService = require('../services/socketService');
const {
  normalizeDateForDb,
  getNowInTimezone,
  combineDateAndTime,
  getEndOfDayInTimezone
} = require('../utils/dateUtils');

/**
 * ⏰ Attendance Auto Checkout Cron
 * يقوم بتذكير الموظف بالانصراف ثم إغلاق تسجيلات الحضور المفتوحة تلقائياً عند الحاجة
 */
class AttendanceAutoCheckoutCron {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('🕐 [ATTENDANCE-CRON] Starting Auto Checkout Cron Service...');

    // نراجع كل دقيقة حتى يتم التذكير بالانصراف والإغلاق التلقائي مباشرة عند الحاجة
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ [ATTENDANCE-CRON] Previous job still running, skipping...');
        return;
      }

      this.isRunning = true;
      console.log('🔄 [ATTENDANCE-CRON] Running auto checkout job...');

      try {
        await this.closeOpenAttendances();
        console.log('✅ [ATTENDANCE-CRON] Auto checkout job completed successfully');
      } catch (error) {
        console.error('❌ [ATTENDANCE-CRON] Error in auto checkout job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ [ATTENDANCE-CRON] Attendance Auto Checkout Service started (checks every minute for reminders and rollover)');
  }

  async createInAppNotification(prisma, companyId, userId, title, message, type, data = {}) {
    try {
      const notification = await prisma.notification.create({
        data: {
          companyId,
          userId,
          title,
          message,
          type,
          data
        }
      });

      socketService.sendToUser(userId, 'notification:new', notification);
      return notification;
    } catch (error) {
      console.error('❌ [ATTENDANCE-CRON] Failed to create in-app notification:', error);
      return null;
    }
  }

  async sendReminderIfNeeded(prisma, attendance, checkoutTime, reminderMinutes, policy, timezone) {
    const now = getNowInTimezone(timezone);

    if (attendance.autoCloseAudit?.reminderSentAt || attendance.autoCloseAudit?.autoClosedAt) {
      return;
    }

    const reminderAt = new Date(checkoutTime.getTime() - Math.max(1, reminderMinutes) * 60000);
    if (now < reminderAt || now >= checkoutTime) {
      return;
    }

    const employee = await prisma.user.findUnique({
      where: { id: attendance.userId },
      select: {
        id: true,
        firstName: true
      }
    });

    const reminderAudit = await prisma.attendanceAutoCloseAudit.upsert({
      where: {
        attendanceId: attendance.id
      },
      update: {
        reminderSentAt: now,
        scheduledCheckOut: checkoutTime,
        autoClosePolicy: policy
      },
      create: {
        companyId: attendance.companyId,
        attendanceId: attendance.id,
        userId: attendance.userId,
        attendanceDate: attendance.date,
        scheduledCheckOut: checkoutTime,
        reminderSentAt: now,
        autoClosePolicy: policy
      }
    });

    const minutesLeft = Math.max(1, Math.round((checkoutTime - now) / 60000));
    const formattedCheckoutTime = checkoutTime.toLocaleTimeString('ar-EG', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.createInAppNotification(
      prisma,
      attendance.companyId,
      attendance.userId,
      'تذكير بالانصراف',
      `متبقي ${minutesLeft} دقيقة على نهاية الدوام. لا تنس تسجيل الانصراف قبل ${formattedCheckoutTime}.`,
      'ATTENDANCE_CHECKOUT_REMINDER',
      {
        attendanceId: attendance.id,
        autoCloseAuditId: reminderAudit.id,
        scheduledCheckOut: checkoutTime,
        minutesLeft
      }
    );

    console.log(`🔔 [ATTENDANCE-CRON] Reminder sent for attendance ${attendance.id}`);

    if (employee?.firstName) {
      attendance.employeeName = employee.firstName;
    }
    attendance.autoCloseAudit = reminderAudit;
  }

  /**
   * إغلاق كل بصمات الحضور المفتوحة من الأيام السابقة
   */
  async closeOpenAttendances() {
    const prisma = getSharedPrismaClient();

    try {
      const openAttendances = await prisma.attendance.findMany({
        where: {
          checkIn: { not: null },
          checkOut: null
        },
        include: {
          company: {
            select: {
              id: true,
              timezone: true
            }
          }
        }
      });

      const attendanceIds = openAttendances.map((record) => record.id);
      const autoCloseAudits = attendanceIds.length > 0
        ? await prisma.attendanceAutoCloseAudit.findMany({
          where: {
            attendanceId: {
              in: attendanceIds
            }
          }
        })
        : [];
      const autoCloseAuditMap = new Map(
        autoCloseAudits.map((audit) => [audit.attendanceId, audit])
      );
      const attendancesWithAudit = openAttendances.map((record) => ({
        ...record,
        autoCloseAudit: autoCloseAuditMap.get(record.id) || null
      }));

      console.log(`📊 [ATTENDANCE-CRON] Found ${attendancesWithAudit.length} open attendances to evaluate`);

      for (const record of attendancesWithAudit) {
        try {
          await this.processAutoCheckout(record);
        } catch (err) {
          console.error(`❌ [ATTENDANCE-CRON] Failed to auto-checkout record ${record.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('❌ [ATTENDANCE-CRON] Error fetching open attendances:', error);
      throw error;
    }
  }

  /**
   * معالجة إغلاق بصمة واحدة
   */
  async processAutoCheckout(attendance) {
    const prisma = getSharedPrismaClient();
    const timezone = attendance.company?.timezone || 'Africa/Cairo';
    const now = getNowInTimezone(timezone);

    const settings = await prisma.hRSettings.findUnique({
      where: { companyId: attendance.companyId }
    });

    if (settings?.autoCheckoutEnabled === false) {
      return;
    }

    const shiftAssignment = await getEffectiveShiftAssignmentForDate(
      prisma,
      attendance.companyId,
      attendance.userId,
      attendance.date,
      timezone
    );

    const attendanceDayForDb = normalizeDateForDb(attendance.date, timezone);
    const currentDayForDb = normalizeDateForDb(now, timezone);
    const startTime = shiftAssignment?.shift?.startTime || settings?.workStartTime || '09:00';
    const endTime = shiftAssignment?.shift?.endTime || settings?.workEndTime || '17:00';
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const isOvernightShift =
      endHour < startHour || (endHour === startHour && endMinute < startMinute);

    let checkoutTime = combineDateAndTime(attendanceDayForDb, endTime, timezone);
    if (!checkoutTime) {
      checkoutTime = getEndOfDayInTimezone(attendanceDayForDb, timezone);
    }

    if (isOvernightShift) {
      checkoutTime.setUTCDate(checkoutTime.getUTCDate() + 1);
    }

    const reminderMinutes = settings?.autoCheckoutReminderMinutes || 30;
    const autoClosePolicy = settings?.autoCheckoutPolicy || 'SCHEDULED_END_AT_DAY_ROLLOVER';
    const notificationsEnabled = settings?.autoCheckoutNotificationsEnabled !== false;

    if (notificationsEnabled) {
      await this.sendReminderIfNeeded(
        prisma,
        attendance,
        checkoutTime,
        reminderMinutes,
        autoClosePolicy,
        timezone
      );
    }

    // للشيفت العادي لا نغلق إلا بعد بداية يوم جديد محلي
    if (attendanceDayForDb.getTime() >= currentDayForDb.getTime()) {
      return;
    }

    // الشيفت الليلي الحقيقي يظل مفتوحاً حتى يصل إلى نهايته المجدولة
    if (isOvernightShift && now < checkoutTime) {
      return;
    }

    const checkInTime = new Date(attendance.checkIn);
    const breakDuration = (shiftAssignment?.shift?.unpaidBreak === true) ? (shiftAssignment?.shift?.breakDuration || 0) : 0;
    const actualWorkMinutes = Math.max(0, (checkoutTime - checkInTime) / 60000);
    const workHours = Math.max(
      0,
      Math.round((((actualWorkMinutes - breakDuration) / 60) * 100)) / 100
    );
    const autoCloseNote = 'Auto-checkout by system at day rollover';

    const updateResult = await prisma.attendance.updateMany({
      where: {
        id: attendance.id,
        checkOut: null
      },
      data: {
        checkOut: checkoutTime,
        checkOutMethod: 'auto_system',
        workHours,
        overtimeHours: 0,
        notes: attendance.notes
          ? `${attendance.notes} (${autoCloseNote})`
          : autoCloseNote
      }
    });

    if (updateResult.count === 0) {
      console.log(`ℹ️ [ATTENDANCE-CRON] Attendance ${attendance.id} was already processed by another worker`);
      return;
    }

    const autoCloseReason = isOvernightShift
      ? 'OVERNIGHT_SHIFT_SCHEDULED_END'
      : 'DAY_ROLLOVER_FORGOTTEN_CHECKOUT';

    // ⏱️ الربط الحتمي: إيقاف أي مؤقتات مهام ظلت معلقة للموظف عند وقت نهاية الشفت التلقائي
    try {
      const taskTimerService = require('../services/taskTimerService');
      await taskTimerService.stopUserActiveTimers({
        companyId: attendance.companyId,
        userId: attendance.userId,
        endTime: checkoutTime,
        reason: autoCloseReason,
      });
    } catch (timerErr) {
      console.warn(`[ATTENDANCE-CRON] Error stopping active task timers for user ${attendance.userId}:`, timerErr?.message);
    }

    const audit = await prisma.attendanceAutoCloseAudit.upsert({
      where: {
        attendanceId: attendance.id
      },
      update: {
        scheduledCheckOut: checkoutTime,
        autoClosedAt: now,
        autoCloseReason,
        autoClosePolicy
      },
      create: {
        companyId: attendance.companyId,
        attendanceId: attendance.id,
        userId: attendance.userId,
        attendanceDate: attendance.date,
        scheduledCheckOut: checkoutTime,
        autoClosedAt: now,
        reminderSentAt: attendance.autoCloseAudit?.reminderSentAt || null,
        autoCloseReason,
        autoClosePolicy
      }
    });

    const formattedDate = new Date(attendance.date).toLocaleDateString('ar-EG', {
      timeZone: timezone
    });
    const formattedCheckoutTime = checkoutTime.toLocaleTimeString('ar-EG', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.createInAppNotification(
      prisma,
      attendance.companyId,
      attendance.userId,
      'تم إغلاق بصمة تلقائياً',
      `تم إغلاق سجل حضور ${formattedDate} تلقائياً على وقت ${formattedCheckoutTime} لعدم تسجيل الانصراف قبل بداية اليوم الجديد.`,
      'ATTENDANCE_AUTO_CLOSED',
      {
        attendanceId: attendance.id,
        autoCloseAuditId: audit.id,
        attendanceDate: attendance.date,
        scheduledCheckOut: checkoutTime,
        reviewStatus: audit.reviewStatus
      }
    );

    const employee = await prisma.user.findUnique({
      where: { id: attendance.userId },
      select: {
        id: true,
        firstName: true
      }
    });

    setImmediate(async () => {
      try {
        const hrOwnerNotificationAgent = require('../services/hr/hrOwnerNotificationAgent');
        await hrOwnerNotificationAgent.sendOwnerNotification({
          companyId: attendance.companyId,
          employeeName: employee?.firstName || 'موظف',
          actionId: 'ATTENDANCE_AUTO_CLOSE',
          actionName: 'إغلاق انصراف تلقائي',
          details: `التاريخ: ${formattedDate}\nوقت الإغلاق المعتمد: ${formattedCheckoutTime}\nالسبب: ${autoCloseReason}\nالسياسة: ${autoClosePolicy}`,
          requiresApproval: false
        });
      } catch (ownerError) {
        console.error('❌ [ATTENDANCE-CRON] Failed to notify owner about auto-close:', ownerError);
      }
    });

    console.log(
      `✅ [ATTENDANCE-CRON] Auto-checked out user ${attendance.userId} for date ${attendance.date.toISOString().split('T')[0]} at ${checkoutTime.toISOString()}`
    );
  }
}

module.exports = new AttendanceAutoCheckoutCron();
