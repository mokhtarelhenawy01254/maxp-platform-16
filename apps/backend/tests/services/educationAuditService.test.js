const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock sharedDatabase before requiring service
const mockActivityLogs = [];
const mockPrisma = {
  activityLog: {
    create: async ({ data }) => {
      const entry = { id: `log-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
      mockActivityLogs.push(entry);
      return entry;
    },
    findMany: async ({ where, skip = 0, take = 25, orderBy }) => {
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

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma
}));

const {
  logEducationEvent,
  getEducationLogs,
  getEducationLogsStats,
  exportEducationLogsCsv,
  ACTION_DEFINITIONS,
} = require('../../services/educationAuditService');

describe('Education Audit Service Verification', () => {
  beforeEach(() => {
    mockActivityLogs.length = 0;
  });

  it('records CREATE_SUBJECT event correctly with category EDUCATION', async () => {
    const entry = await logEducationEvent({
      companyId: 'comp-123',
      userId: 'usr-1',
      userName: 'أحمد الإداري',
      action: 'CREATE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: 'sub-1',
      entityName: 'الفيزياء الحديثة',
      description: 'تم إضافة مادة دراسية جديدة: الفيزياء الحديثة',
      details: { price: 300 },
    });

    expect(entry).toBeDefined();
    expect(entry.category).toBe('EDUCATION');
    expect(entry.action).toBe('CREATE_SUBJECT');
    expect(entry.targetType).toBe('SUBJECT');
    expect(entry.targetName).toBe('الفيزياء الحديثة');
    expect(mockActivityLogs).toHaveLength(1);
  });

  it('records CONFIRM_SESSION and updates stats', async () => {
    await logEducationEvent({
      companyId: 'comp-123',
      action: 'CONFIRM_SESSION',
      entityType: 'SESSION',
      entityId: 'sess-1',
      entityName: 'رياضيات - عمر خالد',
      description: 'تم تأكيد إتمام الحصة للطالب عمر خالد مع المهندس حسام',
      details: { hoursDeducted: 1.5, sessionAmount: 300 },
      severity: 'MEDIUM',
    });

    const stats = await getEducationLogsStats('comp-123');
    expect(stats.totalLogs).toBe(1);
    expect(stats.targetTypeCounts.SESSION).toBe(1);
    expect(stats.actionCounts.CONFIRM_SESSION).toBe(1);
  });

  it('filters logs by action and targetType', async () => {
    await logEducationEvent({
      companyId: 'comp-123',
      action: 'CREATE_STUDENT',
      entityType: 'STUDENT',
      entityId: 'stu-1',
      entityName: 'سارة أحمد',
    });

    await logEducationEvent({
      companyId: 'comp-123',
      action: 'PAY_TEACHER',
      entityType: 'PAYMENT',
      entityId: 'pay-1',
      entityName: 'صرف مرتب مهندس',
    });

    const studentLogs = await getEducationLogs({
      companyId: 'comp-123',
      targetType: 'STUDENT',
    });
    expect(studentLogs.logs).toHaveLength(1);
    expect(studentLogs.logs[0].targetType).toBe('STUDENT');

    const paymentLogs = await getEducationLogs({
      companyId: 'comp-123',
      action: 'PAY_TEACHER',
    });
    expect(paymentLogs.logs).toHaveLength(1);
    expect(paymentLogs.logs[0].action).toBe('PAY_TEACHER');
  });

  it('exports logs to CSV with UTF-8 BOM', async () => {
    await logEducationEvent({
      companyId: 'comp-123',
      action: 'CREATE_PACKAGE',
      entityType: 'PACKAGE',
      entityName: 'باقة التفوق',
      description: 'تم إنشاء باقة جديدة',
    });

    const csv = await exportEducationLogsCsv('comp-123');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('باقة التفوق');
  });
});
