const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getDateStringInTimezone } = require('../utils/dateUtils');

const INVOICE_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'CREDIT', 'VODAFONE_CASH', 'PAYMOB', 'INSTAPAY', 'FAWRY', 'VOUCHER', 'REFERRAL'];
const EXPENSE_SPLITS = ['PATIENT', 'INSURANCE', 'BOTH'];

const netOf = (total, discount, additionAmount) =>
  Math.max(0, (Number(total) || 0) - (Number(discount) || 0) + (Number(additionAmount) || 0));

const computeInsuranceShare = (net, coveragePercent) => {
  const coverage = Number(coveragePercent);
  if (Number.isNaN(coverage) || !Number.isFinite(coverage) || coverage <= 0) return 0;
  return Math.round(Math.max(0, Number(net) || 0) * Math.min(100, coverage) / 100);
};

const resolveAutoInsurance = (req, net, patient) => {
  const body = req.body || {};
  const explicitInsurance = body.insuranceAmount !== undefined && body.insuranceAmount !== null;
  const explicitSplit = body.expenseSplit !== undefined && body.expenseSplit !== null;
  const coverage = Number(patient?.memberType?.coveragePercent) || 0;
  const canAuto = !!patient?.memberTypeId && coverage > 0 && !explicitInsurance && !explicitSplit;
  if (!canAuto) {
    return {
      insuranceAmount: explicitInsurance ? Math.max(0, Number(body.insuranceAmount) || 0) : 0,
      expenseSplit: body.expenseSplit || 'PATIENT',
      insuranceCompanyId: body.insuranceCompanyId || null,
    };
  }
  return {
    insuranceAmount: computeInsuranceShare(net, coverage),
    expenseSplit: 'BOTH',
    insuranceCompanyId: body.insuranceCompanyId || patient.insuranceCompanyId || null,
  };
};

const computeStatus = (total, discount, additionAmount = 0, amountPaid) => {
  const net = netOf(total, discount, additionAmount);
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid >= net - 0.001) return 'PAID';
  return 'PARTIAL';
};

const normalizeMethod = (method) => {
  const m = String(method || 'CASH').trim().toUpperCase();
  return PAYMENT_METHODS.includes(m) ? m : null;
};

const appointmentPaymentStatus = (invoiceStatus) => {
  if (invoiceStatus === 'PAID') return 'paid';
  if (invoiceStatus === 'PARTIAL') return 'partial';
  return 'pending';
};

const cashierNameOf = (req, bodyName) => {
  const name = bodyName !== undefined && bodyName !== null ? String(bodyName).trim() : '';
  if (name) return name;
  const u = req.user || {};
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return 'المحاسب';
};

const payerNameOf = (firstName, lastName) => `${firstName || ''} ${lastName || ''}`.trim() || null;

const writeTransactionLog = async (prisma, req, entry) => {
  try {
    await prisma.transactionLog.create({
      data: {
        companyId: req.user?.companyId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        description: entry.description || null,
        amount: entry.amount !== undefined && entry.amount !== null ? Number(entry.amount) : null,
        payer: entry.payer || null,
        userId: req.user?.id || null,
        userName: [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || null,
      },
    });
  } catch (error) {
    console.error('Error writing transaction log:', error);
  }
};

const generateInvoiceNumber = async (prisma, companyId) => {
  const count = await prisma.medicalInvoice.count({ where: { companyId } });
  const shortId = companyId.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || 'MED';
  return `INV-${shortId}-${String(count + 1).padStart(4, '0')}`;
};

class AmountPaidMismatchError extends Error {
  constructor() {
    super('AMOUNT_PAID_CHANGED');
    this.name = 'AmountPaidMismatchError';
    this.code = 'AMOUNT_PAID_CHANGED';
  }
}

const createInvoiceWithRetry = async (prisma, companyId, build) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const invoiceNumber = await generateInvoiceNumber(prisma, companyId);
    try {
      return await build(invoiceNumber);
    } catch (error) {
      if (attempt < 2 && error && error.code === 'P2002') continue;
      throw error;
    }
  }
  throw new Error('Failed to allocate invoice number');
};

const formatInvoice = (inv) => ({
  ...inv,
  dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : null,
  net: netOf(inv.total, inv.discount, inv.additionAmount),
  remaining: Math.max(0, netOf(inv.total, inv.discount, inv.additionAmount) - inv.amountPaid),
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
          payments: { select: { id: true, amount: true, method: true, paidAt: true, reason: true, cashierName: true } },
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

    const { patientId, appointmentId, total, discount, discountReason, additionAmount, additionReason, dueDate, notes, method, initialPayment, insuranceAmount, expenseSplit, insuranceCompanyId, ticketNumber, cashierId, cashierName } = req.body;
    if (!patientId) return res.status(400).json({ success: false, error: 'المريض مطلوب' });
    const amount = Number(total);
    if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صالح' });

    const rawDisc = discount === undefined || discount === null ? 0 : Number(discount);
    const rawAdd = additionAmount === undefined || additionAmount === null ? 0 : Number(additionAmount);
    if (Number.isNaN(rawDisc) || !Number.isFinite(rawDisc) || rawDisc < 0) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
    if (Number.isNaN(rawAdd) || !Number.isFinite(rawAdd) || rawAdd < 0) return res.status(400).json({ success: false, error: 'قيمة الإضافة غير صالحة' });
    const rawInsurance = insuranceAmount === undefined || insuranceAmount === null ? 0 : Number(insuranceAmount);
    if (Number.isNaN(rawInsurance) || !Number.isFinite(rawInsurance) || rawInsurance < 0) return res.status(400).json({ success: false, error: 'مبلغ التأمين غير صالح' });
    const disc = rawDisc;
    const add = rawAdd;
    if (disc > 0 && !String(discountReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الخصم مطلوب' });
    }
    if (add > 0 && !String(additionReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الإضافة مطلوب' });
    }
    if (expenseSplit && !EXPENSE_SPLITS.includes(expenseSplit)) {
      return res.status(400).json({ success: false, error: 'تقسيم المصاريف غير صالح' });
    }

    const initialPaid = Number(initialPayment) || 0;
    const net = netOf(amount, disc, add);
    if (initialPaid > net + 0.001) {
      return res.status(400).json({ success: false, error: 'الدفعة الأولى أكبر من الصافي' });
    }
    const payMethod = normalizeMethod(method);
    if (initialPaid > 0 && !payMethod) {
      return res.status(400).json({ success: false, error: 'طريقة الدفع غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, companyId },
      include: { memberType: true },
    });
    if (!patient) return res.status(400).json({ success: false, error: 'المريض غير موجود' });

    const resolvedAppointmentId = appointmentId || null;
    if (resolvedAppointmentId) {
      const appointmentExists = await prisma.appointment.findFirst({ where: { id: resolvedAppointmentId, companyId }, select: { id: true } });
      if (!appointmentExists) return res.status(400).json({ success: false, error: 'الموعد غير موجود' });
    }

    const resolvedInsurance = resolveAutoInsurance(req, net, patient);
    const cashierNameFinal = cashierNameOf(req, cashierName);

    const invoice = await createInvoiceWithRetry(prisma, companyId, (invoiceNumber) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.medicalInvoice.create({
          data: {
            companyId, invoiceNumber, patientId,
            appointmentId: resolvedAppointmentId,
            total: amount, discount: disc,
            discountReason: disc > 0 ? String(discountReason).trim() : null,
            additionAmount: add,
            additionReason: add > 0 ? String(additionReason).trim() : null,
            insuranceAmount: resolvedInsurance.insuranceAmount,
            expenseSplit: resolvedInsurance.expenseSplit,
            insuranceCompanyId: resolvedInsurance.insuranceCompanyId,
            ticketNumber: ticketNumber || null,
            cashierId: cashierId || req.user.id || null,
            cashierName: cashierNameFinal,
            amountPaid: initialPaid,
            status: computeStatus(amount, disc, add, initialPaid),
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
          },
        });

        if (initialPaid > 0) {
          await tx.medicalPayment.create({
            data: {
              companyId, invoiceId: created.id,
              amount: initialPaid,
              method: payMethod,
              cashierName: cashierNameFinal,
              notes: notes || null,
              createdById: req.user.id,
            },
          });
          await writeTransactionLog(tx, req, {
            entityType: 'PAYMENT',
            entityId: created.id,
            action: 'PAYMENT',
            description: `دفعة أولى (${payMethod})`,
            amount: initialPaid,
            payer: payerNameOf(patient.firstName, patient.lastName),
          });
        }

        await writeTransactionLog(tx, req, {
          entityType: 'INVOICE',
          entityId: created.id,
          action: 'CREATE',
          description: `إنشاء فاتورة ${created.invoiceNumber}`,
          amount: net,
          payer: payerNameOf(patient.firstName, patient.lastName),
        });

        if (created.appointmentId) {
          await tx.appointment.update({
            where: { id: created.appointmentId },
            data: { paymentStatus: appointmentPaymentStatus(created.status) },
          });
        }

        return created;
      }),
    );

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

    const { total, discount, discountReason, additionAmount, additionReason, dueDate, notes, status, patientId, insuranceAmount, expenseSplit, insuranceCompanyId, ticketNumber, cashierId, cashierName } = req.body;
    if (total !== undefined && (isNaN(Number(total)) || !Number.isFinite(Number(total)) || Number(total) <= 0)) {
      return res.status(400).json({ success: false, error: 'المبلغ غير صالح' });
    }
    if (discount !== undefined && (isNaN(Number(discount)) || !Number.isFinite(Number(discount)) || Number(discount) < 0)) {
      return res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
    }
    if (additionAmount !== undefined && (isNaN(Number(additionAmount)) || !Number.isFinite(Number(additionAmount)) || Number(additionAmount) < 0)) {
      return res.status(400).json({ success: false, error: 'قيمة الإضافة غير صالحة' });
    }
    if (insuranceAmount !== undefined && (isNaN(Number(insuranceAmount)) || !Number.isFinite(Number(insuranceAmount)) || Number(insuranceAmount) < 0)) {
      return res.status(400).json({ success: false, error: 'مبلغ التأمين غير صالح' });
    }
    const data = {};
    if (total !== undefined) data.total = Number(total);
    if (discount !== undefined) data.discount = Math.max(0, Number(discount));
    if (additionAmount !== undefined) data.additionAmount = Math.max(0, Number(additionAmount));
    if (discountReason !== undefined) data.discountReason = discountReason || null;
    if (additionReason !== undefined) data.additionReason = additionReason || null;
    if (insuranceAmount !== undefined) data.insuranceAmount = Math.max(0, Number(insuranceAmount));
    if (expenseSplit !== undefined) data.expenseSplit = expenseSplit;
    if (insuranceCompanyId !== undefined) data.insuranceCompanyId = insuranceCompanyId || null;
    if (ticketNumber !== undefined) data.ticketNumber = ticketNumber || null;
    if (cashierId !== undefined) data.cashierId = cashierId || null;
    if (cashierName !== undefined) data.cashierName = cashierName || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) data.notes = notes;
    if (patientId !== undefined) data.patientId = patientId;
    if (status !== undefined && INVOICE_STATUSES.includes(status)) data.status = status;

    if (expenseSplit !== undefined && !EXPENSE_SPLITS.includes(expenseSplit)) {
      return res.status(400).json({ success: false, error: 'تقسيم المصاريف غير صالح' });
    }

    if (data.patientId) {
      const patientExists = await prisma.patient.findFirst({ where: { id: data.patientId, companyId }, select: { id: true } });
      if (!patientExists) return res.status(400).json({ success: false, error: 'المريض غير موجود' });
    }

    const nextDiscount = data.discount !== undefined ? data.discount : existing.discount;
    const nextAddition = data.additionAmount !== undefined ? data.additionAmount : (existing.additionAmount || 0);
    const nextDiscountReason = data.discountReason !== undefined ? data.discountReason : existing.discountReason;
    const nextAdditionReason = data.additionReason !== undefined ? data.additionReason : existing.additionReason;
    if (nextDiscount > 0 && !String(nextDiscountReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الخصم مطلوب' });
    }
    if (nextAddition > 0 && !String(nextAdditionReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الإضافة مطلوب' });
    }

    const next = { ...existing, ...data };
    const nextNet = netOf(next.total, next.discount, next.additionAmount || 0);
    if (next.amountPaid > nextNet + 0.001) {
      return res.status(400).json({ success: false, error: 'لا يمكن خفض الصافي إلى أقل من المبلغ المسدد' });
    }
    data.status = computeStatus(next.total, next.discount, next.additionAmount || 0, next.amountPaid);

    const invoice = await prisma.medicalInvoice.update({ where: { id }, data });

    const changeParts = [];
    if (data.discount !== undefined && data.discount !== (existing.discount || 0)) changeParts.push('خصم');
    if (data.additionAmount !== undefined && data.additionAmount !== (existing.additionAmount || 0)) changeParts.push('إضافة');
    if (data.total !== undefined && data.total !== (existing.total || 0)) changeParts.push('إجمالي');
    await writeTransactionLog(prisma, req, {
      entityType: 'INVOICE',
      entityId: id,
      action: 'UPDATE',
      description: changeParts.length ? `تعديل الفاتورة (${changeParts.join('، ')})` : 'تعديل الفاتورة',
      amount: netOf(next.total, next.discount, next.additionAmount || 0),
    });

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
    const { amount, method, notes, reason, cashierName } = req.body;
    const paymentAmount = Number(amount);
    if (!amount || isNaN(paymentAmount) || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ الدفع غير صالح' });
    }
    const payMethod = normalizeMethod(method);
    if (!payMethod) {
      return res.status(400).json({ success: false, error: 'طريقة الدفع غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const invoice = await prisma.medicalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.status === 'PAID') return res.status(400).json({ success: false, error: 'الفاتورة مسددة بالكامل' });
    if (invoice.status === 'REFUNDED') return res.status(400).json({ success: false, error: 'الفاتورة ملغاة' });

    const newPaid = invoice.amountPaid + paymentAmount;
    const net = netOf(invoice.total, invoice.discount, invoice.additionAmount);
    if (newPaid > net + 0.001) {
      return res.status(400).json({ success: false, error: `الدفع أكبر من المتبقي (${(net - invoice.amountPaid).toFixed(2)})` });
    }
    const newStatus = computeStatus(invoice.total, invoice.discount, invoice.additionAmount || 0, newPaid);
    const cashierNameFinal = cashierNameOf(req, cashierName);

    const result = await prisma.$transaction(async (tx) => {
      await tx.medicalPayment.create({
        data: {
          companyId, invoiceId: id, amount: paymentAmount,
          method: payMethod,
          reason: reason || null,
          cashierName: cashierNameFinal,
          notes: notes || null, createdById: req.user.id,
        },
      });
      await writeTransactionLog(tx, req, {
        entityType: 'PAYMENT',
        entityId: id,
        action: 'PAYMENT',
        description: `دفعة (${payMethod})`,
        amount: paymentAmount,
      });
      const applied = await tx.medicalInvoice.updateMany({
        where: { id, amountPaid: invoice.amountPaid },
        data: { amountPaid: newPaid, status: newStatus, cashierName: cashierNameFinal, cashierId: invoice.cashierId || req.user.id },
      });
      if (applied.count !== 1) throw new AmountPaidMismatchError();
      const updated = {
        ...invoice,
        amountPaid: newPaid,
        status: newStatus,
        cashierName: cashierNameFinal,
        cashierId: invoice.cashierId || req.user.id,
      };
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
    if (error instanceof AmountPaidMismatchError) {
      return res.status(409).json({ success: false, error: 'تغيّر رصيد الفاتورة، أعد المحاولة' });
    }
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفع' });
  }
};

const paybackPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { amount, method, reason, paymentId, notes, cashierName } = req.body;
    const paybackAmount = Number(amount);
    if (isNaN(paybackAmount) || !Number.isFinite(paybackAmount) || paybackAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ الاسترداد غير صالح' });
    }
    const payMethod = normalizeMethod(method);
    if (!payMethod) {
      return res.status(400).json({ success: false, error: 'طريقة الدفع غير صالحة' });
    }
    if (!String(reason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الاسترداد مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const invoice = await prisma.medicalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.amountPaid <= 0) {
      return res.status(400).json({ success: false, error: 'لا يوجد مبلغ مسدد للاسترداد' });
    }
    if (paybackAmount > invoice.amountPaid + 0.001) {
      return res.status(400).json({ success: false, error: 'الاسترداد أكبر من المبلغ المسدد' });
    }

    const reference = await prisma.medicalPayment.findFirst({
      where: { ...(paymentId ? { id: paymentId } : {}), invoiceId: id, companyId },
      orderBy: { paidAt: 'desc' },
    });

    const newPaid = Math.max(0, invoice.amountPaid - paybackAmount);
    const newStatus = newPaid <= 0 ? 'REFUNDED' : computeStatus(invoice.total, invoice.discount, invoice.additionAmount || 0, newPaid);
    const cashierNameFinal = cashierNameOf(req, cashierName);

    const result = await prisma.$transaction(async (tx) => {
      await tx.medicalPayment.create({
        data: {
          companyId, invoiceId: id,
          amount: -Math.abs(paybackAmount),
          method: payMethod,
          reason: String(reason).trim(),
          paybackOfPaymentId: reference?.id || null,
          cashierName: cashierNameFinal,
          notes: notes || null,
          createdById: req.user.id,
        },
      });
      await writeTransactionLog(tx, req, {
        entityType: 'PAYBACK',
        entityId: id,
        action: 'PAYBACK',
        description: `استرداد (${payMethod}): ${String(reason).trim()}`,
        amount: paybackAmount,
      });
      const applied = await tx.medicalInvoice.updateMany({
        where: { id, amountPaid: invoice.amountPaid },
        data: { amountPaid: newPaid, status: newStatus },
      });
      if (applied.count !== 1) throw new AmountPaidMismatchError();
      const updated = { ...invoice, amountPaid: newPaid, status: newStatus };
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
    if (error instanceof AmountPaidMismatchError) {
      return res.status(409).json({ success: false, error: 'تغيّر رصيد الفاتورة، أعد المحاولة' });
    }
    console.error('Error processing payback:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في معالجة الاسترداد' });
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

    if (invoice.appointmentId) {
      const remainingInvoices = await prisma.medicalInvoice.findMany({
        where: { companyId, appointmentId: invoice.appointmentId, id: { not: id } },
        select: { status: true },
      });
      const nextStatus = remainingInvoices.some((i) => i.status === 'PAID')
        ? 'PAID'
        : remainingInvoices.some((i) => i.status === 'PARTIAL')
          ? 'PARTIAL'
          : 'UNPAID';
      await prisma.appointment.update({
        where: { id: invoice.appointmentId },
        data: { paymentStatus: appointmentPaymentStatus(nextStatus) },
      });
    }

    res.json({ success: true, message: 'تم حذف الفاتورة' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفاتورة' });
  }
};

const resolveAppointmentPrice = (appointment, service) => {
  // 1. Doctor-specific fee for this service (if doctor linked to the service)
  if (appointment.doctorId && service) {
    const link = (service.doctorServices || []).find(ds => ds.doctorId === appointment.doctorId);
    if (link && link.fee) return Number(link.fee);
  }
  // 2. Doctor consultation fee
  if (appointment.doctor?.consultationFee) return Number(appointment.doctor.consultationFee);
  // 3. Service base price
  if (service?.basePrice) return Number(service.basePrice);
  // 4. Branch package single-session price (cheapest)
  if (appointment.branchId && service) {
    const bs = (service.branchServices || []).find(b => b.branchId === appointment.branchId);
    if (bs && Array.isArray(bs.packages) && bs.packages.length > 0) {
      const parsed = bs.packages.map(p => (typeof p === 'string' ? (() => { try { return JSON.parse(p); } catch { return p; } })() : p));
      const singles = parsed.filter(p => p.count === 1 && p.price).map(p => Number(p.price));
      if (singles.length > 0) return Math.min(...singles);
    }
  }
  return null;
};

const createInvoiceFromAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { appointmentId } = req.params;
    const { discount, discountReason, additionAmount, additionReason, method, initialPayment, dueDate, notes, insuranceAmount, expenseSplit, insuranceCompanyId, ticketNumber, cashierId, cashierName } = req.body;

    const prisma = getSharedPrismaClient();
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, companyId },
      include: {
        doctor: { select: { id: true, consultationFee: true } },
        service: {
          select: {
            id: true, name: true, basePrice: true,
            branchServices: { select: { branchId: true, packages: true } },
            doctorServices: { select: { doctorId: true, fee: true } }
          }
        }
      }
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const patient = await prisma.patient.findFirst({
      where: { id: appointment.patientId, companyId },
      include: { memberType: true },
    });

    // Reject if an invoice already exists for this appointment
    const existing = await prisma.medicalInvoice.findFirst({ where: { appointmentId, companyId } });
    if (existing) return res.status(400).json({ success: false, error: 'يوجد فاتورة لهذا الموعد بالفعل' });

    const price = resolveAppointmentPrice(appointment, appointment.service);
    if (!price) return res.status(400).json({ success: false, error: 'لا يوجد سعر محدد لهذه الخدمة، أضف سعراً أساسياً أو باقة' });

    const rawDisc = discount === undefined || discount === null ? 0 : Number(discount);
    const rawAdd = additionAmount === undefined || additionAmount === null ? 0 : Number(additionAmount);
    if (Number.isNaN(rawDisc) || !Number.isFinite(rawDisc) || rawDisc < 0) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
    if (Number.isNaN(rawAdd) || !Number.isFinite(rawAdd) || rawAdd < 0) return res.status(400).json({ success: false, error: 'قيمة الإضافة غير صالحة' });
    const rawInsurance = insuranceAmount === undefined || insuranceAmount === null ? 0 : Number(insuranceAmount);
    if (Number.isNaN(rawInsurance) || !Number.isFinite(rawInsurance) || rawInsurance < 0) return res.status(400).json({ success: false, error: 'مبلغ التأمين غير صالح' });
    const disc = rawDisc;
    const add = rawAdd;
    if (disc > 0 && !String(discountReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الخصم مطلوب' });
    }
    if (add > 0 && !String(additionReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'سبب الإضافة مطلوب' });
    }
    if (expenseSplit && !EXPENSE_SPLITS.includes(expenseSplit)) {
      return res.status(400).json({ success: false, error: 'تقسيم المصاريف غير صالح' });
    }
    const rawInitialPaid = initialPayment === undefined || initialPayment === null ? 0 : Number(initialPayment);
    if (Number.isNaN(rawInitialPaid) || !Number.isFinite(rawInitialPaid) || rawInitialPaid < 0) return res.status(400).json({ success: false, error: 'الدفعة الأولى غير صالحة' });
    const initialPaid = rawInitialPaid;
    const net = netOf(price, disc, add);
    if (initialPaid > net + 0.001) {
      return res.status(400).json({ success: false, error: 'الدفعة الأولى أكبر من الصافي' });
    }
    const payMethod = normalizeMethod(method);
    if (initialPaid > 0 && !payMethod) {
      return res.status(400).json({ success: false, error: 'طريقة الدفع غير صالحة' });
    }

    const cashierNameFinal = cashierNameOf(req, cashierName);
    const resolvedInsurance = resolveAutoInsurance(req, net, patient);

    const invoice = await createInvoiceWithRetry(prisma, companyId, (invoiceNumber) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.medicalInvoice.create({
          data: {
            companyId, invoiceNumber, patientId: appointment.patientId,
            appointmentId: appointment.id,
            total: price, discount: disc,
            discountReason: disc > 0 ? String(discountReason).trim() : null,
            additionAmount: add,
            additionReason: add > 0 ? String(additionReason).trim() : null,
            insuranceAmount: resolvedInsurance.insuranceAmount,
            expenseSplit: resolvedInsurance.expenseSplit,
            insuranceCompanyId: resolvedInsurance.insuranceCompanyId,
            ticketNumber: ticketNumber || null,
            cashierId: cashierId || req.user.id || null,
            cashierName: cashierNameFinal,
            amountPaid: initialPaid,
            status: computeStatus(price, disc, add, initialPaid),
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || `فاتورة تلقائية: ${appointment.serviceName || ''}`.trim(),
          },
        });
        if (initialPaid > 0) {
          await tx.medicalPayment.create({
            data: {
              companyId, invoiceId: created.id, amount: initialPaid,
              method: payMethod,
              cashierName: cashierNameFinal,
              notes: notes || null, createdById: req.user.id,
            },
          });
          await writeTransactionLog(tx, req, {
            entityType: 'PAYMENT',
            entityId: created.id,
            action: 'PAYMENT',
            description: `دفعة أولى (${payMethod})`,
            amount: initialPaid,
            payer: appointment.customerName || null,
          });
        }
        await writeTransactionLog(tx, req, {
          entityType: 'INVOICE',
          entityId: created.id,
          action: 'CREATE',
          description: `فاتورة تلقائية ${created.invoiceNumber}`,
          amount: net,
          payer: appointment.customerName || null,
        });
        if (created.appointmentId) {
          await tx.appointment.update({
            where: { id: created.appointmentId },
            data: { paymentStatus: appointmentPaymentStatus(created.status) },
          });
        }
        return created;
      }),
    );

    res.json({ success: true, data: formatInvoice(invoice) });
  } catch (error) {
    console.error('Error creating invoice from appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفاتورة' });
  }
};

const openCashierShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { openingBalance, cashierId, cashierName } = req.body;
    const prisma = getSharedPrismaClient();
    const cashierIdFinal = cashierId || req.user.id || null;
    const cashierNameFinal = cashierNameOf(req, cashierName);
    const openingBalanceNum = openingBalance === undefined || openingBalance === null ? 0 : Number(openingBalance);
    if (Number.isNaN(openingBalanceNum) || !Number.isFinite(openingBalanceNum) || openingBalanceNum < 0) {
      return res.status(400).json({ success: false, error: 'رصيد الافتتاح غير صالح' });
    }

    const existingOpen = await prisma.cashierShift.findFirst({
      where: { companyId, cashierId: cashierIdFinal, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (existingOpen) {
      return res.status(400).json({ success: false, error: 'يوجد شيفت مفتوح بالفعل لهذا الكاشير' });
    }

    const shift = await prisma.cashierShift.create({
      data: {
        companyId,
        cashierId: cashierIdFinal,
        cashierName: cashierNameFinal,
        openingBalance: openingBalanceNum,
        status: 'OPEN',
      },
    });

    res.json({ success: true, data: shift });
  } catch (error) {
    console.error('Error opening cashier shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فتح الشيفت' });
  }
};

const closeCashierShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { closingBalance } = req.body;
    const prisma = getSharedPrismaClient();
    const shift = await prisma.cashierShift.findFirst({ where: { id, companyId } });
    if (!shift) return res.status(404).json({ success: false, error: 'الشيفت غير موجود' });
    if (shift.status === 'CLOSED') return res.status(400).json({ success: false, error: 'الشيفت مغلق بالفعل' });

    const closingBalanceNum = closingBalance === undefined || closingBalance === null ? 0 : Number(closingBalance);
    if (Number.isNaN(closingBalanceNum) || !Number.isFinite(closingBalanceNum) || closingBalanceNum < 0) {
      return res.status(400).json({ success: false, error: 'رصيد الإغلاق غير صالح' });
    }

    const updated = await prisma.cashierShift.update({
      where: { id },
      data: { closingBalance: closingBalanceNum, status: 'CLOSED', closedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error closing cashier shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إغلاق الشيفت' });
  }
};

const getCurrentCashierShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { cashierId } = req.query;
    const shift = await getSharedPrismaClient().cashierShift.findFirst({
      where: { companyId, status: 'OPEN', ...(cashierId ? { cashierId } : {}) },
      orderBy: { openedAt: 'desc' },
    });

    res.json({ success: true, data: shift || null });
  } catch (error) {
    console.error('Error fetching current cashier shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الشيفت الحالي' });
  }
};

const getCashierShiftBalance = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { from, to, cashierId, cashierName } = req.query;
    const now = new Date();
    const fromDate = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const toDate = to ? new Date(`${to}T23:59:59.999`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const prisma = getSharedPrismaClient();
    const [payments, invoices] = await Promise.all([
      prisma.medicalPayment.findMany({
        where: {
          companyId,
          paidAt: { gte: fromDate, lte: toDate },
          ...(cashierName ? { cashierName: String(cashierName) } : {}),
        },
      }),
      prisma.medicalInvoice.findMany({
        where: {
          companyId,
          createdAt: { gte: fromDate, lte: toDate },
          ...(cashierId ? { cashierId: String(cashierId) } : {}),
        },
      }),
    ]);

    const collectedByMethod = {};
    let totalCollected = 0;
    let paybacks = 0;
    let paymentCount = 0;
    let paybackCount = 0;

    for (const p of payments) {
      const isPayback = !!p.paybackOfPaymentId || (p.amount !== null && p.amount !== undefined && p.amount < 0);
      if (isPayback) {
        paybacks += Math.abs(p.amount || 0);
        paybackCount += 1;
      } else {
        const method = p.method || 'CASH';
        collectedByMethod[method] = (collectedByMethod[method] || 0) + (p.amount || 0);
        totalCollected += p.amount || 0;
        paymentCount += 1;
      }
    }

    let discounts = 0;
    let additions = 0;
    for (const i of invoices) {
      discounts += i.discount || 0;
      additions += i.additionAmount || 0;
    }

    res.json({
      success: true,
      data: {
        from: getDateStringInTimezone(fromDate),
        to: getDateStringInTimezone(toDate),
        collectedByMethod,
        totalCollected,
        paybacks,
        discounts,
        additions,
        counts: { payments: paymentCount, paybacks: paybackCount, invoices: invoices.length },
      },
    });
  } catch (error) {
    console.error('Error fetching cashier balance:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الرصيد' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  addPayment,
  paybackPayment,
  deleteInvoice,
  createInvoiceFromAppointment,
  openCashierShift,
  closeCashierShift,
  getCurrentCashierShift,
  getCashierShiftBalance,
  computeInsuranceShare,
};
