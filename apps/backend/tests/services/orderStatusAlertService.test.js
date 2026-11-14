const express = require('express');
const request = require('supertest');

// Mock token middleware and sharedDatabase BEFORE importing route/service
let mockAuthUser = { id: 'owner-1', companyId: 'comp-1', role: 'OWNER', permissions: [] };

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userCompany: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  hRSettings: {
    findUnique: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
  },
  orderStatusConfig: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  orderStatusDefinition: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  whatsAppSession: {
    findFirst: jest.fn(),
  },
  telegramConfig: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    if (!mockAuthUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  safeQuery: (fn) => fn(),
}));

const mockEmitToUser = jest.fn();
const mockEmitToCompany = jest.fn();
jest.mock('../../services/socketService', () => ({
  emitToUser: (...args) => mockEmitToUser(...args),
  emitToCompany: (...args) => mockEmitToCompany(...args),
}));

const mockSendText = jest.fn();
jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: (...args) => mockSendText(...args),
}));

const mockTgBotSendDirect = jest.fn();
jest.mock('../../services/TelegramBotService', () => ({
  sendDirectMessage: (...args) => mockTgBotSendDirect(...args),
}));

const mockCreateNotification = jest.fn();
jest.mock('../../services/notificationService', () => ({
  createNotification: (...args) => mockCreateNotification(...args),
}));

const statusAlertRoutes = require('../../routes/statusAlertRoutes');
const {
  alertStatusChange,
  sendTestAlert,
} = require('../../services/orderStatusAlertService');
const { clearStatusAlertDedupCache } = require('../../utils/statusAlertDedup');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/order-status-alerts', statusAlertRoutes);
  return app;
}

describe('Order Status Alerts Service & Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStatusAlertDedupCache();
    mockAuthUser = {
      id: 'owner-1',
      companyId: 'comp-1',
      role: 'OWNER',
      firstName: 'أحمد',
      lastName: 'المالك',
      permissions: [],
    };

    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'comp-1',
      phone: '201099999999',
      name: 'Max Store',
      settings: JSON.stringify({ existingFeature: { keep: true } }),
    });
    mockPrisma.company.update.mockResolvedValue({ id: 'comp-1' });
    mockPrisma.userCompany.findMany.mockResolvedValue([
      {
        userId: 'owner-1',
        role: 'OWNER',
        user: {
          id: 'owner-1',
          firstName: 'أحمد',
          lastName: 'المالك',
          email: 'owner@test.com',
          phone: '201012345678',
          role: 'OWNER',
          isActive: true,
        },
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      firstName: 'سارة',
      lastName: 'موظفة',
      email: 'sara@test.com',
    });
    mockPrisma.hRSettings.findUnique.mockResolvedValue({
      ownerWhatsAppNumber: '201012345678',
    });
    mockPrisma.customer.findFirst.mockResolvedValue({
      firstName: 'كريم',
      lastName: 'حسن',
      phone: '201111111111',
    });
    mockPrisma.orderStatusConfig.findMany.mockResolvedValue([
      { code: 'SHIPPED', name: 'تم الشحن', color: '#6366F1', sortOrder: 1 },
      { code: 'DELIVERED', name: 'تم التسليم', color: '#10B981', sortOrder: 2 },
    ]);
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
    mockPrisma.orderStatusDefinition.findMany.mockResolvedValue([]);
    mockPrisma.orderStatusDefinition.findFirst.mockResolvedValue(null);
    mockPrisma.whatsAppSession.findFirst.mockResolvedValue({
      id: 'wa-sess-1',
      phoneNumber: '201000000001',
    });
    mockPrisma.telegramConfig.findFirst.mockResolvedValue({
      id: 'tg-cfg-1',
      type: 'BOT',
      isActive: true,
    });
    mockPrisma.telegramConfig.findMany.mockResolvedValue([
      {
        id: 'tg-cfg-1',
        type: 'BOT',
        botToken: 'bot-token-1',
        isActive: true,
      },
    ]);
    mockCreateNotification.mockResolvedValue({ id: 'notif-1' });
    mockSendText.mockResolvedValue({ success: true });
    mockTgBotSendDirect.mockResolvedValue({ success: true });
  });

  describe('Route RBAC & Persistence', () => {
    test('denies AGENT without order settings permission (403 on GET, PUT, POST /test)', async () => {
      mockAuthUser = { id: 'agent-1', companyId: 'comp-1', role: 'AGENT', permissions: [] };
      const app = buildApp();

      const getRes = await request(app).get('/api/v1/order-status-alerts');
      expect(getRes.status).toBe(403);

      const putRes = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({ enabled: false });
      expect(putRes.status).toBe(403);

      const testRes = await request(app).post('/api/v1/order-status-alerts/test').send({});
      expect(testRes.status).toBe(403);
    });

    test('denies request missing companyId (403)', async () => {
      mockAuthUser = { id: 'super-1', companyId: null, role: 'OWNER', permissions: [] };
      const app = buildApp();

      const res = await request(app).get('/api/v1/order-status-alerts');
      expect(res.status).toBe(403);
    });

    test('OWNER GET / returns normalized settings and full meta context', async () => {
      const app = buildApp();
      const res = await request(app).get('/api/v1/order-status-alerts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statuses).toEqual(['SHIPPED']);
      expect(res.body.data.channels).toEqual({ inApp: true, whatsapp: true, telegram: false });
      expect(res.body.data.recipients.roles).toContain('OWNER');
      expect(res.body.meta.channelStatus.whatsapp.available).toBe(true);
      expect(res.body.meta.channelStatus.telegram.available).toBe(true);
      expect(res.body.meta.teamUsers).toHaveLength(1);
    });

    test('PUT / validates unknown keys, phones, roles, and windowMinutes bounds', async () => {
      const app = buildApp();

      const unknownKeyRes = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({ unexpectedProp: true });
      expect(unknownKeyRes.status).toBe(400);

      const badPhoneRes = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({ recipients: { phones: ['123'] } });
      expect(badPhoneRes.status).toBe(400);

      const badRoleRes = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({ recipients: { roles: ['HACKER_ROLE'] } });
      expect(badRoleRes.status).toBe(400);

      const badWindowRes = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({ windowMinutes: 2000 });
      expect(badWindowRes.status).toBe(400);
    });

    test('PUT / preserves unrelated company.settings inside prisma.$transaction', async () => {
      const app = buildApp();
      const res = await request(app)
        .put('/api/v1/order-status-alerts')
        .send({
          enabled: true,
          statuses: [],
          channels: { inApp: true, whatsapp: false, telegram: true },
          recipients: { roles: ['OWNER'], userIds: ['owner-1'], phones: [], telegramChatIds: ['123456'] },
          windowMinutes: 10,
        });

      expect(res.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.company.update).toHaveBeenCalledTimes(1);
      const written = JSON.parse(mockPrisma.company.update.mock.calls[0][0].data.settings);
      expect(written.existingFeature).toEqual({ keep: true });
      expect(written.statusAlerts.statuses).toEqual([]);
      expect(written.statusAlerts.channels.telegram).toBe(true);
      expect(written.statusAlerts.windowMinutes).toBe(10);
    });

    test('POST /test accepts validated override and rejects invalid override', async () => {
      const app = buildApp();

      const badRes = await request(app)
        .post('/api/v1/order-status-alerts/test')
        .send({ windowMinutes: -5 });
      expect(badRes.status).toBe(400);

      const okRes = await request(app)
        .post('/api/v1/order-status-alerts/test')
        .send({
          enabled: true,
          statuses: ['DELIVERED'],
          channels: { inApp: true, whatsapp: true, telegram: true },
          recipients: {
            roles: ['OWNER'],
            userIds: ['owner-1'],
            phones: ['201055555555'],
            telegramChatIds: ['987654321'],
          },
          windowMinutes: 5,
        });

      expect(okRes.status).toBe(200);
      expect(okRes.body.data.inApp).toBe(true);
      expect(okRes.body.data.whatsapp.success).toBe(true);
      expect(okRes.body.data.telegram.success).toBe(true);
      expect(mockSendText).toHaveBeenCalled();
      expect(mockTgBotSendDirect).toHaveBeenCalledWith(
        expect.objectContaining({ chatId: '987654321', companyId: 'comp-1' })
      );
    });
  });

  describe('Production Dispatch, Multi-Channel Fan-out & Dedup Recovery', () => {
    test('alertStatusChange filters customer lookup by companyId and dispatches In-App + Direct WhatsApp + Telegram', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        settings: JSON.stringify({
          statusAlerts: {
            enabled: true,
            statuses: ['SHIPPED'],
            channels: { inApp: true, whatsapp: true, telegram: true },
            recipients: {
              roles: ['OWNER'],
              userIds: ['user-2'],
              phones: ['201022223333'],
              telegramChatIds: ['-100555444'],
            },
            windowMinutes: 5,
          },
        }),
      });

      const result = await alertStatusChange({
        companyId: 'comp-1',
        order: { id: 'ord-9', orderNumber: 'ORD-5009', customerId: 'cust-77' },
        oldStatus: 'PROCESSING',
        newStatus: 'SHIPPED',
        changedBy: 'staff-1',
        prisma: mockPrisma,
        now: 1762900000000,
      });

      expect(result.skipped).toBe(false);
      expect(result.inApp).toBe(true);
      expect(result.whatsapp.success).toBe(true);
      expect(result.telegram.success).toBe(true);

      // Tenant isolation check on customer query
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-77', companyId: 'comp-1' },
        })
      );

      // Per-user inApp notifications for owner-1 (role OWNER) + user-2 (explicit userIds)
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      const createdPayloads = mockCreateNotification.mock.calls.map((c) => c[0]);
      expect(createdPayloads.map((p) => p.userId).sort()).toEqual(['owner-1', 'user-2']);
      expect(createdPayloads[0].metadata.url).toBe('/orders/ORD-5009');

      // Direct socket alert emitted to selected users
      expect(mockEmitToUser).toHaveBeenCalledWith(
        'owner-1',
        'order:status_alert',
        expect.objectContaining({ orderNumber: 'ORD-5009', newStatus: 'SHIPPED' })
      );

      // Direct WhatsApp text message dispatched without using ANNOUNCEMENT template
      expect(mockSendText).toHaveBeenCalled();
      expect(mockSendText.mock.calls[0][0]).toBe('wa-sess-1');
      expect(mockSendText.mock.calls[0][2]).toContain('#ORD-5009');

      // Telegram bot message dispatched
      expect(mockTgBotSendDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          chatId: '-100555444',
        })
      );
    });

    test('releases dedup quota when all enabled channels fail transiently, allowing immediate retry', async () => {
      mockCreateNotification.mockRejectedValue(new Error('DB transient error'));
      mockSendText.mockRejectedValue(new Error('WA socket closed'));

      const settings = {
        enabled: true,
        statuses: ['SHIPPED'],
        channels: { inApp: true, whatsapp: true, telegram: false },
        recipients: { roles: [], userIds: [], phones: ['201022223333'], telegramChatIds: [] },
        windowMinutes: 5,
      };

      const first = await alertStatusChange({
        companyId: 'comp-1',
        order: { id: 'ord-fail-1', orderNumber: 'ORD-FAIL-1' },
        oldStatus: 'PROCESSING',
        newStatus: 'SHIPPED',
        settings,
        prisma: mockPrisma,
        now: 1762900000000,
      });

      expect(first.skipped).toBe(false);
      expect(first.inApp).toBe(false);
      expect(first.whatsapp.success).toBe(false);

      // Recover channels
      mockCreateNotification.mockResolvedValue({ id: 'notif-recovered' });
      mockSendText.mockResolvedValue({ success: true });

      const retry = await alertStatusChange({
        companyId: 'comp-1',
        order: { id: 'ord-fail-1', orderNumber: 'ORD-FAIL-1' },
        oldStatus: 'PROCESSING',
        newStatus: 'SHIPPED',
        settings,
        prisma: mockPrisma,
        now: 1762900001000,
      });

      // Because all channels failed transiently on attempt #1, attempt #2 must NOT be deduplicated
      expect(retry.skipped).toBe(false);
      expect(retry.inApp).toBe(true);
      expect(retry.whatsapp.success).toBe(true);
    });
  });
});
