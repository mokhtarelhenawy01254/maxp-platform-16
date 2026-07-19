const express = require('express');
const router = express.Router();
const authController = require('../controller/educationTeacherAuthController');
const { authenticateTeacherToken } = require('../utils/verifyTeacherToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Teacher auth routes
router.post('/login', authController.login);
router.get('/me', authenticateTeacherToken, authController.me);
router.put('/me/password', authenticateTeacherToken, authController.changePassword);

// Teacher's sessions
router.get('/sessions', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const data = await getSharedPrismaClient().educationSession.findMany({
      where: { teacherId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        enrollment: { select: { id: true, remainingHours: true } }
      },
      orderBy: { scheduledAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[TeacherPortal] Sessions error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الحصص' });
  }
});

// Teacher's payments
router.get('/payments', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const data = await getSharedPrismaClient().educationTeacherPayment.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[TeacherPortal] Payments error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المدفوعات' });
  }
});

// Teacher's availability
router.get('/availability', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const data = await getSharedPrismaClient().educationTeacherAvailability.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[TeacherPortal] Availability error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الأوقات المتاحة' });
  }
});

router.put('/availability', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'بيانات الأوقات غير صحيحة' });
    }

    const prisma = getSharedPrismaClient();
    await prisma.$transaction([
      prisma.educationTeacherAvailability.deleteMany({ where: { teacherId } }),
      prisma.educationTeacherAvailability.createMany({
        data: slots.map(s => ({
          companyId: req.teacher.companyId,
          teacherId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable ?? true
        }))
      })
    ]);

    const data = await prisma.educationTeacherAvailability.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[TeacherPortal] Update availability error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الأوقات المتاحة' });
  }
});

// Teacher's schedule (upcoming sessions with week grouping)
router.get('/schedule', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { weekStart } = req.query;
    const startDate = weekStart ? new Date(weekStart) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const data = await getSharedPrismaClient().educationSession.findMany({
      where: {
        teacherId,
        scheduledAt: { gte: startDate, lte: endDate }
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[TeacherPortal] Schedule error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الجدول' });
  }
});

// Teacher dashboard stats
router.get('/dashboard', authenticateTeacherToken, async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const prisma = getSharedPrismaClient();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [upcomingSessions, totalSessions, thisWeekSessions, totalPayments, studentCount] = await Promise.all([
      prisma.educationSession.count({ where: { teacherId, status: 'SCHEDULED', scheduledAt: { gte: now } } }),
      prisma.educationSession.count({ where: { teacherId } }),
      prisma.educationSession.count({ where: { teacherId, scheduledAt: { gte: weekStart, lte: weekEnd } } }),
      prisma.educationTeacherPayment.aggregate({ where: { teacherId, status: 'PAID' }, _sum: { netAmount: true } }),
      prisma.educationSession.findMany({ where: { teacherId }, select: { studentId: true }, distinct: ['studentId'] })
    ]);

    res.json({
      success: true,
      data: {
        upcomingSessions,
        totalSessions,
        thisWeekSessions,
        totalPaid: totalPayments._sum.netAmount || 0,
        totalStudents: studentCount.length
      }
    });
  } catch (error) {
    console.error('[TeacherPortal] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
