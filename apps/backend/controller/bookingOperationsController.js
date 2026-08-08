const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getDateStringInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');

const LABEL_TYPES = ['EXAM', 'ENVELOPE'];
const ENTITY_TYPES = ['PATIENT', 'INVOICE', 'PAYMENT', 'PAYBACK', 'APPOINTMENT'];
const ACTIONS = ['CREATE', 'UPDATE', 'PAYMENT', 'PAYBACK', 'DISCOUNT', 'ADJUSTMENT', 'MERGE'];
const DELIVERY_STATUSES = ['NOT_READY', 'READY', 'DELIVERED'];
const PAID_STATUSES = ['PAID', 'PARTIAL', 'UNPAID'];

const userName = (req) => [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || null;

const startOfDay = (s) => getStartOfDayInTimezone(new Date(`${s}T00:00:00.000Z`));
const endOfDay = (s) => getEndOfDayInTimezone(new Date(`${s}T00:00:00.000Z`));

const buildDateRange = (req) => {
  const { date, dateFrom, dateTo } = req.query;
  if (date) return { gte: startOfDay(date), lte: endOfDay(date) };
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.gte = startOfDay(dateFrom);
    if (dateTo) range.lte = endOfDay(dateTo);
    return range;
  }
  const today = getDateStringInTimezone(new Date());
  return { gte: startOfDay(today), lte: endOfDay(today) };
};

const writeLog = async (prisma, companyId, req, entry) => {
  try {
    await prisma.transactionLog.create({
      data: {
        companyId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        description: entry.description || null,
        amount: entry.amount !== undefined && entry.amount !== null ? Number(entry.amount) : null,
        payer: entry.payer || null,
        userId: req.user?.id || null,
        userName: userName(req),
      },
    });
  } catch (error) {
    console.error('Error writing transaction log:', error);
  }
};

const formatAppointmentRef = (a) => ({
  appointmentId: a.id,
  patientId: a.patientId || null,
  patientName: a.patientId && a.patient
    ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim()
    : a.customerName || '',
  patientPhone: a.patient?.phone || a.customerPhone || null,
  serviceId: a.serviceId || null,
  serviceName: a.service?.name || a.serviceName || null,
  room: a.room || null,
  ticketNumber: a.ticketNumber || null,
  accessionNumber: a.accessionNumber || null,
  appointmentDate: a.appointmentDate.toISOString().split('T')[0],
  startTime: a.startTime || null,
});

const getUnprintedLabels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId } = req.query;
    const where = { companyId, labelPrinted: false, appointmentDate: buildDateRange(req) };
    if (branchId) where.branchId = branchId;

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        branch: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 300,
    });

    const data = appointments.map((a) => ({
      ...formatAppointmentRef(a),
      branchId: a.branchId || null,
      branchName: a.branch?.name || null,
      status: a.status,
      bookingStatus: a.bookingStatus || null,
      reportStatus: a.reportStatus || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching unprinted labels:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب اللاصقات غير المطبوعة' });
  }
};

const getPrintedLabels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { date, dateFrom, dateTo, limit } = req.query;
    const where = { companyId };
    if (date) where.printedAt = { gte: startOfDay(date), lte: endOfDay(date) };
    else if (dateFrom || dateTo) {
      where.printedAt = {};
      if (dateFrom) where.printedAt.gte = startOfDay(dateFrom);
      if (dateTo) where.printedAt.lte = endOfDay(dateTo);
    }
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100));

    const labels = await getSharedPrismaClient().examLabel.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true, customerName: true, customerPhone: true, serviceName: true,
            appointmentDate: true, startTime: true, room: true,
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { printedAt: 'desc' },
      take: limitNum,
    });

    const data = labels.map((l) => ({
      id: l.id,
      appointmentId: l.appointmentId,
      patientId: l.patientId || null,
      labelType: l.labelType,
      printedAt: l.printedAt.toISOString(),
      printedBy: l.printedBy || null,
      patientName: l.appointment?.patient
        ? `${l.appointment.patient.firstName || ''} ${l.appointment.patient.lastName || ''}`.trim()
        : l.appointment?.customerName || '',
      patientPhone: l.appointment?.patient?.phone || l.appointment?.customerPhone || null,
      serviceName: l.appointment?.serviceName || null,
      room: l.appointment?.room || null,
      appointmentDate: l.appointment?.appointmentDate ? l.appointment.appointmentDate.toISOString().split('T')[0] : null,
      startTime: l.appointment?.startTime || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching printed labels:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب اللاصقات المطبوعة' });
  }
};

const printLabel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { appointmentId, labelType } = req.body || {};
    if (!appointmentId) return res.status(400).json({ success: false, error: 'معرف الموعد مطلوب' });
    const type = labelType || 'EXAM';
    if (!LABEL_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع اللاصق غير صالح' });

    const prisma = getSharedPrismaClient();
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, companyId: true, patientId: true },
    });
    if (!appointment || appointment.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الموعد غير موجود' });
    }

    const label = await prisma.examLabel.create({
      data: {
        companyId,
        appointmentId,
        patientId: appointment.patientId,
        labelType: type,
        printedAt: new Date(),
        printedBy: userName(req),
      },
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { labelPrinted: true },
    });

    await writeLog(prisma, companyId, req, {
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      action: 'UPDATE',
      description: `طباعة لاصق ${type === 'ENVELOPE' ? 'مغلف' : 'فحص'}`,
    });

    res.json({
      success: true,
      data: {
        id: label.id,
        appointmentId: label.appointmentId,
        patientId: label.patientId || null,
        labelType: label.labelType,
        printedAt: label.printedAt.toISOString(),
        printedBy: label.printedBy || null,
      },
    });
  } catch (error) {
    console.error('Error printing label:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في طباعة اللاصق' });
  }
};

const getDeliveries = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId, paidStatus } = req.query;
    const where = { companyId, appointmentDate: buildDateRange(req) };
    if (branchId) where.branchId = branchId;

    const prisma = getSharedPrismaClient();
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        branch: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 300,
    });

    const ids = appointments.map((a) => a.id);
    const [deliveries, invoices] = await Promise.all([
      ids.length > 0
        ? prisma.reportDelivery.findMany({ where: { companyId, appointmentId: { in: ids } } })
        : [],
      ids.length > 0
        ? prisma.medicalInvoice.findMany({
            where: { companyId, appointmentId: { in: ids } },
            select: { appointmentId: true, status: true },
          })
        : [],
    ]);

    const deliveryMap = new Map(deliveries.map((d) => [d.appointmentId, d]));
    const invoicePaidMap = new Map();
    for (const inv of invoices) {
      invoicePaidMap.set(inv.appointmentId, inv.status === 'PAID' ? 'PAID' : inv.status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID');
    }

    let data = appointments.map((a) => {
      const delivery = deliveryMap.get(a.id);
      let status;
      if (delivery) status = delivery.status;
      else if (a.resultDelivered) status = 'DELIVERED';
      else if (a.reportStatus === 'APPROVED') status = 'READY';
      else status = 'NOT_READY';

      return {
        ...formatAppointmentRef(a),
        branchName: a.branch?.name || null,
        id: delivery?.id || null,
        reportStatus: a.reportStatus || null,
        status,
        deliveredAt: delivery?.deliveredAt ? delivery.deliveredAt.toISOString() : null,
        deliveredBy: delivery?.deliveredBy || null,
        paidStatus: invoicePaidMap.get(a.id) || 'UNPAID',
      };
    });

    if (paidStatus && PAID_STATUSES.includes(paidStatus)) {
      data = data.filter((d) => d.paidStatus === paidStatus);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تسليم التقارير' });
  }
};

const resolveDeliveryTarget = async (prisma, companyId, id) => {
  if (!id) return null;
  const delivery = await prisma.reportDelivery.findUnique({ where: { id } });
  if (delivery) {
    if (delivery.companyId !== companyId) return null;
    return { appointmentId: delivery.appointmentId, patientId: delivery.patientId, delivery };
  }
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, companyId: true, patientId: true },
  });
  if (appointment && appointment.companyId === companyId) {
    const existing = await prisma.reportDelivery.findFirst({
      where: { companyId, appointmentId: appointment.id },
    });
    if (existing) {
      return { appointmentId: existing.appointmentId, patientId: existing.patientId || appointment.patientId, delivery: existing };
    }
    return { appointmentId: appointment.id, patientId: appointment.patientId, delivery: null };
  }
  return null;
};

const upsertDelivery = async (prisma, companyId, target, data) => {
  if (target.delivery) {
    return prisma.reportDelivery.update({ where: { id: target.delivery.id }, data });
  }
  return prisma.reportDelivery.create({
    data: { companyId, appointmentId: target.appointmentId, patientId: target.patientId || null, ...data },
  });
};

const markReady = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const target = await resolveDeliveryTarget(prisma, companyId, req.params.id);
    if (!target) return res.status(404).json({ success: false, error: 'التسليم غير موجود' });

    const delivery = await upsertDelivery(prisma, companyId, target, { status: 'READY' });

    await writeLog(prisma, companyId, req, {
      entityType: 'APPOINTMENT',
      entityId: target.appointmentId,
      action: 'UPDATE',
      description: 'تجهيز التقرير للتسليم',
    });

    res.json({ success: true, data: { id: delivery.id, appointmentId: target.appointmentId, status: 'READY' } });
  } catch (error) {
    console.error('Error marking delivery ready:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تجهيز التقرير' });
  }
};

const markDelivered = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const target = await resolveDeliveryTarget(prisma, companyId, req.params.id);
    if (!target) return res.status(404).json({ success: false, error: 'التسليم غير موجود' });

    const name = userName(req);
    const delivery = await upsertDelivery(prisma, companyId, target, {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      deliveredBy: name,
    });

    await prisma.appointment.update({
      where: { id: target.appointmentId },
      data: { resultDelivered: true },
    });

    await writeLog(prisma, companyId, req, {
      entityType: 'APPOINTMENT',
      entityId: target.appointmentId,
      action: 'UPDATE',
      description: 'تسليم التقرير للمريض',
    });

    res.json({
      success: true,
      data: {
        id: delivery.id,
        appointmentId: target.appointmentId,
        status: 'DELIVERED',
        deliveredAt: delivery.deliveredAt.toISOString(),
        deliveredBy: delivery.deliveredBy,
      },
    });
  } catch (error) {
    console.error('Error marking delivery delivered:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسليم التقرير' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { from, to, entityType, search, page, limit } = req.query;
    const where = { companyId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = startOfDay(from);
      if (to) where.createdAt.lte = endOfDay(to);
    }
    if (entityType && ENTITY_TYPES.includes(entityType)) where.entityType = entityType;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { payer: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100));

    const [items, total] = await Promise.all([
      getSharedPrismaClient().transactionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      getSharedPrismaClient().transactionLog.count({ where }),
    ]);

    const data = items.map((t) => ({
      id: t.id,
      entityType: t.entityType,
      entityId: t.entityId,
      action: t.action,
      description: t.description,
      amount: t.amount,
      payer: t.payer,
      userId: t.userId,
      userName: t.userName,
      createdAt: t.createdAt.toISOString(),
    }));

    res.json({ success: true, data: { items: data, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب سجل الحركات' });
  }
};

const logTransaction = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { entityType, entityId, action, description, amount, payer } = req.body || {};
    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ success: false, error: 'نوع الكيان غير صالح' });
    }
    if (!action || !ACTIONS.includes(action)) {
      return res.status(400).json({ success: false, error: 'الإجراء غير صالح' });
    }
    if (!entityId) return res.status(400).json({ success: false, error: 'معرف الكيان مطلوب' });
    if (amount !== undefined && amount !== null && (Number.isNaN(Number(amount)) || !Number.isFinite(Number(amount)))) {
      return res.status(400).json({ success: false, error: 'المبلغ غير صالح' });
    }

    const log = await getSharedPrismaClient().transactionLog.create({
      data: {
        companyId,
        entityType,
        entityId,
        action,
        description: description || null,
        amount: amount !== undefined && amount !== null ? Number(amount) : null,
        payer: payer || null,
        userId: req.user?.id || null,
        userName: userName(req),
      },
    });

    res.json({
      success: true,
      data: {
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        description: log.description,
        amount: log.amount,
        payer: log.payer,
        userId: log.userId,
        userName: log.userName,
        createdAt: log.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الحركة' });
  }
};

module.exports = {
  getUnprintedLabels,
  getPrintedLabels,
  printLabel,
  getDeliveries,
  markReady,
  markDelivered,
  getTransactions,
  logTransaction,
};
