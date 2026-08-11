const { getSharedPrismaClient } = require('../services/sharedDatabase');

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'VODAFONE_CASH', 'OTHER'];

const paymentStatusFor = (total, paid) => {
  if (!Number.isFinite(total) || total <= 0) return 'UNPAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const getStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    let base = 0;
    if (study.examTypeId) {
      const et = await prisma.radiologyExamType.findFirst({ where: { id: study.examTypeId }, select: { price: true } });
      if (et) base = et.price;
    }
    const total = (base || 0) + (study.additionAmount || 0);
    const paid = study.paidAmount || 0;
    const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId: id }, orderBy: { createdAt: 'desc' } });

    res.json({
      success: true,
      data: {
        total,
        paidAmount: paid,
        remaining: Math.max(0, total - paid),
        paymentStatus: study.paymentStatus || 'UNPAID',
        payments,
      },
    });
  } catch (error) {
    console.error('Error getting radiology study payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الدفع' });
  }
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

    let base = 0;
    if (study.examTypeId) {
      const et = await prisma.radiologyExamType.findFirst({ where: { id: study.examTypeId }, select: { price: true } });
      if (et) base = et.price;
    }
    const total = (base || 0) + (study.additionAmount || 0);
    const paid = (study.paidAmount || 0) + amt;
    const status = paymentStatusFor(total, paid);
    const m = String(method || 'CASH').toUpperCase();
    const methodSafe = PAYMENT_METHODS.includes(m) ? m : 'CASH';

    const payment = await prisma.radiologyStudyPayment.create({
      data: {
        companyId,
        studyId: id,
        amount: amt,
        method: methodSafe,
        note: note ? String(note) : null,
        paidBy: req.user?.id || req.user?.email || null,
      },
    });

    const updated = await prisma.radiologyStudy.update({
      where: { id },
      data: { paidAmount: paid, paymentStatus: status },
    });

    res.json({ success: true, data: { payment, study: updated, total, remaining: Math.max(0, total - paid), paymentStatus: status } });
  } catch (error) {
    console.error('Error recording radiology study payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

module.exports = { getStudyPayment, recordStudyPayment };
