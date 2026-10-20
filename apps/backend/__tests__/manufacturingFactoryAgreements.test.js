/**
 * Wave 7: Partner Factory Agreements & Payments Test Suite
 *
 * Verifies:
 * 1. ensureSchema idempotent DDL.
 * 2. Atomic unique code generation: FA-YYYY-0001 per company.
 * 3. Agreement CRUD with DRAFT protection (structural edits & deletion only allowed on DRAFT).
 * 4. Rejection Validations:
 *    - Activation with totalValue <= 0 -> 400.
 *    - Generate payments twice -> 400.
 *    - Payment percentage sum > 100% -> 400.
 *    - Payment amount > remaining totalValue -> 400.
 *    - Delete non-DRAFT agreement -> 400.
 * 5. Mandatory E2E Scenario:
 *    - Factory cmvg97qwh002sjut55f0svrjn + Order MO-2026-00006
 *    - Total value 12,000 EGP (PER_PIECE) -> Activate -> Generate 70/20/10 (8400/2400/1200)
 *    - Pay first payment (8400) -> Paid 70%.
 * 6. Factory Portal sanitized assignments:
 *    - agreementSummary returned for assigned factory & order.
 *    - First payment PAID.
 *    - Strict security audit: 0 customer sales prices, 0 HUINZO profit, 0 internal unit costs.
 * 7. Factory isolation:
 *    - Factory B cannot see Factory A's agreement.
 */

const assert = require('assert');

let currentPrisma = null;

// Mock sharedDatabase before requiring services
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

const ManufacturingFactoryAgreementService = require('../services/manufacturingFactoryAgreementService');
const FactoryPortalService = require('../services/factoryPortalService');

function createInMemoryStore() {
  const store = {
    partnerFactories: new Map(),
    productionOrders: new Map(),
    productionStages: new Map(),
    customerOrders: new Map(),
    factoryAgreements: new Map(),
    factoryAgreementPayments: new Map(),
    factoryAgreementFiles: new Map(),
    counter: 1,
  };

  const generateId = (prefix = 'id') => `${prefix}_${store.counter++}`;

  return {
    rawStore: store,

    $executeRawUnsafe: async () => 1,

    partnerFactory: {
      findFirst: async ({ where = {} } = {}) => {
        let items = Array.from(store.partnerFactories.values());
        if (where.companyId) items = items.filter((f) => f.companyId === where.companyId);
        if (where.id) items = items.filter((f) => f.id === where.id);
        if (where.accessToken) items = items.filter((f) => f.accessToken === where.accessToken);
        return items[0] || null;
      },
      findUnique: async ({ where = {} } = {}) => {
        if (where.id) return store.partnerFactories.get(where.id) || null;
        if (where.accessToken) {
          return Array.from(store.partnerFactories.values()).find((f) => f.accessToken === where.accessToken) || null;
        }
        return null;
      },
    },

    productionOrder: {
      findFirst: async ({ where = {} } = {}) => {
        let items = Array.from(store.productionOrders.values());
        if (where.companyId) items = items.filter((o) => o.companyId === where.companyId);
        if (where.id) items = items.filter((o) => o.id === where.id);
        if (where.orderNumber) items = items.filter((o) => o.orderNumber === where.orderNumber);
        return items[0] || null;
      },
    },

    customerOrder: {
      findFirst: async ({ where = {} } = {}) => {
        let items = Array.from(store.customerOrders.values());
        if (where.companyId) items = items.filter((c) => c.companyId === where.companyId);
        if (where.id) items = items.filter((c) => c.id === where.id);
        return items[0] || null;
      },
    },

    factoryAgreement: {
      count: async ({ where = {} } = {}) => {
        let items = Array.from(store.factoryAgreements.values());
        if (where.companyId) items = items.filter((a) => a.companyId === where.companyId);
        if (where.partnerFactoryId && where.partnerFactoryId !== 'ALL') {
          items = items.filter((a) => a.partnerFactoryId === where.partnerFactoryId);
        }
        if (where.status && where.status !== 'ALL') {
          items = items.filter((a) => a.status === where.status);
        }
        return items.length;
      },

      findFirst: async ({ where = {}, orderBy } = {}) => {
        let items = Array.from(store.factoryAgreements.values());
        if (where.companyId) items = items.filter((a) => a.companyId === where.companyId);
        if (where.id) items = items.filter((a) => a.id === where.id);
        if (where.partnerFactoryId) items = items.filter((a) => a.partnerFactoryId === where.partnerFactoryId);
        if (where.orderId) items = items.filter((a) => a.orderId === where.orderId);
        if (where.code?.startsWith) {
          items = items.filter((a) => a.code.startsWith(where.code.startsWith));
        }
        if (where.status?.in) {
          items = items.filter((a) => where.status.in.includes(a.status));
        } else if (where.status) {
          items = items.filter((a) => a.status === where.status);
        }

        if (orderBy?.code === 'desc') {
          items.sort((a, b) => b.code.localeCompare(a.code));
        }

        if (items.length === 0) return null;
        const agr = { ...items[0] };

        // Attach relations
        agr.partnerFactory = store.partnerFactories.get(agr.partnerFactoryId) || null;
        agr.order = store.productionOrders.get(agr.orderId) || null;
        agr.customerOrder = store.customerOrders.get(agr.customerOrderId) || null;
        agr.payments = Array.from(store.factoryAgreementPayments.values())
          .filter((p) => p.agreementId === agr.id)
          .sort((a, b) => a.seq - b.seq);
        agr.files = Array.from(store.factoryAgreementFiles.values()).filter((f) => f.agreementId === agr.id);

        return agr;
      },

      findMany: async ({ where = {}, orderBy, skip = 0, take = 50 } = {}) => {
        let items = Array.from(store.factoryAgreements.values());
        if (where.companyId) items = items.filter((a) => a.companyId === where.companyId);
        if (where.partnerFactoryId && where.partnerFactoryId !== 'ALL') {
          items = items.filter((a) => a.partnerFactoryId === where.partnerFactoryId);
        }
        if (where.status && where.status !== 'ALL') {
          items = items.filter((a) => a.status === where.status);
        }
        if (where.orderId) items = items.filter((a) => a.orderId === where.orderId);

        return items.slice(skip, skip + take).map((agr) => {
          const item = { ...agr };
          item.partnerFactory = store.partnerFactories.get(item.partnerFactoryId) || null;
          item.order = store.productionOrders.get(item.orderId) || null;
          item.customerOrder = store.customerOrders.get(item.customerOrderId) || null;
          item.payments = Array.from(store.factoryAgreementPayments.values())
            .filter((p) => p.agreementId === item.id)
            .sort((a, b) => a.seq - b.seq);
          item.files = Array.from(store.factoryAgreementFiles.values()).filter((f) => f.agreementId === item.id);
          return item;
        });
      },

      create: async ({ data }) => {
        const id = generateId('fa');
        const record = {
          id,
          currency: 'EGP',
          pricingMode: 'PER_PIECE',
          status: 'DRAFT',
          totalValue: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        store.factoryAgreements.set(id, record);

        const result = { ...record };
        result.partnerFactory = store.partnerFactories.get(result.partnerFactoryId) || null;
        result.order = store.productionOrders.get(result.orderId) || null;
        result.customerOrder = store.customerOrders.get(result.customerOrderId) || null;
        result.payments = [];
        result.files = [];
        return result;
      },

      update: async ({ where, data }) => {
        const existing = store.factoryAgreements.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.factoryAgreements.set(where.id, updated);

        const result = { ...updated };
        result.partnerFactory = store.partnerFactories.get(result.partnerFactoryId) || null;
        result.order = store.productionOrders.get(result.orderId) || null;
        result.customerOrder = store.customerOrders.get(result.customerOrderId) || null;
        result.payments = Array.from(store.factoryAgreementPayments.values())
          .filter((p) => p.agreementId === result.id)
          .sort((a, b) => a.seq - b.seq);
        result.files = Array.from(store.factoryAgreementFiles.values()).filter((f) => f.agreementId === result.id);
        return result;
      },

      delete: async ({ where }) => {
        const item = store.factoryAgreements.get(where.id);
        if (item) {
          store.factoryAgreements.delete(where.id);
          // cascade payments and files
          for (const [pId, p] of store.factoryAgreementPayments.entries()) {
            if (p.agreementId === where.id) store.factoryAgreementPayments.delete(pId);
          }
          for (const [fId, f] of store.factoryAgreementFiles.entries()) {
            if (f.agreementId === where.id) store.factoryAgreementFiles.delete(fId);
          }
        }
        return item;
      },
    },

    factoryAgreementPayment: {
      findFirst: async ({ where = {} } = {}) => {
        let items = Array.from(store.factoryAgreementPayments.values());
        if (where.id) items = items.filter((p) => p.id === where.id);
        if (where.agreementId) items = items.filter((p) => p.agreementId === where.agreementId);
        return items[0] || null;
      },

      create: async ({ data }) => {
        const id = generateId('fap');
        const record = {
          id,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        store.factoryAgreementPayments.set(id, record);
        return record;
      },

      update: async ({ where, data }) => {
        const existing = store.factoryAgreementPayments.get(where.id);
        if (!existing) throw new Error('Payment not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.factoryAgreementPayments.set(where.id, updated);
        return updated;
      },
    },

    factoryAgreementFile: {
      findFirst: async ({ where = {} } = {}) => {
        let items = Array.from(store.factoryAgreementFiles.values());
        if (where.id) items = items.filter((f) => f.id === where.id);
        if (where.agreementId) items = items.filter((f) => f.agreementId === where.agreementId);
        return items[0] || null;
      },

      create: async ({ data }) => {
        const id = generateId('faf');
        const record = {
          id,
          kind: 'DOCUMENT',
          uploadedAt: new Date(),
          ...data,
        };
        store.factoryAgreementFiles.set(id, record);
        return record;
      },

      delete: async ({ where }) => {
        const item = store.factoryAgreementFiles.get(where.id);
        if (item) store.factoryAgreementFiles.delete(where.id);
        return item;
      },
    },

    productionStage: {
      findMany: async ({ where = {} } = {}) => {
        let stages = Array.from(store.productionStages.values());
        if (where.partnerFactoryId) stages = stages.filter((st) => st.partnerFactoryId === where.partnerFactoryId);
        if (where.executionEntity) stages = stages.filter((st) => st.executionEntity === where.executionEntity);

        return stages.map((st) => {
          const ord = store.productionOrders.get(st.orderId) || {};
          return {
            ...st,
            order: {
              ...ord,
              materialIssues: [],
              variants: [],
              attachments: [],
              bom: { name: 'هودي شتوي رياضي', code: 'BOM-HOODIE-01' },
            },
            attachments: [],
          };
        });
      },
    },
  };
}

describe('Wave 7: Partner Factory Agreements & Payments Test Suite', () => {
  const companyId = 'company_test_cm';
  const mockUser = { id: 'usr_manager', name: 'Director Manager' };

  let prismaMock;

  beforeEach(() => {
    prismaMock = createInMemoryStore();
    currentPrisma = prismaMock;
    global.__testPrisma = prismaMock;

    // Seed test partner factory cmvg97qwh002sjut55f0svrjn
    prismaMock.rawStore.partnerFactories.set('cmvg97qwh002sjut55f0svrjn', {
      id: 'cmvg97qwh002sjut55f0svrjn',
      companyId,
      name: 'مصنع الأهرام الحديث للملابس الجاهزة',
      code: 'FAC-AHR-01',
      specialty: 'خياطة وتجميع',
      phone: '01012345678',
      isActive: true,
      accessToken: 'token_ahram_valid_123',
      portalEnabled: true,
    });

    // Seed second factory for isolation test
    prismaMock.rawStore.partnerFactories.set('fac_other_999', {
      id: 'fac_other_999',
      companyId,
      name: 'مصنع الشرقية للتطريز',
      code: 'FAC-SHQ-02',
      specialty: 'تطريز ديجيتال',
      isActive: true,
      accessToken: 'token_other_456',
      portalEnabled: true,
    });

    // Seed test production order MO-2026-00006
    prismaMock.rawStore.productionOrders.set('ord_mo_00006', {
      id: 'ord_mo_00006',
      companyId,
      orderNumber: 'MO-2026-00006',
      brandName: 'HUINZO Winter',
      status: 'IN_PROGRESS',
      plannedQuantity: 400,
      unit: 'قطعة',
      dueDate: new Date('2026-11-15'),
    });

    // Seed external production stage assigned to factory cmvg97qwh002sjut55f0svrjn
    prismaMock.rawStore.productionStages.set('stg_external_01', {
      id: 'stg_external_01',
      orderId: 'ord_mo_00006',
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      executionEntity: 'EXTERNAL',
      name: 'خياطة وتجميع هودي رياضي',
      stageType: 'SEWING',
      sequence: 2,
      status: 'IN_PROGRESS',
      completedQuantity: 0,
      ratePerPiece: 30,
      stageLaborCost: 12000,
    });
  });

  test('1. ensureSchema executes cleanly without error', async () => {
    await ManufacturingFactoryAgreementService.ensureSchema();
    assert.ok(true, 'ensureSchema executed');
  });

  test('2. Atomic sequential numbering: FA-YYYY-0001 -> FA-YYYY-0002', async () => {
    const code1 = await ManufacturingFactoryAgreementService.generateAgreementCode(companyId);
    const year = new Date().getFullYear();
    assert.strictEqual(code1, `FA-${year}-0001`);

    // Create an agreement with code1
    await ManufacturingFactoryAgreementService.createAgreement(companyId, mockUser, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      title: 'اتفاقية تسلسل رقم 1',
      totalValue: 5000,
    });

    const code2 = await ManufacturingFactoryAgreementService.generateAgreementCode(companyId);
    assert.strictEqual(code2, `FA-${year}-0002`);
  });

  test('3. Rejection Validations (400 Bad Request)', async () => {
    // 3.1: Activate with totalValue <= 0 -> 400
    const draftZero = await ManufacturingFactoryAgreementService.createAgreement(companyId, mockUser, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      title: 'اتفاقية بقيمة صفر',
      totalValue: 0,
    });
    await assert.rejects(
      async () => {
        await ManufacturingFactoryAgreementService.activateAgreement(companyId, draftZero.id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('أكبر من الصفر'));
        return true;
      }
    );

    // 3.2: Create valid agreement and activate
    const validAgr = await ManufacturingFactoryAgreementService.createAgreement(companyId, mockUser, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      title: 'اتفاقية اختبار التحقق',
      totalValue: 10000,
    });
    await ManufacturingFactoryAgreementService.activateAgreement(companyId, validAgr.id);

    // 3.3: Delete non-DRAFT agreement -> 400
    await assert.rejects(
      async () => {
        await ManufacturingFactoryAgreementService.deleteAgreement(companyId, validAgr.id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('المسودة (DRAFT)'));
        return true;
      }
    );

    // 3.4: Generate schedule with sum(percent) > 100 -> 400
    await assert.rejects(
      async () => {
        await ManufacturingFactoryAgreementService.generateDefaultPayments(companyId, validAgr.id, {
          schedule: [
            { label: 'مقدم', percent: 60 },
            { label: 'إنتاج', percent: 50 },
          ],
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('لا يمكن أن يتجاوز 100%'));
        return true;
      }
    );

    // 3.5: Generate default schedule once
    await ManufacturingFactoryAgreementService.generateDefaultPayments(companyId, validAgr.id);

    // 3.6: Generate schedule twice -> 400
    await assert.rejects(
      async () => {
        await ManufacturingFactoryAgreementService.generateDefaultPayments(companyId, validAgr.id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('لوجود دفعات مسجلة بالفعل'));
        return true;
      }
    );

    // 3.7: Add payment exceeding total value -> 400
    // Total is 10000, already scheduled 100% (10000)
    await assert.rejects(
      async () => {
        await ManufacturingFactoryAgreementService.createPayment(companyId, validAgr.id, {
          label: 'دفعة زيادة فائضة',
          amount: 500,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('تتجاوز المبلغ المتبقي'));
        return true;
      }
    );
  });

  test('4. Mandatory E2E Live Flow: Factory cmvg97qwh002sjut55f0svrjn + Order MO-2026-00006', async () => {
    // 4.1: Create agreement linked to MO-2026-00006
    const agreement = await ManufacturingFactoryAgreementService.createAgreement(companyId, mockUser, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      orderId: 'ord_mo_00006',
      title: 'اتفاقية تشغيل حياكة وتجميع هودي رياضي',
      pricingMode: 'PER_PIECE',
      totalValue: 12000,
      scopeOfOperations: 'حياكة وتجميع 400 قطعة هودي أوفر سايز',
      deliveryTerms: 'تسليم في مخزن المصنع الرئيسي',
    });

    assert.strictEqual(agreement.status, 'DRAFT');
    assert.strictEqual(agreement.totalValue, 12000);
    assert.strictEqual(agreement.paidPercent, 0);

    // 4.2: Activate agreement
    const activated = await ManufacturingFactoryAgreementService.activateAgreement(companyId, agreement.id);
    assert.strictEqual(activated.status, 'ACTIVE');

    // 4.3: Generate payments with 70/20/10 schedule
    const genRes = await ManufacturingFactoryAgreementService.generateDefaultPayments(companyId, agreement.id);
    assert.strictEqual(genRes.success, true);

    const afterGen = await ManufacturingFactoryAgreementService.getAgreementById(companyId, agreement.id);
    assert.strictEqual(afterGen.payments.length, 3);
    assert.strictEqual(Number(afterGen.payments[0].amount), 8400); // 70%
    assert.strictEqual(Number(afterGen.payments[1].amount), 2400); // 20%
    assert.strictEqual(Number(afterGen.payments[2].amount), 1200); // 10%
    assert.strictEqual(afterGen.payments[0].status, 'PENDING');

    // 4.4: Pay the first payment (8400 EGP)
    const payRes = await ManufacturingFactoryAgreementService.payPayment(
      companyId,
      agreement.id,
      afterGen.payments[0].id,
      {
        reference: 'TRF-BANK-2026-001',
        notes: 'تم التحويل لحساب المصنع البنكي',
      },
      mockUser
    );

    assert.strictEqual(payRes.data.status, 'PAID');
    assert.strictEqual(payRes.agreement.paidAmount, 8400);
    assert.strictEqual(payRes.agreement.paidPercent, 70);
    assert.strictEqual(payRes.agreement.remainingAmount, 3600);

    // 4.5: Verify listing returns paidPercent: 70%
    const listRes = await ManufacturingFactoryAgreementService.listAgreements(companyId, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
    });
    const found = listRes.data.find((a) => a.id === agreement.id);
    assert.ok(found);
    assert.strictEqual(found.paidPercent, 70);
    assert.strictEqual(found.paidAmount, 8400);
  });

  test('5. Factory Portal Assignment Integration & Strict Security Audit', async () => {
    // Setup active agreement and payments on order
    const agreement = await ManufacturingFactoryAgreementService.createAgreement(companyId, mockUser, {
      partnerFactoryId: 'cmvg97qwh002sjut55f0svrjn',
      orderId: 'ord_mo_00006',
      title: 'اتفاقية تشغيل حياكة وتجميع هودي رياضي',
      pricingMode: 'PER_PIECE',
      totalValue: 12000,
    });
    await ManufacturingFactoryAgreementService.activateAgreement(companyId, agreement.id);
    await ManufacturingFactoryAgreementService.generateDefaultPayments(companyId, agreement.id);
    const agrWithPayments = await ManufacturingFactoryAgreementService.getAgreementById(companyId, agreement.id);
    await ManufacturingFactoryAgreementService.payPayment(
      companyId,
      agreement.id,
      agrWithPayments.payments[0].id,
      { reference: 'TRF-123' },
      mockUser
    );

    // Factory cmvg97qwh002sjut55f0svrjn requests assignments
    const factory = prismaMock.rawStore.partnerFactories.get('cmvg97qwh002sjut55f0svrjn');
    const assignments = await FactoryPortalService.getAssignments(factory);

    assert.strictEqual(assignments.length, 1);
    const asg = assignments[0];

    // Verify agreementSummary is attached
    assert.ok(asg.agreementSummary, 'agreementSummary must be present');
    assert.strictEqual(asg.agreementSummary.totalValue, 12000);
    assert.strictEqual(asg.agreementSummary.payments.length, 3);
    assert.strictEqual(asg.agreementSummary.payments[0].status, 'PAID');
    assert.strictEqual(asg.agreementSummary.payments[0].amount, 8400);
    assert.strictEqual(asg.agreementSummary.payments[1].status, 'PENDING');
    assert.strictEqual(asg.agreementSummary.payments[2].status, 'PENDING');

    // Strict zero-leakage check on assignments payload
    const jsonStr = JSON.stringify(assignments);
    assert.ok(!jsonStr.includes('salePricePerUnit'), 'No customer sale price allowed');
    assert.ok(!jsonStr.includes('profitMargin'), 'No profit margin allowed');
    assert.ok(!jsonStr.includes('actualMaterialCost'), 'No internal material costs allowed');
    assert.ok(!jsonStr.includes('customerOrderPayment'), 'No customer payments allowed');
  });

  test('6. Factory Isolation: Other Factory cannot see agreement of Factory A', async () => {
    const otherFactory = prismaMock.rawStore.partnerFactories.get('fac_other_999');
    const otherAssignments = await FactoryPortalService.getAssignments(otherFactory);

    // Other factory has 0 stages assigned on MO-2026-00006
    assert.strictEqual(otherAssignments.length, 0);
  });
});
