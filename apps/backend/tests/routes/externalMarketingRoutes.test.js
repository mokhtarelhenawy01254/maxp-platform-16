const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const {
  generateTaskApiKey,
  generateExternalApiKey,
  hashTaskApiKey,
  MARKETING_API_SCOPES
} = require('../../services/taskIntegrationService');

const companyId1 = 'comp-marketing-1';
const companyId2 = 'comp-marketing-2';

// In-memory data store for testing
const credentialsStore = [];
const auditLogsStore = [];

const ordersStore = [
  {
    id: 'ord-1',
    companyId: companyId1,
    customerId: 'cust-1',
    orderNumber: 'ORD-1001',
    status: 'DELIVERED',
    total: 500,
    sourceType: 'ai_conversation',
    orderSource: 'REGULAR',
    customerName: 'Secret John',
    customerPhone: '01012345678',
    customerEmail: 'secret@example.com',
    shippingAddress: '123 Secret St',
    createdAt: new Date('2026-09-01T10:00:00.000Z')
  },
  {
    id: 'ord-2',
    companyId: companyId1,
    customerId: 'cust-1', // returning customer
    orderNumber: 'ORD-1002',
    status: 'CONFIRMED',
    total: 300,
    sourceType: 'storefront',
    orderSource: 'REGULAR',
    customerName: 'Secret John',
    customerPhone: '01012345678',
    customerEmail: 'secret@example.com',
    shippingAddress: '123 Secret St',
    createdAt: new Date('2026-09-15T12:00:00.000Z')
  },
  {
    id: 'ord-3',
    companyId: companyId1,
    customerId: 'cust-2', // new customer
    orderNumber: 'ORD-1003',
    status: 'PENDING',
    total: 200,
    sourceType: 'pos',
    orderSource: 'POS',
    customerName: 'Secret Sarah',
    customerPhone: '01198765432',
    customerEmail: 'sarah@example.com',
    shippingAddress: '456 Secret Ave',
    createdAt: new Date('2026-09-20T14:00:00.000Z')
  }
];

const orderItemsStore = [
  {
    id: 'item-1',
    orderId: 'ord-1',
    productId: 'prod-1',
    productName: 'MaxP Smart Watch',
    productSku: 'WATCH-01',
    quantity: 2,
    price: 200,
    total: 400,
    order: ordersStore[0]
  },
  {
    id: 'item-2',
    orderId: 'ord-2',
    productId: 'prod-1',
    productName: 'MaxP Smart Watch',
    productSku: 'WATCH-01',
    quantity: 1,
    price: 200,
    total: 200,
    order: ordersStore[1]
  },
  {
    id: 'item-3',
    orderId: 'ord-3',
    productId: 'prod-2',
    productName: 'Wireless Earbuds',
    productSku: 'EARBUD-01',
    quantity: 1,
    price: 200,
    total: 200,
    order: ordersStore[2]
  }
];

const customersStore = [
  {
    id: 'cust-1',
    companyId: companyId1,
    firstName: 'John',
    lastName: 'Doe',
    phone: '01012345678',
    email: 'john@example.com',
    status: 'LEAD',
    customerRating: 'VIP',
    facebookId: 'fb-123',
    instagramId: null,
    whatsappId: '01012345678',
    telegramId: null,
    tiktokId: null,
    totalOrdersCount: 2,
    createdAt: new Date('2026-09-01T10:00:00.000Z')
  },
  {
    id: 'cust-2',
    companyId: companyId1,
    firstName: 'Sarah',
    lastName: 'Smith',
    phone: '01198765432',
    email: 'sarah@example.com',
    status: 'LEAD',
    customerRating: 'GOOD',
    facebookId: null,
    instagramId: 'insta-456',
    whatsappId: null,
    telegramId: null,
    tiktokId: null,
    totalOrdersCount: 1,
    createdAt: new Date('2026-09-15T12:00:00.000Z')
  }
];

const subscriptionsStore = [
  {
    id: 'sub-1',
    companyId: companyId1,
    plan: 'PRO',
    status: 'ACTIVE',
    monthlyFee: 1500,
    nextBillingDate: new Date('2026-10-15T00:00:00.000Z'),
    trialEndDate: null,
    lastBillingDate: new Date('2026-09-15T00:00:00.000Z')
  },
  {
    id: 'sub-2',
    companyId: companyId2,
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    monthlyFee: 3000,
    nextBillingDate: new Date('2026-10-20T00:00:00.000Z'),
    trialEndDate: null,
    lastBillingDate: new Date('2026-09-20T00:00:00.000Z')
  }
];

const landingPagesStore = [
  {
    id: 'landing-1',
    companyId: companyId1,
    slug: 'smart-watch-offer',
    title: 'Smart Watch Flash Sale',
    status: 'PUBLISHED',
    visits: 1000,
    orders: 50,
    publishedAt: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z')
  }
];

const mockPrisma = {
  taskApiCredential: {
    findFirst: async ({ where }) => {
      return credentialsStore.find((c) => {
        if (where.keyPrefix && c.keyPrefix !== where.keyPrefix) return false;
        if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
        if (where.revokedAt === null && c.revokedAt !== null) return false;
        return true;
      }) || null;
    },
    findUnique: async ({ where }) => {
      return credentialsStore.find((c) => c.id === where.id) || null;
    },
    findMany: async ({ where = {} }) => {
      return credentialsStore.filter((c) => {
        if (where.companyId && c.companyId !== where.companyId) return false;
        if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
        return true;
      });
    },
    create: async ({ data }) => {
      const record = {
        id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      credentialsStore.push(record);
      return record;
    },
    update: async ({ where, data }) => {
      const idx = credentialsStore.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error('Credential not found');
      credentialsStore[idx] = { ...credentialsStore[idx], ...data, updatedAt: new Date() };
      return credentialsStore[idx];
    }
  },
  externalApiAuditLog: {
    create: async ({ data }) => {
      const log = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...data,
        createdAt: new Date()
      };
      auditLogsStore.push(log);
      return log;
    },
    findMany: async ({ where = {}, take = 50, skip = 0 }) => {
      let filtered = auditLogsStore;
      if (where.credentialId) {
        filtered = filtered.filter((l) => l.credentialId === where.credentialId);
      }
      if (where.statusCode) {
        filtered = filtered.filter((l) => l.statusCode === where.statusCode);
      }
      return filtered.slice(skip, skip + take);
    },
    count: async ({ where = {} }) => {
      let filtered = auditLogsStore;
      if (where.credentialId) {
        filtered = filtered.filter((l) => l.credentialId === where.credentialId);
      }
      return filtered.length;
    }
  },
  order: {
    findMany: async ({ where = {} }) => {
      return ordersStore.filter((o) => {
        if (where.companyId && o.companyId !== where.companyId) return false;
        return true;
      });
    }
  },
  orderItem: {
    findMany: async ({ where = {} }) => {
      return orderItemsStore.filter((item) => {
        if (where.order?.companyId && item.order.companyId !== where.order.companyId) return false;
        return true;
      });
    }
  },
  customer: {
    findMany: async ({ where = {} }) => {
      return customersStore.filter((c) => {
        if (where.companyId && c.companyId !== where.companyId) return false;
        return true;
      });
    }
  },
  platformSubscription: {
    findMany: async ({ where = {} }) => {
      return subscriptionsStore.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        return true;
      });
    }
  },
  productLandingPage: {
    findMany: async ({ where = {} }) => {
      return landingPagesStore.filter((p) => {
        if (where.companyId && p.companyId !== where.companyId) return false;
        return true;
      });
    }
  },
  facebookCampaign: {
    findMany: async () => []
  },
  company: {
    findUnique: async ({ where }) => {
      if (where.id === companyId1) return { id: companyId1, name: 'Brand Alpha' };
      if (where.id === companyId2) return { id: companyId2, name: 'Brand Beta' };
      return null;
    },
    findMany: async () => [
      { id: companyId1, name: 'Brand Alpha', slug: 'brand-alpha' },
      { id: companyId2, name: 'Brand Beta', slug: 'brand-beta' }
    ]
  },
  user: {
    findFirst: async () => ({ id: 'usr-1', isActive: true })
  },
  task: {
    findMany: async () => [],
    count: async () => 0
  }
};

// Wire mock Prisma into sharedDatabase
const sharedDatabase = require('../../services/sharedDatabase');
sharedDatabase.getSharedPrismaClient = () => mockPrisma;

// Build test express application
const app = express();
app.use(express.json());

const externalMarketingRoutes = require('../../routes/externalMarketingRoutes');
const taskExternalRoutes = require('../../routes/taskExternalRoutes');
const superAdminExternalApiController = require('../../controller/superAdminExternalApiController');

// Mount routes identically to server.js
app.use('/api/v1/external/tasks', taskExternalRoutes);
app.use('/api/v1/external', externalMarketingRoutes);

// Mount superadmin test mock
app.get('/api/v1/super-admin/external-api/credentials', superAdminExternalApiController.listCredentials);
app.post('/api/v1/super-admin/external-api/credentials', superAdminExternalApiController.createCredential);
app.delete('/api/v1/super-admin/external-api/credentials/:credentialId', superAdminExternalApiController.revokeCredential);
app.get('/api/v1/super-admin/external-api/audit-logs', superAdminExternalApiController.listAuditLogs);

// Setup test keys
const keyAnalyticsOnly = generateExternalApiKey();
const keyWildcard = generateExternalApiKey();
const keyExpired = generateExternalApiKey();
const keyRevoked = generateExternalApiKey();
const keyLegacyTasks = generateTaskApiKey('tsk');
const keyIpRestricted = generateExternalApiKey();

// Helper to seed credentials
const initCredentials = () => {
  credentialsStore.length = 0;
  auditLogsStore.length = 0;

  // 1. Analytics-only key
  credentialsStore.push({
    id: 'cred-analytics-1',
    companyId: companyId1,
    name: 'Analytics Agent Key',
    keyPrefix: keyAnalyticsOnly.keyPrefix,
    keyHash: hashTaskApiKey(keyAnalyticsOnly.rawKey),
    scopes: JSON.stringify(['analytics:read']),
    isActive: true,
    expiresAt: new Date('2028-01-01'),
    revokedAt: null,
    allowedIps: [],
    requestCount: 0
  });

  // 2. Wildcard key (*)
  credentialsStore.push({
    id: 'cred-wildcard-1',
    companyId: null, // Platform level
    name: 'Master AI Agent Key',
    keyPrefix: keyWildcard.keyPrefix,
    keyHash: hashTaskApiKey(keyWildcard.rawKey),
    scopes: JSON.stringify(['*']),
    isActive: true,
    expiresAt: new Date('2028-01-01'),
    revokedAt: null,
    allowedIps: [],
    requestCount: 0
  });

  // 3. Expired key
  credentialsStore.push({
    id: 'cred-expired-1',
    companyId: companyId1,
    name: 'Expired Key',
    keyPrefix: keyExpired.keyPrefix,
    keyHash: hashTaskApiKey(keyExpired.rawKey),
    scopes: JSON.stringify(['analytics:read', 'orders:read']),
    isActive: true,
    expiresAt: new Date('2020-01-01'), // past
    revokedAt: null,
    allowedIps: [],
    requestCount: 0
  });

  // 4. Revoked key
  credentialsStore.push({
    id: 'cred-revoked-1',
    companyId: companyId1,
    name: 'Revoked Key',
    keyPrefix: keyRevoked.keyPrefix,
    keyHash: hashTaskApiKey(keyRevoked.rawKey),
    scopes: JSON.stringify(['analytics:read']),
    isActive: false,
    expiresAt: new Date('2028-01-01'),
    revokedAt: new Date('2026-09-01'),
    revokedReason: 'Compromised',
    allowedIps: [],
    requestCount: 0
  });

  // 5. Legacy tasks key (tsk_ prefix)
  credentialsStore.push({
    id: 'cred-legacy-tasks',
    companyId: companyId1,
    name: 'Legacy Tasks Worker',
    keyPrefix: keyLegacyTasks.keyPrefix,
    keyHash: hashTaskApiKey(keyLegacyTasks.rawKey),
    scopes: JSON.stringify(['tasks:read', 'tasks:write']),
    isActive: true,
    expiresAt: new Date('2028-01-01'),
    revokedAt: null,
    allowedIps: [],
    requestCount: 0
  });

  // 6. IP restricted key (allowed: 192.168.1.50)
  credentialsStore.push({
    id: 'cred-ip-restricted',
    companyId: companyId1,
    name: 'IP Restricted Key',
    keyPrefix: keyIpRestricted.keyPrefix,
    keyHash: hashTaskApiKey(keyIpRestricted.rawKey),
    scopes: JSON.stringify(['analytics:read']),
    isActive: true,
    expiresAt: new Date('2028-01-01'),
    revokedAt: null,
    allowedIps: ['192.168.1.50'],
    requestCount: 0
  });
};

// Helper: recursively find any forbidden PII keys in response data
const FORBIDDEN_PII_KEYS = new Set([
  'phone',
  'email',
  'customerphone',
  'customeremail',
  'customername',
  'shippingaddress',
  'billingaddress',
  'customeraddress',
  'firstname',
  'lastname',
  'address'
]);

const assertNoPii = (obj, path = '') => {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    assert.strictEqual(
      FORBIDDEN_PII_KEYS.has(lowerKey),
      false,
      `Forbidden PII field "${key}" detected at path "${path}.${key}" in external API response!`
    );
    if (value && typeof value === 'object') {
      assertNoPii(value, `${path}.${key}`);
    }
  }
};

// ==========================================
// 8 MANDATORY ACCEPTANCE CRITERIA TESTS
// ==========================================

test('Criterion 1: Key with analytics:read returns 200 on /analytics/summary and 403 on products endpoint', async () => {
  initCredentials();

  // A. Access allowed endpoint (analytics:read) -> 200
  const summaryRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', keyAnalyticsOnly.rawKey);

  assert.strictEqual(summaryRes.statusCode, 200);
  assert.strictEqual(summaryRes.body.success, true);
  assert.strictEqual(summaryRes.body.data.totalOrders, 3);
  assert.strictEqual(summaryRes.body.data.totalRevenue, 1000);
  assert.strictEqual(summaryRes.body.data.newCustomers, 1);
  assert.strictEqual(summaryRes.body.data.returningCustomers, 1);

  // B. Access endpoint without required scope (products:read) -> 403
  const productsRes = await request(app)
    .get('/api/v1/external/products/top')
    .set('X-API-Key', keyAnalyticsOnly.rawKey);

  assert.strictEqual(productsRes.statusCode, 403);
  assert.strictEqual(productsRes.body.success, false);
  assert.match(productsRes.body.message, /products:read/);
});

test('Criterion 2: Wildcard key (*) can access all external endpoints and produces audit logs', async () => {
  initCredentials();

  const endpoints = [
    '/api/v1/external/analytics/summary',
    '/api/v1/external/analytics/orders-by-source',
    '/api/v1/external/products/top',
    '/api/v1/external/subscriptions/summary',
    '/api/v1/external/landing-pages/stats',
    '/api/v1/external/leads/summary',
    '/api/v1/external/ads/summary'
  ];

  for (const ep of endpoints) {
    const res = await request(app)
      .get(ep)
      .set('X-API-Key', keyWildcard.rawKey);

    assert.strictEqual(res.statusCode, 200, `Endpoint ${ep} must return 200 for wildcard key`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data, `Endpoint ${ep} must return data object`);
    assert.ok(res.body.meta, `Endpoint ${ep} must return meta object`);
  }

  // Allow async on('finish') handlers to write audit logs
  await new Promise((r) => setTimeout(r, 100));

  // Verify audit logs were captured
  assert.ok(auditLogsStore.length >= endpoints.length, 'Audit logs must be written for each request');
  const wildcardLogs = auditLogsStore.filter((l) => l.credentialId === 'cred-wildcard-1');
  assert.ok(wildcardLogs.length >= endpoints.length, 'Wildcard key requests must appear in audit logs');
  assert.strictEqual(wildcardLogs[0].statusCode, 200);
});

test('Criterion 3: Expired or Revoked keys return 401 immediately', async () => {
  initCredentials();

  // A. Expired Key -> 401
  const expiredRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', keyExpired.rawKey);

  assert.strictEqual(expiredRes.statusCode, 401);
  assert.strictEqual(expiredRes.body.success, false);
  assert.match(expiredRes.body.message, /expired/i);

  // B. Revoked Key -> 401
  const revokedRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', keyRevoked.rawKey);

  assert.strictEqual(revokedRes.statusCode, 401);
  assert.strictEqual(revokedRes.body.success, false);
  assert.match(revokedRes.body.message, /revoked/i);

  // C. Missing key -> 401
  const missingRes = await request(app)
    .get('/api/v1/external/analytics/summary');

  assert.strictEqual(missingRes.statusCode, 401);
  assert.strictEqual(missingRes.body.success, false);

  // D. Invalid format key -> 401
  const invalidFormatRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', 'invalid_single_string');

  assert.strictEqual(invalidFormatRes.statusCode, 401);
  assert.strictEqual(invalidFormatRes.body.success, false);
});

test('Criterion 4: Absolute PII Prohibition — No customer personal fields exist in any external responses', async () => {
  initCredentials();

  const endpoints = [
    '/api/v1/external/analytics/summary',
    '/api/v1/external/analytics/orders-by-source',
    '/api/v1/external/products/top',
    '/api/v1/external/subscriptions/summary',
    '/api/v1/external/landing-pages/stats',
    '/api/v1/external/leads/summary',
    '/api/v1/external/ads/summary',
    '/api/v1/external/docs'
  ];

  for (const ep of endpoints) {
    const res = await request(app)
      .get(ep)
      .set('X-API-Key', keyWildcard.rawKey);

    assert.strictEqual(res.statusCode, 200);
    // Deep recursive check across entire JSON response
    assertNoPii(res.body, ep);
  }
});

test('Criterion 5: Legacy scopes tasks:read/write still work seamlessly on existing tsk_ keys', async () => {
  initCredentials();

  // Test tasks:read scope with legacy tsk_ key on taskExternalRoutes
  const legacyRes = await request(app)
    .get('/api/v1/external/tasks')
    .set('X-API-Key', keyLegacyTasks.rawKey);

  // Status is 200 or clean valid response, not 401/403
  assert.ok([200, 304].includes(legacyRes.statusCode), 'Legacy tasks route must authenticate tsk_ keys without error');
});

test('Criterion 6: Super Admin management works: Create, Reveal Once, List, Revoke, and View Audit Logs', async () => {
  initCredentials();

  // A. Create new credential
  const createRes = await request(app)
    .post('/api/v1/super-admin/external-api/credentials')
    .send({
      name: 'Automated Bot Alpha',
      label: 'Production Campaign Bot',
      scopes: ['analytics:read', 'orders:read', 'products:read'],
      expiresAt: '2028-12-31T23:59:59.000Z',
      allowedIps: ['127.0.0.1', '192.168.1.100']
    });

  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.success, true);
  assert.ok(createRes.body.secret.apiKey, 'Must return the raw generated API key in secret object');
  assert.match(createRes.body.secret.apiKey, /^ext_[a-f0-9]+_[a-f0-9]+$/);
  assert.match(createRes.body.secret.warning, /لن يتم عرضه مرة أخرى/);

  const newKey = createRes.body.secret.apiKey;
  const credentialId = createRes.body.data.id;

  // B. Verify the newly created key can authenticate immediately
  const testCallRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', newKey);

  assert.strictEqual(testCallRes.statusCode, 200);

  // C. List credentials in Super Admin
  const listRes = await request(app)
    .get('/api/v1/super-admin/external-api/credentials');

  assert.strictEqual(listRes.statusCode, 200);
  assert.strictEqual(listRes.body.success, true);
  const found = listRes.body.data.find((c) => c.id === credentialId);
  assert.ok(found, 'Created credential must appear in Super Admin list');
  assert.strictEqual(found.status, 'ACTIVE');
  assert.strictEqual(found.name, 'Automated Bot Alpha');

  // D. Immediate Revocation (Kill Switch)
  const revokeRes = await request(app)
    .delete(`/api/v1/super-admin/external-api/credentials/${credentialId}`)
    .send({ reason: 'Emergency security test kill' });

  assert.strictEqual(revokeRes.statusCode, 200);
  assert.strictEqual(revokeRes.body.success, true);

  // E. Subsequent request with revoked key MUST fail immediately with 401
  const afterRevokeRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', newKey);

  assert.strictEqual(afterRevokeRes.statusCode, 401);
  assert.match(afterRevokeRes.body.message, /revoked/i);

  // F. View audit logs
  await new Promise((r) => setTimeout(r, 100));
  const logsRes = await request(app)
    .get('/api/v1/super-admin/external-api/audit-logs');

  assert.strictEqual(logsRes.statusCode, 200);
  assert.strictEqual(logsRes.body.success, true);
  assert.ok(Array.isArray(logsRes.body.data.logs));
  assert.ok(logsRes.body.data.logs.length > 0);
});

test('Criterion 7: GET /external/docs returns comprehensive documentation matching reality', async () => {
  const docsRes = await request(app)
    .get('/api/v1/external/docs');

  assert.strictEqual(docsRes.statusCode, 200);
  assert.strictEqual(docsRes.body.success, true);
  assert.ok(docsRes.body.data.scopes.available.includes('analytics:read'));
  assert.ok(docsRes.body.data.scopes.available.includes('*'));
  assert.ok(docsRes.body.data.scopes.available.includes('platform:read'));

  // Ensure all endpoints are listed
  const paths = docsRes.body.data.endpoints.map((e) => e.path);
  assert.ok(paths.includes('/api/v1/external/analytics/summary'));
  assert.ok(paths.includes('/api/v1/external/analytics/orders-by-source'));
  assert.ok(paths.includes('/api/v1/external/products/top'));
  assert.ok(paths.includes('/api/v1/external/subscriptions/summary'));
  assert.ok(paths.includes('/api/v1/external/landing-pages/stats'));
  assert.ok(paths.includes('/api/v1/external/leads/summary'));
  assert.ok(paths.includes('/api/v1/external/ads/summary'));
  assert.ok(paths.includes('/api/v1/external/docs'));

  // Check curl example exists
  assert.ok(docsRes.body.data.endpoints[0].example.includes('curl'));
});

test('Criterion 8: Security Safeguards — IP Allowlist and Rate Limit headers', async () => {
  initCredentials();

  // A. IP Allowlist rejection when request comes from non-allowed IP
  const blockedIpRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', keyIpRestricted.rawKey)
    .set('X-Forwarded-For', '203.0.113.195');

  assert.strictEqual(blockedIpRes.statusCode, 403);
  assert.strictEqual(blockedIpRes.body.success, false);
  assert.match(blockedIpRes.body.message, /not authorized/i);

  // B. IP Allowlist accepted when request matches allowed IP
  const allowedIpRes = await request(app)
    .get('/api/v1/external/analytics/summary')
    .set('X-API-Key', keyIpRestricted.rawKey)
    .set('X-Forwarded-For', '192.168.1.50');

  assert.strictEqual(allowedIpRes.statusCode, 200);
  assert.strictEqual(allowedIpRes.body.success, true);

  // C. Rate limit headers verification
  assert.ok(allowedIpRes.headers['x-ratelimit-limit']);
  assert.ok(allowedIpRes.headers['x-ratelimit-remaining']);
  assert.ok(allowedIpRes.headers['x-ratelimit-reset']);
  assert.strictEqual(allowedIpRes.headers['x-ratelimit-limit'], '60');
});
