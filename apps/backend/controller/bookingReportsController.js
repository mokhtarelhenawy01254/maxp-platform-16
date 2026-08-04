const { getSharedPrismaClient } = require('../services/sharedDatabase');

const CSV_HEADERS = {
  appointments: ['id', 'customerName', 'customerPhone', 'customerGender', 'branchName', 'doctorName', 'serviceName', 'appointmentDate', 'startTime', 'endTime', 'status', 'diagnosis', 'paymentStatus', 'source'],
  invoices: ['invoiceNumber', 'patientName', 'patientPhone', 'total', 'discount', 'net', 'amountPaid', 'remaining', 'status', 'dueDate', 'createdAt'],
};

const csvEscape = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers, rows) => {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(headers.map(h => csvEscape(row[h] ?? '')).join(','));
  return lines.join('\n');
};

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

    const prisma = getSharedPrismaClient();
    const where = { companyId, appointmentDate: { gte: dateFrom, lte: dateTo } };

    const [total, byStatus, cancelled, confirmed, pending, byService, byBranch, byDoctor, invoices] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.appointment.count({ where: { ...where, status: 'cancelled' } }),
      prisma.appointment.count({ where: { ...where, status: 'confirmed' } }),
      prisma.appointment.count({ where: { ...where, status: 'pending' } }),
      prisma.appointment.groupBy({ by: ['serviceName'], where, _count: { _all: true } }),
      prisma.appointment.groupBy({ by: ['branchId'], where, _count: { _all: true } }),
      prisma.appointment.groupBy({ by: ['doctorId'], where, _count: { _all: true } }),
      prisma.medicalInvoice.findMany({
        where: { companyId, createdAt: { gte: dateFrom, lte: dateTo } },
        select: { total: true, discount: true, amountPaid: true, status: true, patientId: true, appointmentId: true },
      }),
    ]);

    const [branches, doctors, patients] = await Promise.all([
      prisma.bookingBranch.findMany({ where: { companyId }, select: { id: true, name: true } }),
      prisma.bookingDoctor.findMany({ where: { companyId }, select: { id: true, name: true, title: true } }),
      prisma.patient.findMany({ where: { companyId }, select: { id: true, gender: true, createdAt: true } }),
    ]);
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const doctorMap = new Map(doctors.map(d => [d.id, `${d.title || ''} ${d.name || ''}`.trim()]));

    // Financials
    const activeInvoices = invoices.filter(i => i.status !== 'REFUNDED');
    const totalRevenue = activeInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const collected = activeInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
    const outstanding = totalRevenue - collected;
    const unpaidInvoices = invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').length;

    // Doctor performance
    const doctorAgg = await prisma.appointment.groupBy({
      by: ['doctorId', 'status'],
      where: { companyId, doctorId: { not: null }, appointmentDate: { gte: dateFrom, lte: dateTo } },
      _count: { _all: true },
    });
    const doctorPerformanceMap = new Map();
    for (const row of doctorAgg) {
      if (!doctorPerformanceMap.has(row.doctorId)) doctorPerformanceMap.set(row.doctorId, { total: 0, completed: 0, cancelled: 0, noShow: 0, other: 0 });
      const entry = doctorPerformanceMap.get(row.doctorId);
      entry.total += row._count._all;
      if (row.status === 'completed') entry.completed += row._count._all;
      else if (row.status === 'cancelled') entry.cancelled += row._count._all;
      else if (row.status === 'no_show') entry.noShow += row._count._all;
      else entry.other += row._count._all;
    }
    const doctorPerformance = [...doctorPerformanceMap.entries()]
      .map(([doctorId, p]) => ({
        doctorId,
        doctorName: doctorMap.get(doctorId) || 'غير معروف',
        ...p,
        attendanceRate: p.total > 0 ? +(((p.total - p.cancelled - p.noShow) / p.total) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Patient stats
    const newPatientCount = patients.filter(p => p.createdAt >= dateFrom && p.createdAt <= dateTo).length;
    const maleCount = patients.filter(p => p.gender === 'MALE').length;
    const femaleCount = patients.filter(p => p.gender === 'FEMALE').length;
    const invoicePatients = new Set(invoices.map(i => i.patientId));

    // Service revenue: link invoices to appointments to attribute revenue per service
    const invoiceAppointmentIds = invoices.filter(i => i.appointmentId && i.status !== 'REFUNDED').map(i => i.appointmentId);
    const serviceRevenueRows = invoiceAppointmentIds.length > 0
      ? await prisma.appointment.findMany({
          where: { id: { in: invoiceAppointmentIds } },
          select: { id: true, serviceName: true },
        })
      : [];
    const serviceRevenueMap = new Map();
    for (const row of serviceRevenueRows) {
      const key = row.serviceName || 'غير محدد';
      const inv = invoices.find(i => i.appointmentId === row.id && i.status !== 'REFUNDED');
      if (inv) serviceRevenueMap.set(key, (serviceRevenueMap.get(key) || 0) + (Number(inv.total) || 0));
    }

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
        .map(s => ({ service: s.serviceName, count: s._count._all, revenue: +(serviceRevenueMap.get(s.serviceName) || 0).toFixed(2) }))
        .sort((a, b) => b.count - a.count),
      branchBreakdown: byBranch
        .filter(b => b.branchId)
        .map(b => ({ branchId: b.branchId, branchName: branchMap.get(b.branchId) || 'غير معروف', count: b._count._all }))
        .sort((a, b) => b.count - a.count),
      doctorBreakdown: byDoctor
        .filter(d => d.doctorId)
        .map(d => ({ doctorId: d.doctorId, doctorName: doctorMap.get(d.doctorId) || 'غير معروف', count: d._count._all }))
        .sort((a, b) => b.count - a.count),
      // Financials
      financials: {
        totalRevenue: +totalRevenue.toFixed(2),
        collected: +collected.toFixed(2),
        outstanding: +outstanding.toFixed(2),
        invoiceCount: invoices.length,
        unpaidInvoices,
      },
      // Doctor performance
      doctorPerformance,
      // Patient stats
      patientStats: {
        totalPatients: patients.length,
        newPatients: newPatientCount,
        returningPatients: invoicePatients.size,
        maleCount,
        femaleCount,
      },
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التقارير' });
  }
};

const exportCsv = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { type, dateFrom, dateTo, status } = req.query;
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) where.appointmentDate.gte = new Date(dateFrom);
      if (dateTo) where.appointmentDate.lte = new Date(dateTo);
    }
    if (status) where.status = status;

    let csv;
    let filename;

    if (type === 'invoices') {
      const invoices = await prisma.medicalInvoice.findMany({
        where: { companyId, ...(dateFrom || dateTo ? { createdAt: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } } : {}) },
        include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      });
      csv = toCsv(CSV_HEADERS.invoices, invoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        patientName: `${i.patient?.firstName || ''} ${i.patient?.lastName || ''}`.trim(),
        patientPhone: i.patient?.phone || '',
        total: i.total, discount: i.discount,
        net: Math.max(0, i.total - i.discount),
        amountPaid: i.amountPaid,
        remaining: Math.max(0, Math.max(0, i.total - i.discount) - i.amountPaid),
        status: i.status,
        dueDate: i.dueDate ? i.dueDate.toISOString().split('T')[0] : '',
        createdAt: i.createdAt.toISOString(),
      })));
      filename = `invoices-${Date.now()}.csv`;
    } else {
      const [appointments, branches, doctors] = await Promise.all([
        prisma.appointment.findMany({ where, orderBy: { appointmentDate: 'desc' } }),
        prisma.bookingBranch.findMany({ where: { companyId }, select: { id: true, name: true } }),
        prisma.bookingDoctor.findMany({ where: { companyId }, select: { id: true, name: true } }),
      ]);
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      const doctorMap = new Map(doctors.map(d => [d.id, d.name]));
      csv = toCsv(CSV_HEADERS.appointments, appointments.map(a => ({
        id: a.id,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        customerGender: a.customerGender,
        branchName: branchMap.get(a.branchId) || '',
        doctorName: doctorMap.get(a.doctorId) || '',
        serviceName: a.serviceName || '',
        appointmentDate: a.appointmentDate.toISOString().split('T')[0],
        startTime: a.startTime, endTime: a.endTime || '',
        status: a.status,
        diagnosis: a.diagnosis || '',
        paymentStatus: a.paymentStatus || '',
        source: a.source || '',
      })));
      filename = `appointments-${Date.now()}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Arabic in Excel
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التصدير' });
  }
};

module.exports = { getReportsSummary, exportCsv };
