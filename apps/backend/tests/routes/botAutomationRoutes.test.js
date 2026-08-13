const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "user-1",
  companyId: "company-1",
  role: "OWNER",
};

const mockPrisma = {
  botAutomationSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  botAutomationRule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  botConversationStarter: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  botPersistentMenu: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  whatsAppSession: {
    findFirst: jest.fn(),
  },
  facebookPage: {
    findFirst: jest.fn(),
  },
};

const mockBuildStarterLinks = jest.fn();
const mockGetFacebookPage = jest.fn();
const mockPushPersistentMenu = jest.fn();

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/botLinkService", () => ({
  buildStarterLinks: (...args) => mockBuildStarterLinks(...args),
  getFacebookPage: (...args) => mockGetFacebookPage(...args),
}));

jest.mock("../../services/botMenuService", () => ({
  buildMenuItems: (items) => items,
  pushPersistentMenu: (...args) => mockPushPersistentMenu(...args),
}));

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => next(),
  requireSuperAdmin: (req, res, next) => next(),
  requireCompanyAccess: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

const botAutomationRoutes = require("../../routes/botAutomationRoutes");

describe("botAutomationRoutes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/bot-automation", botAutomationRoutes);
  });

  describe("GET /settings", () => {
    test("returns defaults when no settings exist", async () => {
      mockPrisma.botAutomationSettings.findUnique.mockResolvedValue(null);
      const res = await request(app).get("/api/v1/bot-automation/settings");
      expect(res.status).toBe(200);
      expect(res.body.data.welcomeEnabled).toBe(false);
      expect(res.body.data.channels).toEqual(['WHATSAPP', 'FACEBOOK']);
    });

    test("returns saved settings", async () => {
      mockPrisma.botAutomationSettings.findUnique.mockResolvedValue({
        welcomeEnabled: true,
        welcomeMessage: 'أهلاً بك 👋',
        defaultReplyEnabled: true,
        defaultReply: 'نرد عليك قريب',
        channels: JSON.stringify(['WHATSAPP']),
      });
      const res = await request(app).get("/api/v1/bot-automation/settings");
      expect(res.status).toBe(200);
      expect(res.body.data.welcomeMessage).toBe('أهلاً بك 👋');
      expect(res.body.data.channels).toEqual(['WHATSAPP']);
    });
  });

  describe("PUT /settings", () => {
    test("upserts settings with normalized channels", async () => {
      mockPrisma.botAutomationSettings.upsert.mockResolvedValue({});
      const res = await request(app)
        .put("/api/v1/bot-automation/settings")
        .send({
          welcomeEnabled: true,
          welcomeMessage: 'أهلاً بك',
          defaultReplyEnabled: true,
          defaultReply: 'نرد عليك قريب',
          channels: ['facebook', 'WHATSAPP', 'INVALID'],
        });
      expect(res.status).toBe(200);
      const args = mockPrisma.botAutomationSettings.upsert.mock.calls[0][0];
      expect(args.update.channels).toBe(JSON.stringify(['FACEBOOK', 'WHATSAPP']));
      expect(args.update.welcomeEnabled).toBe(true);
    });
  });

  describe("POST /rules", () => {
    test("creates a valid rule", async () => {
      mockPrisma.botAutomationRule.create.mockResolvedValue({ id: 'new-rule' });
      const res = await request(app)
        .post("/api/v1/bot-automation/rules")
        .send({
          name: 'الأسعار',
          channels: ['WHATSAPP'],
          matchMode: 'CONTAINS',
          keywords: ['سعر', 'السعر'],
          replyType: 'TEXT',
          replyText: 'الأسعار تبدأ من 100 جنيه',
          priority: 3,
        });
      expect(res.status).toBe(200);
      const data = mockPrisma.botAutomationRule.create.mock.calls[0][0].data;
      expect(data.name).toBe('الأسعار');
      expect(JSON.parse(data.keywords)).toEqual(['سعر', 'السعر']);
      expect(data.priority).toBe(3);
    });

    test("rejects rule without keywords", async () => {
      const res = await request(app)
        .post("/api/v1/bot-automation/rules")
        .send({ name: 'فاضي', channels: ['WHATSAPP'], replyType: 'TEXT', replyText: 'x' });
      expect(res.status).toBe(400);
    });

    test("rejects rule with no valid channel", async () => {
      const res = await request(app)
        .post("/api/v1/bot-automation/rules")
        .send({ name: 'ك', channels: ['TIKTOK'], keywords: ['a'], replyType: 'TEXT', replyText: 'x' });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /rules/:id", () => {
    test("updates own company rule", async () => {
      mockPrisma.botAutomationRule.findFirst.mockResolvedValue({ id: 'r1', companyId: 'company-1' });
      mockPrisma.botAutomationRule.update.mockResolvedValue({});
      const res = await request(app)
        .put("/api/v1/bot-automation/rules/r1")
        .send({ name: 'محدث', channels: ['WHATSAPP'], keywords: ['سعر'], replyType: 'TEXT', replyText: 'جديد' });
      expect(res.status).toBe(200);
    });

    test("404 when rule not owned by company", async () => {
      mockPrisma.botAutomationRule.findFirst.mockResolvedValue(null);
      const res = await request(app)
        .put("/api/v1/bot-automation/rules/r-other")
        .send({ name: 'x', channels: ['WHATSAPP'], keywords: ['سعر'], replyType: 'TEXT', replyText: 'y' });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /rules/:id", () => {
    test("deletes own company rule", async () => {
      mockPrisma.botAutomationRule.findFirst.mockResolvedValue({ id: 'r1', companyId: 'company-1' });
      mockPrisma.botAutomationRule.delete.mockResolvedValue({});
      const res = await request(app).delete("/api/v1/bot-automation/rules/r1");
      expect(res.status).toBe(200);
    });

    test("404 when rule missing", async () => {
      mockPrisma.botAutomationRule.findFirst.mockResolvedValue(null);
      const res = await request(app).delete("/api/v1/bot-automation/rules/r-missing");
      expect(res.status).toBe(404);
    });
  });

  describe("conversation starters", () => {
    test("lists starters with parsed channels", async () => {
      mockPrisma.botConversationStarter.findMany.mockResolvedValue([
        { id: 's1', name: 'الأسعار', channels: JSON.stringify(['WHATSAPP']), message: 'السلام عليكم', refCode: '', isEnabled: true, sortOrder: 1 },
      ]);
      const res = await request(app).get("/api/v1/bot-automation/starters");
      expect(res.status).toBe(200);
      expect(res.body.data[0].channels).toEqual(['WHATSAPP']);
      expect(res.body.data[0].name).toBe('الأسعار');
    });

    test("creates starter", async () => {
      mockPrisma.botConversationStarter.create.mockResolvedValue({ id: 's-new' });
      const res = await request(app)
        .post("/api/v1/bot-automation/starters")
        .send({ name: 'تسعير', channels: ['WHATSAPP', 'FACEBOOK'], message: 'كام سعر؟', refCode: 'pricing' });
      expect(res.status).toBe(200);
      const data = mockPrisma.botConversationStarter.create.mock.calls[0][0].data;
      expect(JSON.parse(data.channels)).toEqual(['WHATSAPP', 'FACEBOOK']);
      expect(data.refCode).toBe('pricing');
    });

    test("rejects starter without channels", async () => {
      const res = await request(app)
        .post("/api/v1/bot-automation/starters")
        .send({ name: 'x', channels: ['TIKTOK'] });
      expect(res.status).toBe(400);
    });

    test("builds starter links", async () => {
      mockPrisma.botConversationStarter.findMany.mockResolvedValue([
        { id: 's1', name: 'الأسعار', channels: JSON.stringify(['WHATSAPP', 'FACEBOOK']), message: 'مرحبا', refCode: 'pricing', isEnabled: true, sortOrder: 0 },
      ]);
      mockBuildStarterLinks.mockResolvedValue({
        starterId: 's1',
        name: 'الأسعار',
        message: 'مرحبا',
        channels: [{ channel: 'WHATSAPP', url: 'https://wa.me/201012345678' }],
      });
      const res = await request(app).get("/api/v1/bot-automation/starters/links");
      expect(res.status).toBe(200);
      expect(res.body.data[0].channels[0].url).toContain('wa.me');
    });

    test("deletes starter", async () => {
      mockPrisma.botConversationStarter.findFirst.mockResolvedValue({ id: 's1', companyId: 'company-1' });
      mockPrisma.botConversationStarter.delete.mockResolvedValue({});
      const res = await request(app).delete("/api/v1/bot-automation/starters/s1");
      expect(res.status).toBe(200);
    });
  });

  describe("persistent menu", () => {
    test("GET returns saved menu and page info", async () => {
      mockPrisma.botPersistentMenu.findUnique.mockResolvedValue({
        isEnabled: true,
        pageId: 'page-1',
        items: JSON.stringify([{ type: 'postback', title: 'الأسعار', payload: 'MENU_PRICE' }]),
      });
      mockGetFacebookPage.mockResolvedValue({ pageId: 'page-1', pageName: 'Swan' });
      const res = await request(app).get("/api/v1/bot-automation/menu");
      expect(res.status).toBe(200);
      expect(res.body.data.hasPageConnected).toBe(true);
      expect(res.body.data.items[0].title).toBe('الأسعار');
    });

    test("PUT saves menu and pushes to Facebook when page connected", async () => {
      mockPrisma.botPersistentMenu.upsert.mockResolvedValue({ id: 'm1' });
      mockGetFacebookPage.mockResolvedValue({ pageId: 'page-1', pageAccessToken: 'tok', pageName: 'Swan' });
      mockPushPersistentMenu.mockResolvedValue({ success: true });
      const res = await request(app)
        .put("/api/v1/bot-automation/menu")
        .send({ isEnabled: true, items: [{ type: 'postback', title: 'الأسعار' }] });
      expect(res.status).toBe(200);
      expect(mockPushPersistentMenu).toHaveBeenCalled();
      expect(res.body.push.success).toBe(true);
    });

    test("DELETE removes menu", async () => {
      mockPrisma.botPersistentMenu.findUnique.mockResolvedValue({ companyId: 'company-1' });
      mockPrisma.botPersistentMenu.delete.mockResolvedValue({});
      const res = await request(app).delete("/api/v1/bot-automation/menu");
      expect(res.status).toBe(200);
    });
  });
});
