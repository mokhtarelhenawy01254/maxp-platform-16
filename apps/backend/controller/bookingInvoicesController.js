const { getSharedPrismaClient } = require('../services/sharedDatabase');

const INVOICE_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];

const computeStatus = (total, discount, amountPaid) => {
  const net = Math.max(0, total - discount);
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid >= net - 0.001) return 'PAID';
  return 'PARTIAL';
};

const appointmentPaymentStatus = (invoiceStatus) => {
  if (invoiceStatus === 'PAID') return 'paid';
  if (invoiceStatus === 'PARTIAL') return 'partial';
  return 'pending';
};

const generateInvoiceNumber = async (prisma, companyId) => {
  const count = await prisma.medicalInvoice.count({ where: { companyId } });
  const shortId = companyId.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || 'MED';
  return `INV-${shortId}-${String(count + 1).padStart(4, '0')}`;
};

const formatInvoice = (inv) => ({
  ...inv,
  dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : null,
  net: Math.max(0, inv.total - inv.discount),
  remaining: Math.max(0, Math.max(0, inv.total - inv.discount) - inv.amountPaid),
});

const getAllInvoices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { status, patientId, search, page, limit } = req.query;
    const where = { companyId };
    if (status && INVOICE_STATUSES.includes(status)) where.status = status;
    if (patientId) where.patientId = patientId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

    const [invoices, total] = await Promise.all([
      getSharedPrismaClient().medicalInvoice.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          appointment: { select: { id: true, appointmentDate: true, serviceName: true } },
          payments: { select: { id: true, amount: true, method: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      getSharedPrismaClient().medicalInvoice.count({ where }),
    ]);

    res.json({ success: true, data: invoices.map(formatInvoice), total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفواتير' });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const invoice = await getSharedPrismaClient().medicalInvoice.findFirst({
      where: { id, companyId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        appointment: { select: { id: true, appointmentDate: true, serviceName: true, status: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    res.json({ success: true, data: formatInvoice(invoice) });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفاتورة' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientId, appointmentId, total, discount, dueDate, notes, method, initialPayment } = req.body;
    if (!patientId) return res.status(400).json({ success: false, error: 'المريض مطلوب' });
    const amount = Number(total);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صالح' });

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
    if (!patient) return res.status(400).json({ success: false, error: 'المريض غير موجود' });

    const invoiceNumber = await generateInvoiceNumber(prisma, companyId);
    const disc = Math.max(0, Number(discount) || 0);
    const initialPaid = Number(initialPayment) || 0;

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.medicalInvoice.create({
        data: {
          companyId, invoiceNumber, patientId,
          appointmentId: appointmentId || null,
          total: amount, discount: disc,
          amountPaid: initialPaid,
          status: computeStatus(amount, disc, initialPaid),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
        },
      });

      if (initialPaid > 0) {
        await tx.medicalPayment.create({
          data: {
            companyId, invoiceId: created.id,
            amount: initialPaid,
            method: method || 'CASH',
            notes: notes || null,
            createdById: req.user.id,
          },
        });
      }

      if (created.appointmentId) {
        await tx.appointment.update({
          where: { id: created.appointmentId },
          data: { paymentStatus: appointmentPaymentStatus(created.status) },
        });
      }

      return created;
    });

    res.json({ success: true, data: formatInvoice(invoice) });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفاتورة' });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.medicalInvoice.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    const { total, discount, dueDate, notes, status, patientId } = req.body;
    const data = {};
    if (total !== undefined) data.total = Number(total);
    if (discount !== undefined) data.discount = Math.max(0, Number(discount));
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) data.notes = notes;
    if (patientId !== undefined) data.patientId = patientId;
    if (status !== undefined && INVOICE_STATUSES.includes(status)) data.status = status;

    const next = { ...existing, ...data };
    data.status = computeStatus(next.total, next.discount, next.amountPaid);

    const invoice = await prisma.medicalInvoice.update({ where: { id }, data });

    if (invoice.appointmentId) {
      await prisma.appointment.update({
        where: { id: invoice.appointmentId },
        data: { paymentStatus: appointmentPaymentStatus(invoice.status) },
      });
    }

    res.json({ success: true, data: formatInvoice(invoice) });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفاتورة' });
  }
};

const addPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { amount, method, notes } = req.body;
    const paymentAmount = Number(amount);
    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ الدفع غير صالح' });
    }

    const prisma = getSharedPrismaClient();
    const invoice = await prisma.medicalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.status === 'PAID') return res.status(400).json({ success: false, error: 'الفاتورة مسددة بالكامل' });
    if (invoice.status === 'REFUNDED') return res.status(400).json({ success: false, error: 'الفاتورة ملغاة' });

    const newPaid = invoice.amountPaid + paymentAmount;
    const net = Math.max(0, invoice.total - invoice.discount);
    if (newPaid > net + 0.001) {
      return res.status(400).json({ success: false, error: `الدفع أكبر من المتبقي (${(net - invoice.amountPaid).toFixed(2)})` });
    }
    const newStatus = computeStatus(invoice.total, invoice.discount, newPaid);

    const result = await prisma.$transaction(async (tx) => {
      await tx.medicalPayment.create({
        data: {
          companyId, invoiceId: id, amount: paymentAmount,
          method: method || 'CASH', notes: notes || null, createdById: req.user.id,
        },
      });
      const updated = await tx.medicalInvoice.update({
        where: { id },
        data: { amountPaid: newPaid, status: newStatus },
      });
      if (updated.appointmentId) {
        await tx.appointment.update({
          where: { id: updated.appointmentId },
          data: { paymentStatus: appointmentPaymentStatus(newStatus) },
        });
      }
      return updated;
    });

    res.json({ success: true, data: formatInvoice(result) });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفع' });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const invoice = await prisma.medicalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.amountPaid > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف فاتورة عليها دفعات مسجلة' });
    }

    await prisma.medicalInvoice.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الفاتورة' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفاتورة' });
  }
};

module.exports = { getAllInvoices, getInvoiceById, createInvoice, updateInvoice, addPayment, deleteInvoice };
