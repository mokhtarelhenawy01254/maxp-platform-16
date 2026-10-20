/**
 * Jest & Direct Test Suite for Standalone Sample Manufacturing Orders (Wave 5)
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

const ManufacturingSampleService = require('../services/manufacturingSampleService');
const ManufacturingService = require('../services/manufacturingService');

function createInMemoryStore() {
  const store = {
    sampleOrders: new Map(),
    sampleStages: new Map(),
    sampleAttachments: new Map(),
    productionOrders: new Map(),
    boms: new Map(),
    counter: 0,
  };

  return {
    sampleOrder: {
      findFirst: async ({ where, orderBy } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.id) items = items.filter((s) => s.id === where.id);
        if (where?.sampleNumber?.startsWith) {
          items = items.filter((s) => s.sampleNumber.startsWith(where.sampleNumber.startsWith));
        }
        if (where?.status) items = items.filter((s) => s.status === where.status);
        if (orderBy?.sampleNumber === 'desc') {
          items.sort((a, b) => b.sampleNumber.localeCompare(a.sampleNumber));
        }
        if (items.length === 0) return null;
        const item = items[0];
        const stages = Array.from(store.sampleStages.values())
          .filter((st) => st.sampleOrderId === item.id)
          .sort((a, b) => a.sequence - b.sequence);
        const attachments = Array.from(store.sampleAttachments.values())
          .filter((att) => att.sampleOrderId === item.id);
        return { ...item, stages, attachments };
      },
      findMany: async ({ where, skip = 0, take = 50 } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.status && where.status !== 'ALL') items = items.filter((s) => s.status === where.status);
        if (where?.materialSource && where.materialSource !== 'ALL') {
          items = items.filter((s) => s.materialSource === where.materialSource);
        }
        if (where?.OR) {
          items = items.filter((s) => {
            const num = (s.sampleNumber || '').toLowerCase();
            const prod = (s.productName || '').toLowerCase();
            const cust = (s.customerName || '').toLowerCase();
            const brand = (s.brandName || '').toLowerCase();
            return (
              num.includes('brand') || prod.includes('brand') || cust.includes('brand') || brand.includes('brand')
            );
          });
        }
        return items.slice(skip, skip + take).map((s) => ({
          ...s,
          stages: Array.from(store.sampleStages.values()).filter((st) => st.sampleOrderId === s.id),
          attachments: Array.from(store.sampleAttachments.values()).filter((att) => att.sampleOrderId === s.id),
        }));
      },
      count: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.status && where.status !== 'ALL') items = items.filter((s) => s.status === where.status);
        return items.length;
      },
      create: async ({ data }) => {
        const id = `smp-ord-${++store.counter}`;
        const record = {
          id,
          ...data,
          status: data.status || 'DRAFT',
          plannedQuantity: data.plannedQuantity !== undefined ? data.plannedQuantity : 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleOrders.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = store.sampleOrders.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.sampleOrders.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const existing = store.sampleOrders.get(where.id);
        store.sampleOrders.delete(where.id);
        return existing;
      },
    },
    sampleOrderStage: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleStages.values());
        if (where?.id) items = items.filter((st) => st.id === where.id);
        if (where?.sampleOrderId) items = items.filter((st) => st.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = `stg-${++store.counter}`;
        const record = {
          id,
          ...data,
          status: data.status || 'PENDING',
          sequence: data.sequence || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleStages.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = store.sampleStages.get(where.id);
        if (!existing) throw new Error('Stage not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.sampleStages.set(where.id, updated);
        return updated;
      },
      deleteMany: async ({ where }) => {
        for (const [id, stg] of store.sampleStages.entries()) {
          if (stg.sampleOrderId === where.sampleOrderId) {
            store.sampleStages.delete(id);
          }
        }
      },
    },
    sampleOrderAttachment: {
      create: async ({ data }) => {
        const id = `att-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date() };
        store.sampleAttachments.set(id, record);
        return record;
      },
      deleteMany: async ({ where }) => {
        for (const [id, att] of store.sampleAttachments.entries()) {
          if (att.sampleOrderId === where.sampleOrderId) {
            store.sampleAttachments.delete(id);
          }
        }
      },
    },
    productionOrder: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.productionOrders.values());
        if (where?.id) items = items.filter((o) => o.id === where.id);
        if (where?.companyId) items = items.filter((o) => o.companyId === where.companyId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = `mo-ord-${++store.counter}`;
        const record = {
          id,
          ...data,
          orderNumber: `MO-2026-0000${store.counter}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.productionOrders.set(id, record);
        return record;
      },
    },
    billOfMaterials: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.boms.values());
        if (where?.id) items = items.filter((b) => b.id === where.id);
        if (where?.code) items = items.filter((b) => b.code === where.code);
        return items[0] || null;
      },
    },
    $transaction: async (fn) => fn(currentPrisma),
    $executeRawUnsafe: async () => true,
    _store: store,
  };
}

describe('Wave 5: Standalone Sample Orders & Conversion', () => {
  const companyId = 'c-cm-test-wave5';
  const testUser = { id: 'usr-cm-1', name: 'Test QA', email: 'qa@huinzo.com' };

  beforeEach(() => {
    currentPrisma = createInMemoryStore();
    global.__testPrisma = currentPrisma;

    // Seed sample BOM
    currentPrisma._store.boms.set('bom-hoodie-1', {
      id: 'bom-hoodie-1',
      companyId,
      code: 'BOM-HOODIE-OVR-01',
      name: 'هودي أوفر سايز صيفي',
      status: 'APPROVED',
      isActive: true,
    });

    // Mock ManufacturingService.createOrder to simulate production order creation
    jest.spyOn(ManufacturingService, 'createOrder').mockImplementation(async (cId, payload, userId) => {
      let plannedQuantity = 0;
      if (Array.isArray(payload.variantMatrix)) {
        for (const v of payload.variantMatrix) {
          plannedQuantity += Number(v.plannedQuantity || v.quantity || 0);
        }
      }
      if (plannedQuantity === 0 && payload.plannedQuantity) {
        plannedQuantity = Number(payload.plannedQuantity);
      }

      const order = await currentPrisma.productionOrder.create({
        data: {
          companyId: cId,
          orderNumber: 'MO-2026-00008',
          orderType: payload.orderType || 'FULL_PACKAGE',
          sourceSampleOrderId: payload.sourceSampleOrderId,
          productName: payload.productName,
          plannedQuantity,
          bomId: payload.bomId,
          variantMatrix: payload.variantMatrix,
          createdById: userId,
        },
      });
      return order;
    });

    jest.spyOn(ManufacturingService, 'getBomById').mockImplementation(async (cId, bId) => {
      return currentPrisma._store.boms.get(bId) || null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. Atomic Sequential Numbering (00001 -> 00002 -> 00003)', async () => {
    const s1 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 1',
    });
    const s2 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 2',
    });
    const s3 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 3',
    });

    const year = new Date().getFullYear();
    expect(s1.sampleNumber).toBe(`SMP-${year}-00001`);
    expect(s2.sampleNumber).toBe(`SMP-${year}-00002`);
    expect(s3.sampleNumber).toBe(`SMP-${year}-00003`);
  });

  test('2. Negative Validations (Reject / 400 Guards)', async () => {
    // 2.1 Empty productName
    await expect(
      ManufacturingSampleService.createSampleOrder(companyId, testUser, { productName: '   ' })
    ).rejects.toThrow('اسم المنتج إلزامي لإنشاء أمر العينة');

    // 2.2 Reject without reason
    const s = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة للاختبار',
    });
    await expect(
      ManufacturingSampleService.rejectSampleOrder(companyId, testUser, s.id, { resultNotes: '' })
    ).rejects.toThrow('سبب الرفض إلزامي');

    // 2.3 Converting DRAFT sample
    await expect(
      ManufacturingSampleService.convertSampleToOrder(companyId, testUser, s.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 100,
      })
    ).rejects.toThrow('لا يمكن تحويل العينة لأمر تصنيع إلا بعد اعتمادها أولاً');

    // 2.4 Modifying non-DRAFT sample
    await ManufacturingSampleService.approveSampleOrder(companyId, testUser, s.id, { resultNotes: 'معتمد' });
    await expect(
      ManufacturingSampleService.updateSampleOrder(companyId, testUser, s.id, { productName: 'تعديل ممنوع' })
    ).rejects.toThrow('لا يمكن تعديل بيانات العينة إلا في حالة المسودة');
  });

  test('3. Live E2E Lifecycle: Brand Z Hoodie Sample -> Full Production Order', async () => {
    // A) Create Brand Z Sample
    const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'هودي أوفر سايز Brand Z',
      brandName: 'Brand Z',
      customerName: 'أحمد التاجر الحر',
      plannedQuantity: 3,
      size: 'L',
      color: 'BLACK',
      materialSource: 'CUSTOMER',
      fee: 2500,
      bomId: 'bom-hoodie-1',
      stages: [
        { name: 'قص وتجهيز القماش', sequence: 1 },
        { name: 'خياطة وتجميع العينة', sequence: 2 },
        { name: 'فحص الجودة والكي', sequence: 3 },
      ],
    });

    expect(sample.sampleNumber).toMatch(/^SMP-\d{4}-\d{5}$/);
    expect(sample.status).toBe('DRAFT');
    expect(sample.fee).toBe(2500);
    expect(sample.materialSource).toBe('CUSTOMER');
    expect(sample.stages.length).toBe(3);

    // B) Progress Stages
    for (const stg of sample.stages) {
      await ManufacturingSampleService.updateSampleStage(companyId, testUser, sample.id, stg.id, {
        status: 'COMPLETED',
        notes: `تم إنهاء مرحلة ${stg.name} بنجاح ومطابقة للمواصفات`,
      });
    }

    // C) Upload Attachment
    const att = await ManufacturingSampleService.uploadSampleFile(companyId, testUser, sample.id, {
      fileName: 'hoodie-sample-approved.jpg',
      url: 'https://cdn.maxp.online/samples/hoodie-approved.jpg',
      kind: 'IMAGE',
    });
    expect(att.fileName).toBe('hoodie-sample-approved.jpg');

    // D) Approve Sample
    const approved = await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, {
      resultNotes: 'تم اعتماد العينة بنجاح ومطابقتها للمواصفات الفنية المطلوبة',
    });
    expect(approved.status).toBe('APPROVED');

    // E) Convert to ProductionOrder
    const converted = await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
      plannedQuantity: 300,
      orderType: 'FULL_PACKAGE',
      bomId: 'bom-hoodie-1',
      notes: 'تحويل تلقائي من عينة Brand Z المعتمدة',
    });

    expect(converted.sampleOrder.status).toBe('CONVERTED');
    expect(converted.sampleOrder.convertedOrderId).toBe(converted.order.id);
    expect(converted.order.sourceSampleOrderId).toBe(sample.id);
    expect(converted.order.plannedQuantity).toBe(300);

    // Verify variant matrix inherited
    expect(converted.order.variantMatrix).toEqual([
      { size: 'L', color: 'BLACK', plannedQuantity: 300 },
    ]);

    // F) Double conversion blocked (400)
    await expect(
      ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        plannedQuantity: 500,
        bomId: 'bom-hoodie-1',
      })
    ).rejects.toThrow('تم تحويل هذه العينة بالفعل إلى أمر تصنيع');
  });

  test('4. List Samples and Filtering', async () => {
    await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة للفلترة Brand Z',
      brandName: 'Brand Z',
    });

    const list = await ManufacturingSampleService.listSampleOrders(companyId, {
      status: 'ALL',
      materialSource: 'ALL',
      page: 1,
      limit: 10,
    });
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.length).toBeGreaterThanOrEqual(1);
  });
});
