async function recordDentalLabStatusHistory(prisma, entry) {
  // BEST-EFFORT: never throw. Creates a DentalCaseStatusHistory row with fields:
  // companyId, caseId, dimension (STAGE|ORDER|PAYMENT), status, oldStatus, changedBy, userName, reason.
  // Wrap in try/catch and console.error on failure.
  try {
    const { companyId, caseId, dimension, status, oldStatus, changedBy, userName, reason } = entry || {};
    if (!prisma || !caseId || !dimension || !status) return null;
    return await prisma.dentalCaseStatusHistory.create({
      data: {
        companyId: companyId || null,
        caseId,
        dimension,
        status,
        oldStatus: oldStatus || null,
        changedBy: changedBy || null,
        userName: userName || null,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Error recording dental lab status history:', error);
    return null;
  }
}

function adminDisplayName(req) {
  return ([req?.user?.firstName, req?.user?.lastName].filter(Boolean).join(' ') || req?.user?.email || null);
}

async function syncCasePayments(prisma, companyId, caseId, { changedBy = null, userName = null, reason = 'دفعة' } = {}) {
  try {
    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id: caseId, companyId } });
    if (!dentalCase) return null;

    const invoices = await prisma.dentalInvoice.findMany({
      where: { caseId, companyId, status: { not: 'VOID' } },
      select: { paid: true },
    });
    const paid = require('./dentalLabHelpers').round2(invoices.reduce((sum, inv) => sum + (Number(inv.paid) || 0), 0));
    const { derivePaymentStatus } = require('./dentalLabHelpers');
    const total = require('./dentalLabHelpers').round2(Number(dentalCase.total) || 0);
    const remaining = require('./dentalLabHelpers').round2(Math.max(0, total - paid));
    const paymentStatus = derivePaymentStatus(total, paid);

    const paidChanged = paid !== (Number(dentalCase.paid) || 0);
    const remainingChanged = remaining !== (Number(dentalCase.remaining) || 0);
    const statusChanged = paymentStatus !== dentalCase.paymentStatus;
    if (paidChanged || remainingChanged || statusChanged) {
      await prisma.dentalLabCase.update({
        where: { id: caseId },
        data: { paid, remaining, paymentStatus },
      });
      await recordDentalLabStatusHistory(prisma, {
        companyId,
        caseId,
        dimension: 'PAYMENT',
        status: paymentStatus,
        oldStatus: dentalCase.paymentStatus || null,
        changedBy,
        userName,
        reason,
      });
    }
    return { paid, remaining, paymentStatus };
  } catch (error) {
    console.error('Error syncing dental case payments:', error);
    return null;
  }
}

module.exports = { recordDentalLabStatusHistory, adminDisplayName, syncCasePayments };