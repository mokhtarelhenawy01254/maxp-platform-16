const express = require('express');
const router = express.Router();
const authController = require('../controller/bookingDoctorAuthController');
const { authenticateDoctorToken } = require('../utils/verifyDoctorToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.post('/login', authController.login);
router.get('/me', authenticateDoctorToken, authController.me);
router.put('/me/password', authenticateDoctorToken, authController.changePassword);

// Doctor's own availability
router.get('/availability', authenticateDoctorToken, async (req, res) => {
  try {
    const data = await getSharedPrismaClient().doctorAvailability.findMany({
      where: { doctorId: req.doctor.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[DoctorPortal] Availability error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الأوقات المتاحة' });
  }
});

router.put('/availability', authenticateDoctorToken, async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'بيانات الأوقات غير صحيحة' });
    }

    const prisma = getSharedPrismaClient();
    const doctorId = req.doctor.id;
    await prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({ where: { doctorId } });
      await tx.doctorAvailability.createMany({
        data: slots
          .filter(s => s.isAvailable && s.startTime && s.endTime)
          .map(s => ({
            companyId: req.doctor.companyId,
            doctorId,
            dayOfWeek: Number(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: true,
          })),
      });
    });

    const data = await prisma.doctorAvailability.findMany({ where: { doctorId }, orderBy: { dayOfWeek: 'asc' } });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[DoctorPortal] Update availability error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الأوقات المتاحة' });
  }
});

// Doctor's appointments (upcoming / by filters)
router.get('/appointments', authenticateDoctorToken, async (req, res) => {
  try {
    const { status, dateFrom, dateTo, limit } = req.query;
    const where = { doctorId: req.doctor.id };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) where.appointmentDate.gte = new Date(dateFrom);
      if (dateTo) where.appointmentDate.lte = new Date(dateTo);
    }

    const data = await getSharedPrismaClient().appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, bloodType: true } },
        branch: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
      take: Math.min(200, parseInt(limit) || 100),
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[DoctorPortal] Appointments error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المواعيد' });
  }
});

// Doctor's schedule grouped by week
router.get('/schedule', authenticateDoctorToken, async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startDate = weekStart ? new Date(weekStart) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const data = await getSharedPrismaClient().appointment.findMany({
      where: {
        doctorId: req.doctor.id,
        appointmentDate: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[DoctorPortal] Schedule error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الجدول' });
  }
});

// Doctor's patients (distinct from their appointments)
router.get('/patients', authenticateDoctorToken, async (req, res) => {
  try {
    const appointments = await getSharedPrismaClient().appointment.findMany({
      where: { doctorId: req.doctor.id, patientId: { not: null } },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    const ids = appointments.map(a => a.patientId).filter(Boolean);
    const patients = ids.length > 0
      ? await getSharedPrismaClient().patient.findMany({
          where: { id: { in: ids } },
          include: { _count: { select: { appointments: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('[DoctorPortal] Patients error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المرضى' });
  }
});

// Doctor's revenue from invoices on their appointments
router.get('/payments', authenticateDoctorToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: req.doctor.id },
      select: { id: true },
    });
    const appointmentIds = appointments.map(a => a.id);

    const [invoices, totals] = await Promise.all([
      appointmentIds.length > 0
        ? prisma.medicalInvoice.findMany({
            where: { appointmentId: { in: appointmentIds } },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      appointmentIds.length > 0
        ? prisma.medicalInvoice.aggregate({
            where: { appointmentId: { in: appointmentIds }, status: { notIn: ['REFUNDED'] } },
            _sum: { total: true, amountPaid: true },
          })
        : Promise.resolve({ _sum: { total: 0, amountPaid: 0 } }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        totalRevenue: totals._sum.total || 0,
        collected: totals._sum.amountPaid || 0,
        outstanding: (totals._sum.total || 0) - (totals._sum.amountPaid || 0),
      },
    });
  } catch (error) {
    console.error('[DoctorPortal] Payments error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المدفوعات' });
  }
});

// Doctor dashboard stats
router.get('/dashboard', authenticateDoctorToken, async (req, res) => {
  try {
    const doctorId = req.doctor.id;
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, upcomingAppointments, totalAppointments, completedAppointments, patientCount, unpaidInvoices] = await Promise.all([
      prisma.appointment.count({ where: { doctorId, appointmentDate: today, status: { notIn: ['cancelled', 'no_show'] } } }),
      prisma.appointment.count({ where: { doctorId, appointmentDate: { gte: tomorrow }, status: { notIn: ['cancelled', 'no_show'] } } }),
      prisma.appointment.count({ where: { doctorId } }),
      prisma.appointment.count({ where: { doctorId, status: 'completed' } }),
      prisma.appointment.findMany({ where: { doctorId, patientId: { not: null } }, select: { patientId: true }, distinct: ['patientId'] }),
      prisma.medicalInvoice.count({
        where: {
          status: { in: ['UNPAID', 'PARTIAL'] },
          appointment: { doctorId },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        todayAppointments,
        upcomingAppointments,
        totalAppointments,
        completedAppointments,
        totalPatients: patientCount.length,
        unpaidInvoices,
      },
    });
  } catch (error) {
    console.error('[DoctorPortal] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
