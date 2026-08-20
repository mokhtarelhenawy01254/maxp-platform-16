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
      prisma.radiologyStudy.findMany({ where, select: { status: true, orderStatus: true, modality: true, examTypeName: true, assignedRadiologistName: true, referralDoctor: true, referringPhysicianId: true, referralSourceId: true, referralSourceName: true, marketingRepId: true, marketingRepName: true, isExternalReferral: true, externalPartnerName: true, priceSnapshot: true, additionAmount: true, createdAt: true } }),
      prisma.radiologyExamType.findMany({ where: { companyId }, select: { category: true } }),
      prisma.radiologyAppointment.findMany({ where, select: { status: true, studyId: true } }),
    ]);

    // Resolve ids → names for sources and reps (loose scalar refs need a second query)
    const sourceIds = [...new Set(studies.map((s) => s.referralSourceId).filter(Boolean))];
    const repIds = [...new Set(studies.map((s) => s.marketingRepId).filter(Boolean))];
    const [sources, reps] = await Promise.all([
      sourceIds.length ? prisma.radiologyReferralSource.findMany({ where: { id: { in: sourceIds }, companyId }, select: { id: true, name: true } }) : [],
      repIds.length ? prisma.radiologyMarketingRep.findMany({ where: { id: { in: repIds }, companyId }, select: { id: true, name: true } }) : [],
    ]);
    const sourceNameById = new Map(sources.map((s) => [s.id, s.name]));
    const repNameById = new Map(reps.map((r) => [r.id, r.name]));

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
    const bySource = {};
    const byRep = {};
    let externalReferrals = 0;
    let externalReferralRevenue = 0;
    for (const s of studies) {
      byStatus[s.status || 'UNKNOWN'] = (byStatus[s.status || 'UNKNOWN'] || 0) + 1;
      const mod = s.modality || 'غير محدد';
      byModality[mod] = (byModality[mod] || 0) + 1;
      if (s.assignedRadiologistName) byRadiologist[s.assignedRadiologistName] = (byRadiologist[s.assignedRadiologistName] || 0) + 1;
      if (s.referralDoctor) byDoctor[s.referralDoctor] = (byDoctor[s.referralDoctor] || 0) + 1;
      const sourceKey = s.referralSourceName || (s.referralSourceId ? sourceNameById.get(s.referralSourceId) : null) || null;
      if (sourceKey) bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;
      const repKey = s.marketingRepName || (s.marketingRepId ? repNameById.get(s.marketingRepId) : null) || null;
      if (repKey) byRep[repKey] = (byRep[repKey] || 0) + 1;
      if (s.isExternalReferral) {
        externalReferrals += 1;
        externalReferralRevenue += (s.priceSnapshot || 0) + (s.additionAmount || 0);
      }
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
        bySource,
        byRep,
        externalReferrals,
        externalReferralRevenue,
        modalityOptions,
      },
    });
  } catch (error) {
    console.error('Error computing radiology statistics:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب الإحصائيات' });
  }
};

module.exports = { getStatistics };
