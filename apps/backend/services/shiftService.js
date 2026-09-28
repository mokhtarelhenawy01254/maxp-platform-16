const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');

class ShiftService {
  constructor() {
    this.prisma = null;
    this.tablesEnsured = false;
  }

  getDb() {
    if (!this.prisma) {
      this.prisma = getSharedPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Defensive DDL: Ensures hr_overtime_sessions and hr_shift_handovers exist
   */
  async ensureTables() {
    if (this.tablesEnsured) return;
    try {
      const db = this.getDb();
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "hr_overtime_sessions" (
          "id" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "deviceId" TEXT,
          "date" DATE NOT NULL,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "endedAt" TIMESTAMP(3),
          "durationSec" INTEGER NOT NULL DEFAULT 0,
          "reason" TEXT NOT NULL,
          "taskSummary" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "deviceType" TEXT DEFAULT 'PERSONAL',
          "approvedBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "hr_overtime_sessions_pkey" PRIMARY KEY ("id")
        );
      `);

      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "hr_overtime_sessions_companyId_date_idx" ON "hr_overtime_sessions"("companyId", "date");
        CREATE INDEX IF NOT EXISTS "hr_overtime_sessions_userId_date_idx" ON "hr_overtime_sessions"("userId", "date");
        CREATE INDEX IF NOT EXISTS "hr_overtime_sessions_status_idx" ON "hr_overtime_sessions"("status");
      `);

      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "hr_shift_handovers" (
          "id" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "deviceId" TEXT,
          "shiftDate" DATE NOT NULL,
          "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "handoverNotes" TEXT,
          "pendingTasks" TEXT,
          "metricsSnapshot" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "hr_shift_handovers_pkey" PRIMARY KEY ("id")
        );
      `);

      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "hr_shift_handovers_companyId_shiftDate_idx" ON "hr_shift_handovers"("companyId", "shiftDate");
        CREATE INDEX IF NOT EXISTS "hr_shift_handovers_userId_shiftDate_idx" ON "hr_shift_handovers"("userId", "shiftDate");
      `);

      this.tablesEnsured = true;
    } catch (err) {
      console.warn('[ShiftService] ensureTables non-fatal notice:', err.message);
    }
  }

  /**
   * Close regular shift with handover notes and check-out
   */
  async closeShift({
    companyId,
    userId,
    deviceId,
    handoverNotes,
    pendingTasks,
    metricsSnapshot,
  }) {
    await this.ensureTables();
    const db = this.getDb();
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));

    // 1. Look up open attendance record for today (or within last 24h)
    let attendance = await db.attendance.findFirst({
      where: {
        companyId,
        userId,
        checkOut: null,
      },
      orderBy: { date: 'desc' },
    });

    if (!attendance) {
      // Look up today's record even if already checked out
      attendance = await db.attendance.findFirst({
        where: {
          companyId,
          userId,
          date: today,
        },
        orderBy: { date: 'desc' },
      });
    }

    let closedAttendance = null;
    if (attendance && !attendance.checkOut) {
      const checkInTime = new Date(attendance.checkIn || attendance.createdAt);
      const diffMs = now.getTime() - checkInTime.getTime();
      const actualHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

      const noteAddition = handoverNotes
        ? `${attendance.notes ? attendance.notes + ' | ' : ''}[تسليم الشيفت]: ${handoverNotes}`
        : attendance.notes;

      closedAttendance = await db.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOut: now,
          checkOutMethod: 'desktop_handover',
          workHours: actualHours,
          notes: noteAddition,
          updatedAt: now,
        },
      });
    } else {
      closedAttendance = attendance;
    }

    // 2. Create ShiftHandover record
    const handover = await db.shiftHandover.create({
      data: {
        companyId,
        userId,
        deviceId: deviceId || null,
        shiftDate: today,
        closedAt: now,
        handoverNotes: handoverNotes || null,
        pendingTasks: pendingTasks || null,
        metricsSnapshot: metricsSnapshot || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // 3. Emit socket notification to managers and office team
    try {
      const io = socketService.getIO();
      if (io) {
        const employeeName = handover.user
          ? `${handover.user.firstName || ''} ${handover.user.lastName || ''}`.trim()
          : 'موظف';

        io.to(`company_${companyId}`).emit('shift_closed', {
          handoverId: handover.id,
          userId,
          employeeName,
          closedAt: now.toISOString(),
          handoverNotes,
          pendingTasks,
        });
      }

      if (handoverNotes && handoverNotes.trim()) {
        const employeeName = handover.user
          ? `${handover.user.firstName || ''} ${handover.user.lastName || ''}`.trim()
          : 'موظف';
        await db.notification.create({
          data: {
            companyId,
            title: `تسليم شيفت: ${employeeName}`,
            message: `أنهى الموظف (${employeeName}) الوردية وقدم ملاحظات التسليم: "${handoverNotes.slice(0, 100)}"`,
            type: 'SHIFT_HANDOVER',
            data: {
              handoverId: handover.id,
              userId,
              shiftDate: today,
            },
          },
        });
      }
    } catch (notifErr) {
      console.warn('[ShiftService] Failed to emit shift_closed notice:', notifErr.message);
    }

    return {
      success: true,
      handover,
      attendance: closedAttendance,
      closedAt: now.toISOString(),
      message: 'تم إغلاق الشيفت وتسجيل ملاحظات التسليم بنجاح.',
    };
  }

  /**
   * Start Overtime Shift Session
   */
  async startOvertime({
    companyId,
    userId,
    deviceId,
    reason,
    taskSummary,
    deviceType = 'PERSONAL',
  }) {
    if (!reason || !reason.trim()) {
      throw new Error('يرجى تحديد سبب أو مهمة الوردية الإضافية');
    }

    await this.ensureTables();
    const db = this.getDb();
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));

    // Check if there is already an active overtime session for this user
    const existingActive = await db.overtimeSession.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      return {
        success: true,
        session: existingActive,
        alreadyActive: true,
        message: 'يوجد جلسة عمل إضافية نشطة بالفعل.',
      };
    }

    const session = await db.overtimeSession.create({
      data: {
        companyId,
        userId,
        deviceId: deviceId || null,
        date: today,
        startedAt: now,
        reason: reason.trim(),
        taskSummary: taskSummary || null,
        status: 'ACTIVE',
        deviceType: deviceType || 'PERSONAL',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify company admins
    try {
      const io = socketService.getIO();
      if (io) {
        const employeeName = session.user
          ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
          : 'موظف';
        io.to(`company_${companyId}`).emit('overtime_started', {
          sessionId: session.id,
          userId,
          employeeName,
          reason: session.reason,
          startedAt: now.toISOString(),
          deviceType: session.deviceType,
        });
      }
    } catch (notifErr) {
      console.warn('[ShiftService] startOvertime socket notice error:', notifErr.message);
    }

    return {
      success: true,
      session,
      message: 'تم بدء الوردية الإضافية (Overtime) بنجاح.',
    };
  }

  /**
   * End Overtime Shift Session
   */
  async endOvertime({
    companyId,
    userId,
    sessionId,
    taskSummary,
  }) {
    await this.ensureTables();
    const db = this.getDb();
    const now = new Date();

    let session = null;
    if (sessionId) {
      session = await db.overtimeSession.findFirst({
        where: { id: sessionId, companyId, userId },
        include: { user: true },
      });
    } else {
      session = await db.overtimeSession.findFirst({
        where: { companyId, userId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
        include: { user: true },
      });
    }

    if (!session) {
      throw new Error('لا توجد جلسة عمل إضافية نشطة لإنهائها.');
    }

    const durationSec = Math.max(0, Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 1000));
    const overtimeHoursDecimal = Math.round((durationSec / 3600) * 100) / 100;

    const updated = await db.overtimeSession.update({
      where: { id: session.id },
      data: {
        endedAt: now,
        durationSec,
        taskSummary: taskSummary || session.taskSummary,
        status: 'PENDING', // Awaiting admin approval
        updatedAt: now,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Optionally update today's attendance record with overtime hours
    try {
      const today = new Date(now.toISOString().slice(0, 10));
      const att = await db.attendance.findFirst({
        where: { companyId, userId, date: today },
      });
      if (att) {
        const currentOvertime = Number(att.overtimeHours || 0);
        await db.attendance.update({
          where: { id: att.id },
          data: {
            overtimeHours: currentOvertime + overtimeHoursDecimal,
          },
        });
      }
    } catch (attErr) {
      console.warn('[ShiftService] Failed to sync overtime to attendance:', attErr.message);
    }

    // In-app notification to managers
    try {
      const employeeName = updated.user
        ? `${updated.user.firstName || ''} ${updated.user.lastName || ''}`.trim()
        : 'موظف';
      const durationMin = Math.round(durationSec / 60);

      await db.notification.create({
        data: {
          companyId,
          title: `وردية إضافية مكتملة: ${employeeName}`,
          message: `أنهى الموظف (${employeeName}) وردية إضافية استغرقت ${durationMin} دقيقة (${updated.reason}) بانتظار الاعتماد.`,
          type: 'OVERTIME_PENDING',
          data: {
            sessionId: updated.id,
            userId,
            durationSec,
            reason: updated.reason,
            actionUrl: '/settings?tab=overtime',
          },
        },
      });

      const io = socketService.getIO();
      if (io) {
        io.to(`company_${companyId}`).emit('overtime_ended', {
          sessionId: updated.id,
          userId,
          employeeName,
          durationSec,
          durationMin,
          reason: updated.reason,
        });
      }
    } catch (notifErr) {
      console.warn('[ShiftService] endOvertime notice error:', notifErr.message);
    }

    return {
      success: true,
      session: updated,
      durationSec,
      durationMin: Math.round(durationSec / 60),
      message: `تم إنهاء الوردية الإضافية بنجاح (${Math.round(durationSec / 60)} دقيقة). الجلسة بانتظار الاعتماد.`,
    };
  }

  /**
   * Get current shift status for user (regular shift, overtime, etc.)
   */
  async getTodayShiftStatus({ companyId, userId }) {
    await this.ensureTables();
    const db = this.getDb();
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));

    const [attendance, activeOvertime, lastHandover, allTodayOvertime] = await Promise.all([
      db.attendance.findFirst({
        where: { companyId, userId, date: today },
      }),
      db.overtimeSession.findFirst({
        where: { companyId, userId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      }),
      db.shiftHandover.findFirst({
        where: { companyId, userId, shiftDate: today },
        orderBy: { closedAt: 'desc' },
      }),
      db.overtimeSession.findMany({
        where: { companyId, userId, date: today },
      }),
    ]);

    const totalOvertimeSec = allTodayOvertime.reduce((acc, curr) => acc + (curr.durationSec || 0), 0);

    return {
      date: today.toISOString().slice(0, 10),
      regularShiftOpen: Boolean(attendance && !attendance.checkOut),
      regularShiftClosed: Boolean(attendance && attendance.checkOut) || Boolean(lastHandover),
      checkInTime: attendance?.checkIn || null,
      checkOutTime: attendance?.checkOut || null,
      workHours: attendance?.workHours ? Number(attendance.workHours) : null,
      lastHandover: lastHandover || null,
      activeOvertime: activeOvertime || null,
      isOvertimeActive: Boolean(activeOvertime),
      todayOvertimeMinutes: Math.round(totalOvertimeSec / 60),
    };
  }

  /**
   * List overtime sessions for admin review
   */
  async listOvertimeSessions({
    companyId,
    status,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  }) {
    await this.ensureTables();
    const db = this.getDb();
    const take = Math.min(Math.max(1, Number(limit) || 50), 100);
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

    const where = { companyId };
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [total, sessions] = await Promise.all([
      db.overtimeSession.count({ where }),
      db.overtimeSession.findMany({
        where,
        take,
        skip,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page: Number(page),
        limit: take,
        pages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Approve or reject overtime session
   */
  async updateOvertimeStatus({ companyId, sessionId, status, approvedByUserId }) {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new Error('الحالة يجب أن تكون APPROVED أو REJECTED');
    }

    await this.ensureTables();
    const db = this.getDb();

    const session = await db.overtimeSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new Error('جلسة العمل الإضافي غير موجودة');
    }

    const updated = await db.overtimeSession.update({
      where: { id: sessionId },
      data: {
        status,
        approvedBy: approvedByUserId,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }
}

module.exports = new ShiftService();
