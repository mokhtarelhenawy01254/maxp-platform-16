const { getSharedPrismaClient } = require('../services/sharedDatabase');

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'VODAFONE_CASH', 'OTHER'];

const paymentStatusFor = (total, paid) => {
  if (!Number.isFinite(total) || total <= 0) return paid > 0 ? 'PAID' : 'UNPAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const getStudyTotal = (study) => (study.priceSnapshot || 0) + (study.additionAmount || 0);

const getStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const total = getStudyTotal(study);
    const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId: id }, orderBy: { createdAt: 'desc' } });
    const paid = payments.reduce((s, p) => s + p.amount, 0);

    res.json({
      success: true,
      data: {
        total,
        paidAmount: Math.max(0, paid),
        remaining: Math.max(0, total - paid),
        paymentStatus: study.paymentStatus || 'UNPAID',
        billingType: study.billingType || 'PATIENT',
        payments,
      },
    });
  } catch (error) {
    console.error('Error getting radiology study payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الدفع' });
  }
};

const recomputePaid = async (prisma, studyId, total) => {
  const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId }, select: { amount: true } });
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const status = paymentStatusFor(total, paid);
  const updated = await prisma.radiologyStudy.update({ where: { id: studyId }, data: { paidAmount: Math.max(0, paid), paymentStatus: status } });
  return { paid: Math.max(0, paid), status, updated };
};

const recordStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { amount, method, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const m = String(method || 'CASH').toUpperCase();
    const payment = await prisma.radiologyStudyPayment.create({
      data: {
        companyId,
        studyId: id,
        amount: amt,
        method: PAYMENT_METHODS.includes(m) ? m : 'CASH',
        note: note ? String(note) : null,
        paidBy: req.user?.id || req.user?.email || null,
      },
    });

    const total = getStudyTotal(study);
    const { paid, status, updated } = await recomputePaid(prisma, id, total);
    res.json({ success: true, data: { payment, study: updated, total, paidAmount: paid, remaining: Math.max(0, total - paid), paymentStatus: status } });
  } catch (error) {
    console.error('Error recording radiology study payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

const refundStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { amount, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId: id }, select: { amount: true } });
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    if (amt > paid) return res.status(400).json({ success: false, error: 'مبلغ الاسترجاع أكبر من المدفوع' });

    const payment = await prisma.radiologyStudyPayment.create({
      data: {
        companyId,
        studyId: id,
        amount: -amt,
        method: 'REFUND',
        note: note ? `استرجاع: ${String(note)}` : 'استرجاع دفعة',
        paidBy: req.user?.id || req.user?.email || null,
      },
    });

    const total = getStudyTotal(study);
    const { paid: newPaid, status, updated } = await recomputePaid(prisma, id, total);
    res.json({ success: true, data: { refund: payment, study: updated, total, paidAmount: newPaid, remaining: Math.max(0, total - newPaid), paymentStatus: status } });
  } catch (error) {
    console.error('Error refunding radiology study payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استرجاع الدفعة' });
  }
};

const financialSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const [studies, invoices, ledger] = await Promise.all([
      prisma.radiologyStudy.findMany({ where: { companyId }, select: { billingType: true, priceSnapshot: true, additionAmount: true, paidAmount: true } }),
      prisma.radiologyInsuranceInvoice.findMany({ where: { companyId }, select: { insuranceCompanyId: true, insuranceCompanyName: true, totalAmount: true, paidAmount: true, remainingAmount: true, status: true } }),
      prisma.radiologyInsuranceLedgerEntry.findMany({ where: { companyId, type: 'PAYMENT' }, select: { amount: true } }),
    ]);

    const patientCollected = studies
      .filter(s => s.billingType !== 'INSURANCE')
      .reduce((s, x) => s + (x.paidAmount || 0), 0);
    const patientTotal = studies
      .filter(s => s.billingType !== 'INSURANCE')
      .reduce((s, x) => s + (x.priceSnapshot || 0) + (x.additionAmount || 0), 0);
    const patientOutstanding = Math.max(0, patientTotal - patientCollected);

    const insuranceBilled = invoices.reduce((s, x) => s + x.totalAmount, 0);
    const insuranceCollected = ledger.reduce((s, x) => s + x.amount, 0);
    const insuranceOutstanding = invoices.reduce((s, x) => s + x.remainingAmount, 0);

    const byEntity = invoices.reduce((acc, inv) => {
      const key = inv.insuranceCompanyId;
      if (!acc[key]) acc[key] = { insuranceCompanyId: key, name: inv.insuranceCompanyName || '—', total: 0, paid: 0, remaining: 0 };
      acc[key].total += inv.totalAmount;
      acc[key].paid += inv.paidAmount;
      acc[key].remaining += inv.remainingAmount;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        patient: { total: patientTotal, collected: patientCollected, outstanding: patientOutstanding },
        insurance: { billed: insuranceBilled, collected: insuranceCollected, outstanding: insuranceOutstanding },
        totalCollected: patientCollected + insuranceCollected,
        totalOutstanding: patientOutstanding + insuranceOutstanding,
        byEntity: Object.values(byEntity),
      },
    });
  } catch (error) {
    console.error('Error computing radiology financial summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب الملخص المالي' });
  }
};

module.exports = { getStudyPayment, recordStudyPayment, refundStudyPayment, financialSummary };
