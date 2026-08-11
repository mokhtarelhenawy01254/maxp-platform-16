const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Easy Warehouse + Bulk Status Routes', () => {
  let app;
  let prisma;
  let company;
  let adminUser;
  let token;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();

    app = express();
    app.use(express.json());

    const easyWarehouseRoutes = require('../../routes/easyWarehouseRoutes');
    const bulkStatusUpdateRoutes = require('../../routes/bulkStatusUpdateRoutes');
    app.use('/api/v1/easy-warehouse', easyWarehouseRoutes);
    app.use('/api/v1/orders/bulk-status', bulkStatusUpdateRoutes);

    const unique = Date.now();

    company = await prisma.company.create({
      data: {
        id: `test-company-easywh-${unique}`,
        name: 'Test Easy WH',
        email: `easywh-company-${unique}@test.local`,
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Asia/Riyadh',
        updatedAt: new Date()
      }
    });

    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    adminUser = await prisma.user.create({
      data: {
        id: `test-user-easywh-admin-${unique}`,
        email: `easywh-admin-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Easy',
        lastName: 'Admin',
        role: 'MANAGER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true,
        availability: 'available',
        timezone: 'Asia/Riyadh'
      }
    });

    await prisma.userCompany.create({
      data: {
        userId: adminUser.id,
        companyId: company.id,
        role: 'MANAGER',
        isActive: true,
        isDefault: true
      }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'maxp-super-secret-jwt-key-2026';
    process.env.JWT_SECRET = JWT_SECRET;

    token = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        companyId: company.id
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    try {
      if (adminUser) {
        await prisma.userCompany.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }
      if (company) {
        await prisma.product.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.storefrontSettings.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('PUT /easy-warehouse/settings persists toggle', async () => {
    const res = await request(app)
      .put('/api/v1/easy-warehouse/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ easyWarehouseMode: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.easyWarehouseMode).toBe(true);
  });

  test('GET /easy-warehouse/settings returns saved toggle', async () => {
    const res = await request(app)
      .get('/api/v1/easy-warehouse/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.easyWarehouseMode).toBe(true);
  });

  test('POST /easy-warehouse/ensure-products creates a missing product', async () => {
    const res = await request(app)
      .post('/api/v1/easy-warehouse/ensure-products')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productName: 'Auto Created Product', price: 120, sku: 'AUTO-1' }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created.length).toBe(1);
    expect(res.body.data.created[0].productName).toBe('Auto Created Product');

    const product = await prisma.product.findFirst({
      where: { companyId: company.id, name: 'Auto Created Product' }
    });
    expect(product).not.toBeNull();
    expect(product.sku).toBe('AUTO-1');
  });

  test('GET /orders/bulk-status/template returns an xlsx file', async () => {
    const res = await request(app)
      .get('/api/v1/orders/bulk-status/template')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');

    const wb = XLSX.read(res.body, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    expect(rows[0]).toHaveProperty('orderNumber');
    expect(rows[0]).toHaveProperty('status');
  });

  test('POST /orders/bulk-status without file returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/orders/bulk-status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
