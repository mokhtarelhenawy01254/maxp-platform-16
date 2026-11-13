const express = require('express');
const request = require('supertest');

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  companyApp: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  customer: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: 'cust-1', name: 'Test' }),
    count: jest.fn().mockResolvedValue(0),
  },
  userPermission: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
  closeSharedDatabase: jest.fn(async () => {}),
}));

let mockUser = {
  id: 'user-1',
  role: 'COMPANY_ADMIN',
  companyId: 'comp-no-crm',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
  requireRole: () => (req, res, next) => next(),
  requireCompanyAccess: (req, res, next) => next(),
}));

jest.mock('../../middleware/rbacMiddleware', () => ({
  requireDbPermission: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next(),
  hasPermission: () => true,
}));

// Mock controllers to return dummy responses
jest.mock('../../controller/customerController', () => ({
  getAllCustomer: (req, res) => res.json({ success: true, route: 'getAllCustomer' }),
  createCustomer: (req, res) => res.json({ success: true, route: 'createCustomer' }),
  searchCustomers: (req, res) => res.json({ success: true, route: 'searchCustomers' }),
  getCustomerLookupByPhone: (req, res) => res.json({ success: true, route: 'getCustomerLookupByPhone' }),
  exportCustomers: (req, res) => res.json({ success: true, route: 'exportCustomers' }),
  importCustomersFromCSV: (req, res) => res.json({ success: true, route: 'importCustomersFromCSV' }),
  deleteAllCustomers: (req, res) => res.json({ success: true, route: 'deleteAllCustomers' }),
  deleteAllConversations: (req, res) => res.json({ success: true, route: 'deleteAllConversations' }),
  blockCustomerOnPage: (req, res) => res.json({ success: true, route: 'blockCustomerOnPage' }),
  unblockCustomerOnPage: (req, res) => res.json({ success: true, route: 'unblockCustomerOnPage' }),
  getBlockedCustomersOnPage: (req, res) => res.json({ success: true, route: 'getBlockedCustomersOnPage' }),
  checkCustomerBlockStatus: (req, res) => res.json({ success: true, route: 'checkCustomerBlockStatus' }),
  getDistinctTags: (req, res) => res.json({ success: true, route: 'getDistinctTags' }),
  renameTag: (req, res) => res.json({ success: true, route: 'renameTag' }),
  deleteTag: (req, res) => res.json({ success: true, route: 'deleteTag' }),
  recalculateAllCustomerRatingsHandler: (req, res) => res.json({ success: true, route: 'recalculateAllCustomerRatingsHandler' }),
  getCustomerDetails: (req, res) => res.json({ success: true, route: 'getCustomerDetails' }),
  recalculateCustomerRatingHandler: (req, res) => res.json({ success: true, route: 'recalculateCustomerRatingHandler' }),
  getCustomerOrders: (req, res) => res.json({ success: true, route: 'getCustomerOrders' }),
  getCustomerActivity: (req, res) => res.json({ success: true, route: 'getCustomerActivity' }),
  getCustomerNotes: (req, res) => res.json({ success: true, route: 'getCustomerNotes' }),
  addCustomerNote: (req, res) => res.json({ success: true, route: 'addCustomerNote' }),
  deleteCustomerNote: (req, res) => res.json({ success: true, route: 'deleteCustomerNote' }),
  deleteCustomer: (req, res) => res.json({ success: true, route: 'deleteCustomer' }),
  updateCustomerTags: (req, res) => res.json({ success: true, route: 'updateCustomerTags' }),
  updateCustomer: (req, res) => res.json({ success: true, route: 'updateCustomer' }),
  getDueLeadFollowUps: (req, res) => res.json({ success: true, route: 'getDueLeadFollowUps' }),
  bulkAssignLeads: (req, res) => res.json({ success: true, route: 'bulkAssignLeads' }),
  assignLead: (req, res) => res.json({ success: true, route: 'assignLead' }),
}));

jest.mock('../../controller/customerWhatsAppController', () => ({
  getConnectedWhatsAppSessions: (req, res) => res.json({ success: true, route: 'getConnectedWhatsAppSessions' }),
  refreshSessions: (req, res) => res.json({ success: true, route: 'refreshSessions' }),
  getCustomersWithPhones: (req, res) => res.json({ success: true, route: 'getCustomersWithPhones' }),
  getProductsForNotification: (req, res) => res.json({ success: true, route: 'getProductsForNotification' }),
  previewAudience: (req, res) => res.json({ success: true, route: 'previewAudience' }),
  previewBirthdayAudience: (req, res) => res.json({ success: true, route: 'previewBirthdayAudience' }),
  sendSmartBulkNotification: (req, res) => res.json({ success: true, route: 'sendSmartBulkNotification' }),
  sendBirthdayBulkNotification: (req, res) => res.json({ success: true, route: 'sendBirthdayBulkNotification' }),
  getBirthdayAnalyticsReports: (req, res) => res.json({ success: true, route: 'getBirthdayAnalyticsReports' }),
  getBirthdayAutomationSettings: (req, res) => res.json({ success: true, route: 'getBirthdayAutomationSettings' }),
  saveBirthdayAutomationSettings: (req, res) => res.json({ success: true, route: 'saveBirthdayAutomationSettings' }),
  getTodayBirthdayTrack: (req, res) => res.json({ success: true, route: 'getTodayBirthdayTrack' }),
  getUpcomingBirthdaysTrack: (req, res) => res.json({ success: true, route: 'getUpcomingBirthdaysTrack' }),
  getMissingBirthdaysTrack: (req, res) => res.json({ success: true, route: 'getMissingBirthdaysTrack' }),
  sendTestBirthdayMessage: (req, res) => res.json({ success: true, route: 'sendTestBirthdayMessage' }),
  getCampaignStatus: (req, res) => res.json({ success: true, route: 'getCampaignStatus' }),
  stopCampaign: (req, res) => res.json({ success: true, route: 'stopCampaign' }),
  getCampaignHistory: (req, res) => res.json({ success: true, route: 'getCampaignHistory' }),
  getProductAutoSendSettings: (req, res) => res.json({ success: true, route: 'getProductAutoSendSettings' }),
  saveProductAutoSendSettings: (req, res) => res.json({ success: true, route: 'saveProductAutoSendSettings' }),
  scheduleOccasionCampaign: (req, res) => res.json({ success: true, route: 'scheduleOccasionCampaign' }),
  getScheduledOccasionCampaigns: (req, res) => res.json({ success: true, route: 'getScheduledOccasionCampaigns' }),
  sendBulkWhatsAppNotification: (req, res) => res.json({ success: true, route: 'sendBulkWhatsAppNotification' }),
  getCustomerMessageTimeline: (req, res) => res.json({ success: true, route: 'getCustomerMessageTimeline' }),
}));

jest.mock('../../controller/occasionController', () => ({
  listOccasions: (req, res) => res.json({ success: true, route: 'listOccasions' }),
  createOccasion: (req, res) => res.json({ success: true, route: 'createOccasion' }),
  updateOccasion: (req, res) => res.json({ success: true, route: 'updateOccasion' }),
  deleteOccasion: (req, res) => res.json({ success: true, route: 'deleteOccasion' }),
  publishOccasion: (req, res) => res.json({ success: true, route: 'publishOccasion' }),
}));

const customerRoutes = require('../../routes/customerRoutes');

describe('CRM App Gate on customerRoutes (Category A vs B)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/customers', customerRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-1',
      role: 'COMPANY_ADMIN',
      companyId: 'comp-1',
    };
  });

  describe('Scenario 1: Company WITHOUT crm-basic installed', () => {
    beforeEach(() => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        installedApps: [],
      });
      mockPrisma.marketplaceApp.findMany.mockResolvedValue([
        { id: 'app-crm-basic', slug: 'crm-basic', name: 'CRM الأساسي' },
      ]);
      mockPrisma.companyApp.findUnique.mockResolvedValue(null);
    });

    test('Category (A) GET / returns 403 with needsActivation', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.needsActivation).toBe(true);
      expect(res.body.message).toContain('هذه الميزة تتطلب تفعيل');
    });

    test('Category (A) POST / returns 403', async () => {
      const res = await request(app).post('/api/v1/customers').send({ name: 'Ali' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Category (A) GET /search returns 403', async () => {
      const res = await request(app).get('/api/v1/customers/search?q=test');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Category (A) GET /export returns 403', async () => {
      const res = await request(app).get('/api/v1/customers/export');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Category (A) GET /:customerId returns 403', async () => {
      const res = await request(app).get('/api/v1/customers/cust-123');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Category (A) PUT /:customerId returns 403', async () => {
      const res = await request(app).put('/api/v1/customers/cust-123').send({ name: 'New' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Category (A) DELETE /:customerId returns 403', async () => {
      const res = await request(app).delete('/api/v1/customers/cust-123');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // Category (B) must NOT be blocked!
    test('Category (B) GET /ping works without crm-basic', async () => {
      const res = await request(app).get('/api/v1/customers/ping');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    test('Category (B) GET /by-phone/:phone works without crm-basic', async () => {
      const res = await request(app).get('/api/v1/customers/by-phone/01012345678');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getCustomerLookupByPhone');
    });

    test('Category (B) GET /:customerId/orders works without crm-basic (used by Inbox/Orders)', async () => {
      const res = await request(app).get('/api/v1/customers/cust-123/orders');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getCustomerOrders');
    });

    test('Category (B) GET /:customerId/notes works without crm-basic (used by Inbox notes)', async () => {
      const res = await request(app).get('/api/v1/customers/cust-123/notes');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getCustomerNotes');
    });

    test('Category (B) WhatsApp sessions endpoint works without crm-basic', async () => {
      const res = await request(app).get('/api/v1/customers/whatsapp-notify/sessions');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getConnectedWhatsAppSessions');
    });

    test('Category (B) POST /block works without crm-basic (used by Inbox)', async () => {
      const res = await request(app).post('/api/v1/customers/block').send({ customerId: 'c1', pageId: 'p1' });
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('blockCustomerOnPage');
    });
  });

  describe('Scenario 2: Company WITH crm-basic installed', () => {
    beforeEach(() => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        installedApps: [
          {
            id: 'ca-1',
            status: 'ACTIVE',
            app: {
              id: 'app-crm-basic',
              slug: 'crm-basic',
              name: 'CRM الأساسي',
            },
          },
        ],
      });
      mockPrisma.marketplaceApp.findMany.mockResolvedValue([
        { id: 'app-crm-basic', slug: 'crm-basic', name: 'CRM الأساسي' },
      ]);
      mockPrisma.companyApp.findUnique.mockResolvedValue({
        id: 'ca-1',
        status: 'ACTIVE',
      });
    });

    test('Category (A) GET / returns 200 with CRM installed', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getAllCustomer');
    });

    test('Category (A) POST / returns 200 with CRM installed', async () => {
      const res = await request(app).post('/api/v1/customers').send({ name: 'Ali' });
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('createCustomer');
    });

    test('Category (A) GET /:customerId returns 200 with CRM installed', async () => {
      const res = await request(app).get('/api/v1/customers/cust-123');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getCustomerDetails');
    });
  });

  describe('Scenario 3: SUPER_ADMIN bypass', () => {
    beforeEach(() => {
      mockUser = {
        id: 'super-admin-user',
        role: 'SUPER_ADMIN',
        companyId: null,
      };
      mockPrisma.company.findUnique.mockResolvedValue(null);
    });

    test('SUPER_ADMIN accesses Category (A) GET / without crm-basic (returns 200)', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.status).toBe(200);
      expect(res.body.route).toBe('getAllCustomer');
    });
  });
});
