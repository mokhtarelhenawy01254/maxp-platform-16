const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { teacherId, status } = req.query;
    const where = { companyId };
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    const data = await getSharedPrismaClient().educationTeacherPayment.findMany({
      where,
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المدفوعات' });
  }
};

const calculate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { teacherId, from, to, hourlyRate } = req.body;
    if (!teacherId || !from || !to) {
      return res.status(400).json({ success: false, error: 'المدرس والتاريخ مطلوبان' });
    }

    const sessions = await getSharedPrismaClient().educationSession.findMany({
      where: {
        companyId,
        teacherId,
        status: 'CONFIRMED',
        scheduledAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      include: {
        subject: { select: { id: true, name: true } },
        enrollment: { select: { id: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || s.plannedDuration), 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const rate = hourlyRate || 0;
    const grossAmount = Math.round(totalHours * rate * 100) / 100;

    res.json({
      success: true,
      data: {
        teacherId,
        periodFrom: from,
        periodTo: to,
        totalSessions,
        totalHours,
        hourlyRate: rate,
        grossAmount,
        sessions: sessions.map(s => ({
          id: s.id,
          date: s.scheduledAt,
          subject: s.subject?.name,
          duration: s.actualDuration || s.plannedDuration,
          status: s.status
        }))
      }
    });
  } catch (error) {
    console.error('Error calculating payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب المستحقات' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { teacherId, periodFrom, periodTo, totalSessions, totalHours, hourlyRate, grossAmount, deductions, notes } = req.body;
    if (!teacherId || !periodFrom || !periodTo) {
      return res.status(400).json({ success: false, error: 'بيانات الدفع مطلوبة' });
    }

    const netAmount = (grossAmount || 0) - (deductions || 0);

    const data = await getSharedPrismaClient().educationTeacherPayment.create({
      data: {
        companyId,
        teacherId,
        periodFrom: new Date(periodFrom),
        periodTo: new Date(periodTo),
        totalSessions: totalSessions || 0,
        totalHours: totalHours || 0,
        hourlyRate: hourlyRate || 0,
        grossAmount: grossAmount || 0,
        deductions: deductions || 0,
        netAmount,
        notes
      },
      include: { teacher: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الدفع' });
  }
};

const markPaid = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationTeacherPayment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
      include: { teacher: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error marking payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الدفع' });
  }
};

module.exports = { getAll, calculate, create, markPaid };
