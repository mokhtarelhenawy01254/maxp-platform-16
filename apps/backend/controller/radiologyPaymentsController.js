const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { attachToActiveShift } = require('./radiologyShiftsController');
const { recordRadiologyStatusHistory } = require('../utils/radiologyStatusHistory');

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'VODAFONE_CASH', 'OTHER'];

const paymentStatusFor = (total, paid, hasRefunds = false) => {
  if (!Number.isFinite(total) || total <= 0) {
    if (hasRefunds && paid <= 0) return 'REFUNDED';
    return paid > 0 ? 'PAID' : 'UNPAID';
  }
  if (hasRefunds && paid <= 0) return 'REFUNDED';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const getStudyTotal = (study) => (study.priceSnapshot || 0) + (study.additionAmount || 0);

const getAppointmentTotal = (appointment) => (appointment.priceSnapshot || 0) + (appointment.additionAmount || 0);

const appointmentPaymentStatusFor = (total, paid) => {
  if (!Number.isFinite(total) || total <= 0) return paid > 0 ? 'PAID' : 'UNPAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const recomputeAppointmentPaid = async (prisma, appointmentId, total) => {
  const payments = await prisma.radiologyAppointmentPayment.findMany({ where: { appointmentId }, select: { amount: true } });
  const net = Math.max(0, payments.reduce((s, p) => s + p.amount, 0));
  const status = appointmentPaymentStatusFor(total, net);
  const updated = await prisma.radiologyAppointment.update({ where: { id: appointmentId }, data: { paidAmount: net, paymentStatus: status } });
  return { paid: net, status, updated };
};

const getAppointmentPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪¼╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const total = getAppointmentTotal(appointment);
    const payments = await prisma.radiologyAppointmentPayment.findMany({ where: { appointmentId: id }, orderBy: { createdAt: 'desc' } });
    const paid = payments.reduce((s, p) => s + p.amount, 0);

    res.json({
      success: true,
      data: {
        total,
        paidAmount: Math.max(0, paid),
        remaining: Math.max(0, total - paid),
        paymentStatus: appointment.paymentStatus || 'UNPAID',
        billingType: appointment.insuranceCompanyId ? 'INSURANCE' : 'PATIENT',
        payments,
      },
    });
  } catch (error) {
    console.error('Error getting radiology appointment payment:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪»┘ü╪╣' });
  }
};

const recordAppointmentPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { amount, method, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: '╪º┘ä┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });

    const prisma = getSharedPrismaClient();
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪¼╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const total = getAppointmentTotal(appointment);
    const paidSoFar = (await prisma.radiologyAppointmentPayment.aggregate({ where: { appointmentId: id }, _sum: { amount: true } }))._sum?.amount || 0;
    if (paidSoFar + amt > total) {
      return res.status(400).json({ success: false, error: `╪º┘ä┘à╪¿┘ä╪║ ┘è╪¬╪¼╪º┘ê╪▓ ╪º┘ä┘à╪¬╪¿┘é┘è (${Math.max(0, total - paidSoFar).toFixed(0)} ╪¼)` });
    }

    const m = String(method || 'CASH').toUpperCase();
    const payment = await prisma.radiologyAppointmentPayment.create({
      data: {
        companyId,
        appointmentId: id,
        amount: amt,
        method: PAYMENT_METHODS.includes(m) ? m : 'CASH',
        note: note ? String(note) : null,
        paidBy: req.user?.id || req.user?.email || null,
      },
    });
    await attachToActiveShift(prisma, companyId, null, 'PAYMENT', amt, m, note ? String(note) : null, 'APPOINTMENT', null, id);

    const { paid, status, updated } = await recomputeAppointmentPaid(prisma, id, total);
    res.json({ success: true, data: { payment, appointment: updated, total, paidAmount: paid, remaining: Math.max(0, total - paid), paymentStatus: status } });
  } catch (error) {
    console.error('Error recording radiology appointment payment:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣╪⌐' });
  }
};

const refundAppointmentPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { amount, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: '╪º┘ä┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });

    const prisma = getSharedPrismaClient();
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪¼╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const payments = await prisma.radiologyAppointmentPayment.findMany({ where: { appointmentId: id }, select: { amount: true } });
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    if (amt > paid) return res.status(400).json({ success: false, error: '┘à╪¿┘ä╪║ ╪º┘ä╪º╪│╪¬╪▒╪¼╪º╪╣ ╪ú┘â╪¿╪▒ ┘à┘å ╪º┘ä┘à╪»┘ü┘ê╪╣' });

    const payment = await prisma.radiologyAppointmentPayment.create({
      data: {
        companyId,
        appointmentId: id,
        amount: -amt,
        method: 'REFUND',
        note: note ? `╪º╪│╪¬╪▒╪¼╪º╪╣: ${String(note)}` : '╪º╪│╪¬╪▒╪¼╪º╪╣ ╪»┘ü╪╣╪⌐',
        paidBy: req.user?.id || req.user?.email || null,
      },
    });
    await attachToActiveShift(prisma, companyId, null, 'REFUND', amt, 'CASH', note ? String(note) : null, 'APPOINTMENT', null, id);

    const total = getAppointmentTotal(appointment);
    const { paid: newPaid, status, updated } = await recomputeAppointmentPaid(prisma, id, total);
    res.json({ success: true, data: { refund: payment, appointment: updated, total, paidAmount: newPaid, remaining: Math.max(0, total - newPaid), paymentStatus: status } });
  } catch (error) {
    console.error('Error refunding radiology appointment payment:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º╪│╪¬╪▒╪¼╪º╪╣ ╪º┘ä╪»┘ü╪╣╪⌐' });
  }
};

const getStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪»┘ü╪╣' });
  }
};

const recomputePaid = async (prisma, studyId, total) => {
  const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId }, select: { amount: true } });
  const positive = payments.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter(p => p.amount < 0).reduce((s, p) => s + p.amount, 0);
  const net = Math.max(0, positive + refunded);
  const hasRefunds = refunded < 0;
  const status = paymentStatusFor(total, net, hasRefunds);
  const updated = await prisma.radiologyStudy.update({ where: { id: studyId }, data: { paidAmount: net, paymentStatus: status } });
  return { paid: net, status, updated };
};

const recordStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { amount, method, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: '╪º┘ä┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const total = getStudyTotal(study);
    const paidSoFar = (await prisma.radiologyStudyPayment.aggregate({ where: { studyId: id }, _sum: { amount: true } }))._sum?.amount || 0;
    if (paidSoFar + amt > total) {
      return res.status(400).json({ success: false, error: `╪º┘ä┘à╪¿┘ä╪║ ┘è╪¬╪¼╪º┘ê╪▓ ╪º┘ä┘à╪¬╪¿┘é┘è (${Math.max(0, total - paidSoFar).toFixed(0)} ╪¼)` });
    }

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
    await attachToActiveShift(prisma, companyId, id, 'PAYMENT', amt, m, note ? String(note) : null);

    const { paid, status, updated } = await recomputePaid(prisma, id, total);
    await recordRadiologyStatusHistory(prisma, {
      companyId,
      studyId: id,
      dimension: 'PAYMENT',
      oldStatus: study.paymentStatus,
      status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: req.user?.firstName ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ')) : (req.user?.email || null),
      reason: note ? String(note) : '╪¬╪│╪¼┘è┘ä ╪»┘ü╪╣╪⌐',
    });
    res.json({ success: true, data: { payment, study: updated, total, paidAmount: paid, remaining: Math.max(0, total - paid), paymentStatus: status } });
  } catch (error) {
    console.error('Error recording radiology study payment:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣╪⌐' });
  }
};

const refundStudyPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { amount, note } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: '╪º┘ä┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const payments = await prisma.radiologyStudyPayment.findMany({ where: { studyId: id }, select: { amount: true } });
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    if (amt > paid) return res.status(400).json({ success: false, error: '┘à╪¿┘ä╪║ ╪º┘ä╪º╪│╪¬╪▒╪¼╪º╪╣ ╪ú┘â╪¿╪▒ ┘à┘å ╪º┘ä┘à╪»┘ü┘ê╪╣' });

    const payment = await prisma.radiologyStudyPayment.create({
      data: {
        companyId,
        studyId: id,
        amount: -amt,
        method: 'REFUND',
        note: note ? `╪º╪│╪¬╪▒╪¼╪º╪╣: ${String(note)}` : '╪º╪│╪¬╪▒╪¼╪º╪╣ ╪»┘ü╪╣╪⌐',
        paidBy: req.user?.id || req.user?.email || null,
      },
    });
    await attachToActiveShift(prisma, companyId, id, 'REFUND', amt, 'CASH', note ? String(note) : null);

    const total = getStudyTotal(study);
    const { paid: newPaid, status, updated } = await recomputePaid(prisma, id, total);
    await recordRadiologyStatusHistory(prisma, {
      companyId,
      studyId: id,
      dimension: 'PAYMENT',
      oldStatus: study.paymentStatus,
      status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: req.user?.firstName ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ')) : (req.user?.email || null),
      reason: note ? `╪º╪│╪¬╪▒╪¼╪º╪╣: ${String(note)}` : '╪º╪│╪¬╪▒╪¼╪º╪╣ ╪»┘ü╪╣╪⌐',
    });
    res.json({ success: true, data: { refund: payment, study: updated, total, paidAmount: newPaid, remaining: Math.max(0, total - newPaid), paymentStatus: status } });
  } catch (error) {
    console.error('Error refunding radiology study payment:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º╪│╪¬╪▒╪¼╪º╪╣ ╪º┘ä╪»┘ü╪╣╪⌐' });
  }
};

const financialSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

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
      if (!acc[key]) acc[key] = { insuranceCompanyId: key, name: inv.insuranceCompanyName || 'ΓÇö', total: 0, paid: 0, remaining: 0 };
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪│╪º╪¿ ╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä┘à╪º┘ä┘è' });
  }
};

module.exports = { getStudyPayment, recordStudyPayment, refundStudyPayment, financialSummary, getAppointmentPayment, recordAppointmentPayment, refundAppointmentPayment };
