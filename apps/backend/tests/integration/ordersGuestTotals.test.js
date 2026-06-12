const path = require('path');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.local'),
  quiet: true,
});

jest.setTimeout(45000);

describe('Orders routes guest totals', () => {
  let app;
  let prisma;
  let company;
  let adminUser;
  let customer;
  let regularOrder;
  let guestOrder;
  let guestOrderMissingShipping;
  let trashGuestOrder;
  let shippingZone;
  let token;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();

    app = express();
    app.use(express.json());

    const ordersRoutes = require('../../routes/orders');
    app.use('/api/v1/orders-new', ordersRoutes);

    const unique = Date.now();
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    company = await prisma.company.create({
      data: {
        id: `test-company-orders-guest-${unique}`,
        name: 'Test Company Orders Guest',
        email: `orders-guest-company-${unique}@test.local`,
        plan: 'ENTERPRISE',
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
        updatedAt: new Date()
      }
    });

    adminUser = await prisma.user.create({
      data: {
        id: `test-user-orders-guest-${unique}`,
        email: `orders-guest-admin-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Orders',
        lastName: 'Admin',
        role: 'MANAGER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true,
        availability: 'available',
        timezone: 'Africa/Cairo'
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

    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: 'Orders',
        lastName: 'Regular',
        email: `orders-regular-${unique}@test.local`,
        phone: '01000000777'
      }
    });

    regularOrder = await prisma.order.create({
      data: {
        orderNumber: `REGULAR-ORDER-TRASH-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'PENDING',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'CASH',
        subtotal: 220,
        tax: 0,
        shipping: 30,
        discount: 0,
        total: 250,
        currency: 'EGP',
        customerName: 'Orders Regular',
        customerPhone: '01000000777',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual'
      }
    });

    guestOrder = await prisma.guestOrder.create({
      data: {
        orderNumber: `GUEST-ORDER-TOTALS-${unique}`,
        guestEmail: `orders-guest-${unique}@test.local`,
        guestPhone: '01000000999',
        guestName: 'Guest Totals',
        items: JSON.stringify([
          {
            productId: 'guest-product-1',
            name: 'Guest Product',
            quantity: 1,
            price: 150,
            metadata: {}
          }
        ]),
        total: 150,
        shippingCost: 25,
        discountAmount: 0,
        finalTotal: 175,
        shippingAddress: JSON.stringify({
          address: 'شارع الاختبار',
          city: 'الجيزة',
          governorate: 'الجيزة'
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id
      }
    });

    trashGuestOrder = await prisma.guestOrder.create({
      data: {
        orderNumber: `GUEST-ORDER-TRASH-${unique}`,
        guestEmail: `orders-guest-trash-${unique}@test.local`,
        guestPhone: '01000000666',
        guestName: 'Guest Trash',
        items: JSON.stringify([
          {
            productId: 'guest-product-trash',
            name: 'Trash Product',
            quantity: 1,
            price: 180,
            metadata: {}
          }
        ]),
        total: 180,
        shippingCost: 20,
        discountAmount: 0,
        finalTotal: 200,
        shippingAddress: JSON.stringify({
          address: 'شارع السلة',
          city: 'القاهرة',
          governorate: 'القاهرة'
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id
      }
    });

    shippingZone = await prisma.shippingZone.create({
      data: {
        id: `test-shipping-zone-${unique}`,
        name: 'القاهرة والجيزة',
        governorates: JSON.stringify(['القاهرة', 'Cairo', 'الجيزة', 'Giza']),
        price: 60,
        deliveryTime: '1-2 يوم',
        deliveryTimeType: 'custom',
        pricingType: 'flat',
        isActive: true,
        companyId: company.id,
        updatedAt: new Date()
      }
    });

    guestOrderMissingShipping = await prisma.guestOrder.create({
      data: {
        orderNumber: `GUEST-ORDER-SHIPPING-FALLBACK-${unique}`,
        guestEmail: `orders-guest-fallback-${unique}@test.local`,
        guestPhone: '01000000888',
        guestName: 'Guest Shipping Fallback',
        items: JSON.stringify([
          {
            productId: 'guest-product-2',
            name: 'Fallback Product',
            quantity: 1,
            price: 300,
            metadata: {}
          }
        ]),
        total: 300,
        shippingCost: 0,
        discountAmount: 0,
        finalTotal: 300,
        shippingAddress: JSON.stringify({
          address: 'الدقي',
          city: 'Giza',
          governorate: 'Giza'
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id
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
    if (!prisma) return;

    await prisma.order.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.shippingZone.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.guestOrder.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.customer.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.userCompany.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.user.deleteMany({
      where: { companyId: company?.id }
    });
    await prisma.company.deleteMany({
      where: { id: company?.id }
    });
  });

  test('GET /simple/:orderNumber returns guest shipping and final total for admin screens', async () => {
    const res = await request(app)
      .get(`/api/v1/orders-new/simple/${guestOrder.orderNumber}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.subtotal)).toBe(150);
    expect(Number(res.body.data.shipping)).toBe(25);
    expect(Number(res.body.data.total)).toBe(175);
  });

  test('PUT /simple/:orderNumber/items keeps guest subtotal separate from final total', async () => {
    const updateRes = await request(app)
      .put(`/api/v1/orders-new/simple/${guestOrder.orderNumber}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            productId: 'guest-product-1',
            productName: 'Guest Product Updated',
            price: 200,
            quantity: 1,
            total: 200,
            metadata: {}
          }
        ],
        subtotal: 200,
        shipping: 40,
        tax: 0,
        total: 240
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    const storedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: guestOrder.id }
    });

    expect(Number(storedGuestOrder.total)).toBe(200);
    expect(Number(storedGuestOrder.shippingCost)).toBe(40);
    expect(Number(storedGuestOrder.finalTotal)).toBe(240);

    const detailRes = await request(app)
      .get(`/api/v1/orders-new/simple/${guestOrder.orderNumber}`)
      .set('Authorization', `Bearer ${token}`);

    expect(detailRes.status).toBe(200);
    expect(Number(detailRes.body.data.subtotal)).toBe(200);
    expect(Number(detailRes.body.data.shipping)).toBe(40);
    expect(Number(detailRes.body.data.total)).toBe(240);
  });

  test('GET /simple/:orderNumber infers missing guest shipping from shipping zones for admin display', async () => {
    const res = await request(app)
      .get(`/api/v1/orders-new/simple/${guestOrderMissingShipping.orderNumber}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.subtotal)).toBe(300);
    expect(Number(res.body.data.shipping)).toBe(60);
    expect(Number(res.body.data.total)).toBe(360);
  });

  test('GET /simple excludes guest orders from payment-status filtered lists', async () => {
    const res = await request(app)
      .get('/api/v1/orders-new/simple?paymentStatus=pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test('POST /bulk/delete moves regular and guest orders to trash and keeps them out of the default list', async () => {
    const bulkDeleteRes = await request(app)
      .post('/api/v1/orders-new/bulk/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderIds: [regularOrder.orderNumber, trashGuestOrder.orderNumber]
      });

    expect(bulkDeleteRes.status).toBe(200);
    expect(bulkDeleteRes.body.success).toBe(true);
    expect(Number(bulkDeleteRes.body.data.successCount)).toBe(2);

    const storedRegularOrder = await prisma.order.findUnique({
      where: { id: regularOrder.id }
    });
    const storedTrashGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: trashGuestOrder.id }
    });

    expect(storedRegularOrder).not.toBeNull();
    expect(storedTrashGuestOrder).not.toBeNull();
    expect(storedRegularOrder.status).toBe('TRASH');
    expect(storedTrashGuestOrder.status).toBe('TRASH');

    const defaultListRes = await request(app)
      .get('/api/v1/orders-new/simple')
      .set('Authorization', `Bearer ${token}`);

    expect(defaultListRes.status).toBe(200);
    expect(defaultListRes.body.success).toBe(true);

    const defaultListOrderNumbers = defaultListRes.body.data.map((order) => order.orderNumber);
    expect(defaultListOrderNumbers).not.toContain(regularOrder.orderNumber);
    expect(defaultListOrderNumbers).not.toContain(trashGuestOrder.orderNumber);

    const trashListRes = await request(app)
      .get('/api/v1/orders-new/simple?status=trash')
      .set('Authorization', `Bearer ${token}`);

    expect(trashListRes.status).toBe(200);
    expect(trashListRes.body.success).toBe(true);

    const trashListOrderNumbers = trashListRes.body.data.map((order) => order.orderNumber);
    expect(trashListOrderNumbers).toContain(regularOrder.orderNumber);
    expect(trashListOrderNumbers).toContain(trashGuestOrder.orderNumber);
  });

  test('POST /bulk/delete with permanent deletes trashed regular and guest orders', async () => {
    await prisma.orderNote.createMany({
      data: [
        {
          orderId: regularOrder.id,
          content: 'Regular order note before permanent delete',
          authorName: 'Orders Admin'
        },
        {
          guestOrderId: trashGuestOrder.id,
          content: 'Guest order note before permanent delete',
          authorName: 'Orders Admin'
        }
      ]
    });

    const permanentDeleteRes = await request(app)
      .post('/api/v1/orders-new/bulk/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderIds: [regularOrder.orderNumber, trashGuestOrder.orderNumber],
        permanent: true
      });

    console.log("DEBUG BODY:", JSON.stringify(permanentDeleteRes.body, null, 2));
    expect(permanentDeleteRes.status).toBe(200);
    expect(permanentDeleteRes.body.success).toBe(true);
    expect(permanentDeleteRes.body.data.action).toBe('permanent_delete');
    expect(Number(permanentDeleteRes.body.data.successCount)).toBe(2);
    expect(Number(permanentDeleteRes.body.data.regularDeleted)).toBe(1);
    expect(Number(permanentDeleteRes.body.data.guestDeleted)).toBe(1);

    const [storedRegularOrder, storedTrashGuestOrder, remainingOrderNotes] = await Promise.all([
      prisma.order.findUnique({ where: { id: regularOrder.id } }),
      prisma.guestOrder.findUnique({ where: { id: trashGuestOrder.id } }),
      prisma.orderNote.count({
        where: {
          OR: [
            { orderId: regularOrder.id },
            { guestOrderId: trashGuestOrder.id }
          ]
        }
      })
    ]);

    expect(storedRegularOrder).toBeNull();
    expect(storedTrashGuestOrder).toBeNull();
    expect(remainingOrderNotes).toBe(0);

    const trashListRes = await request(app)
      .get('/api/v1/orders-new/simple?status=trash')
      .set('Authorization', `Bearer ${token}`);

    expect(trashListRes.status).toBe(200);
    expect(trashListRes.body.success).toBe(true);

    const trashListOrderNumbers = trashListRes.body.data.map((order) => order.orderNumber);
    expect(trashListOrderNumbers).not.toContain(regularOrder.orderNumber);
    expect(trashListOrderNumbers).not.toContain(trashGuestOrder.orderNumber);
  });
});
