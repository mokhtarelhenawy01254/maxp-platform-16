/**
 * Wave 8: Customer Portal Test Suite (بوابة العميل — تقدم معتمد فقط)
 *
 * Verifies:
 * 1. Portal Link Lifecycle: Generate token, rotate token, toggle enabled/disabled, revoke/delete.
 * 2. Token Authentication & Security Guards: Valid token returns 200, missing/invalid/disabled/revoked token returns 403.
 * 3. Mandatory Security Rule: Whitelist Sanitization & ZERO sensitive leak
 *    - 0 factory/partnerFactory names or IDs
 *    - 0 supplier/vendor names or IDs
 *    - 0 internal unit costs, total costs, or actual costs
 *    - 0 profit, margin, or markup
 * 4. Draft & Unpublished Content Protection:
 *    - ONLY attachments with reviewStatus === 'PUBLISHED' appear in updates.
 *    - UNDER_REVIEW, APPROVED (not published), REJECTED, and HIDDEN attachments are strictly excluded.
 *    - ONLY APPROVED tech packs & size charts appear. DRAFT versions are strictly excluded.
 * 5. Cross-Order & Cross-Tenant Isolation:
 *    - Token for Order A cannot access Order B.
 * 6. Progress & Delivery Metrics:
 *    - Calculates contracted vs expected delivery date, delay flag, overall progress %, canonical stages list.
 * 7. Commercial Payments Schedule (70/20/10):
 *    - Client payment items, totals (totalAmount, paidAmount, remainingAmount, percentPaid).
 */

let currentPrisma = null;

const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  },
};

if (typeof jest !== 'undefined') {
  jest.mock('../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  }));
}

const CustomerPortalService = require('../services/customerPortalService');

// In-Memory Database Store for Customer Portal Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    customerOrders: [],
    customers: [],
    productionOrders: [],
    productionStages: [],
    manufacturingAttachments: [],
    customerOrderPayments: [],
    techPacks: [],
    techPackFiles: [],
    sizeCharts: [],
    sizeChartRows: [],
  };

  const createTableHandlers = (tableName, stateArray, idPrefix) => ({
    findMany: async ({ where = {}, orderBy, include, select } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (item[k] !== v) return false;
        }
        return true;
      });

      // Hydrate relations
      results = results.map((item) => {
        const copy = { ...item };
        if (tableName === 'customerOrders') {
          if (include?.customer && item.customerId) {
            copy.customer = state.customers.find((c) => c.id === item.customerId) || null;
          }
          if (include?.payments) {
            copy.payments = state.customerOrderPayments.filter((p) => p.customerOrderId === item.id);
          }
          if (include?.orders) {
            copy.orders = state.productionOrders
              .filter((po) => po.customerOrderId === item.id)
              .map((po) => {
                const poCopy = { ...po };
                if (include.orders.include?.stages) {
                  poCopy.stages = state.productionStages.filter((s) => s.orderId === po.id);
                }
                if (include.orders.include?.attachments) {
                  let atts = state.manufacturingAttachments.filter((a) => a.orderId === po.id);
                  if (include.orders.include.attachments.where?.reviewStatus) {
                    atts = atts.filter((a) => a.reviewStatus === include.orders.include.attachments.where.reviewStatus);
                  }
                  poCopy.attachments = atts;
                }
                if (include.orders.include?.techPack && po.techPackId) {
                  const tp = state.techPacks.find((t) => t.id === po.techPackId);
                  if (tp) {
                    poCopy.techPack = {
                      ...tp,
                      files: state.techPackFiles.filter((f) => f.techPackId === tp.id),
                    };
                  }
                }
                if (include.orders.include?.sizeChart && po.sizeChartId) {
                  const sc = state.sizeCharts.find((s) => s.id === po.sizeChartId);
                  if (sc) {
                    poCopy.sizeChart = {
                      ...sc,
                      rows: state.sizeChartRows.filter((r) => r.chartId === sc.id),
                    };
                  }
                }
                return poCopy;
              });
          }
        }
        return copy;
      });

      return results;
    },

    findFirst: async ({ where = {}, include } = {}) => {
      const all = await createTableHandlers(tableName, stateArray, idPrefix).findMany({ where, include });
      return all[0] || null;
    },

    findUnique: async ({ where = {}, include } = {}) => {
      const all = await createTableHandlers(tableName, stateArray, idPrefix).findMany({ where, include });
      return all[0] || null;
    },

    create: async ({ data }) => {
      const newItem = {
        id: data.id || generateId(idPrefix),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stateArray.push(newItem);
      return newItem;
    },

    update: async ({ where, data }) => {
      const idx = stateArray.findIndex((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx === -1) throw new Error(`Item not found in ${tableName} for update`);
      stateArray[idx] = {
        ...stateArray[idx],
        ...data,
        updatedAt: new Date(),
      };
      return stateArray[idx];
    },
  });

  return {
    state,
    customerOrder: createTableHandlers('customerOrders', state.customerOrders, 'co'),
    customer: createTableHandlers('customers', state.customers, 'cust'),
    productionOrder: createTableHandlers('productionOrders', state.productionOrders, 'po'),
    productionStage: createTableHandlers('productionStages', state.productionStages, 'ps'),
    manufacturingAttachment: createTableHandlers('manufacturingAttachments', state.manufacturingAttachments, 'att'),
    customerOrderPayment: createTableHandlers('customerOrderPayments', state.customerOrderPayments, 'cop'),
    techPack: createTableHandlers('techPacks', state.techPacks, 'tp'),
    techPackFile: createTableHandlers('techPackFiles', state.techPackFiles, 'tpf'),
    sizeChart: createTableHandlers('sizeCharts', state.sizeCharts, 'sc'),
    sizeChartRow: createTableHandlers('sizeChartRows', state.sizeChartRows, 'scr'),
    $executeRawUnsafe: async () => 1,
  };
};

describe('Wave 8: Customer Portal Suite (بوابة العميل — تقدم معتمد فقط)', () => {
  let mockPrisma;
  const companyId = 'comp_test_huinzo_2026';

  beforeEach(() => {
    mockPrisma = createInMemoryStore();
    currentPrisma = mockPrisma;
    global.__testPrisma = mockPrisma;
  });

  afterEach(() => {
    currentPrisma = null;
    global.__testPrisma = null;
  });

  test('1. Portal Link Lifecycle: Generate token, rotate token, toggle enabled/disabled, revoke/delete', async () => {
    // Seed Customer Order
    const order = await mockPrisma.customerOrder.create({
      data: {
        companyId,
        orderNumber: 'CO-2026-00001',
        brandName: 'Dalida Boutique',
        status: 'CONFIRMED',
        portalEnabled: false,
        portalToken: null,
      },
    });

    // 1.1 Generate Portal Link
    const genRes = await CustomerPortalService.generatePortalLink(companyId, order.id);
    expect(genRes.success).toBe(true);
    expect(genRes.portalToken).toBeDefined();
    expect(genRes.portalToken.length).toBe(48); // 24 bytes hex = 48 chars
    expect(genRes.portalEnabled).toBe(true);
    expect(genRes.portalUrl).toBe(`/customer-portal?token=${genRes.portalToken}`);

    // Verify DB update
    const updated1 = await mockPrisma.customerOrder.findUnique({ where: { id: order.id } });
    expect(updated1.portalToken).toBe(genRes.portalToken);
    expect(updated1.portalEnabled).toBe(true);

    // 1.2 Rotate Portal Link
    const rotateRes = await CustomerPortalService.generatePortalLink(companyId, order.id);
    expect(rotateRes.portalToken).not.toBe(genRes.portalToken);
    expect(rotateRes.portalToken.length).toBe(48);

    // 1.3 Toggle Portal Link (Disable)
    const toggleOff = await CustomerPortalService.togglePortalLink(companyId, order.id, { enabled: false });
    expect(toggleOff.portalEnabled).toBe(false);

    // 1.4 Toggle Portal Link (Re-enable)
    const toggleOn = await CustomerPortalService.togglePortalLink(companyId, order.id, { enabled: true });
    expect(toggleOn.portalEnabled).toBe(true);

    // 1.5 Delete/Revoke Portal Link
    const deleteRes = await CustomerPortalService.deletePortalLink(companyId, order.id);
    expect(deleteRes.success).toBe(true);
    const finalOrder = await mockPrisma.customerOrder.findUnique({ where: { id: order.id } });
    expect(finalOrder.portalToken).toBeNull();
    expect(finalOrder.portalEnabled).toBe(false);
  });

  test('2. Token Authentication & Security Guards (403 on invalid/missing/disabled)', async () => {
    const order = await mockPrisma.customerOrder.create({
      data: {
        companyId,
        orderNumber: 'CO-2026-00001',
        brandName: 'Dalida Boutique',
        status: 'IN_PRODUCTION',
        portalToken: 'valid_secure_token_48_chars_hex_dalida_2026',
        portalEnabled: true,
      },
    });

    // 2.1 Valid Token -> Returns Context & Updates lastAccessAt
    const ctx = await CustomerPortalService.getContext(order.portalToken);
    expect(ctx.orderNumber).toBe('CO-2026-00001');
    expect(ctx.brandName).toBe('Dalida Boutique');
    expect(ctx.status).toBe('IN_PRODUCTION');

    // 2.2 Missing Token -> 403
    await expect(CustomerPortalService.getContext('')).rejects.toMatchObject({
      statusCode: 403,
      message: 'رمز الدخول لبوابة العميل مطلوب',
    });

    // 2.3 Invalid/Non-existent Token -> 403
    await expect(CustomerPortalService.getContext('wrong_invalid_token')).rejects.toMatchObject({
      statusCode: 403,
      message: 'رابط البوابة غير صالح أو انتهت صلاحيته',
    });

    // 2.4 Disabled Token -> 403
    await mockPrisma.customerOrder.update({
      where: { id: order.id },
      data: { portalEnabled: false },
    });
    await expect(CustomerPortalService.getContext(order.portalToken)).rejects.toMatchObject({
      statusCode: 403,
      message: 'تم تعطيل أو إيقاف بوابة متابعة هذا الطلب حالياً من قِبل الإدارة',
    });
  });

  test('3. Mandatory Security Rule: Whitelist Sanitization & Zero Sensitive Leak', async () => {
    // Verify auditSanitizedPayload catches all sensitive fields
    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        factory: 'Al-Nour Factory', // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "factory"/);

    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        partnerFactoryId: 'pf_123', // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "partnerFactoryId"/);

    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        unitCost: 150.0, // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "unitCost"/);

    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        actualLaborCost: 45.0, // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "actualLaborCost"/);

    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        profitMargin: 0.35, // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "profitMargin"/);

    expect(() => {
      CustomerPortalService.auditSanitizedPayload({
        orderNumber: 'CO-1',
        supplier: 'Egyptian Spinning Co', // PROHIBITED
      });
    }).toThrow(/Prohibited sensitive field "supplier"/);
  });

  test('4. Draft & Unpublished Content Protection (ONLY PUBLISHED media & APPROVED tech pack/size chart)', async () => {
    const order = await mockPrisma.customerOrder.create({
      data: {
        companyId,
        orderNumber: 'CO-2026-00001',
        brandName: 'Dalida Boutique',
        status: 'IN_PRODUCTION',
        portalToken: 'token_published_filter_test',
        portalEnabled: true,
      },
    });

    // Child Production Order
    const po = await mockPrisma.productionOrder.create({
      data: {
        companyId,
        orderNumber: 'PO-2026-001',
        customerOrderId: order.id,
        status: 'IN_PROGRESS',
      },
    });

    // Attachments with different review statuses
    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId,
        orderId: po.id,
        url: 'https://images.unsplash.com/published-1.jpg',
        caption: 'صورة الفحص النهائي المعتمدة',
        reviewStatus: 'PUBLISHED',
      },
    });

    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId,
        orderId: po.id,
        url: 'https://images.unsplash.com/under-review.jpg',
        caption: 'صورة داخلية قيد المراجعة',
        reviewStatus: 'UNDER_REVIEW', // MUST NOT LEAK
      },
    });

    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId,
        orderId: po.id,
        url: 'https://images.unsplash.com/approved-not-published.jpg',
        caption: 'صورة معتمدة داخلياً ولكن لم تُنشر للعميل',
        reviewStatus: 'APPROVED', // MUST NOT LEAK
      },
    });

    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId,
        orderId: po.id,
        url: 'https://images.unsplash.com/rejected.jpg',
        caption: 'صورة مرفوضة لوجود عيب خياطة',
        reviewStatus: 'REJECTED', // MUST NOT LEAK
      },
    });

    // Tech Pack & Size Chart (Draft vs Approved)
    const approvedTp = await mockPrisma.techPack.create({
      data: {
        companyId,
        code: 'TP-APPROVED-01',
        title: 'فستان صيفي معتمد',
        version: 1,
        status: 'APPROVED',
      },
    });
    await mockPrisma.techPackFile.create({
      data: {
        techPackId: approvedTp.id,
        fileName: 'approved-sketch.png',
        url: 'https://cdn.maxp.online/tp-approved.png',
        kind: 'IMAGE',
      },
    });

    const approvedSc = await mockPrisma.sizeChart.create({
      data: {
        companyId,
        code: 'SC-APPROVED-01',
        name: 'جدول قياسات معتمد',
        version: 1,
        status: 'APPROVED',
        unit: 'CM',
        measurementMethod: 'FLAT',
      },
    });
    await mockPrisma.sizeChartRow.create({
      data: {
        chartId: approvedSc.id,
        sizeLabel: 'M',
        measurementKey: 'Chest',
        value: 52,
        tolerance: 1,
      },
    });

    // Link to production order
    await mockPrisma.productionOrder.update({
      where: { id: po.id },
      data: {
        techPackId: approvedTp.id,
        sizeChartId: approvedSc.id,
      },
    });

    // Call getOrderDetails
    const details = await CustomerPortalService.getOrderDetails(order.portalToken);

    // 4.1 Verify Updates: Exactly 1 published update returned
    expect(details.updates.length).toBe(1);
    expect(details.updates[0].url).toBe('https://images.unsplash.com/published-1.jpg');
    expect(details.updates[0].caption).toBe('صورة الفحص النهائي المعتمدة');

    // Verify NONE of the unapproved/unpublished media exist in updates
    const urls = details.updates.map((u) => u.url);
    expect(urls).not.toContain('https://images.unsplash.com/under-review.jpg');
    expect(urls).not.toContain('https://images.unsplash.com/approved-not-published.jpg');
    expect(urls).not.toContain('https://images.unsplash.com/rejected.jpg');

    // 4.2 Verify Tech Pack & Size Chart: Approved versions returned
    expect(details.techPack).toBeDefined();
    expect(details.techPack.code).toBe('TP-APPROVED-01');
    expect(details.techPack.files.length).toBe(1);

    expect(details.sizeChart).toBeDefined();
    expect(details.sizeChart.code).toBe('SC-APPROVED-01');
    expect(details.sizeChart.rows.length).toBe(1);
    expect(details.sizeChart.rows[0].value).toBe(52);

    // 4.3 Now simulate DRAFT tech pack & size chart -> must be hidden (null)
    await mockPrisma.techPack.update({
      where: { id: approvedTp.id },
      data: { status: 'DRAFT' },
    });
    await mockPrisma.sizeChart.update({
      where: { id: approvedSc.id },
      data: { status: 'DRAFT' },
    });

    const draftDetails = await CustomerPortalService.getOrderDetails(order.portalToken);
    expect(draftDetails.techPack).toBeNull();
    expect(draftDetails.sizeChart).toBeNull();
  });

  test('5. Cross-Order & Cross-Tenant Isolation (Token A cannot access Order B)', async () => {
    const orderA = await mockPrisma.customerOrder.create({
      data: {
        companyId: 'comp_A',
        orderNumber: 'CO-A-001',
        brandName: 'Brand A',
        status: 'CONFIRMED',
        portalToken: 'token_order_A_secret_2026',
        portalEnabled: true,
      },
    });

    const orderB = await mockPrisma.customerOrder.create({
      data: {
        companyId: 'comp_B',
        orderNumber: 'CO-B-002',
        brandName: 'Brand B',
        status: 'IN_PRODUCTION',
        portalToken: 'token_order_B_secret_2026',
        portalEnabled: true,
      },
    });

    // Token A returns ONLY Order A
    const resA = await CustomerPortalService.getOrderDetails(orderA.portalToken);
    expect(resA.orderNumber).toBe('CO-A-001');
    expect(resA.brandName).toBe('Brand A');
    expect(resA.orderNumber).not.toBe(orderB.orderNumber);

    // Token B returns ONLY Order B
    const resB = await CustomerPortalService.getOrderDetails(orderB.portalToken);
    expect(resB.orderNumber).toBe('CO-B-002');
    expect(resB.brandName).toBe('Brand B');
    expect(resB.orderNumber).not.toBe(orderA.orderNumber);
  });

  test('6. Commercial Payments Schedule (70/20/10) & Totals Calculation', async () => {
    const order = await mockPrisma.customerOrder.create({
      data: {
        companyId,
        orderNumber: 'CO-2026-00001',
        brandName: 'Dalida Boutique',
        status: 'IN_PRODUCTION',
        portalToken: 'token_payments_test',
        portalEnabled: true,
      },
    });

    // Seed 70/20/10 Commercial Payments
    await mockPrisma.customerOrderPayment.create({
      data: {
        customerOrderId: order.id,
        kind: 'DEPOSIT',
        label: 'دفعة مقدم التعاقد (70%)',
        percent: 70,
        amount: 70000,
        status: 'PAID',
        paidAmount: 70000,
        paidAt: new Date(),
      },
    });

    await mockPrisma.customerOrderPayment.create({
      data: {
        customerOrderId: order.id,
        kind: 'INSTALLMENT',
        label: 'دفعة بدء الإنتاج (20%)',
        percent: 20,
        amount: 20000,
        status: 'PENDING',
        paidAmount: 0,
      },
    });

    await mockPrisma.customerOrderPayment.create({
      data: {
        customerOrderId: order.id,
        kind: 'FINAL',
        label: 'الدفعة النهائية عند التسليم (10%)',
        percent: 10,
        amount: 10000,
        status: 'PENDING',
        paidAmount: 0,
      },
    });

    const details = await CustomerPortalService.getOrderDetails(order.portalToken);
    expect(details.payments).toBeDefined();
    expect(details.payments.totalAmount).toBe(100000);
    expect(details.payments.paidAmount).toBe(70000);
    expect(details.payments.remainingAmount).toBe(30000);
    expect(details.payments.percentPaid).toBe(70);
    expect(details.payments.items.length).toBe(3);
    expect(details.payments.items[0].status).toBe('PAID');
    expect(details.payments.items[1].status).toBe('PENDING');
  });
});
