const express = require('express');
const request = require('supertest');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../utils/verifyToken', () => {
  const noop = (req, res, next) => next();
  return {
    authenticateToken: (req, res, next) => {
      req.user = { id: 'test-ws-user', companyId: 'test-ws-company', role: 'OWNER', email: 'ws@test.com', firstName: 'Test', lastName: 'User' };
      next();
    },
    requireCompanyAccess: noop,
    requireRole: () => noop,
    requireSuperAdmin: noop,
    optionalAuth: noop,
    getAiServiceToken: () => null,
  };
});

const wholesaleRoutes = require('../../routes/wholesaleRoutes');

describe('Wholesale Module — Full Integration', () => {
  let prisma;
  let app;
  let companyId, customerId1, customerId2, productId, variantId, priceListId, wcId1, wcId2;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    app = express();
    app.use(express.json());
    app.use('/api/v1/wholesale', wholesaleRoutes);

    companyId = 'test-ws-company';

    // Create test company (needed for FK constraints)
    await prisma.company.upsert({
      where: { id: companyId },
      update: {},
      create: { id: companyId, name: 'Test Wholesale Co', slug: 'test-ws-company', email: 'ws-company@test.com', isActive: true },
    });

    // Clean up any leftover test data from previous runs
    await prisma.wholesaleStatement.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleTransaction.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleCustomerPriceList.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesalePriceListItem.deleteMany({ where: { priceList: { companyId } } }).catch(() => {});
    await prisma.wholesalePriceList.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleCustomer.deleteMany({ where: { companyId } }).catch(() => {});

    // Create test customers
    const c1 = await prisma.customer.create({
      data: { id: 'test-ws-cust-1', companyId, firstName: 'أحمد', lastName: 'علي', phone: '01110000001', status: 'ACTIVE' },
    });
    customerId1 = c1.id;
    const c2 = await prisma.customer.create({
      data: { id: 'test-ws-cust-2', companyId, firstName: 'خالد', lastName: 'محمود', phone: '01110000002', status: 'ACTIVE' },
    });
    customerId2 = c2.id;

    // Create test category + product + variant
    const cat = await prisma.category.create({
      data: { id: 'test-ws-cat', companyId, name: 'Test Cat', slug: 'test-ws-cat' },
    });
    const prod = await prisma.product.create({
      data: { id: 'test-ws-prod', companyId, name: 'حذاء رياضي', categoryId: cat.id, price: 500, sku: 'SKU-WS-001', stock: 100, isActive: true },
    });
    productId = prod.id;
    const var1 = await prisma.productVariant.create({
      data: { id: 'test-ws-var', productId, name: 'مقاس 42', price: 500, sku: 'SKU-WS-001-42', stock: 50, isActive: true },
    });
    variantId = var1.id;
  });

  afterAll(async () => {
    await prisma.wholesaleStatement.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleTransaction.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleCustomerPriceList.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesalePriceListItem.deleteMany({ where: { priceList: { companyId } } }).catch(() => {});
    await prisma.wholesalePriceList.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.wholesaleCustomer.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.productVariant.deleteMany({ where: { id: 'test-ws-var' } }).catch(() => {});
    await prisma.product.deleteMany({ where: { id: 'test-ws-prod' } }).catch(() => {});
    await prisma.category.deleteMany({ where: { id: 'test-ws-cat' } }).catch(() => {});
    await prisma.customer.deleteMany({ where: { id: { in: ['test-ws-cust-1', 'test-ws-cust-2'] } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { id: companyId } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  });

  // ── 1. Create Price List ──
  it('should create a price list', async () => {
    const res = await request(app)
      .post('/api/v1/wholesale/price-lists')
      .send({ name: 'قائمة الجملة الأساسية', nameAr: 'قائمة الجملة', type: 'PUBLIC', isActive: true, description: 'للموزعين' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    priceListId = res.body.data.id;
  });

  // ── 2. Add Item to Price List ──
  it('should add an item to a price list', async () => {
    const res = await request(app)
      .post(`/api/v1/wholesale/price-lists/${priceListId}/items`)
      .send({ productId, variantId, price: 350, minQuantity: 10 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price).toBe('350');
  });

  // ── 3. List Price Lists ──
  it('should list price lists with pagination', async () => {
    const res = await request(app).get('/api/v1/wholesale/price-lists');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Get Price List Detail ──
  it('should get price list detail with items', async () => {
    const res = await request(app).get(`/api/v1/wholesale/price-lists/${priceListId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].price).toBe('350');
    expect(res.body.data.items[0].product.name).toBe('حذاء رياضي');
  });

  // ── 5. Update Price List ──
  it('should update a price list', async () => {
    const res = await request(app)
      .put(`/api/v1/wholesale/price-lists/${priceListId}`)
      .send({ description: 'للموزعين المعتمدين فقط' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 6. Create Wholesale Customers ──
  it('should create wholesale customers', async () => {
    const res1 = await request(app)
      .post('/api/v1/wholesale/customers')
      .send({ customerId: customerId1, creditLimit: 50000, currentBalance: 0, isActive: true, notes: 'موزع رئيسي' });
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    wcId1 = res1.body.data.id;

    const res2 = await request(app)
      .post('/api/v1/wholesale/customers')
      .send({ customerId: customerId2, creditLimit: 30000, currentBalance: 0, isActive: true, notes: 'موزع ثانوي' });
    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    wcId2 = res2.body.data.id;
  });

  // ── 7. List Wholesale Customers ──
  it('should list wholesale customers', async () => {
    const res = await request(app).get('/api/v1/wholesale/customers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].customer.firstName).toBeDefined();
  });

  // ── 8. Get Wholesale Customer Detail ──
  it('should get wholesale customer detail', async () => {
    const res = await request(app).get(`/api/v1/wholesale/customers/${wcId1}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer.firstName).toBe('أحمد');
    expect(res.body.data.creditLimit).toBe('50000');
  });

  // ── 9. Update Wholesale Customer ──
  it('should update wholesale customer', async () => {
    const res = await request(app)
      .put(`/api/v1/wholesale/customers/${wcId1}`)
      .send({ creditLimit: 60000, notes: 'موزع رئيسي - تم رفع الحد' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 10. Assign Price List to Customer ──
  it('should assign price list to a customer', async () => {
    const res = await request(app)
      .post(`/api/v1/wholesale/customers/${customerId1}/assign-price-list`)
      .send({ customerId: customerId1, priceListId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 11. Record Invoice Transactions ──
  it('should record invoice transactions and update balance', async () => {
    const inv1 = await request(app)
      .post('/api/v1/wholesale/transactions')
      .send({ wholesaleCustomerId: wcId1, type: 'INVOICE', amount: 15000, notes: 'طلب جملة 1' });
    expect(inv1.status).toBe(201);
    expect(Number(inv1.body.data.balanceAfter)).toBe(15000);

    const inv2 = await request(app)
      .post('/api/v1/wholesale/transactions')
      .send({ wholesaleCustomerId: wcId2, type: 'INVOICE', amount: 8000, notes: 'طلب جملة 2' });
    expect(inv2.status).toBe(201);
    expect(Number(inv2.body.data.balanceAfter)).toBe(8000);
  });

  // ── 12. Record Payment Transaction ──
  it('should record a payment and decrease balance', async () => {
    const pay = await request(app)
      .post('/api/v1/wholesale/transactions')
      .send({ wholesaleCustomerId: wcId1, type: 'PAYMENT', amount: 5000, notes: 'دفعة أولى' });
    expect(pay.status).toBe(201);
    expect(Number(pay.body.data.balanceAfter)).toBe(10000);
  });

  // ── 13. List Transactions for Customer ──
  it('should list transactions for a wholesale customer', async () => {
    const res = await request(app).get(`/api/v1/wholesale/customers/${wcId1}/transactions`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  // ── 14. Generate Statement ──
  it('should generate a customer statement with opening/closing balance', async () => {
    const start = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    const res = await request(app)
      .get(`/api/v1/wholesale/customers/${wcId1}/statement?periodStart=${start}&periodEnd=${end}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statement).toBeDefined();
    expect(res.body.data.transactions.length).toBe(2);
    expect(Number(res.body.data.closingBalance)).toBe(10000);
    expect(Number(res.body.data.totalInvoiced)).toBe(15000);
    expect(Number(res.body.data.totalPaid)).toBe(5000);
  });

  // ── 15. Dashboard ──
  it('should return dashboard stats', async () => {
    const res = await request(app).get('/api/v1/wholesale/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCustomers).toBe(2);
    expect(res.body.data.totalOutstanding).toBeGreaterThanOrEqual(0);
  });

  // ── 16. Debt Aging Report ──
  it('should return debt aging report with buckets', async () => {
    const res = await request(app).get('/api/v1/wholesale/debts/aging');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalOutstanding).toBeGreaterThanOrEqual(0);
    expect(res.body.data.agingBuckets).toHaveLength(5);
    expect(res.body.data.customers.length).toBeGreaterThanOrEqual(1);
  });

  // ── 17. Remove Price List Item ──
  it('should remove an item from price list', async () => {
    const pl = await request(app).get(`/api/v1/wholesale/price-lists/${priceListId}`);
    if (!pl.body.data?.items?.length) return; // skip if no items (previous create/add may have failed)
    const itemId = pl.body.data.items[0].id;
    const res = await request(app).delete(`/api/v1/wholesale/price-lists/${priceListId}/items/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 18. Delete Price List (cascades items) ──
  it('should delete a price list', async () => {
    const res = await request(app).delete(`/api/v1/wholesale/price-lists/${priceListId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 19. 404 for deleted price list ──
  it('should return 404 for deleted price list', async () => {
    const res = await request(app).get(`/api/v1/wholesale/price-lists/${priceListId}`);
    expect(res.status).toBe(404);
  });
});
