const taskExternalController = require('../../controller/taskExternalController');

// Mock sharedDatabase to isolate controller testing
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
  },
  task: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  taskAttachment: {
    findMany: jest.fn(),
  },
  taskActivity: {
    create: jest.fn(),
  },
  taskComment: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

jest.mock('../../services/taskNotificationService', () => ({
  queueNotification: jest.fn(),
  notifyTaskStakeholders: jest.fn().mockResolvedValue(),
  notifyTaskActivity: jest.fn().mockResolvedValue(),
  helpers: {
    buildTaskVariables: jest.fn(() => ({})),
    normalizeStatusLabel: jest.fn((s) => s),
  },
}));

jest.mock('../../services/taskWebhookService', () => ({
  queueTaskWebhook: jest.fn(),
  dispatchTaskWebhook: jest.fn().mockResolvedValue(),
}));

jest.mock('../../workers/webhookWorker', () => ({
  queueTaskWebhook: jest.fn(),
}));

const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
};

describe('Task Delivery Gate Integration Tests (مسار التسليم على السيرفر)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-agent-1',
      role: 'COMPANY_ADMIN',
    });
  });

  const baseReq = {
    params: { id: 'task-100' },
    externalTaskApi: {
      companyId: 'company-test-1',
      integrationName: 'DeliveryGateIntegration',
      actingUserId: 'user-agent-1',
    },
  };

  test('مهمة HIGH بدون أدلة كافية → ترفض بـ 422 مع تفاصيل الحقول الناقصة', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: 'task-100',
      companyId: 'company-test-1',
      title: 'Fix Critical Billing Glitch',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      acceptanceCriteria: '1. Reconcile balance',
      assignedTo: 'user-agent-1',
      createdBy: 'user-admin-1',
    });
    mockPrisma.taskAttachment.findMany.mockResolvedValue([]);

    const req = {
      ...baseReq,
      body: {
        status: 'IN_REVIEW',
        // Only changeType provided — missing link/commit, metrics, notTested, before and after images
        changeType: 'BUG_FIX',
      },
    };
    const res = createMockRes();

    await taskExternalController.updateTaskStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('أدلة التسليم غير مكتملة');
    expect(res.body.missingFields).toContain('صورة قبل');
    expect(res.body.missingFields).toContain('صورة بعد');
    expect(res.body.missingFields).toContain('الأرقام قبل / بعد');
    expect(res.body.missingFields).toContain('نطاق ما لم يتم اختباره');
  });

  test('مهمة HIGH كاملة الأدلة مع الصورتين واللينك → تقبل بنجاح 200 OK وتخزن الدليل', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: 'task-100',
      companyId: 'company-test-1',
      title: 'Fix Critical Billing Glitch',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      acceptanceCriteria: '1. Reconcile balance',
      assignedTo: 'user-agent-1',
      createdBy: 'user-admin-1',
    });
    mockPrisma.taskAttachment.findMany.mockResolvedValue([]);
    mockPrisma.task.update.mockResolvedValue({
      id: 'task-100',
      status: 'IN_REVIEW',
      title: 'Fix Critical Billing Glitch',
      priority: 'HIGH',
    });

    const req = {
      ...baseReq,
      body: {
        status: 'IN_REVIEW',
        changeType: 'BUG_FIX',
        pageUrl: 'https://maxp.online/billing',
        commitOrPath: 'fix(billing): correct balance discrepancy',
        numbersBeforeAfter: 'Discrepancy count 12 -> 0',
        notTestedScope: 'Tested on staging accounts',
        beforeAttachmentId: 'att-b-1',
        beforeAttachmentUrl: 'https://maxp.online/uploads/before.png',
        afterAttachmentId: 'att-a-2',
        afterAttachmentUrl: 'https://maxp.online/uploads/after.png',
      },
    };
    const res = createMockRes();

    await taskExternalController.updateTaskStatus(req, res);

    expect(res.status).not.toHaveBeenCalledWith(422);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-100' },
        data: expect.objectContaining({
          status: 'IN_REVIEW',
          hasEvidence: true,
          evidence: expect.objectContaining({
            beforeAttachmentId: 'att-b-1',
            afterAttachmentId: 'att-a-2',
            pageUrl: 'https://maxp.online/billing',
          }),
        }),
      })
    );
  });

  test('مهمة MEDIUM كاملة الحد الأدنى (نوع التغيير + الكوميت أو اللينك) → تقبل بنجاح 200 OK', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: 'task-200',
      companyId: 'company-test-1',
      title: 'Improve UX micro-copy',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      acceptanceCriteria: 'Clear wording',
      assignedTo: 'user-agent-1',
      createdBy: 'user-admin-1',
    });
    mockPrisma.taskAttachment.findMany.mockResolvedValue([]);
    mockPrisma.task.update.mockResolvedValue({
      id: 'task-200',
      status: 'IN_REVIEW',
      title: 'Improve UX micro-copy',
      priority: 'MEDIUM',
    });

    const req = {
      ...baseReq,
      params: { id: 'task-200' },
      body: {
        status: 'IN_REVIEW',
        changeType: 'UI_UX',
        pageUrl: 'https://maxp.online/tasks',
      },
    };
    const res = createMockRes();

    await taskExternalController.updateTaskStatus(req, res);

    expect(res.status).not.toHaveBeenCalledWith(422);
    expect(res.body.success).toBe(true);
  });

  test('مهمة LOW بدون أدلة تسليم → تقبل بنجاح 200 OK دون حظر', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({
      id: 'task-300',
      companyId: 'company-test-1',
      title: 'Fix typo in footer',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      acceptanceCriteria: null,
      assignedTo: 'user-agent-1',
      createdBy: 'user-admin-1',
    });
    mockPrisma.taskAttachment.findMany.mockResolvedValue([]);
    mockPrisma.task.update.mockResolvedValue({
      id: 'task-300',
      status: 'IN_REVIEW',
      title: 'Fix typo in footer',
      priority: 'LOW',
    });

    const req = {
      ...baseReq,
      params: { id: 'task-300' },
      body: {
        status: 'IN_REVIEW',
        // Completely empty evidence
      },
    };
    const res = createMockRes();

    await taskExternalController.updateTaskStatus(req, res);

    expect(res.status).not.toHaveBeenCalledWith(422);
    expect(res.body.success).toBe(true);
  });
});
