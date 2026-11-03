/**
 * Real-DB end-to-end test for internal sync and linked order status sync on QA lab (maxp_qa).
 *
 * Runs against real Postgres (maxp_qa) with stubbed external services.
 * All fixture rows are deleted in finally block.
 */
const path = require('path');
const fs = require('fs');

const QA = 'C:/Users/ali wazery/maxp-qa';
const BE = (process.env.E2E_BE || path.resolve(__dirname, '../..')).replace(/\\/g, '/');
const TAG = 'QA-LINKED-SYNC-' + Date.now();

// Read password from pgpass.conf (field 5)
const pgpassFile = QA + '/pg/pgpass.conf';
let pwd = '';
if (fs.existsSync(pgpassFile)) {
  const pgpass = fs.readFileSync(pgpassFile, 'utf8').trim();
  pwd = pgpass.split(':')[4] || '';
}

process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(pwd)}@127.0.0.1:5433/maxp_qa?schema=public`;
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'qa-probe-secret';

let PrismaClient;
try {
  PrismaClient = require(QA + '/qa-seed/backend/prisma/generated/postgresql_v2').PrismaClient;
} catch (e) {
  PrismaClient = require(path.join(BE, 'prisma/generated/postgresql_v2')).PrismaClient;
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error']
});

function stub(rel, exports) {
  const p = require.resolve(path.join(BE, rel));
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

// Stubs specified in brief
stub('services/sharedDatabase.js', {
  getSharedPrismaClient: () => prisma,
  safeQuery: async (fn) => fn(),
  createPrismaClient: () => prisma,
  isDbUnavailable: () => false,
  getCircuitBreakerStatus: () => ({ isAvailable: true }),
  disconnectSharedClient: async () => {}
});

stub('services/wooCommerceAutoExportService.js', {
  getWooCommerceAutoExportService: () => ({
    exportOrderAsync: async () => {}
  })
});

stub('services/whatsapp/WhatsAppNotificationService.js', {
  sendOrderCreatedNotification: async () => {},
  sendStatusUpdateNotification: async () => {}
});

stub('services/socketService.js', {
  sendToCompany: () => {},
  sendToUser: () => {}
});

stub('services/commissionService.js', {
  calculateCommissions: async () => {}
});

// Real modules
const internalSyncService = require(path.join(BE, 'services/internalSyncService.js'));
const linkedOrderSyncService = require(path.join(BE, 'services/linkedOrderSyncService.js'));

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    failures.push(name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''));
    console.log('  FAIL  ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''));
  }
}

const created = {
  orderIds: [],
  customerIds: [],
  productVariantIds: [],
  productIds: [],
  affiliateIds: [],
  userIds: [],
  connectionIds: [],
  companyIds: []
};

async function cleanup() {
  console.log('\n🧹 Cleaning up test fixtures...');

  // 1. Clean order status histories, order items, and orders
  if (created.orderIds.length > 0) {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: created.orderIds } }
    }).catch(() => {});

    await prisma.orderItem.deleteMany({
      where: { orderId: { in: created.orderIds } }
    }).catch(() => {});

    await prisma.order.deleteMany({
      where: { id: { in: created.orderIds } }
    }).catch(() => {});

    // Clean any provider copies created with externalId pointing to consumer orders
    await prisma.orderStatusHistory.deleteMany({
      where: { order: { externalId: { in: created.orderIds } } }
    }).catch(() => {});

    await prisma.orderItem.deleteMany({
      where: { order: { externalId: { in: created.orderIds } } }
    }).catch(() => {});

    await prisma.order.deleteMany({
      where: { externalId: { in: created.orderIds } }
    }).catch(() => {});
  }

  // 2. Customers
  if (created.customerIds.length > 0) {
    await prisma.customer.deleteMany({
      where: { id: { in: created.customerIds } }
    }).catch(() => {});
  }

  // 3. Product variants & products
  if (created.productVariantIds.length > 0) {
    await prisma.productVariant.deleteMany({
      where: { id: { in: created.productVariantIds } }
    }).catch(() => {});
  }
  if (created.productIds.length > 0) {
    await prisma.productVariant.deleteMany({
      where: { productId: { in: created.productIds } }
    }).catch(() => {});
    await prisma.product.deleteMany({
      where: { id: { in: created.productIds } }
    }).catch(() => {});
  }

  // 4. Affiliates
  if (created.affiliateIds.length > 0) {
    await prisma.affiliate.deleteMany({
      where: { id: { in: created.affiliateIds } }
    }).catch(() => {});
  }

  // 5. Users
  if (created.userIds.length > 0) {
    await prisma.affiliate.deleteMany({
      where: { userId: { in: created.userIds } }
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: created.userIds } }
    }).catch(() => {});
  }

  // 6. Connections
  if (created.connectionIds.length > 0) {
    await prisma.companyConnection.deleteMany({
      where: { id: { in: created.connectionIds } }
    }).catch(() => {});
  }

  // 7. Companies
  if (created.companyIds.length > 0) {
    await prisma.company.deleteMany({
      where: { id: { in: created.companyIds } }
    }).catch(() => {});
  }
}

(async () => {
  console.log('==========================================================');
  console.log('linked-order-sync E2E Test (real DB: maxp_qa)');
  console.log('BE: ' + BE);
  console.log('TAG: ' + TAG);
  console.log('==========================================================\n');

  // Step 1: Create 2 companies
  const providerCompany = await prisma.company.create({
    data: {
      name: TAG + '-PROVIDER',
      email: TAG.toLowerCase() + '-prov@maxp.local'
    }
  });
  created.companyIds.push(providerCompany.id);

  const consumerCompany = await prisma.company.create({
    data: {
      name: TAG + '-CONSUMER',
      email: TAG.toLowerCase() + '-cons@maxp.local'
    }
  });
  created.companyIds.push(consumerCompany.id);

  // Step 2: Create OWNER user in consumer company (required by affiliateService)
  const ownerUser = await prisma.user.create({
    data: {
      email: TAG.toLowerCase() + '-owner@maxp.local',
      password: 'qa-hashed-password',
      firstName: 'Consumer',
      lastName: 'Owner',
      role: 'OWNER',
      isActive: true,
      companyId: consumerCompany.id
    }
  });
  created.userIds.push(ownerUser.id);

  // Step 3: Create ACTIVE companyConnection (both pull flags true)
  const connection = await prisma.companyConnection.create({
    data: {
      providerId: providerCompany.id,
      consumerId: consumerCompany.id,
      allowOrderPull: true,
      allowProductPull: true,
      status: 'ACTIVE'
    }
  });
  created.connectionIds.push(connection.id);

  // Step 4: Provider product with 2 variants whose metadata uses النوع / عدد_القطع
  const provProduct = await prisma.product.create({
    data: {
      name: 'منتج سيارات تجريبي',
      sku: TAG + '-PROV-SKU',
      price: 700,
      cost: 500,
      stock: 50,
      companyId: providerCompany.id
    }
  });
  created.productIds.push(provProduct.id);

  const variant1 = await prisma.productVariant.create({
    data: {
      productId: provProduct.id,
      name: 'ثابت - 7',
      sku: TAG + '-VAR-1',
      price: 700,
      metadata: JSON.stringify({
        attributeValues: {
          'النوع': 'ثابت',
          'عدد_القطع': '7'
        }
      })
    }
  });
  created.productVariantIds.push(variant1.id);

  const variant2 = await prisma.productVariant.create({
    data: {
      productId: provProduct.id,
      name: 'متحرك - 5',
      sku: TAG + '-VAR-2',
      price: 650,
      metadata: JSON.stringify({
        attributeValues: {
          'النوع': 'متحرك',
          'عدد_القطع': '5'
        }
      })
    }
  });
  created.productVariantIds.push(variant2.id);

  // Step 5: Consumer imported product (source:'internal', externalId = provider product id)
  const consProduct = await prisma.product.create({
    data: {
      name: 'منتج سيارات تجريبي (مستورد)',
      sku: TAG + '-CONS-SKU',
      price: 700,
      stock: 50,
      companyId: consumerCompany.id,
      source: 'internal',
      externalId: provProduct.id
    }
  });
  created.productIds.push(consProduct.id);

  // Step 6: Customer
  const consumerCustomer = await prisma.customer.create({
    data: {
      firstName: 'عميل',
      lastName: 'تجريبي',
      phone: '01099998888',
      whatsappId: '01099998888',
      companyId: consumerCompany.id,
      status: 'ACTIVE'
    }
  });
  created.customerIds.push(consumerCustomer.id);

  // Step 7: Consumer Order with exact brief specifications
  const consumerOrder = await prisma.order.create({
    data: {
      orderNumber: TAG + '-ORD-001',
      customerId: consumerCustomer.id,
      companyId: consumerCompany.id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      subtotal: 700,
      shipping: 25,
      discount: 10,
      tax: 0,
      total: 715,
      currency: 'EGP',
      notes: 'تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: جيب رينجيت 2017',
      metadata: JSON.stringify({ customFields: [{ label: 'اللون', value: 'أسود' }] }),
      customerName: 'عميل تجريبي',
      customerPhone: '01099998888',
      orderItems: {
        create: [
          {
            productId: consProduct.id,
            productName: consProduct.name,
            productSku: consProduct.sku,
            quantity: 1,
            price: 700,
            total: 700,
            productColor: 'ثابت',
            productSize: '7',
            metadata: JSON.stringify({
              attributeValues: {
                'النوع': 'ثابت',
                'عدد_القطع': '7',
                'car_model': 'جيب رينجيت 2017'
              }
            })
          }
        ]
      }
    }
  });
  created.orderIds.push(consumerOrder.id);

  console.log('📦 Pushing order segment to provider...');
  await internalSyncService.pushOrderToProvider(consumerOrder.id, consumerCompany.id);

  // Look up created provider order
  const providerOrder = await prisma.order.findFirst({
    where: {
      externalId: consumerOrder.id,
      sourceType: 'internal_push',
      companyId: providerCompany.id
    },
    include: {
      orderItems: true
    }
  });

  if (providerOrder) {
    created.orderIds.push(providerOrder.id);
  }

  check('Provider order was created', !!providerOrder, providerOrder ? providerOrder.id : null);

  if (providerOrder) {
    // 1. notes contains both the auto line AND جيب رينجيت 2017
    const notesStr = String(providerOrder.notes || '');
    const hasAutoLine = notesStr.includes('طلب آلي من متجر أفليت');
    const hasCarModel = notesStr.includes('جيب رينجيت 2017');
    check(
      '1. notes contains both the auto line AND جيب رينجيت 2017',
      hasAutoLine && hasCarModel,
      notesStr
    );

    // 2. order metadata parses and has internalSync.sourceOrderId === consumerOrder.id
    let parsedOrderMeta = {};
    try {
      parsedOrderMeta = JSON.parse(providerOrder.metadata || '{}');
    } catch (e) {}
    check(
      '2. order metadata parses and has internalSync.sourceOrderId === consumerOrder.id',
      parsedOrderMeta.internalSync && parsedOrderMeta.internalSync.sourceOrderId === consumerOrder.id,
      parsedOrderMeta
    );

    // 3. item metadata parses; attributeValues['car_model'] present; root car_model present
    const firstItem = providerOrder.orderItems && providerOrder.orderItems[0];
    let parsedItemMeta = {};
    try {
      parsedItemMeta = JSON.parse(firstItem?.metadata || '{}');
    } catch (e) {}
    const hasItemCarModel = parsedItemMeta.car_model === 'جيب رينجيت 2017';
    const hasAttrCarModel = parsedItemMeta.attributeValues && parsedItemMeta.attributeValues.car_model === 'جيب رينجيت 2017';
    check(
      '3. item metadata parses; attributeValues[car_model] present; root car_model present',
      hasItemCarModel && hasAttrCarModel,
      parsedItemMeta
    );

    // 4. item variantId equals the provider variant ثابت - 7
    check(
      '4. item variantId equals the provider variant ثابت - 7',
      firstItem && firstItem.variantId === variant1.id,
      firstItem ? firstItem.variantId : null
    );

    // 5. shipping=25, discount=10, total=715, currency='EGP'
    const isMoneyMatch =
      Number(providerOrder.shipping) === 25 &&
      Number(providerOrder.discount) === 10 &&
      Number(providerOrder.total) === 715 &&
      providerOrder.currency === 'EGP';
    check(
      '5. shipping=25, discount=10, total=715, currency=EGP',
      isMoneyMatch,
      {
        shipping: providerOrder.shipping,
        discount: providerOrder.discount,
        total: providerOrder.total,
        currency: providerOrder.currency
      }
    );

    // 6. externalId === consumerOrder.id, sourceType==='internal_push'
    check(
      '6. externalId === consumerOrder.id, sourceType===internal_push',
      providerOrder.externalId === consumerOrder.id && providerOrder.sourceType === 'internal_push',
      { externalId: providerOrder.externalId, sourceType: providerOrder.sourceType }
    );

    // --- Status sync tests ---

    // 7. linkedOrderSyncService.mirrorStatus({model:'Order', orderId: providerOrder.id, companyId: providerCompany.id, newStatus:'CONFIRMED'}) → consumer order CONFIRMED + 1 history row
    console.log('🔄 Mirroring status: Provider Order -> CONFIRMED');
    await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: providerOrder.id,
      companyId: providerCompany.id,
      newStatus: 'CONFIRMED'
    });

    const consumerAfterConfirm = await prisma.order.findUnique({
      where: { id: consumerOrder.id },
      include: { statusHistory: true }
    });
    const confirmHistories = (consumerAfterConfirm?.statusHistory || []).filter(h => h.status === 'CONFIRMED');
    check(
      '7. consumer order CONFIRMED + 1 history row',
      consumerAfterConfirm?.status === 'CONFIRMED' && confirmHistories.length === 1,
      { status: consumerAfterConfirm?.status, confirmHistoriesCount: confirmHistories.length }
    );

    // 8. mirrorStatus({model:'Order', orderId: consumerOrder.id, companyId: consumerCompany.id, newStatus:'CANCELLED'}) → provider copy CANCELLED
    console.log('🔄 Mirroring status: Consumer Order -> CANCELLED');
    await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: consumerOrder.id,
      companyId: consumerCompany.id,
      newStatus: 'CANCELLED'
    });

    const providerAfterCancel = await prisma.order.findUnique({
      where: { id: providerOrder.id }
    });
    check(
      '8. provider copy CANCELLED',
      providerAfterCancel?.status === 'CANCELLED',
      { status: providerAfterCancel?.status }
    );

    // 9. repeat provider CONFIRMED twice → still exactly one history row for that transition
    console.log('🔄 Mirroring status: Repeating provider CONFIRMED twice');
    await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: providerOrder.id,
      companyId: providerCompany.id,
      newStatus: 'CONFIRMED'
    });
    await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: providerOrder.id,
      companyId: providerCompany.id,
      newStatus: 'CONFIRMED'
    });

    const consumerAfterReconfirm = await prisma.order.findUnique({
      where: { id: consumerOrder.id },
      include: { statusHistory: true }
    });
    const reconfirmedHistories = (consumerAfterReconfirm?.statusHistory || []).filter(h => h.status === 'CONFIRMED');
    check(
      '9. repeat provider CONFIRMED twice -> still exactly one history row for that transition',
      reconfirmedHistories.length === 1,
      { totalConfirmHistories: reconfirmedHistories.length }
    );
  }

})().catch((e) => {
  console.error('❌ E2E CRASH:', e && e.stack ? e.stack : e);
  fail++;
  failures.push('Crash: ' + (e?.message || String(e)));
}).finally(async () => {
  await cleanup().catch(e => console.error('Cleanup error:', e.message));
  console.log('\n---------------------------------------------');
  console.log(`RESULT: PASS ${pass} / FAIL ${fail}`);
  if (failures.length) {
    console.log('FAILURES:\n - ' + failures.join('\n - '));
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(fail > 0 ? 1 : 0);
});
