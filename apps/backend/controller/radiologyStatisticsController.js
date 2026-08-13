const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getStatistics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { dateFrom, dateTo } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (dateFrom || dateTo) {
      const f = {};
      if (dateFrom) f.gte = new Date(dateFrom);
      if (dateTo) f.lte = new Date(dateTo);
      where.createdAt = f;
    }

    const [studies, exams, appointments] = await Promise.all([
      prisma.radiologyStudy.findMany({ where, select: { status: true, orderStatus: true, modality: true, examTypeName: true, assignedRadiologistName: true, referralDoctor: true, createdAt: true } }),
      prisma.radiologyExamType.findMany({ where: { companyId }, select: { category: true } }),
      prisma.radiologyAppointment.findMany({ where, select: { status: true, studyId: true } }),
    ]);

    const orderStatusBreakdown = { PENDING: 0, CHECKED_IN: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const a of appointments) {
      if (a.status === 'SCHEDULED') orderStatusBreakdown.PENDING += 1;
      else if (a.status === 'CHECKED_IN') orderStatusBreakdown.CHECKED_IN += 1;
      else if (a.status === 'CANCELLED' && !a.studyId) orderStatusBreakdown.CANCELLED += 1;
    }
    for (const s of studies) {
      const k = s.orderStatus || 'IN_PROGRESS';
      if (orderStatusBreakdown[k] !== undefined) orderStatusBreakdown[k] += 1;
    }

    const byStatus = {};
    const byModality = {};
    const byRadiologist = {};
    const byDoctor = {};
    for (const s of studies) {
      byStatus[s.status || 'UNKNOWN'] = (byStatus[s.status || 'UNKNOWN'] || 0) + 1;
      const mod = s.modality || 'غير محدد';
      byModality[mod] = (byModality[mod] || 0) + 1;
      if (s.assignedRadiologistName) byRadiologist[s.assignedRadiologistName] = (byRadiologist[s.assignedRadiologistName] || 0) + 1;
      if (s.referralDoctor) byDoctor[s.referralDoctor] = (byDoctor[s.referralDoctor] || 0) + 1;
    }

    const modalityOptions = Array.from(new Set((exams || []).map(e => e.category).filter(Boolean)));
    const total = studies.length;
    const delivered = byStatus['DELIVERED'] || 0;
    const pendingReport = byStatus['PENDING_REPORT'] || 0;
    const reported = byStatus['REPORTED'] || 0;

    res.json({
      success: true,
      data: {
        total,
        delivered,
        pendingReport,
        reported,
        completionRate: total ? Math.round((delivered / total) * 100) : 0,
        orderStatusBreakdown,
        byStatus,
        byModality,
        byRadiologist,
        byDoctor,
        modalityOptions,
      },
    });
  } catch (error) {
    console.error('Error computing radiology statistics:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب الإحصائيات' });
  }
};

module.exports = { getStatistics };
