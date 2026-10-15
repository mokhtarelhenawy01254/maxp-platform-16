const mockPrisma = {
  supportTicket: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  supportMessage: {
    create: jest.fn(),
  },
  supportAttachment: {
    createMany: jest.fn(),
  },
};

const mockCreateNotification = jest.fn().mockResolvedValue({ id: 'notif-1' });

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((fn) => fn()),
}));

jest.mock('../../services/tenantContext', () => ({
  bypass: jest.fn(async (cb) => cb()),
}));

jest.mock('../../services/notificationService', () => ({
  createNotification: (...args) => mockCreateNotification(...args),
}));

jest.mock('../../utils/imageProcessor', () => ({
  processImage: jest.fn(),
  isProcessableImage: jest.fn(() => false),
}));

const controller = require('../../controller/supportTicketController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('supportTicketController - Notifications on reply and status change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // (1) رد أدمن -> إشعار للمستخدم
  test('(1) Admin reply to ticket creates notification for ticket owner with correct snippet and ticketId', async () => {
    const mockTicket = {
      id: 'ticket-db-1',
      ticketId: 'TKT-1001',
      subject: 'مشكلة في المخزون',
      status: 'OPEN',
      userId: 'merchant-user-1',
      companyId: 'company-merchant-1',
      user: {
        id: 'merchant-user-1',
        companyId: 'company-merchant-1',
        firstName: 'أحمد',
        lastName: 'التاجر',
      },
    };

    mockPrisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: 'msg-1',
      content: 'تم حل المشكلة وتحديث الرصيد بنجاح',
      isFromAdmin: true,
      ticketId: 'ticket-db-1',
      senderId: 'admin-user-1',
    });
    mockPrisma.supportTicket.update.mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    });

    const req = {
      params: { ticketId: 'TKT-1001' },
      body: { content: 'تم حل المشكلة وتحديث الرصيد بنجاح' },
      user: { id: 'admin-user-1', role: 'SUPER_ADMIN', companyId: 'super-company' },
    };
    const res = createMockRes();

    await controller.addMessage(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      companyId: 'company-merchant-1',
      userId: 'merchant-user-1',
      title: 'رد جديد على تذكرتك TKT-1001',
      body: 'تم حل المشكلة وتحديث الرصيد بنجاح',
      type: 'support_ticket',
      metadata: {
        ticketId: 'TKT-1001',
        url: '/support/tickets/TKT-1001',
        action: 'new_reply',
      },
    });
  });

  // (2) تغيير حالة -> إشعار للمستخدم
  test('(2) Status change (e.g. to CLOSED) creates notification for ticket owner with localized status', async () => {
    const mockTicket = {
      id: 'ticket-db-2',
      ticketId: 'TKT-1002',
      subject: 'طلب ربط فيسبوك',
      status: 'IN_PROGRESS',
      userId: 'merchant-user-2',
      companyId: 'company-merchant-2',
      user: {
        id: 'merchant-user-2',
        companyId: 'company-merchant-2',
        firstName: 'سارة',
        lastName: 'محمود',
      },
    };

    mockPrisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    mockPrisma.supportTicket.update.mockResolvedValue({
      ...mockTicket,
      status: 'CLOSED',
      user: mockTicket.user,
    });

    const req = {
      params: { ticketId: 'TKT-1002' },
      body: { status: 'closed' },
      user: { id: 'admin-user-1', role: 'SUPER_ADMIN', companyId: 'super-company' },
    };
    const res = createMockRes();

    await controller.updateTicket(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      companyId: 'company-merchant-2',
      userId: 'merchant-user-2',
      title: 'تحديث حالة تذكرتك TKT-1002',
      body: 'تذكرتك TKT-1002 بقت: مغلقة',
      type: 'support_ticket',
      metadata: {
        ticketId: 'TKT-1002',
        status: 'CLOSED',
        url: '/support/tickets/TKT-1002',
        action: 'status_changed',
      },
    });
  });

  // (3) رد التاجر نفسه -> مفيش إشعار لنفسه
  test('(3) Merchant replying to their own ticket does NOT send a notification to themselves', async () => {
    const mockTicket = {
      id: 'ticket-db-3',
      ticketId: 'TKT-1003',
      subject: 'استفسار عن الفاتورة',
      status: 'OPEN',
      userId: 'merchant-user-3',
      companyId: 'company-merchant-3',
      assignedUserId: null,
      user: {
        id: 'merchant-user-3',
        companyId: 'company-merchant-3',
        firstName: 'خالد',
        lastName: 'إبراهيم',
      },
    };

    mockPrisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: 'msg-3',
      content: 'شكراً، برجاء توضيح البند الثاني',
      isFromAdmin: false,
      ticketId: 'ticket-db-3',
      senderId: 'merchant-user-3',
    });

    const req = {
      params: { ticketId: 'TKT-1003' },
      body: { content: 'شكراً، برجاء توضيح البند الثاني' },
      user: { id: 'merchant-user-3', role: 'COMPANY_ADMIN', companyId: 'company-merchant-3' },
    };
    const res = createMockRes();

    await controller.addMessage(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // Verified: No self notification created for merchant
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  // (4) مفيش تسريب إشعارات لشركة تانية (عزل تام للـ companyId)
  test('(4) Strict isolation: notifications are scoped strictly to the ticket companyId and userId without cross-tenant bleed', async () => {
    const mockTicket = {
      id: 'ticket-db-4',
      ticketId: 'TKT-1004',
      subject: 'طلب دعم خاص بشركة الفا',
      status: 'OPEN',
      userId: 'user-alpha-1',
      companyId: 'company-alpha',
      user: {
        id: 'user-alpha-1',
        companyId: 'company-alpha',
        firstName: 'علي',
        lastName: 'الفا',
      },
    };

    mockPrisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: 'msg-4',
      content: 'رد الدعم الفني',
      isFromAdmin: true,
      ticketId: 'ticket-db-4',
      senderId: 'admin-user-1',
    });
    mockPrisma.supportTicket.update.mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    });

    // Admin who might belong to another company context
    const req = {
      params: { ticketId: 'TKT-1004' },
      body: { content: 'رد الدعم الفني' },
      user: { id: 'admin-user-1', role: 'SUPER_ADMIN', companyId: 'company-beta' },
    };
    const res = createMockRes();

    await controller.addMessage(req, res);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notificationCall = mockCreateNotification.mock.calls[0][0];

    // Notification target company MUST be company-alpha, NOT company-beta
    expect(notificationCall.companyId).toBe('company-alpha');
    expect(notificationCall.companyId).not.toBe('company-beta');
    expect(notificationCall.userId).toBe('user-alpha-1');
  });

  // Additional edge-case: Internal admin notes do NOT notify the customer
  test('Internal admin notes (isInternal: true) do NOT send notifications to customer', async () => {
    const mockTicket = {
      id: 'ticket-db-5',
      ticketId: 'TKT-1005',
      subject: 'ملاحظة داخلية سرية',
      status: 'OPEN',
      userId: 'merchant-user-5',
      companyId: 'company-merchant-5',
      user: {
        id: 'merchant-user-5',
        companyId: 'company-merchant-5',
        firstName: 'حسن',
        lastName: 'العميل',
      },
    };

    mockPrisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: 'msg-5',
      content: 'ملاحظة للمشرفين فقط: فحص الحساب بالخلفية',
      isFromAdmin: true,
      isInternal: true,
      ticketId: 'ticket-db-5',
      senderId: 'admin-user-1',
    });

    const req = {
      params: { ticketId: 'TKT-1005' },
      body: { content: 'ملاحظة للمشرفين فقط: فحص الحساب بالخلفية', isInternal: true },
      user: { id: 'admin-user-1', role: 'SUPER_ADMIN', companyId: 'super-company' },
    };
    const res = createMockRes();

    await controller.addMessage(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
