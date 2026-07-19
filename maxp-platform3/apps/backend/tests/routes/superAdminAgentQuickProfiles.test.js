const express = require('express');
const request = require('supertest');

const mockPrisma = {
  systemSettings: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock('../../middleware/superAdminMiddleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'admin_1', role: 'SUPER_ADMIN' };
    next();
  },
  requireSuperAdmin: (req, _res, next) => next(),
  checkPermission: () => (req, _res, next) => next(),
  preventPrivilegeEscalation: () => (req, _res, next) => next(),
}));

jest.mock('../../middleware/companyMiddleware', () => ({
  addPublicCORS: (req, _res, next) => next(),
}));

jest.mock('../../middleware/performanceOptimization', () => ({
  cacheMiddleware: () => (req, _res, next) => next(),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  safeQuery: (fn) => fn(),
}));

const superAdminRoutes = require('../../routes/superAdminRoutes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/super-admin', superAdminRoutes);
  return app;
};

const SAMPLE_PROFILES = [
  {
    slug: 'sales-agent',
    icon: '🤖',
    title: 'وكيل مبيعات',
    titleEn: 'Sales Agent',
    category: 'مبيعات',
    categoryEn: 'Sales',
    desc: 'وكيل متخصص في المبيعات',
    descEn: 'Specialized in sales',
    sortOrder: 0,
    isActive: true,
    personalities: [{ name: 'مساعد', tone: 'ودود', desc: 'يساعد في المبيعات', persona: '', goal: '' }],
  },
  {
    slug: 'support-agent',
    icon: '🎧',
    title: 'وكيل دعم',
    titleEn: 'Support Agent',
    category: 'دعم',
    categoryEn: 'Support',
    desc: 'وكيل متخصص في الدعم الفني',
    descEn: 'Specialized in support',
    sortOrder: 1,
    isActive: true,
    personalities: [{ name: 'دعم فني', tone: 'محترف', desc: '', persona: '', goal: '' }],
  },
];

describe('Super Admin — Agent Quick Profiles CRUD', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  function mockProfiles(profiles) {
    mockPrisma.systemSettings.findFirst.mockResolvedValue(
      profiles
        ? { config: JSON.stringify({ profiles }) }
        : null
    );
  }

  describe('GET /api/v1/super-admin/agents/quick-profiles', () => {
    test('returns empty array when no settings exist', async () => {
      mockProfiles(null);
      const res = await request(app).get('/api/v1/super-admin/agents/quick-profiles');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profiles).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    test('returns stored profiles', async () => {
      mockProfiles(SAMPLE_PROFILES);
      const res = await request(app).get('/api/v1/super-admin/agents/quick-profiles');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profiles).toHaveLength(2);
      expect(res.body.profiles[0].slug).toBe('sales-agent');
    });
  });

  describe('POST /api/v1/super-admin/agents/quick-profiles', () => {
    test('creates a new profile', async () => {
      mockProfiles([]);
      mockPrisma.systemSettings.upsert.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/super-admin/agents/quick-profiles')
        .send({
          slug: 'marketing-agent',
          icon: '📢',
          title: 'وكيل تسويق',
          titleEn: 'Marketing Agent',
          category: 'تسويق',
          categoryEn: 'Marketing',
          desc: 'وكيل متخصص في التسويق',
          descEn: 'Specialized in marketing',
          personalities: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.profiles).toHaveLength(1);
      expect(res.body.profiles[0].slug).toBe('marketing-agent');
      expect(res.body.profiles[0].sortOrder).toBe(1);
      expect(res.body.profiles[0].isActive).toBe(true);
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalled();
    });

    test('rejects missing slug', async () => {
      const res = await request(app)
        .post('/api/v1/super-admin/agents/quick-profiles')
        .send({ title: 'No Slug' });
      expect(res.status).toBe(400);
    });

    test('rejects missing title', async () => {
      const res = await request(app)
        .post('/api/v1/super-admin/agents/quick-profiles')
        .send({ slug: 'no-title' });
      expect(res.status).toBe(400);
    });

    test('rejects duplicate slug', async () => {
      mockProfiles(SAMPLE_PROFILES);
      const res = await request(app)
        .post('/api/v1/super-admin/agents/quick-profiles')
        .send({ slug: 'sales-agent', title: 'Duplicate' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/v1/super-admin/agents/quick-profiles/:slug', () => {
    test('updates an existing profile', async () => {
      mockProfiles(SAMPLE_PROFILES);
      mockPrisma.systemSettings.upsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/v1/super-admin/agents/quick-profiles/sales-agent')
        .send({ title: 'وكيل مبيعات متطور', isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const updated = res.body.profiles.find((p) => p.slug === 'sales-agent');
      expect(updated.title).toBe('وكيل مبيعات متطور');
      expect(updated.isActive).toBe(false);
    });

    test('returns 404 for non-existent slug', async () => {
      mockProfiles(SAMPLE_PROFILES);
      const res = await request(app)
        .put('/api/v1/super-admin/agents/quick-profiles/non-existent')
        .send({ title: 'Nothing' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/super-admin/agents/quick-profiles/:slug', () => {
    test('deletes an existing profile', async () => {
      mockProfiles(SAMPLE_PROFILES);
      mockPrisma.systemSettings.upsert.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/v1/super-admin/agents/quick-profiles/support-agent');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profiles).toHaveLength(1);
      expect(res.body.profiles[0].slug).toBe('sales-agent');
    });

    test('returns 404 for non-existent slug', async () => {
      mockProfiles(SAMPLE_PROFILES);
      const res = await request(app)
        .delete('/api/v1/super-admin/agents/quick-profiles/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/super-admin/agents/quick-profiles/reorder', () => {
    test('reorders profiles by slugs array', async () => {
      mockProfiles([...SAMPLE_PROFILES]);
      mockPrisma.systemSettings.upsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/v1/super-admin/agents/quick-profiles/reorder')
        .send({ slugs: ['support-agent', 'sales-agent'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profiles[0].slug).toBe('support-agent');
      expect(res.body.profiles[0].sortOrder).toBe(0);
      expect(res.body.profiles[1].slug).toBe('sales-agent');
      expect(res.body.profiles[1].sortOrder).toBe(1);
    });

    test('rejects non-array slugs', async () => {
      const res = await request(app)
        .put('/api/v1/super-admin/agents/quick-profiles/reorder')
        .send({ slugs: 'not-an-array' });
      expect(res.status).toBe(400);
    });
  });
});
