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
          where: { id: { in: invoiceAppointmentIds }, companyId },
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
      csv = toCsv(CSV_HEADERS.invoices, invoices.map(i => {
        const invNet = netOf(i.total, i.discount, i.additionAmount);
        return {
          invoiceNumber: i.invoiceNumber,
          patientName: `${i.patient?.firstName || ''} ${i.patient?.lastName || ''}`.trim(),
          patientPhone: i.patient?.phone || '',
          total: i.total, discount: i.discount,
          net: invNet,
          amountPaid: i.amountPaid,
          remaining: Math.max(0, invNet - (Number(i.amountPaid) || 0)),
          status: i.status,
          dueDate: i.dueDate ? i.dueDate.toISOString().split('T')[0] : '',
          createdAt: i.createdAt.toISOString(),
        };
      }));
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

const num = (v) => Number(v) || 0;

const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

const fmtDate = (d) => (d instanceof Date && !isNaN(d)) ? d.toISOString().split('T')[0] : '';

const netOf = (total, discount, additionAmount) =>
  Math.max(0, num(total) - num(discount) + num(additionAmount));

const PAYBACK_REASON_PATTERNS = ['payback', 'refund', 'استرداد', 'مرتجع'];

const isPaybackPayment = (p) =>
  p.paybackOfPaymentId != null ||
  num(p.amount) < 0 ||
  (!!p.reason && PAYBACK_REASON_PATTERNS.some((pt) => String(p.reason).toLowerCase().includes(pt.toLowerCase())));

const buildPaybackReasonOr = () => {
  const ors = [{ paybackOfPaymentId: { not: null } }, { amount: { lt: 0 } }];
  for (const pattern of PAYBACK_REASON_PATTERNS) {
    if (/[a-z]/i.test(pattern)) ors.push({ reason: { contains: pattern, mode: 'insensitive' } });
    else ors.push({ reason: { contains: pattern } });
  }
  return ors;
};

const parseDayStart = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const iso = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00.000Z`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const resolveDateRange = (req, res) => {
  const now = new Date();
  const fromRaw = req.query.from || req.query.dateFrom;
  const toRaw = req.query.to || req.query.dateTo;
  const start = fromRaw ? parseDayStart(fromRaw) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = toRaw
    ? (() => { const d = parseDayStart(toRaw); if (d) d.setUTCHours(23, 59, 59, 999); return d; })()
    : (() => { const d = new Date(now); d.setHours(23, 59, 59, 999); return d; })();
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    res.status(400).json({ success: false, error: 'نطاق التاريخ غير صالح' });
    return null;
  }
  return { start, end };
};

const buildAppointmentInvoiceFilter = (query) => {
  const branchId = query.branchId;
  const doctorId = query.doctorId;
  const serviceId = query.serviceId;
  if (!branchId && !doctorId && !serviceId) return {};
  return {
    appointment: {
      is: {
        ...(branchId ? { branchId } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(serviceId ? { serviceId } : {}),
      },
    },
  };
};

const linkInvoicesToAppointments = async (prisma, companyId, invoices) => {
  const apptIds = [...new Set(invoices.filter((i) => i.appointmentId).map((i) => i.appointmentId))];
  if (apptIds.length === 0) return new Map();
  const appointments = await prisma.appointment.findMany({
    where: { id: { in: apptIds }, companyId },
    select: { id: true, doctorId: true, serviceId: true, serviceName: true, reportStatus: true },
  });
  return new Map(appointments.map((a) => [a.id, a]));
};

const getRevenueReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();

    const invoices = await prisma.medicalInvoice.findMany({
      where: {
        companyId,
        createdAt: { gte: range.start, lte: range.end },
        ...buildAppointmentInvoiceFilter(req.query),
      },
      select: { id: true, appointmentId: true, total: true, discount: true, additionAmount: true, amountPaid: true, status: true },
    });
    const active = invoices.filter((i) => i.status !== 'REFUNDED');

    const [apptMap, doctors, services] = await Promise.all([
      linkInvoicesToAppointments(prisma, companyId, active),
      prisma.bookingDoctor.findMany({ where: { companyId }, select: { id: true, name: true, specialty: true } }),
      prisma.bookingService.findMany({ where: { companyId }, select: { id: true, name: true } }),
    ]);
    const doctorNameMap = new Map(doctors.map((d) => [d.id, d.name || '']));
    const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

    const invoiceIds = active.map((i) => i.id);
    const payments = invoiceIds.length > 0
      ? await prisma.medicalPayment.findMany({
          where: { companyId, invoiceId: { in: invoiceIds }, paidAt: { gte: range.start, lte: range.end } },
          select: { invoiceId: true, amount: true },
        })
      : [];
    const collectedByInvoice = new Map();
    for (const p of payments) collectedByInvoice.set(p.invoiceId, (collectedByInvoice.get(p.invoiceId) || 0) + num(p.amount));

    const doctorRows = new Map();
    const serviceRows = new Map();
    let billed = 0;
    let discounts = 0;
    let collected = 0;
    let net = 0;

    for (const inv of active) {
      const invDiscount = num(inv.discount);
      const invCollected = collectedByInvoice.get(inv.id) || 0;
      const invNet = netOf(inv.total, inv.discount, inv.additionAmount);
      billed += num(inv.total);
      discounts += invDiscount;
      net += invNet;
      collected += invCollected;

      const appt = inv.appointmentId ? apptMap.get(inv.appointmentId) : null;
      const docKey = appt?.doctorId || 'none';
      const svcKey = appt?.serviceId || 'none';

      let dRow = doctorRows.get(docKey);
      if (!dRow) {
        dRow = {
          doctorId: appt?.doctorId || null,
          doctorName: appt?.doctorId ? (doctorNameMap.get(appt.doctorId) || 'غير معروف') : 'غير محدد',
          billed: 0, discounts: 0, collected: 0, net: 0, invoiceCount: 0,
        };
        doctorRows.set(docKey, dRow);
      }
      dRow.billed += num(inv.total);
      dRow.discounts += invDiscount;
      dRow.net += invNet;
      dRow.collected += invCollected;
      dRow.invoiceCount += 1;

      let sRow = serviceRows.get(svcKey);
      if (!sRow) {
        sRow = {
          serviceId: appt?.serviceId || null,
          serviceName: appt?.serviceId ? (serviceNameMap.get(appt.serviceId) || 'غير معروف') : (appt?.serviceName || 'غير محدد'),
          billed: 0, discounts: 0, collected: 0, net: 0, invoiceCount: 0,
        };
        serviceRows.set(svcKey, sRow);
      }
      sRow.billed += num(inv.total);
      sRow.discounts += invDiscount;
      sRow.net += invNet;
      sRow.collected += invCollected;
      sRow.invoiceCount += 1;
    }

    const finalizeRevenueRows = (rows) => rows.map((r) => ({
      id: r.doctorId || r.serviceId,
      name: r.doctorName || r.serviceName,
      billed: round2(r.billed),
      discounts: round2(r.discounts),
      collected: round2(r.collected),
      outstanding: round2(Math.max(0, r.net - r.collected)),
      invoiceCount: r.invoiceCount,
    }));

    const byDoctor = finalizeRevenueRows([...doctorRows.values()]).sort((a, b) => b.billed - a.billed);
    const byService = finalizeRevenueRows([...serviceRows.values()]).sort((a, b) => b.billed - a.billed);

    res.json({
      success: true,
      data: {
        dateFrom: fmtDate(range.start),
        dateTo: fmtDate(range.end),
        totals: {
          billed: round2(billed),
          discounts: round2(discounts),
          collected: round2(collected),
          outstanding: round2(Math.max(0, net - collected)),
          invoiceCount: active.length,
        },
        byDoctor,
        byService,
      },
    });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الإيرادات' });
  }
};

const getActualVsExpected = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();

    const invoices = await prisma.medicalInvoice.findMany({
      where: {
        companyId,
        createdAt: { gte: range.start, lte: range.end },
        ...buildAppointmentInvoiceFilter(req.query),
      },
      select: { id: true, total: true, discount: true, additionAmount: true, status: true, createdAt: true },
    });
    const invoiceIds = invoices.map((i) => i.id);
    const payments = invoiceIds.length > 0
      ? await prisma.medicalPayment.findMany({
          where: { companyId, invoiceId: { in: invoiceIds }, paidAt: { gte: range.start, lte: range.end } },
          select: { amount: true, paidAt: true },
        })
      : [];

    const expectedByDay = new Map();
    for (const inv of invoices) {
      if (inv.status === 'REFUNDED') continue;
      const day = fmtDate(inv.createdAt);
      expectedByDay.set(day, (expectedByDay.get(day) || 0) + netOf(inv.total, inv.discount, inv.additionAmount));
    }
    const actualByDay = new Map();
    for (const p of payments) {
      const day = fmtDate(p.paidAt);
      actualByDay.set(day, (actualByDay.get(day) || 0) + num(p.amount));
    }

    const firstDay = fmtDate(range.start);
    const lastDay = fmtDate(range.end);
    const days = [];
    const cursor = new Date(`${firstDay}T00:00:00.000Z`);
    const endTime = new Date(`${lastDay}T23:59:59.999Z`);
    while (cursor <= endTime) {
      days.push(cursor.toISOString().split('T')[0]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
    }

    let expected = 0;
    let actual = 0;
    const rows = days.map((day) => {
      const exp = expectedByDay.get(day) || 0;
      const act = actualByDay.get(day) || 0;
      expected += exp;
      actual += act;
      return { date: day, expected: round2(exp), actual: round2(act), variance: round2(act - exp) };
    });

    res.json({
      success: true,
      data: {
        dateFrom: firstDay,
        dateTo: lastDay,
        totals: { expected: round2(expected), actual: round2(actual), variance: round2(actual - expected) },
        rows,
      },
    });
  } catch (error) {
    console.error('Error fetching actual vs expected:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الفعلي مقابل المتوقع' });
  }
};

const getPhysicianCommissions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();

    const invoices = await prisma.medicalInvoice.findMany({
      where: {
        companyId,
        createdAt: { gte: range.start, lte: range.end },
        status: { not: 'REFUNDED' },
        ...buildAppointmentInvoiceFilter(req.query),
      },
      select: { id: true, appointmentId: true, total: true, discount: true, additionAmount: true, status: true },
    });

    const [apptMap, doctors, branches] = await Promise.all([
      linkInvoicesToAppointments(prisma, companyId, invoices),
      prisma.bookingDoctor.findMany({
        where: { companyId },
        select: { id: true, name: true, specialty: true, commissionRate: true, branchId: true },
      }),
      prisma.bookingBranch.findMany({ where: { companyId }, select: { id: true, name: true } }),
    ]);
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));
    const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));

    const agg = new Map();
    for (const inv of invoices) {
      const appt = inv.appointmentId ? apptMap.get(inv.appointmentId) : null;
      const docId = appt?.doctorId;
      if (!docId) continue;
      let row = agg.get(docId);
      if (!row) {
        row = { doctorId: docId, gross: 0, invoiceCount: 0, reportStatuses: new Map() };
        agg.set(docId, row);
      }
      row.gross += netOf(inv.total, inv.discount, inv.additionAmount);
      row.invoiceCount += 1;
      const reportStatus = appt.reportStatus || 'NONE';
      row.reportStatuses.set(reportStatus, (row.reportStatuses.get(reportStatus) || 0) + 1);
    }

    const rows = [...agg.values()].map((r) => {
      const doctor = doctorMap.get(r.doctorId) || {};
      const rate = doctor.commissionRate != null ? num(doctor.commissionRate) : 0;
      const gross = round2(r.gross);
      const commission = rate > 0 ? round2(gross * (rate / 100)) : 0;
      const byReportStatus = [...r.reportStatuses.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);
      const unapprovedCount = [...r.reportStatuses.entries()]
        .filter(([status]) => status !== 'APPROVED')
        .reduce((s, [, c]) => s + c, 0);
      return {
        doctorId: r.doctorId,
        doctorName: doctor.name || 'غير معروف',
        specialty: doctor.specialty || '',
        branchId: doctor.branchId || null,
        branchName: branchNameMap.get(doctor.branchId) || 'غير محدد',
        gross,
        commissionRate: rate,
        commission,
        net: round2(gross - commission),
        invoiceCount: r.invoiceCount,
        byReportStatus,
        unapprovedCount,
      };
    }).sort((a, b) => b.gross - a.gross);

    const totals = rows.reduce((t, r) => ({
      gross: t.gross + r.gross,
      commission: t.commission + r.commission,
      net: t.net + r.net,
      unapprovedCount: t.unapprovedCount + r.unapprovedCount,
    }), { gross: 0, commission: 0, net: 0, unapprovedCount: 0 });
    totals.gross = round2(totals.gross);
    totals.commission = round2(totals.commission);
    totals.net = round2(totals.net);

    res.json({
      success: true,
      data: {
        dateFrom: fmtDate(range.start),
        dateTo: fmtDate(range.end),
        basis: { commission: 'invoice_net', unapproved: 'reportStatus != APPROVED' },
        totals,
        rows,
      },
    });
  } catch (error) {
    console.error('Error fetching physician commissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير عمولات الأطباء' });
  }
};

const getDues = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();

    const invoices = await prisma.medicalInvoice.findMany({
      where: {
        companyId,
        createdAt: { gte: range.start, lte: range.end },
        status: { in: ['UNPAID', 'PARTIAL'] },
        ...buildAppointmentInvoiceFilter(req.query),
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const byPatient = new Map();
    for (const inv of invoices) {
      const net = netOf(inv.total, inv.discount, inv.additionAmount);
      const remaining = Math.max(0, net - num(inv.amountPaid));
      if (remaining <= 0) continue;
      let p = byPatient.get(inv.patientId);
      if (!p) {
        p = {
          patientId: inv.patientId,
          patientName: `${inv.patient?.firstName || ''} ${inv.patient?.lastName || ''}`.trim() || 'غير معروف',
          patientPhone: inv.patient?.phone || '',
          totalOutstanding: 0,
          paidBackTotal: 0,
          invoiceCount: 0,
          invoices: [],
        };
        byPatient.set(inv.patientId, p);
      }
      p.totalOutstanding += remaining;
      p.paidBackTotal += num(inv.amountPaid);
      p.invoiceCount += 1;
      p.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        total: num(inv.total),
        discount: num(inv.discount),
        net,
        amountPaid: num(inv.amountPaid),
        remaining: round2(remaining),
        status: inv.status,
        dueDate: inv.dueDate ? fmtDate(inv.dueDate) : '',
        createdAt: fmtDate(inv.createdAt),
      });
    }

    const patients = [...byPatient.values()]
      .map((p) => ({ ...p, totalOutstanding: round2(p.totalOutstanding), paidBackTotal: round2(p.paidBackTotal) }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totals = {
      outstanding: round2(patients.reduce((s, p) => s + p.totalOutstanding, 0)),
      paidBackTotal: round2(patients.reduce((s, p) => s + p.paidBackTotal, 0)),
      invoiceCount: patients.reduce((s, p) => s + p.invoiceCount, 0),
      patientCount: patients.length,
    };

    res.json({ success: true, data: { dateFrom: fmtDate(range.start), dateTo: fmtDate(range.end), totals, patients } });
  } catch (error) {
    console.error('Error fetching dues:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير المستحقات' });
  }
};

const getRefunds = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();
    const { cashierName } = req.query;

    const paybacks = await prisma.medicalPayment.findMany({
      where: {
        companyId,
        paidAt: { gte: range.start, lte: range.end },
        OR: buildPaybackReasonOr(),
        ...(cashierName ? { cashierName } : {}),
      },
      include: {
        invoice: { select: { invoiceNumber: true, patient: { select: { firstName: true, lastName: true, phone: true } } } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const byCashier = new Map();
    const byMethod = new Map();
    let total = 0;
    const rows = paybacks.map((p) => {
      const cashier = p.cashierName || 'غير محدد';
      const method = p.method || 'CASH';
      const amount = Math.abs(num(p.amount));
      total += amount;
      byCashier.set(cashier, (byCashier.get(cashier) || 0) + amount);
      byMethod.set(method, (byMethod.get(method) || 0) + amount);
      return {
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber || '',
        patientName: `${p.invoice?.patient?.firstName || ''} ${p.invoice?.patient?.lastName || ''}`.trim(),
        patientPhone: p.invoice?.patient?.phone || '',
        amount: round2(amount),
        method,
        reason: p.reason || '',
        cashierName: cashier,
        paidAt: fmtDate(p.paidAt),
      };
    });

    const cashiers = [...byCashier.entries()]
      .map(([cashierName, amount]) => ({
        cashierName,
        total: round2(amount),
        count: rows.filter((r) => r.cashierName === cashierName).length,
      }))
      .sort((a, b) => b.total - a.total);
    const methods = [...byMethod.entries()]
      .map(([method, amount]) => ({ method, total: round2(amount) }))
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        dateFrom: fmtDate(range.start),
        dateTo: fmtDate(range.end),
        summary: { totalPayback: round2(total), count: rows.length, methods, cashiers },
        rows,
      },
    });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الاستردادات' });
  }
};

const getCashierDaily = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const range = resolveDateRange(req, res);
    if (!range) return;
    const prisma = getSharedPrismaClient();

    const [payments, invoices, shifts] = await Promise.all([
      prisma.medicalPayment.findMany({
        where: { companyId, paidAt: { gte: range.start, lte: range.end } },
        select: { amount: true, method: true, paidAt: true, cashierName: true, reason: true, paybackOfPaymentId: true },
      }),
      prisma.medicalInvoice.findMany({
        where: { companyId, createdAt: { gte: range.start, lte: range.end }, status: { not: 'REFUNDED' }, discount: { gt: 0 } },
        select: { discount: true, cashierName: true, createdAt: true },
      }),
      prisma.cashierShift.findMany({
        where: { companyId, openedAt: { gte: range.start, lte: range.end } },
        select: { cashierName: true, openedAt: true, openingBalance: true, closingBalance: true, status: true },
      }),
    ]);

    const rowsMap = new Map();
    const ensureRow = (date, cashier) => {
      const key = `${date}|${cashier}`;
      let row = rowsMap.get(key);
      if (!row) {
        row = {
          date,
          cashierName: cashier,
          byMethod: new Map(),
          totalCollected: 0,
          totalCount: 0,
          discounts: 0,
          paybacks: 0,
          openingBalance: 0,
          closingBalance: null,
          shiftStatus: null,
        };
        rowsMap.set(key, row);
      }
      return row;
    };

    for (const p of payments) {
      const row = ensureRow(fmtDate(p.paidAt), p.cashierName || 'غير محدد');
      if (isPaybackPayment(p)) {
        row.paybacks += Math.abs(num(p.amount));
        continue;
      }
      const method = p.method || 'CASH';
      const m = row.byMethod.get(method) || { method, amount: 0, count: 0 };
      m.amount += num(p.amount);
      m.count += 1;
      row.byMethod.set(method, m);
      row.totalCollected += num(p.amount);
      row.totalCount += 1;
    }

    for (const inv of invoices) {
      const row = ensureRow(fmtDate(inv.createdAt), inv.cashierName || 'غير محدد');
      row.discounts += num(inv.discount);
    }

    for (const s of shifts) {
      const row = ensureRow(fmtDate(s.openedAt), s.cashierName || 'غير محدد');
      row.openingBalance += num(s.openingBalance);
      if (s.closingBalance != null) row.closingBalance = num(s.closingBalance);
      if (row.shiftStatus !== 'CLOSED') row.shiftStatus = s.status === 'OPEN' ? 'OPEN' : 'CLOSED';
    }

    const rows = [...rowsMap.values()].map((r) => {
      const totalCollected = round2(r.totalCollected);
      const discounts = round2(r.discounts);
      const paybacks = round2(r.paybacks);
      return {
        date: r.date,
        cashierName: r.cashierName,
        byMethod: [...r.byMethod.values()]
          .map((m) => ({ method: m.method, amount: round2(m.amount), count: m.count }))
          .sort((a, b) => b.amount - a.amount),
        totalCollected,
        totalCount: r.totalCount,
        discounts,
        paybacks,
        netCollected: round2(totalCollected - discounts - paybacks),
        openingBalance: round2(r.openingBalance),
        closingBalance: r.closingBalance != null ? round2(r.closingBalance) : null,
        shiftStatus: r.shiftStatus || 'NO_SHIFT',
      };
    }).sort((a, b) => (a.date === b.date ? a.cashierName.localeCompare(b.cashierName, 'ar') : b.date.localeCompare(a.date)));

    const totals = rows.reduce((t, r) => ({
      totalCollected: t.totalCollected + r.totalCollected,
      totalCount: t.totalCount + r.totalCount,
      discounts: t.discounts + r.discounts,
      paybacks: t.paybacks + r.paybacks,
      netCollected: t.netCollected + r.netCollected,
    }), { totalCollected: 0, totalCount: 0, discounts: 0, paybacks: 0, netCollected: 0 });
    totals.totalCollected = round2(totals.totalCollected);
    totals.discounts = round2(totals.discounts);
    totals.paybacks = round2(totals.paybacks);
    totals.netCollected = round2(totals.netCollected);

    res.json({
      success: true,
      data: {
        dateFrom: fmtDate(range.start),
        dateTo: fmtDate(range.end),
        totals: { ...totals, dayCount: new Set(rows.map((r) => r.date)).size, cashierCount: new Set(rows.map((r) => r.cashierName)).size },
        rows,
      },
    });
  } catch (error) {
    console.error('Error fetching cashier daily:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير حساب الكاشير اليومي' });
  }
};

module.exports = {
  getReportsSummary,
  exportCsv,
  getRevenueReport,
  getActualVsExpected,
  getPhysicianCommissions,
  getDues,
  getRefunds,
  getCashierDaily,
};
