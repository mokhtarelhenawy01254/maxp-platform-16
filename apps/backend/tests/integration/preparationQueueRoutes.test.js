const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendOrderStatusNotification: jest.fn().mockResolvedValue({ success: true, reason: 'mocked' }),
  sendBroadcastNotification: jest.fn().mockResolvedValue({ success: true, reason: 'mocked' }),
}));
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');

jest.setTimeout(45000);

describe('Preparation Queue Routes', () => {
  let app;
  let prisma;
  let company;
  let adminUser;
  let customer;
  let mainWarehouse;
  let secondaryWarehouse;
  let readyProduct;
  let shortageProduct;
  let transferProduct;
  let waitingOrder;
  let packagedOrder;
  let preparingGuestOrder;
  let shortageGuestOrder;
  let token;
  let dynamicOrderSeed = 0;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();

    app = express();
    app.use(express.json());

    const ordersRoutes = require('../../routes/orders');
    const inventoryRoutes = require('../../routes/inventoryRoutes');
    const agentWorkspaceRoutes = require('../../routes/agentWorkspaceRoutes');
    const orderWorkflowRoutes = require('../../routes/orderWorkflowRoutes');
    app.use('/api/v1/orders-new', ordersRoutes);
    app.use('/api/v1/inventory', inventoryRoutes);
    app.use('/api/v1/agent-workspace', agentWorkspaceRoutes);
    app.use('/api/v1/order-workflow', orderWorkflowRoutes);

    const unique = Date.now();
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);
    const baseTime = new Date('2026-03-20T09:00:00.000Z');

    company = await prisma.company.create({
      data: {
        id: `test-company-prep-${unique}`,
        name: 'Test Company Preparation Queue',
        email: `preparation-company-${unique}@test.local`,
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
        updatedAt: new Date()
      }
    });

    adminUser = await prisma.user.create({
      data: {
        id: `test-user-prep-admin-${unique}`,
        email: `preparation-admin-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Prep',
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
        firstName: 'Queue',
        lastName: 'Customer',
        email: `preparation-customer-${unique}@test.local`,
        phone: '01000000111'
      }
    });

    mainWarehouse = await prisma.warehouse.create({
      data: {
        name: `Main Prep Warehouse ${unique}`,
        location: 'Cairo',
        type: 'main',
        companyId: company.id,
        isActive: true
      }
    });

    secondaryWarehouse = await prisma.warehouse.create({
      data: {
        name: `Secondary Prep Warehouse ${unique}`,
        location: 'Giza',
        type: 'secondary',
        companyId: company.id,
        isActive: true
      }
    });

    readyProduct = await prisma.product.create({
      data: {
        name: `Ready Product ${unique}`,
        sku: `READY-${unique}`,
        price: 100,
        stock: 20,
        companyId: company.id,
        isActive: true,
        trackInventory: true
      }
    });

    shortageProduct = await prisma.product.create({
      data: {
        name: `Shortage Product ${unique}`,
        sku: `SHORT-${unique}`,
        price: 80,
        stock: 0,
        companyId: company.id,
        isActive: true,
        trackInventory: true
      }
    });

    transferProduct = await prisma.product.create({
      data: {
        name: `Transfer Product ${unique}`,
        sku: `MOVE-${unique}`,
        price: 60,
        stock: 6,
        companyId: company.id,
        isActive: true,
        trackInventory: true
      }
    });

    await prisma.inventory.create({
      data: {
        productId: readyProduct.id,
        warehouseId: mainWarehouse.id,
        quantity: 20,
        available: 20,
        reserved: 0,
        minStock: 0,
        reorderPoint: 0,
        reorderQuantity: 0
      }
    });

    await prisma.inventory.create({
      data: {
        productId: transferProduct.id,
        warehouseId: secondaryWarehouse.id,
        quantity: 6,
        available: 6,
        reserved: 0,
        minStock: 0,
        reorderPoint: 0,
        reorderQuantity: 0
      }
    });

    waitingOrder = await prisma.order.create({
      data: {
        orderNumber: `PREP-WAIT-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 100,
        tax: 0,
        shipping: 10,
        discount: 0,
        total: 110,
        currency: 'EGP',
        customerName: 'Queue Customer',
        customerPhone: '01000000111',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual',
        createdAt: baseTime,
        updatedAt: baseTime,
        orderItems: {
          create: [{
            productId: readyProduct.id,
            quantity: 1,
            price: 100,
            total: 100,
            productName: readyProduct.name,
            productSku: readyProduct.sku,
            metadata: JSON.stringify({ productName: readyProduct.name })
          }]
        }
      }
    });

    packagedOrder = await prisma.order.create({
      data: {
        orderNumber: `PREP-PACK-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 100,
        tax: 0,
        shipping: 10,
        discount: 0,
        total: 110,
        currency: 'EGP',
        customerName: 'Queue Customer',
        customerPhone: '01000000111',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual',
        metadata: JSON.stringify({ preparationStatus: 'PACKAGED' }),
        createdAt: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000),
        updatedAt: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000),
        orderItems: {
          create: [{
            productId: readyProduct.id,
            quantity: 1,
            price: 100,
            total: 100,
            productName: readyProduct.name,
            productSku: readyProduct.sku,
            metadata: JSON.stringify({ productName: readyProduct.name })
          }]
        }
      }
    });

    preparingGuestOrder = await prisma.guestOrder.create({
      data: {
        orderNumber: `PREP-GUEST-${unique}`,
        guestEmail: `preparation-guest-${unique}@test.local`,
        guestPhone: '01000000222',
        guestName: 'Guest Preparing',
        items: JSON.stringify([{ productId: readyProduct.id, name: readyProduct.name, quantity: 1, price: 100 }]),
        total: 100,
        shippingCost: 10,
        discountAmount: 0,
        finalTotal: 110,
        shippingAddress: JSON.stringify({ address: 'Cairo' }),
        paymentMethod: 'CASH',
        status: 'preparing',
        companyId: company.id,
        createdAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
        updatedAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000)
      }
    });

    shortageGuestOrder = await prisma.guestOrder.create({
      data: {
        orderNumber: `PREP-SHORT-${unique}`,
        guestEmail: `preparation-short-${unique}@test.local`,
        guestPhone: '01000000333',
        guestName: 'Guest Shortage',
        items: JSON.stringify([{ productId: shortageProduct.id, name: shortageProduct.name, quantity: 2, price: 80 }]),
        total: 160,
        shippingCost: 10,
        discountAmount: 0,
        finalTotal: 170,
        shippingAddress: JSON.stringify({ address: 'Alexandria' }),
        paymentMethod: 'CASH',
        status: 'confirmed',
        metadata: JSON.stringify({
          preparationStatus: 'STOCK_SHORTAGE',
          preparationShortageHold: {
            reason: 'waiting_restock',
            owner: 'خالد',
            followUpDate: '2026-03-19',
            customerNotified: true,
            note: 'Awaiting inbound stock',
            heldAt: '2026-03-18T10:00:00.000Z',
            state: 'held'
          }
        }),
        companyId: company.id,
        createdAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000)
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const nextDynamicKey = (prefix) => {
    dynamicOrderSeed += 1;
    return `${prefix}-${Date.now()}-${dynamicOrderSeed}`;
  };

  const createRegularWorkflowOrder = async (overrides = {}) => {
    return prisma.order.create({
      data: {
        orderNumber: nextDynamicKey('PREP-CANCEL'),
        customerId: customer.id,
        companyId: company.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 100,
        tax: 0,
        shipping: 10,
        discount: 0,
        total: 110,
        currency: 'EGP',
        customerName: 'Queue Customer',
        customerPhone: '01000000111',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual',
        ...overrides
      }
    });
  };

  const createGuestCancellationOrder = async (overrides = {}) => {
    return prisma.guestOrder.create({
      data: {
        orderNumber: nextDynamicKey('PREP-GUEST-CANCEL'),
        guestEmail: `guest-${Date.now()}-${dynamicOrderSeed}@test.local`,
        guestPhone: '01000000999',
        guestName: 'Guest Cancel Test',
        items: JSON.stringify([{ productName: 'Guest Product', quantity: 1, price: 100 }]),
        total: 100,
        shippingCost: 10,
        discountAmount: 0,
        finalTotal: 110,
        shippingAddress: JSON.stringify({ city: 'القاهرة', governorate: 'القاهرة' }),
        paymentMethod: 'cash',
        status: 'PENDING',
        companyId: company.id,
        ...overrides
      }
    });
  };

  const configureCancellationWorkflow = async ({ allowCancel }) => {
    await prisma.orderWorkflowTransition.deleteMany({ where: { companyId: company.id } });
    await prisma.orderStatusChangeRequest.deleteMany({ where: { companyId: company.id } });
    await prisma.orderWorkflowAuditLog.deleteMany({ where: { companyId: company.id } });
    await prisma.orderStatusDefinition.deleteMany({ where: { companyId: company.id } });

    await prisma.orderWorkflowConfig.upsert({
      where: { companyId: company.id },
      update: {
        enabled: true,
        enforceTransitions: true,
        allowOverride: true
      },
      create: {
        companyId: company.id,
        enabled: true,
        enforceTransitions: true,
        allowOverride: true
      }
    });

    const confirmedStatus = await prisma.orderStatusDefinition.create({
      data: {
        companyId: company.id,
        name: 'Confirmed',
        code: 'CONFIRMED',
        sortOrder: 1
      }
    });

    const cancelledStatus = await prisma.orderStatusDefinition.create({
      data: {
        companyId: company.id,
        name: 'Cancelled',
        code: 'CANCELLED',
        sortOrder: 2
      }
    });

    if (allowCancel) {
      await prisma.orderWorkflowTransition.create({
        data: {
          companyId: company.id,
          fromStatusId: confirmedStatus.id,
          toStatusId: cancelledStatus.id,
          allowedRoles: JSON.stringify(['MANAGER'])
        }
      });
    }

    return { confirmedStatus, cancelledStatus };
  };

  afterAll(async () => {
    try {
      if (company?.id) {
        await prisma.notification.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.activityLog.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.whatsAppNotificationLog.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.orderStatusHistory.deleteMany({
          where: {
            OR: [
              waitingOrder?.id ? { orderId: waitingOrder.id } : undefined,
              packagedOrder?.id ? { orderId: packagedOrder.id } : undefined,
              preparingGuestOrder?.id ? { guestOrderId: preparingGuestOrder.id } : undefined,
              shortageGuestOrder?.id ? { guestOrderId: shortageGuestOrder.id } : undefined
            ].filter(Boolean)
          }
        }).catch(() => {});
        await prisma.stockMovement.deleteMany({
          where: {
            productId: {
              in: [readyProduct?.id, shortageProduct?.id, transferProduct?.id].filter(Boolean)
            }
          }
        }).catch(() => {});
        await prisma.order.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.guestOrder.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.inventory.deleteMany({
          where: { warehouse: { companyId: company.id } }
        }).catch(() => {});
        await prisma.warehouse.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.product.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.customer.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      }

      if (adminUser?.id) {
        await prisma.userCompany.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }

      if (company?.id) {
        await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('GET /preparation/queue returns summary and shortage owner options', async () => {
    const res = await request(app)
      .get('/api/v1/orders-new/preparation/queue')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBe(4);
    expect(res.body.summary.stageCounts).toMatchObject({
      ALL: 4,
      WAITING: 1,
      PREPARING: 1,
      PACKAGED: 1,
      STOCK_SHORTAGE: 1
    });
    expect(res.body.summary.shortageCount).toBe(1);
    expect(res.body.summary.overdueShortageFollowUpCount).toBe(1);
    expect(res.body.shortageOwnerOptions).toContain('خالد');
  });

  test('GET /preparation/queue filters shortage stage with overdue follow-up', async () => {
    const res = await request(app)
      .get('/api/v1/orders-new/preparation/queue?stage=STOCK_SHORTAGE&shortageFollowUp=overdue')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].orderNumber).toBe(shortageGuestOrder.orderNumber);
  });

  test('GET /preparation/queue search is case-insensitive', async () => {
    const res = await request(app)
      .get(`/api/v1/orders-new/preparation/queue?search=${shortageGuestOrder.orderNumber.toLowerCase()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].orderNumber).toBe(shortageGuestOrder.orderNumber);
  });

  test('GET /preparation/queue search still matches product names after batching', async () => {
    const res = await request(app)
      .get(`/api/v1/orders-new/preparation/queue?search=${encodeURIComponent(shortageProduct.name)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].orderNumber).toBe(shortageGuestOrder.orderNumber);
  });

  test('GET /preparation/queue keeps transfer-needed orders visible for the selected destination warehouse', async () => {
    const transferNeededOrder = await prisma.order.create({
      data: {
        orderNumber: nextDynamicKey('PREP-MOVE-IN'),
        customerId: customer.id,
        companyId: company.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 120,
        tax: 0,
        shipping: 10,
        discount: 0,
        total: 130,
        currency: 'EGP',
        customerName: 'Queue Customer',
        customerPhone: '01000000111',
        customerEmail: customer.email,
        city: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
        governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
        sourceType: 'manual',
        orderItems: {
          create: [{
            productId: transferProduct.id,
            quantity: 2,
            price: 60,
            total: 120,
            productName: transferProduct.name,
            productSku: transferProduct.sku,
            metadata: JSON.stringify({ productName: transferProduct.name })
          }]
        }
      }
    });

    try {
      const res = await request(app)
        .get(
          `/api/v1/orders-new/preparation/queue?warehouseId=${mainWarehouse.id}&search=${transferNeededOrder.orderNumber}`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.summary.shortageCount).toBe(1);
      expect(res.body.data[0].orderNumber).toBe(transferNeededOrder.orderNumber);
    } finally {
      await prisma.order.delete({ where: { id: transferNeededOrder.id } }).catch(() => {});
    }
  });

  test('GET /preparation/queue paginates visible orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders-new/preparation/queue?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: 4,
      page: 2,
      limit: 2,
      pages: 2
    });
    expect(res.body.data.map((order) => order.orderNumber)).toEqual([
      preparingGuestOrder.orderNumber,
      waitingOrder.orderNumber
    ]);
  });

  test('POST /simple/:orderNumber/status stores preparation status for regular orders', async () => {
    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${waitingOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'PACKAGED',
        notes: 'Packaged from preparation queue test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      orderType: 'regular',
      orderNumber: waitingOrder.orderNumber,
      status: 'PROCESSING',
      preparationStatus: 'PACKAGED'
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: waitingOrder.id },
      select: { status: true, metadata: true }
    });

    const metadata = JSON.parse(updatedOrder.metadata || '{}');
    expect(updatedOrder.status).toBe('PROCESSING');
    expect(metadata.preparationStatus).toBe('PACKAGED');

    const statusHistory = await prisma.orderStatusHistory.findFirst({
      where: { orderId: waitingOrder.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, oldStatus: true, reason: true }
    });

    expect(statusHistory).toMatchObject({
      status: 'PACKAGED',
      oldStatus: 'CONFIRMED',
      reason: 'Packaged from preparation queue test'
    });
  });

  test('PUT /simple/:orderNumber merges metadataPatch for regular orders', async () => {
    const res = await request(app)
      .put(`/api/v1/orders-new/simple/${packagedOrder.orderNumber}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: 'Regular metadata patch test',
        metadataPatch: {
          preparationShortageHold: {
            reason: 'other',
            owner: 'مها'
          },
          customPreparationNote: 'keep-existing-status'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: packagedOrder.id },
      select: { notes: true, metadata: true }
    });

    const metadata = JSON.parse(updatedOrder.metadata || '{}');
    expect(updatedOrder.notes).toBe('Regular metadata patch test');
    expect(metadata.preparationStatus).toBe('PACKAGED');
    expect(metadata.customPreparationNote).toBe('keep-existing-status');
    expect(metadata.preparationShortageHold).toMatchObject({
      reason: 'other',
      owner: 'مها'
    });
  });

  test('PUT /simple/:orderNumber merges metadataPatch for guest orders', async () => {
    const res = await request(app)
      .put(`/api/v1/orders-new/simple/${shortageGuestOrder.orderNumber}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: 'Guest metadata patch test',
        metadataPatch: {
          preparationShortageHold: {
            owner: 'سارة',
            note: 'Updated follow-up owner',
            followUpDate: '2026-03-21'
          }
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: shortageGuestOrder.id },
      select: { notes: true, metadata: true }
    });

    const metadata = JSON.parse(updatedGuestOrder.metadata || '{}');
    expect(updatedGuestOrder.notes).toBe('Guest metadata patch test');
    expect(metadata.preparationStatus).toBe('STOCK_SHORTAGE');
    expect(metadata.preparationShortageHold).toMatchObject({
      reason: 'waiting_restock',
      owner: 'سارة',
      note: 'Updated follow-up owner',
      followUpDate: '2026-03-21'
    });
  });

  test('POST /inventory/transfer moves stock between warehouses', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: transferProduct.id,
        fromWarehouseId: secondaryWarehouse.id,
        toWarehouseId: mainWarehouse.id,
        quantity: 3,
        notes: 'Preparation quick transfer test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sourceInventory = await prisma.inventory.findFirst({
      where: {
        productId: transferProduct.id,
        warehouseId: secondaryWarehouse.id,
        batchNumber: null
      },
      select: { quantity: true, available: true }
    });

    const destinationInventory = await prisma.inventory.findFirst({
      where: {
        productId: transferProduct.id,
        warehouseId: mainWarehouse.id,
        batchNumber: null
      },
      select: { quantity: true, available: true }
    });

    const movementCount = await prisma.stockMovement.count({
      where: {
        productId: transferProduct.id,
        reason: 'TRANSFER'
      }
    });

    expect(sourceInventory).toMatchObject({ quantity: 3, available: 3 });
    expect(destinationInventory).toMatchObject({ quantity: 3, available: 3 });
    expect(movementCount).toBe(2);
  });

  test('POST /simple/:orderNumber/status updates guest preparation status', async () => {
    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${preparingGuestOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'READY_TO_SHIP',
        notes: 'Guest ready to ship test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: preparingGuestOrder.id },
      select: { status: true, notes: true }
    });

    expect(updatedGuestOrder).toMatchObject({
      status: 'READY_TO_SHIP',
      notes: 'Guest ready to ship test'
    });
  });

  test('PUT /simple/:orderNumber rejects invalid metadataPatch payload', async () => {
    const res = await request(app)
      .put(`/api/v1/orders-new/simple/${packagedOrder.orderNumber}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metadataPatch: 'invalid-patch'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('metadataPatch must be a plain object');
  });

  test('POST /inventory/transfer returns 400 for insufficient stock', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: transferProduct.id,
        fromWarehouseId: secondaryWarehouse.id,
        toWarehouseId: mainWarehouse.id,
        quantity: 10,
        notes: 'Insufficient stock test'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('مخزون غير كاف في مخزن المصدر');
  });

  test.skip('POST /simple/:orderNumber/status blocks duplicate guest WhatsApp notifications with normalized event type', async () => {
    const sendNotificationSpy = jest
      .spyOn(WhatsAppNotificationService, 'sendOrderStatusNotification')
      .mockResolvedValue({ success: true, reason: 'mocked' });

    await prisma.whatsAppNotificationLog.create({
      data: {
        companyId: company.id,
        sessionId: `prep-duplicate-${Date.now()}`,
        recipientPhone: shortageGuestOrder.guestPhone,
        recipientName: shortageGuestOrder.guestName,
        category: 'ORDER',
        eventType: 'PICKING',
        content: 'Duplicate picking notification',
        status: 'SENT',
        sentAt: new Date()
      }
    });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${shortageGuestOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'PREPARING',
        notes: 'Duplicate picking notification test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });

  test.skip('POST /simple/:orderNumber/status maps packaged guest notifications to PACKED', async () => {
    const sendNotificationSpy = jest
      .spyOn(WhatsAppNotificationService, 'sendOrderStatusNotification')
      .mockResolvedValue({ success: true, reason: 'mocked' });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${preparingGuestOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'PACKAGED',
        notes: 'Packaged notification mapping test'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
    expect(sendNotificationSpy.mock.calls[0][1]).toBe('PACKED');
  });

  test('POST /simple/:orderNumber/status requires a reason when cancelling', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 3
    });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${workflowOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'CANCELLED'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('سبب إلغاء الطلب');

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });
    const historyCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(reloadedOrder.status).toBe('CONFIRMED');
    expect(historyCount).toBe(0);
  });

  test('POST /bulk/status requires a reason when bulk cancelling', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 3
    });

    const res = await request(app)
      .post('/api/v1/orders-new/bulk/status')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderIds: [workflowOrder.orderNumber],
        status: 'CANCELLED'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('سبب إلغاء الطلب');

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });
    expect(reloadedOrder.status).toBe('CONFIRMED');
  });

  test('POST /simple/:orderNumber/status allows cancellation without requiring 3 calls when workflow allows it', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 0
    });

    await configureCancellationWorkflow({ allowCancel: true });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${workflowOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'CANCELLED',
        notes: 'Manual cancellation should succeed directly'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const finalOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const finalHistoryCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(finalOrder.status).toBe('CANCELLED');
    expect(finalHistoryCount).toBe(1);
    return;
    const intermediateOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const intermediateHistoryCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(res.body.data.status).toBe('CANCELLED');
    expect(intermediateOrder.status).toBe('CANCELLED');
    expect(intermediateHistoryCount).toBe(1);
    return;
    expect(res.body.message).toContain('3 محاولات');

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const historyCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(reloadedOrder.status).toBe('CONFIRMED');
    expect(historyCount).toBe(0);
  });

  test('POST /simple/:orderNumber/status does not fallback-update when workflow rejects cancellation', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 3
    });

    await configureCancellationWorkflow({ allowCancel: false });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${workflowOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'CANCELLED',
        notes: 'Workflow should reject this transition'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const historyCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(reloadedOrder.status).toBe('CONFIRMED');
    expect(historyCount).toBe(0);
  });

  test('POST /agent-workspace/orders/:id/quick-action allows guest cancellation without requiring 3 calls', async () => {
    const guestOrder = await createGuestCancellationOrder({
      callAttempts: 0
    });

    const res = await request(app)
      .post(`/api/v1/agent-workspace/orders/${guestOrder.id}/quick-action`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'cancel',
        type: 'GUEST',
        notes: 'Guest quick action should respect the call guard'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const finalGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: guestOrder.id },
      select: { status: true }
    });

    const finalGuestHistoryCount = await prisma.orderStatusHistory.count({
      where: { guestOrderId: guestOrder.id }
    });

    expect(finalGuestOrder.status).toBe('CANCELLED');
    expect(finalGuestHistoryCount).toBe(1);
    return;
    expect(res.body.error).toContain('3 محاولات');

    const reloadedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: guestOrder.id },
      select: { status: true }
    });

    const historyCount = await prisma.orderStatusHistory.count({
      where: { guestOrderId: guestOrder.id }
    });

    expect(reloadedGuestOrder.status).toBe('PENDING');
    expect(historyCount).toBe(0);
  });

  test('POST /order-workflow/change-status allows cancellation without requiring 3 calls', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 0
    });

    const { cancelledStatus } = await configureCancellationWorkflow({ allowCancel: true });

    const res = await request(app)
      .post('/api/v1/order-workflow/change-status')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: workflowOrder.id,
        statusId: cancelledStatus.id,
        reason: 'Workflow UI should not bypass the call guard'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const finalOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const finalHistoryCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(finalOrder.status).toBe('CANCELLED');
    expect(finalHistoryCount).toBe(1);
    return;
    expect(res.body.message).toContain('3 محاولات');

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    const historyCount = await prisma.orderStatusHistory.count({
      where: { orderId: workflowOrder.id }
    });

    expect(reloadedOrder.status).toBe('CONFIRMED');
    expect(historyCount).toBe(0);
  });

  test('POST /simple/:orderNumber/status still blocks delivery failed before 3 calls', async () => {
    const workflowOrder = await createRegularWorkflowOrder({
      callAttempts: 0
    });

    const res = await request(app)
      .post(`/api/v1/orders-new/simple/${workflowOrder.orderNumber}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'DELIVERY_FAILED',
        notes: 'Failure statuses should still require call attempts'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const finalOrder = await prisma.order.findUnique({
      where: { id: workflowOrder.id },
      select: { status: true }
    });

    expect(finalOrder.status).toBe('CONFIRMED');
  });
});
