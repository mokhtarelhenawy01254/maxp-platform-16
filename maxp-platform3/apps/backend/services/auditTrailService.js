/**
 * 📋 Audit Trail Service
 * Tracks all import/export operations for compliance and debugging
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const { generateJobCorrelationId, getCurrentCorrelationId } = require('../utils/correlation');

// In-memory audit log (limited to 1000 entries)
const auditLog = [];
const MAX_AUDIT_LOG_SIZE = 1000;

/**
 * Audit action types
 */
const AUDIT_ACTIONS = {
  // Import actions
  IMPORT_STARTED: 'IMPORT_STARTED',
  IMPORT_COMPLETED: 'IMPORT_COMPLETED',
  IMPORT_FAILED: 'IMPORT_FAILED',
  IMPORT_PAUSED: 'IMPORT_PAUSED',
  IMPORT_RESUMED: 'IMPORT_RESUMED',
  IMPORT_CANCELLED: 'IMPORT_CANCELLED',
  ORDER_IMPORTED: 'ORDER_IMPORTED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_SKIPPED: 'ORDER_SKIPPED',
  ORDER_FAILED: 'ORDER_FAILED',
  
  // Export actions
  EXPORT_STARTED: 'EXPORT_STARTED',
  EXPORT_COMPLETED: 'EXPORT_COMPLETED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  
  // Settings actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  CREDENTIALS_TESTED: 'CREDENTIALS_TESTED',
  WEBHOOKS_SETUP: 'WEBHOOKS_SETUP',
  
  // Sync actions
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
  
  // Admin actions
  JOB_PAUSED: 'JOB_PAUSED',
  JOB_RESUMED: 'JOB_RESUMED',
  JOB_CANCELLED: 'JOB_CANCELLED'
};

/**
 * Severity levels
 */
const AUDIT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Create audit entry
 */
async function createAuditEntry(data) {
  const {
    action,
    companyId,
    userId,
    resourceType,
    resourceId,
    details,
    severity = AUDIT_SEVERITY.INFO,
    correlationId = getCurrentCorrelationId()
  } = data;
  
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    companyId,
    userId,
    resourceType,
    resourceId,
    details,
    severity,
    correlationId,
    metadata: {
      userAgent: process.env.USER_AGENT || 'system',
      source: 'backend',
      version: process.env.npm_package_version || '1.0.0'
    }
  };
  
  // Add to in-memory log
  auditLog.push(entry);
  
  // Trim old entries
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }
  
  // Optionally save to database
  try {
    const prisma = getSharedPrismaClient();
    if (prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          companyId: entry.companyId,
          userId: entry.userId,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          details: JSON.stringify(entry.details),
          severity: entry.severity,
          correlationId: entry.correlationId,
          metadata: JSON.stringify(entry.metadata)
        }
      });
    }
  } catch (e) {
    console.warn('⚠️ Could not save audit entry to database:', e.message);
  }
  
  return entry;
}

/**
 * Log import started
 */
async function logImportStarted(companyId, options, correlationId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.IMPORT_STARTED,
    companyId,
    resourceType: 'import_job',
    resourceId: correlationId,
    details: {
      options: {
        batchSize: options.batchSize,
        status: options.status,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        duplicateAction: options.duplicateAction
      },
      message: `بدأت مهمة استيراد جديدة`
    },
    correlationId
  });
}

/**
 * Log import completed
 */
async function logImportCompleted(companyId, stats, correlationId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.IMPORT_COMPLETED,
    companyId,
    resourceType: 'import_job',
    resourceId: correlationId,
    details: {
      stats: {
        totalProcessed: stats.imported + stats.updated + stats.skipped + stats.failed,
        imported: stats.imported,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed
      },
      message: `اكتملت مهمة الاستيراد`
    },
    severity: stats.failed > 0 ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
    correlationId
  });
}

/**
 * Log import failed
 */
async function logImportFailed(companyId, error, correlationId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.IMPORT_FAILED,
    companyId,
    resourceType: 'import_job',
    resourceId: correlationId,
    details: {
      error: error.message,
      stack: error.stack,
      message: `فشلت مهمة الاستيراد: ${error.message}`
    },
    severity: AUDIT_SEVERITY.ERROR,
    correlationId
  });
}

/**
 * Log order imported
 */
async function logOrderImported(companyId, orderId, wooCommerceId, status, correlationId) {
  return createAuditEntry({
    action: status === 'imported' ? AUDIT_ACTIONS.ORDER_IMPORTED : AUDIT_ACTIONS.ORDER_UPDATED,
    companyId,
    resourceType: 'order',
    resourceId: orderId,
    details: {
      wooCommerceId,
      localOrderId: orderId,
      status,
      message: `تم ${status === 'imported' ? 'استيراد' : 'تحديث'} الطلب #${wooCommerceId}`
    },
    correlationId
  });
}

/**
 * Log order failed
 */
async function logOrderFailed(companyId, wooCommerceId, error, correlationId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.ORDER_FAILED,
    companyId,
    resourceType: 'order',
    resourceId: wooCommerceId,
    details: {
      wooCommerceId,
      error: error.message,
      message: `فشل استيراد الطلب #${wooCommerceId}: ${error.message}`
    },
    severity: AUDIT_SEVERITY.WARNING,
    correlationId
  });
}

/**
 * Log settings updated
 */
async function logSettingsUpdated(companyId, changes, userId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    companyId,
    userId,
    resourceType: 'woocommerce_settings',
    resourceId: companyId,
    details: {
      changes,
      message: 'تم تحديث إعدادات WooCommerce'
    }
  });
}

/**
 * Log credentials tested
 */
async function logCredentialsTested(companyId, success, storeUrl, userId) {
  return createAuditEntry({
    action: AUDIT_ACTIONS.CREDENTIALS_TESTED,
    companyId,
    userId,
    resourceType: 'woocommerce_settings',
    resourceId: companyId,
    details: {
      storeUrl,
      success,
      message: success ? 'نجح اختبار الاتصال' : 'فشل اختبار الاتصال'
    },
    severity: success ? AUDIT_SEVERITY.INFO : AUDIT_SEVERITY.WARNING
  });
}

/**
 * Get audit logs for company
 */
async function getAuditLogs(companyId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    limit = 100,
    offset = 0
  } = options;
  
  // First check in-memory logs
  let filteredLogs = auditLog.filter(log => log.companyId === companyId);
  
  // Filter by date range
  if (startDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
  }
  
  // Filter by action
  if (action) {
    filteredLogs = filteredLogs.filter(log => log.action === action);
  }
  
  // Sort by timestamp descending
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Apply pagination
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);
  
  // Try to get from database for complete history
  try {
    const prisma = getSharedPrismaClient();
    if (prisma.auditLog) {
      const where = { companyId };
      
      if (startDate) where.timestamp = { gte: new Date(startDate) };
      if (endDate) where.timestamp = { ...where.timestamp, lte: new Date(endDate) };
      if (action) where.action = action;
      
      const dbLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });
      
      // Merge with in-memory logs
      const dbLogIds = new Set(dbLogs.map(l => l.id));
      const combinedLogs = [
        ...dbLogs.map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          action: l.action,
          companyId: l.companyId,
          userId: l.userId,
          resourceType: l.resourceType,
          resourceId: l.resourceId,
          details: JSON.parse(l.details || '{}'),
          severity: l.severity,
          correlationId: l.correlationId
        })),
        ...paginatedLogs.filter(l => !dbLogIds.has(l.id))
      ];
      
      return {
        logs: combinedLogs.slice(0, limit),
        total: combinedLogs.length
      };
    }
  } catch (e) {
    console.warn('⚠️ Could not fetch audit logs from database:', e.message);
  }
  
  return {
    logs: paginatedLogs,
    total: filteredLogs.length
  };
}

/**
 * Get audit statistics
 */
async function getAuditStats(companyId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const logs = auditLog.filter(log => 
    log.companyId === companyId && 
    new Date(log.timestamp) >= startDate
  );
  
  const stats = {
    totalImports: logs.filter(l => l.action === AUDIT_ACTIONS.IMPORT_STARTED).length,
    successfulImports: logs.filter(l => l.action === AUDIT_ACTIONS.IMPORT_COMPLETED).length,
    failedImports: logs.filter(l => l.action === AUDIT_ACTIONS.IMPORT_FAILED).length,
    ordersImported: logs.filter(l => l.action === AUDIT_ACTIONS.ORDER_IMPORTED).length,
    ordersUpdated: logs.filter(l => l.action === AUDIT_ACTIONS.ORDER_UPDATED).length,
    ordersFailed: logs.filter(l => l.action === AUDIT_ACTIONS.ORDER_FAILED).length,
    settingsChanges: logs.filter(l => l.action === AUDIT_ACTIONS.SETTINGS_UPDATED).length,
    errors: logs.filter(l => l.severity === AUDIT_SEVERITY.ERROR || l.severity === AUDIT_SEVERITY.CRITICAL).length
  };
  
  return stats;
}

/**
 * Export audit trail to JSON
 */
function exportAuditTrail(companyId, startDate, endDate) {
  const logs = auditLog.filter(log => 
    log.companyId === companyId &&
    new Date(log.timestamp) >= new Date(startDate) &&
    new Date(log.timestamp) <= new Date(endDate)
  );
  
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    companyId,
    dateRange: { startDate, endDate },
    totalEntries: logs.length,
    logs
  }, null, 2);
}

/**
 * Cleanup old audit entries
 */
async function cleanupOldAuditEntries(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  // Clean in-memory log
  const originalLength = auditLog.length;
  let removed = 0;
  
  for (let i = auditLog.length - 1; i >= 0; i--) {
    if (new Date(auditLog[i].timestamp) < cutoffDate) {
      auditLog.splice(i, 1);
      removed++;
    }
  }
  
  console.log(`🧹 Cleaned ${removed} old audit entries from memory`);
  
  // Clean database if available
  try {
    const prisma = getSharedPrismaClient();
    if (prisma.auditLog) {
      const deleted = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });
      
      console.log(`🧹 Cleaned ${deleted.count} old audit entries from database`);
    }
  } catch (e) {
    console.warn('⚠️ Could not cleanup audit entries from database:', e.message);
  }
  
  return { removed };
}

module.exports = {
  createAuditEntry,
  logImportStarted,
  logImportCompleted,
  logImportFailed,
  logOrderImported,
  logOrderFailed,
  logSettingsUpdated,
  logCredentialsTested,
  getAuditLogs,
  getAuditStats,
  exportAuditTrail,
  cleanupOldAuditEntries,
  AUDIT_ACTIONS,
  AUDIT_SEVERITY
};
