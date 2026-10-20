const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

/**
 * Log a procurement-related activity to the centralized ActivityLog table.
 * Zero blast-radius: Wrapped in try/catch to ensure audit logging never breaks core business transactions.
 *
 * @param {Object} params
 * @param {string} params.companyId - Tenant Company ID
 * @param {string} [params.userId] - User who initiated the action
 * @param {string} params.action - High-level action code (e.g. CREATE_PURCHASE_ORDER, APPROVE_PURCHASE_ORDER)
 * @param {string} params.targetType - Domain entity type ('PURCHASE_ORDER' | 'PURCHASE_INVOICE' | 'SUPPLIER_PAYMENT' | 'SUPPLIER')
 * @param {string} params.targetId - Entity primary key ID
 * @param {string} [params.targetName] - Entity display name / reference (e.g. orderNumber, supplier name)
 * @param {string} params.description - Human-readable summary in Arabic
 * @param {Object} [params.metadata] - Extra context (amounts, status changes, items count)
 * @param {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} [params.severity='LOW'] - Severity level
 * @param {boolean} [params.isSuccess=true] - Action result
 * @param {string} [params.errorMessage] - Error details if failed
 */
async function logProcurementActivity({
  companyId,
  userId = null,
  action,
  targetType,
  targetId,
  targetName = null,
  description,
  metadata = null,
  severity = 'LOW',
  isSuccess = true,
  errorMessage = null,
}) {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.activityLog?.create) return null;

    const data = {
      companyId: companyId || null,
      userId: userId || null,
      category: 'PROCUREMENT',
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetName: targetName ? String(targetName) : null,
      description: description || action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      severity,
      isSuccess,
      errorMessage: errorMessage ? String(errorMessage) : null,
      tags: JSON.stringify(['procurement', targetType.toLowerCase()]),
    };

    return await safeQuery(() => prisma.activityLog.create({ data }));
  } catch (err) {
    console.warn('[ProcurementAudit] Failed to log activity:', err.message);
    return null;
  }
}

module.exports = {
  logProcurementActivity,
};
