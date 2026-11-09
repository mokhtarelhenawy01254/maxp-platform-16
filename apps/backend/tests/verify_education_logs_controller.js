const assert = require('assert');

// Mock educationAuditService
const mockLogs = [
  {
    id: 'log-1',
    category: 'EDUCATION',
    action: 'CONFIRM_SESSION',
    description: 'تم تأكيد إتمام الحصة للطالب أحمد',
    targetType: 'SESSION',
    targetId: 'sess-1',
    targetName: 'رياضيات - أحمد',
    severity: 'MEDIUM',
    isSuccess: true,
    actorName: 'أحمد الإداري',
    actorRole: 'COMPANY_ADMIN',
    createdAt: new Date().toISOString()
  }
];

const auditServicePath = require.resolve('../services/educationAuditService');
require.cache[auditServicePath] = {
  id: auditServicePath,
  filename: auditServicePath,
  loaded: true,
  exports: {
    ACTION_DEFINITIONS: { CONFIRM_SESSION: { label: 'تأكيد إتمام الحصة' } },
    getEducationLogs: async ({ companyId }) => ({
      logs: mockLogs,
      pagination: { total: 1, page: 1, limit: 25, totalPages: 1 }
    }),
    getEducationLogsStats: async (companyId) => ({
      totalLogs: 1,
      todayLogs: 1,
      weekLogs: 1,
      targetTypeCounts: { SESSION: 1 },
      actionCounts: { CONFIRM_SESSION: 1 },
      recent: mockLogs
    }),
    exportEducationLogsCsv: async () => '\uFEFFالتاريخ,الوصف\n"2026-11-09","تم تأكيد إتمام الحصة"'
  }
};

const controller = require('../controller/educationLogsController');

async function run() {
  console.log('--- Testing Education Logs Controller ---');

  // Test getLogs
  const req1 = { user: { companyId: 'comp-1' }, query: {} };
  let jsonResponse1 = null;
  const res1 = {
    json: (data) => { jsonResponse1 = data; return res1; },
    status: () => res1
  };
  await controller.getLogs(req1, res1);
  assert(jsonResponse1.success === true, 'getLogs should return success: true');
  assert(jsonResponse1.data.length === 1, 'getLogs should return 1 log');
  console.log('✓ controller.getLogs passed.');

  // Test getStats
  const req2 = { user: { companyId: 'comp-1' } };
  let jsonResponse2 = null;
  const res2 = {
    json: (data) => { jsonResponse2 = data; return res2; },
    status: () => res2
  };
  await controller.getStats(req2, res2);
  assert(jsonResponse2.success === true, 'getStats should return success: true');
  assert(jsonResponse2.data.totalLogs === 1, 'getStats should return totalLogs = 1');
  console.log('✓ controller.getStats passed.');

  // Test exportLogs
  const req3 = { user: { companyId: 'comp-1' }, query: {} };
  let headersSent = {};
  let sentData = '';
  const res3 = {
    setHeader: (k, v) => { headersSent[k] = v; },
    send: (d) => { sentData = d; return res3; },
    status: () => res3
  };
  await controller.exportLogs(req3, res3);
  assert(headersSent['Content-Type'].includes('text/csv'), 'exportLogs should set text/csv header');
  assert(sentData.includes('تم تأكيد إتمام الحصة'), 'exportLogs should send CSV with arabic content');
  console.log('✓ controller.exportLogs passed.');

  console.log('\n========================================');
  console.log('🎉 ALL CONTROLLER TESTS PASSED! 🎉');
  console.log('========================================');
}

run().catch((err) => {
  console.error('❌ Controller test failed:', err);
  process.exit(1);
});
