const assert = require('assert');

// Mock sharedDatabase
const mockActivityLogs = [];
const mockPrisma = {
  activityLog: {
    create: async ({ data }) => {
      const entry = { id: `log-${Date.now()}-${mockActivityLogs.length + 1}`, createdAt: new Date(), ...data };
      mockActivityLogs.push(entry);
      return entry;
    },
    findMany: async ({ where, skip = 0, take = 25 }) => {
      let filtered = mockActivityLogs.filter(l => {
        if (where.companyId && l.companyId !== where.companyId) return false;
        if (where.category && l.category !== where.category) return false;
        if (where.action && l.action !== where.action) return false;
        if (where.targetType && l.targetType !== where.targetType) return false;
        if (where.severity && l.severity !== where.severity) return false;
        if (where.userId && l.userId !== where.userId) return false;
        return true;
      });
      return filtered.slice(skip, skip + take);
    },
    count: async ({ where }) => {
      let filtered = mockActivityLogs.filter(l => {
        if (where.companyId && l.companyId !== where.companyId) return false;
        if (where.category && l.category !== where.category) return false;
        if (where.action && l.action !== where.action) return false;
        if (where.targetType && l.targetType !== where.targetType) return false;
        return true;
      });
      return filtered.length;
    },
    groupBy: async ({ by, where }) => {
      const field = by[0];
      const counts = {};
      mockActivityLogs.forEach(l => {
        if (where.companyId && l.companyId !== where.companyId) return;
        const val = l[field];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts).map(([k, v]) => ({
        [field]: k,
        _count: { id: v }
      }));
    }
  }
};

// Override sharedDatabase require cache
const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => mockPrisma
  }
};

const {
  logEducationEvent,
  getEducationLogs,
  getEducationLogsStats,
  exportEducationLogsCsv,
  ACTION_DEFINITIONS,
} = require('../services/educationAuditService');

async function run() {
  console.log('--- Starting Standalone Education Audit Verification ---');

  // Test 1: Action definitions
  assert(ACTION_DEFINITIONS.CREATE_SUBJECT, 'ACTION_DEFINITIONS should contain CREATE_SUBJECT');
  assert(ACTION_DEFINITIONS.CONFIRM_SESSION, 'ACTION_DEFINITIONS should contain CONFIRM_SESSION');
  assert(ACTION_DEFINITIONS.PAY_TEACHER, 'ACTION_DEFINITIONS should contain PAY_TEACHER');
  console.log('✓ Action definitions verified.');

  // Test 2: logEducationEvent
  const log1 = await logEducationEvent({
    companyId: 'company-test-1',
    userId: 'user-admin',
    userName: 'المدير العام',
    action: 'CREATE_STUDENT',
    entityType: 'STUDENT',
    entityId: 'student-99',
    entityName: 'كريم محمود',
    description: 'تم تسجيل طالب جديد: كريم محمود',
    details: { grade: 'المرحلة الثانوية' },
  });

  assert.strictEqual(log1.category, 'EDUCATION');
  assert.strictEqual(log1.targetType, 'STUDENT');
  assert.strictEqual(log1.targetName, 'كريم محمود');
  assert.strictEqual(mockActivityLogs.length, 1);
  console.log('✓ Log event creation verified.');

  // Test 3: Multiple logs and stats
  await logEducationEvent({
    companyId: 'company-test-1',
    action: 'CONFIRM_SESSION',
    entityType: 'SESSION',
    entityId: 'sess-100',
    entityName: 'كيمياء - كريم محمود',
    description: 'تم تأكيد إتمام الحصة للطالب كريم محمود',
    details: { duration: 90, hours: 1.5 },
  });

  await logEducationEvent({
    companyId: 'company-test-1',
    action: 'PAY_TEACHER',
    entityType: 'PAYMENT',
    entityId: 'pay-200',
    entityName: 'صرف مرتب المهندس زياد',
    description: 'تم صرف مرتب المهندس زياد بمبلغ 1200 ج.م',
    details: { amount: 1200 },
  });

  const stats = await getEducationLogsStats('company-test-1');
  assert.strictEqual(stats.totalLogs, 3);
  assert.strictEqual(stats.targetTypeCounts.STUDENT, 1);
  assert.strictEqual(stats.targetTypeCounts.SESSION, 1);
  assert.strictEqual(stats.targetTypeCounts.PAYMENT, 1);
  console.log('✓ Aggregate statistics verified.');

  // Test 4: Query filtering
  const studentLogs = await getEducationLogs({
    companyId: 'company-test-1',
    targetType: 'STUDENT',
  });
  assert.strictEqual(studentLogs.logs.length, 1);
  assert.strictEqual(studentLogs.logs[0].targetId, 'student-99');
  console.log('✓ Target type filter verified.');

  const sessionLogs = await getEducationLogs({
    companyId: 'company-test-1',
    action: 'CONFIRM_SESSION',
  });
  assert.strictEqual(sessionLogs.logs.length, 1);
  assert.strictEqual(sessionLogs.logs[0].targetId, 'sess-100');
  console.log('✓ Action filter verified.');

  // Test 5: CSV Export
  const csv = await exportEducationLogsCsv('company-test-1');
  assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
  assert(csv.includes('كريم محمود'), 'CSV must contain student name');
  assert(csv.includes('المهندس زياد'), 'CSV must contain teacher payment description');
  console.log('✓ CSV export with UTF-8 BOM verified.');

  console.log('\n========================================');
  console.log('🎉 ALL 5 EDUCATION AUDIT TESTS PASSED! 🎉');
  console.log('========================================');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
