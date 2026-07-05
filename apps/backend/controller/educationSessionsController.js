const { getSharedPrismaClient } = require('../services/sharedDatabase');
const educationNotificationService = require('../services/educationNotificationService');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { studentId, teacherId, subjectId, enrollmentId, status, from, to } = req.query;
    const where = { companyId };
    if (studentId) where.studentId = studentId;
    if (teacherId) where.teacherId = teacherId;
    if (subjectId) where.subjectId = subjectId;
    if (enrollmentId) where.enrollmentId = enrollmentId;
    if (status) where.status = status;
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }

    const data = await getSharedPrismaClient().educationSession.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        enrollment: { select: { id: true, remainingHours: true } }
      },
      orderBy: { scheduledAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحصص' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationSession.findFirst({
      where: { id, companyId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, phone: true } },
        teacher: { select: { id: true, name: true, phone: true } },
        subject: { select: { id: true, name: true } },
        enrollment: { select: { id: true, remainingHours: true, totalHours: true } }
      }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الحصة غير موجودة' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحصة' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { enrollmentId, scheduledAt, plannedDuration, topic, notes } = req.body;
    if (!enrollmentId) return res.status(400).json({ success: false, error: 'التسجيل مطلوب' });
    if (!scheduledAt) return res.status(400).json({ success: false, error: 'موعد الحصة مطلوب' });

    const enrollment = await getSharedPrismaClient().educationEnrollment.findFirst({
      where: { id: enrollmentId, companyId },
      include: { package: { select: { subjectId: true } } }
    });
    if (!enrollment) return res.status(400).json({ success: false, error: 'التسجيل غير موجود' });
    if (enrollment.remainingHours <= 0) return res.status(400).json({ success: false, error: 'رصيد الساعات منتهي' });
    if (!enrollment.teacherId) return res.status(400).json({ success: false, error: 'يجب تعيين مدرس للتسجيل قبل جدولة الحصص' });

    // Conflict detection: check if teacher has another session at the same time
    const sessionStart = new Date(scheduledAt);
    const sessionEnd = new Date(sessionStart.getTime() + (plannedDuration || 60) * 60000);

    const conflicting = await getSharedPrismaClient().educationSession.findFirst({
      where: {
        companyId,
        teacherId: enrollment.teacherId,
        status: { not: 'CANCELLED' },
        scheduledAt: {
          gte: new Date(sessionStart.getTime() - 60 * 60000), // 1 hour buffer
          lte: new Date(sessionEnd.getTime() + 60 * 60000)
        }
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    if (conflicting) {
      const conflictStart = new Date(conflicting.scheduledAt);
      const conflictEnd = new Date(conflictStart.getTime() + (conflicting.plannedDuration || 60) * 60000);
      // Check actual overlap
      if (sessionStart < conflictEnd && sessionEnd > conflictStart) {
        const studentName = `${conflicting.student?.firstName || ''} ${conflicting.student?.lastName || ''}`.trim();
        return res.status(409).json({
          success: false,
          error: `المدرس لديه حصة أخرى في هذا الوقت مع الطالب ${studentName} (${conflicting.subject?.name || ''})`,
          conflict: {
            id: conflicting.id,
            studentName,
            subjectName: conflicting.subject?.name,
            scheduledAt: conflicting.scheduledAt
          }
        });
      }
    }

    const data = await getSharedPrismaClient().educationSession.create({
      data: {
        companyId,
        enrollmentId,
        teacherId: enrollment.teacherId,
        studentId: enrollment.studentId,
        subjectId: enrollment.package.subjectId,
        scheduledAt: new Date(scheduledAt),
        plannedDuration,
        topic,
        notes
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    educationNotificationService.notifySessionScheduled(companyId, data).catch(e =>
      console.error('[SessionNotify]', e.message)
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الحصة' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { scheduledAt, plannedDuration, topic, notes } = req.body;

    const existing = await getSharedPrismaClient().educationSession.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحصة غير موجودة' });
    if (existing.status !== 'SCHEDULED') return res.status(400).json({ success: false, error: 'لا يمكن تعديل حصة غير مجدولة' });

    const data = await getSharedPrismaClient().educationSession.update({
      where: { id },
      data: { scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, plannedDuration, topic, notes },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحصة' });
  }
};

const confirm = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { actualDuration, notes } = req.body;

    const existing = await getSharedPrismaClient().educationSession.findFirst({
      where: { id, companyId },
      include: {
        enrollment: true,
        teacher: { include: { subjectRates: true } }
      }
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الحصة غير موجودة' });
    if (existing.status !== 'SCHEDULED') return res.status(400).json({ success: false, error: 'يمكن تأكيد الحصص المجدولة فقط' });

    const duration = actualDuration || existing.plannedDuration;
    const hours = duration / 60;

    if (hours > existing.enrollment.remainingHours) {
      return res.status(400).json({ success: false, error: 'الساعات المتبقية غير كافية' });
    }

    // Calculate session payment amount
    const subjectRate = existing.teacher.subjectRates.find(sr => sr.subjectId === existing.subjectId);
    const hourlyRate = subjectRate?.hourlyRate || 0;
    const sessionAmount = Math.round(hours * hourlyRate * 100) / 100;

    // Determine monthly period from session date
    const sessionDate = new Date(existing.scheduledAt);
    const periodFrom = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), 1);
    const periodTo = new Date(sessionDate.getFullYear(), sessionDate.getMonth() + 1, 0, 23, 59, 59);

    const prisma = getSharedPrismaClient();
    const [session] = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.educationSession.update({
        where: { id },
        data: { status: 'CONFIRMED', actualDuration: duration, notes },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } }
        }
      });

      await tx.educationEnrollment.update({
        where: { id: existing.enrollmentId },
        data: { remainingHours: { decrement: hours } }
      });

      // Auto-create or update pending payment for this teacher/period
      const existingPayment = await tx.educationTeacherPayment.findFirst({
        where: { companyId, teacherId: existing.teacherId, periodFrom, periodTo, status: 'PENDING' }
      });

      if (existingPayment) {
        await tx.educationTeacherPayment.update({
          where: { id: existingPayment.id },
          data: {
            totalSessions: { increment: 1 },
            totalHours: { increment: Math.round(hours * 100) / 100 },
            grossAmount: { increment: sessionAmount },
            netAmount: { increment: sessionAmount }
          }
        });
      } else {
        await tx.educationTeacherPayment.create({
          data: {
            companyId,
            teacherId: existing.teacherId,
            periodFrom,
            periodTo,
            totalSessions: 1,
            totalHours: Math.round(hours * 100) / 100,
            hourlyRate,
            grossAmount: sessionAmount,
            deductions: 0,
            netAmount: sessionAmount,
            status: 'PENDING'
          }
        });
      }

      return [updatedSession];
    });

    educationNotificationService.notifySessionConfirmed(companyId, id).catch(e =>
      console.error('[SessionConfirmNotify]', e.message)
    );
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error confirming session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تأكيد الحصة' });
  }
};

const cancel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;

    const existing = await getSharedPrismaClient().educationSession.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحصة غير موجودة' });
    if (existing.status !== 'SCHEDULED') return res.status(400).json({ success: false, error: 'يمكن إلغاء الحصص المجدولة فقط' });

    const data = await getSharedPrismaClient().educationSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    educationNotificationService.notifySessionCancelled(companyId, data).catch(e =>
      console.error('[SessionCancelNotify]', e.message)
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء الحصة' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationSession.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحصة غير موجودة' });

    await getSharedPrismaClient().educationSession.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الحصة' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الحصة' });
  }
};

module.exports = { getAll, getById, create, update, confirm, cancel, remove };
