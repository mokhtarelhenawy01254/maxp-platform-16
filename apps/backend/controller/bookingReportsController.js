const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getReportsSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const period = req.query.period || 'today';
    const now = new Date();
    let dateFrom, dateTo;
    const fmt = (d) => d.toISOString().split('T')[0];

    if (period === 'today') {
      dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      dateFrom = new Date(now); dateFrom.setDate(now.getDate() - 6); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ success: false, error: 'الفترة يجب أن تكون today|week|month' });
    }

    const where = { companyId, appointmentDate: { gte: dateFrom, lte: dateTo } };

    const [total, byStatus, cancelled, confirmed, pending, byService, byBranch, byDoctor] = await Promise.all([
      getSharedPrismaClient().appointment.count({ where }),
      getSharedPrismaClient().appointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
      getSharedPrismaClient().appointment.count({ where: { ...where, status: 'cancelled' } }),
      getSharedPrismaClient().appointment.count({ where: { ...where, status: 'confirmed' } }),
      getSharedPrismaClient().appointment.count({ where: { ...where, status: 'pending' } }),
      getSharedPrismaClient().appointment.groupBy({ by: ['serviceName'], where, _count: { _all: true } }),
      getSharedPrismaClient().appointment.groupBy({ by: ['branchId'], where, _count: { _all: true } }),
      getSharedPrismaClient().appointment.groupBy({ by: ['doctorId'], where, _count: { _all: true } }),
    ]);

    const [branches, doctors] = await Promise.all([
      getSharedPrismaClient().bookingBranch.findMany({ where: { companyId }, select: { id: true, name: true } }),
      getSharedPrismaClient().bookingDoctor.findMany({ where: { companyId }, select: { id: true, name: true, title: true } }),
    ]);
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const doctorMap = new Map(doctors.map(d => [d.id, `${d.title || ''} ${d.name || ''}`.trim()]));

    const data = {
      period,
      dateFrom: fmt(dateFrom),
      dateTo: fmt(dateTo),
      totalAppointments: total,
      confirmed,
      pending,
      cancelled,
      cancellationRate: total > 0 ? +(cancelled / total * 100).toFixed(1) : 0,
      statusBreakdown: byStatus.map(s => ({ status: s.status, count: s._count._all })),
      serviceBreakdown: byService
        .filter(s => s.serviceName)
        .map(s => ({ service: s.serviceName, count: s._count._all }))
        .sort((a, b) => b.count - a.count),
      branchBreakdown: byBranch
        .filter(b => b.branchId)
        .map(b => ({ branchId: b.branchId, branchName: branchMap.get(b.branchId) || 'غير معروف', count: b._count._all }))
        .sort((a, b) => b.count - a.count),
      doctorBreakdown: byDoctor
        .filter(d => d.doctorId)
        .map(d => ({ doctorId: d.doctorId, doctorName: doctorMap.get(d.doctorId) || 'غير معروف', count: d._count._all }))
        .sort((a, b) => b.count - a.count),
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التقارير' });
  }
};

module.exports = { getReportsSummary };