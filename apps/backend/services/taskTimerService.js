const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');

/**
 * ⏱️ TaskTimerService
 * خدمة إدارة مؤقتات مهام العمل والربط الحتمي مع الحضور والانصراف ومواعيد الورديات.
 * تمنع تسرب الساعات الوهمية وتضمن إغلاق المهام تلقائياً عند:
 * 1. بصمة الانصراف (يدوي / كيوسك / تطبيق / جهاز بصمة)
 * 2. إغلاق البصمة التلقائي عبر الكرون (Auto-Checkout Cron)
 * 3. إنهاء الوردية من الديسك توب (Desktop Shift End)
 * 4. السقف الأقصى للجلسة المتصلة (Max Session Cap - 6 Hours)
 */
class TaskTimerService {
  /**
   * إيقاف جميع المؤقتات النشطة لموظف محدد (Cascade Stop)
   */
  async stopUserActiveTimers({
    companyId,
    userId,
    endTime = new Date(),
    reason = 'SYSTEM_CASCADE_STOP',
    maxAllowedMinutes = null
  }) {
    if (!companyId || !userId) return { stoppedCount: 0, entries: [] };
    const prisma = getSharedPrismaClient();

    try {
      const runningEntries = await prisma.timeEntry.findMany({
        where: {
          companyId,
          userId,
          isRunning: true,
        },
        include: {
          task: { select: { id: true, title: true } },
        },
      });

      if (!runningEntries || runningEntries.length === 0) {
        return { stoppedCount: 0, entries: [] };
      }

      const stopTime = endTime ? new Date(endTime) : new Date();
      const stoppedEntries = [];

      for (const entry of runningEntries) {
        const startTime = new Date(entry.startTime);
        let durationMinutes = Math.max(1, Math.round((stopTime.getTime() - startTime.getTime()) / 60000));

        if (maxAllowedMinutes && durationMinutes > maxAllowedMinutes) {
          durationMinutes = maxAllowedMinutes;
        }

        const noteSuffix = ` [إيقاف تلقائي: ${reason}]`;
        const description = entry.description
          ? `${entry.description}${noteSuffix}`.trim()
          : noteSuffix.trim();

        const updated = await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            isRunning: false,
            endTime: stopTime,
            duration: durationMinutes,
            description,
          },
          include: { task: { select: { id: true, title: true } } },
        });

        // زيادة ساعات العمل الفعلية على المهمة
        if (entry.taskId) {
          await prisma.task.update({
            where: { id: entry.taskId },
            data: {
              actualHours: { increment: Math.round(durationMinutes / 60) },
            },
          }).catch((err) => console.warn('[TaskTimerService] Task actualHours update error:', err.message));
        }

        // 🎯 Auto-advance hours goal metric on stop
        try {
          const hoursLogged = Math.round((durationMinutes / 60) * 100) / 100;
          if (hoursLogged > 0) {
            const goalMetricEngine = require('./goalMetricEngine');
            goalMetricEngine.recordGoalMetricEvent({
              companyId,
              userId,
              metricKey: 'TASK_STOPWATCH_HOURS',
              incrementValue: hoursLogged,
              metadata: { taskId: entry.taskId, durationMinutes, reason },
            }).catch(() => {});
          }
        } catch {}

        stoppedEntries.push(updated);
      }

      // إشعار فوري عبر السوكيت لتحديث شاشات المشرف وتطبيق الديسك توب
      try {
        socketService.sendToCompany(companyId, 'tasks:timer-stopped', {
          userId,
          stoppedCount: stoppedEntries.length,
          reason,
          stoppedAt: stopTime.toISOString(),
        });
        socketService.sendToUser(userId, 'tasks:timer-stopped', {
          stoppedCount: stoppedEntries.length,
          reason,
          stoppedAt: stopTime.toISOString(),
        });
      } catch {}

      console.log(`[TaskTimerService] Successfully stopped ${stoppedEntries.length} timer(s) for user ${userId} (Reason: ${reason})`);
      return { stoppedCount: stoppedEntries.length, entries: stoppedEntries };
    } catch (error) {
      console.error('[TaskTimerService] Error stopping active timers:', error);
      return { stoppedCount: 0, entries: [], error: error.message };
    }
  }

  /**
   * إيقاف مؤقت محدد بالـ ID بواسطة الموظف أو المشرف الإداري
   */
  async stopTimerById({
    entryId,
    companyId,
    actingUserId,
    actingUserRole,
    customEndTime = null,
    reason = 'MANUAL_STOP'
  }) {
    const prisma = getSharedPrismaClient();
    const isManagerOrAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(
      String(actingUserRole || '').toUpperCase()
    );

    const where = isManagerOrAdmin
      ? { id: entryId, companyId, isRunning: true }
      : { id: entryId, userId: actingUserId, companyId, isRunning: true };

    const entry = await prisma.timeEntry.findFirst({
      where,
      include: { task: { select: { id: true, title: true } } },
    });

    if (!entry) {
      throw new Error('سجل الوقت غير موجود أو متوقف بالفعل أو غير مصرح لك بإيقافه');
    }

    const stopTime = customEndTime ? new Date(customEndTime) : new Date();
    const startTime = new Date(entry.startTime);
    const durationMinutes = Math.max(1, Math.round((stopTime.getTime() - startTime.getTime()) / 60000));

    const noteSuffix = actingUserId !== entry.userId
      ? ' [إيقاف إداري بواسطة المشرف]'
      : (reason !== 'MANUAL_STOP' ? ` [${reason}]` : '');
    const description = entry.description ? `${entry.description}${noteSuffix}`.trim() : (noteSuffix.trim() || null);

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        isRunning: false,
        endTime: stopTime,
        duration: durationMinutes,
        description,
      },
      include: { task: { select: { id: true, title: true } } },
    });

    if (entry.taskId) {
      await prisma.task.update({
        where: { id: entry.taskId },
        data: { actualHours: { increment: Math.round(durationMinutes / 60) } },
      }).catch(() => {});
    }

    try {
      const hoursLogged = Math.round((durationMinutes / 60) * 100) / 100;
      if (hoursLogged > 0) {
        const goalMetricEngine = require('./goalMetricEngine');
        goalMetricEngine.recordGoalMetricEvent({
          companyId,
          userId: entry.userId,
          metricKey: 'TASK_STOPWATCH_HOURS',
          incrementValue: hoursLogged,
          metadata: { taskId: entry.taskId, durationMinutes, reason },
        }).catch(() => {});
      }
    } catch {}

    try {
      socketService.sendToCompany(companyId, 'tasks:timer-stopped', {
        userId: entry.userId,
        entryId,
        reason,
        stoppedAt: stopTime.toISOString(),
      });
    } catch {}

    return updated;
  }

  /**
   * صمام أمان تنظيف وتصفية المؤقتات المعلقة أو الشاذة للشركة
   */
  async cleanupOrphanTimersForCompany(companyId) {
    const prisma = getSharedPrismaClient();
    const MAX_ALLOWED_HOURS = 6;
    const cutoffTime = new Date(Date.now() - MAX_ALLOWED_HOURS * 3600 * 1000);

    try {
      const overgrownEntries = await prisma.timeEntry.findMany({
        where: {
          companyId,
          isRunning: true,
          startTime: { lt: cutoffTime },
        },
      });

      for (const entry of overgrownEntries) {
        const cappedEndTime = new Date(new Date(entry.startTime).getTime() + MAX_ALLOWED_HOURS * 3600 * 1000);
        await this.stopUserActiveTimers({
          companyId,
          userId: entry.userId,
          endTime: cappedEndTime,
          reason: 'AUTO_STOPPED_MAX_HOURS_CAP',
          maxAllowedMinutes: MAX_ALLOWED_HOURS * 60,
        });
      }
    } catch (err) {
      console.warn('[TaskTimerService] Error cleaning orphan timers:', err.message);
    }
  }
}

module.exports = new TaskTimerService();
