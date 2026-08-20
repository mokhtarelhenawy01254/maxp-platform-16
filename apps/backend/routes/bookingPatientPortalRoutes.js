const express = require('express');
const router = express.Router();
const authController = require('../controller/bookingPatientAuthController');
const { authenticatePatientToken } = require('../utils/verifyPatientToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.post('/login', authController.login);
router.get('/me', authenticatePatientToken, authController.me);
router.put('/me/password', authenticatePatientToken, authController.changePassword);

// Patient's own appointments (upcoming + history)
router.get('/appointments', authenticatePatientToken, async (req, res) => {
  try {
    const { status, limit } = req.query;
    const where = { patientId: req.patient.id };
    if (status) where.status = status;

    const data = await getSharedPrismaClient().appointment.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        doctor: { select: { id: true, title: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
      take: Math.min(200, parseInt(limit) || 100),
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PatientPortal] Appointments error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à┘ê╪º╪╣┘è╪»' });
  }
});

// Patient's medical history (visits with diagnosis/prescription)
router.get('/medical-history', authenticatePatientToken, async (req, res) => {
  try {
    const data = await getSharedPrismaClient().appointment.findMany({
      where: { patientId: req.patient.id, OR: [{ diagnosis: { not: null } }, { prescription: { not: null } }, { treatmentPlan: { not: null } }] },
      include: {
        branch: { select: { id: true, name: true } },
        doctor: { select: { id: true, title: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PatientPortal] Medical history error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¬╪º╪▒┘è╪« ╪º┘ä╪╖╪¿┘è' });
  }
});

// Patient's invoices
router.get('/invoices', authenticatePatientToken, async (req, res) => {
  try {
    const data = await getSharedPrismaClient().medicalInvoice.findMany({
      where: { patientId: req.patient.id },
      include: { appointment: { select: { id: true, appointmentDate: true, serviceName: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    const formatted = data.map(inv => ({
      ...inv,
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : null,
      net: Math.max(0, inv.total - inv.discount + (inv.additionAmount || 0)),
      remaining: Math.max(0, Math.max(0, inv.total - inv.discount + (inv.additionAmount || 0)) - inv.amountPaid),
    }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[PatientPortal] Invoices error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒' });
  }
});

// Patient dashboard stats
router.get('/dashboard', authenticatePatientToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const patientId = req.patient.id;
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const [upcoming, completed, total, unpaidInvoices, totalSpent] = await Promise.all([
      prisma.appointment.count({ where: { patientId, appointmentDate: { gte: today }, status: { notIn: ['cancelled', 'no_show'] } } }),
      prisma.appointment.count({ where: { patientId, status: 'completed' } }),
      prisma.appointment.count({ where: { patientId } }),
      prisma.medicalInvoice.count({ where: { patientId, status: { in: ['UNPAID', 'PARTIAL'] } } }),
      prisma.medicalInvoice.aggregate({ where: { patientId, status: { notIn: ['REFUNDED'] } }, _sum: { amountPaid: true } }),
    ]);

    res.json({
      success: true,
      data: {
        upcomingAppointments: upcoming,
        completedAppointments: completed,
        totalAppointments: total,
        unpaidInvoices,
        totalSpent: totalSpent._sum.amountPaid || 0,
      },
    });
  } catch (error) {
    console.error('[PatientPortal] Dashboard error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬' });
  }
});

module.exports = router;
