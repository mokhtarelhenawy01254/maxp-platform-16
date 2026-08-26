const express = require('express');
const supertest = require('supertest');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  getSharedPrismaClientAsync: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
}));

const { getSharedPrismaClient, getSharedPrismaClientAsync } = require('../../services/sharedDatabase');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../../middleware/subdomainMiddleware');

const buildApp = () => {
  const app = express();
  app.get(
    '/api/v1/public/test',
    extractSubdomainMiddleware,
    requireCompany,
    (_req, res) => res.json({ success: true }),
  );
  return { app };
};

describe('extractSubdomainMiddleware — bare slug headers', () => {
  const company = {
    id: 'company-1',
    name: 'ملابس كاجوال',
    slug: 'mlabs-kajwal',
    email: null,
    logo: null,
    currency: 'EGP',
    settings: null,
    isActive: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    const prismaStub = {
      company: {
        findUnique: jest.fn().mockResolvedValue(company),
      },
    };
    getSharedPrismaClient.mockReturnValue(prismaStub);
    getSharedPrismaClientAsync.mockResolvedValue(prismaStub);
  });

  test('resolves the company from a bare X-Subdomain slug (no dots)', async () => {
    const { app } = buildApp();

    const res = await supertest(app)
      .get('/api/v1/public/test')
      .set('x-subdomain', 'mlabs-kajwal')
      .set('host', 'mlabs-kajwal.maxp.online');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('resolves the company from X-Company-Slug when X-Subdomain is unresolvable', async () => {
    const { app } = buildApp();

    const res = await supertest(app)
      .get('/api/v1/public/test')
      .set('host', 'mlabs-kajwal.maxp.online')
      .set('x-company-slug', 'mlabs-kajwal');

    expect(res.status).toBe(200);
  });

  test('returns 400 from requireCompany when no company can be resolved', async () => {
    const nullPrismaStub = {
      company: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    getSharedPrismaClient.mockReturnValue(nullPrismaStub);
    getSharedPrismaClientAsync.mockResolvedValue(nullPrismaStub);

    const { app } = buildApp();

    const res = await supertest(app)
      .get('/api/v1/public/test')
      .set('x-subdomain', 'unknown-store')
      .set('host', 'unknown-store.maxp.online');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
