const RADIOLOGY_ORDER_STATUSES = ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function deriveRadiologyOrderStatus({ appointment = null, study = null } = {}) {
  if (appointment && appointment.status === 'CANCELLED') return 'CANCELLED';
  if (study && study.status === 'DELIVERED') return 'COMPLETED';
  if (study) return 'IN_PROGRESS';
  if (appointment && appointment.status === 'CHECKED_IN') return 'CHECKED_IN';
  return 'PENDING';
}

async function recordRadiologyStatusHistory(prisma, entry) {
  // BEST-EFFORT: never throw. Creates a RadiologyStudyStatusHistory row with fields:
  // companyId, studyId, dimension (ORDER|PREP|REPORT|PAYMENT), status, oldStatus, changedBy, userName, reason.
  // Wrap in try/catch and console.error on failure.
  try {
    const { companyId, studyId, dimension, status, oldStatus, changedBy, userName, reason } = entry || {};
    if (!prisma || !studyId || !dimension || !status) return null;
    return await prisma.radiologyStudyStatusHistory.create({
      data: {
        companyId: companyId || null,
        studyId,
        dimension,
        status,
        oldStatus: oldStatus || null,
        changedBy: changedBy || null,
        userName: userName || null,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Error recording radiology status history:', error);
    return null;
  }
}

function signerDisplayName(req) {
  return ([req?.user?.firstName, req?.user?.lastName].filter(Boolean).join(' ') || req?.user?.email || null);
}

async function syncStudyOrderStatus(prisma, study, { changedBy, userName, appointment = null } = {}) {
  try {
    const derived = deriveRadiologyOrderStatus({ study, appointment });
    if (derived !== study.orderStatus) {
      await recordRadiologyStatusHistory(prisma, {
        companyId: study.companyId,
        studyId: study.id,
        dimension: 'ORDER',
        oldStatus: study.orderStatus,
        status: derived,
        changedBy,
        userName,
      });
      await prisma.radiologyStudy.update({ where: { id: study.id }, data: { orderStatus: derived } });
    }
    return derived;
  } catch (error) {
    console.error('Error syncing radiology study order status:', error);
    return null;
  }
}

module.exports = { RADIOLOGY_ORDER_STATUSES, deriveRadiologyOrderStatus, recordRadiologyStatusHistory, signerDisplayName, syncStudyOrderStatus };
