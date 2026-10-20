/**
 * Self-Contained Verification Suite for Wave 5: Standalone Sample Orders
 */

const assert = require('assert');

// Mock sharedDatabase before requiring ManufacturingSampleService
const mockDb = {
  sampleOrders: new Map(),
  sampleStages: new Map(),
  sampleAttachments: new Map(),
  productionOrders: new Map(),
  boms: new Map(),
  counter: 0,
};

// Create in-memory mock Prisma
function getMockPrisma() {
  return {
    sampleOrder: {
      findFirst: async ({ where, orderBy }) => {
        let items = Array.from(mockDb.sampleOrders.values());
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
        // include stages
        const stages = Array.from(mockDb.sampleStages.values())
          .filter((st) => st.sampleOrderId === item.id)
          .sort((a, b) => a.sequence - b.sequence);
        const attachments = Array.from(mockDb.sampleAttachments.values())
          .filter((att) => att.sampleOrderId === item.id);
        return { ...item, stages, attachments };
      },
      findMany: async ({ where, skip = 0, take = 50 }) => {
        let items = Array.from(mockDb.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.status && where.status !== 'ALL') items = items.filter((s) => s.status === where.status);
        if (where?.materialSource && where.materialSource !== 'ALL') {
          items = items.filter((s) => s.materialSource === where.materialSource);
        }
        if (where?.OR) {
          // search filter
          const s = where.OR[0].sampleNumber.contains.toLowerCase();
          items = items.filter(
            (i) =>
              i.sampleNumber.toLowerCase().includes(s) ||
              i.productName.toLowerCase().includes(s) ||
              (i.customerName && i.customerName.toLowerCase().includes(s)) ||
              (i.brandName && i.brandName.toLowerCase().includes(s))
          );
        }
        return items.slice(skip, skip + take).map((i) => {
          const stages = Array.from(mockDb.sampleStages.values()).filter((st) => st.sampleOrderId === i.id);
          const attachments = Array.from(mockDb.sampleAttachments.values()).filter((att) => att.sampleOrderId === i.id);
          return { ...i, stages, attachments };
        });
      },
      count: async ({ where }) => {
        let items = Array.from(mockDb.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        return items.length;
      },
      create: async ({ data }) => {
        mockDb.counter++;
        const id = `smp-ord-${mockDb.counter}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockDb.sampleOrders.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = mockDb.sampleOrders.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        mockDb.sampleOrders.set(where.id, updated);
        const stages = Array.from(mockDb.sampleStages.values()).filter((st) => st.sampleOrderId === where.id);
        const attachments = Array.from(mockDb.sampleAttachments.values()).filter((att) => att.sampleOrderId === where.id);
        return { ...updated, stages, attachments };
      },
      delete: async ({ where }) => {
        mockDb.sampleOrders.delete(where.id);
        return { id: where.id };
      },
    },
    sampleOrderStage: {
      findFirst: async ({ where }) => {
        let items = Array.from(mockDb.sampleStages.values());
        if (where?.id) items = items.filter((st) => st.id === where.id);
        if (where?.sampleOrderId) items = items.filter((st) => st.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        mockDb.counter++;
        const id = `smp-stage-${mockDb.counter}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockDb.sampleStages.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = mockDb.sampleStages.get(where.id);
        if (!existing) throw new Error('Stage not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        mockDb.sampleStages.set(where.id, updated);
        return updated;
      },
      deleteMany: async ({ where }) => {
        for (const [id, st] of mockDb.sampleStages.entries()) {
          if (st.sampleOrderId === where.sampleOrderId) {
            mockDb.sampleStages.delete(id);
          }
        }
      },
    },
    sampleOrderAttachment: {
      create: async ({ data }) => {
        mockDb.counter++;
        const id = `smp-att-${mockDb.counter}`;
        const record = { id, ...data, uploadedAt: new Date() };
        mockDb.sampleAttachments.set(id, record);
        return record;
      },
      deleteMany: async ({ where }) => {
        for (const [id, att] of mockDb.sampleAttachments.entries()) {
          if (att.sampleOrderId === where.sampleOrderId) {
            mockDb.sampleAttachments.delete(id);
          }
        }
      },
    },
    productionOrder: {
      findFirst: async ({ where }) => {
        let items = Array.from(mockDb.productionOrders.values());
        if (where?.id) items = items.filter((o) => o.id === where.id);
        return items[0] || null;
      },
      findMany: async ({ where }) => {
        let items = Array.from(mockDb.productionOrders.values());
        if (where?.id?.in) items = items.filter((o) => where.id.in.includes(o.id));
        return items;
      },
    },
    $transaction: async (cb) => cb(getMockPrisma()),
    $executeRawUnsafe: async () => true,
  };
}

// Override getSharedPrismaClient
const sharedDb = require('../apps/backend/services/sharedDatabase');
sharedDb.getSharedPrismaClient = getMockPrisma;

// Override ManufacturingService.createOrder to simulate production order creation
const ManufacturingService = require('../apps/backend/services/manufacturingService');
ManufacturingService.createOrder = async (companyId, data, userId) => {
  mockDb.counter++;
  const id = `mo-ord-${mockDb.counter}`;
  const year = new Date().getFullYear();
  const orderNumber = `MO-${year}-${String(mockDb.counter).padStart(5, '0')}`;
  const record = {
    id,
    companyId,
    orderNumber,
    status: 'PLANNED',
    bomId: data.bomId,
    productId: data.productId,
    plannedQuantity: data.plannedQuantity || 300,
    orderType: data.orderType || 'FULL_PACKAGE',
    sourceSampleOrderId: data.sourceSampleOrderId,
    notes: data.notes,
    variants: data.variantMatrix,
    createdById: userId,
  };
  mockDb.productionOrders.set(id, record);
  return record;
};

const ManufacturingSampleService = require('../apps/backend/services/manufacturingSampleService');

async function testSuite() {
  console.log('================================================================');
  console.log('🧪 Starting Wave 5: Standalone Sample Orders Verification Suite');
  console.log('================================================================\n');

  const companyId = 'comp-wave5-test';
  const mockUser = { id: 'usr-1', name: 'Mokhtar QA', email: 'test@maxp.com' };

  // 1. Atomic Sequential Numbering Test (SMP-YYYY-#####)
  console.log('--- Test 1: Atomic Sequential Numbering (00001 -> 00002 -> 00003) ---');
  const sample1 = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
    productName: 'عينة 1',
  });
  const sample2 = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
    productName: 'عينة 2',
  });
  const sample3 = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
    productName: 'عينة 3',
  });

  const year = new Date().getFullYear();
  assert.strictEqual(sample1.sampleNumber, `SMP-${year}-00001`, 'First sample should be 00001');
  assert.strictEqual(sample2.sampleNumber, `SMP-${year}-00002`, 'Second sample should be 00002');
  assert.strictEqual(sample3.sampleNumber, `SMP-${year}-00003`, 'Third sample should be 00003');
  console.log(`✅ Atomic sequential numbering verified: ${sample1.sampleNumber} -> ${sample2.sampleNumber} -> ${sample3.sampleNumber}`);

  // 2. Negative Validations
  console.log('\n--- Test 2: Negative Validations (Reject / 400 Guards) ---');

  // 2.1 Missing product name
  let missingProductThrew = false;
  try {
    await ManufacturingSampleService.createSampleOrder(companyId, mockUser, { productName: '' });
  } catch (err) {
    missingProductThrew = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('اسم المنتج إلزامي'));
  }
  assert.ok(missingProductThrew, 'createSampleOrder without productName should throw 400');
  console.log('✅ Empty productName correctly rejected with 400.');

  // 2.2 Reject without reason
  let rejectWithoutReasonThrew = false;
  try {
    await ManufacturingSampleService.rejectSampleOrder(companyId, mockUser, sample1.id, { resultNotes: '   ' });
  } catch (err) {
    rejectWithoutReasonThrew = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('سبب الرفض إلزامي'));
  }
  assert.ok(rejectWithoutReasonThrew, 'reject without reason should throw 400');
  console.log('✅ Rejection without reason correctly rejected with 400.');

  // 2.3 Convert DRAFT sample
  let convertDraftThrew = false;
  try {
    await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, sample1.id, {
      plannedQuantity: 100,
      bomId: 'bom-1',
    });
  } catch (err) {
    convertDraftThrew = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('لا يمكن تحويل العينة لأمر تصنيع إلا بعد اعتمادها أولاً'));
  }
  assert.ok(convertDraftThrew, 'convert DRAFT sample should throw 400');
  console.log('✅ Converting DRAFT sample correctly blocked with 400.');

  // 2.4 Update/Delete non-DRAFT sample
  await ManufacturingSampleService.approveSampleOrder(companyId, mockUser, sample2.id, { resultNotes: 'معتمدة' });
  let updateNonDraftThrew = false;
  try {
    await ManufacturingSampleService.updateSampleOrder(companyId, mockUser, sample2.id, { productName: 'تعديل' });
  } catch (err) {
    updateNonDraftThrew = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('لا يمكن تعديل بيانات العينة إلا في حالة المسودة'));
  }
  assert.ok(updateNonDraftThrew, 'update non-DRAFT sample should throw 400');
  console.log('✅ Modifying non-DRAFT sample correctly blocked with 400.');

  // 3. Live Full E2E Lifecycle: Brand Z Hoodie Sample
  console.log('\n--- Test 3: Live E2E Lifecycle: Brand Z Hoodie Sample -> Full Production Order ---');

  // 3.1 Create sample: Brand Z · 3 pcs · خامة العميل · 2500 ج.م · L / Black
  const liveSample = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
    customerName: 'Brand Z',
    brandName: 'Brand Z',
    productName: 'هودي أوفر سايز ملتون (Hoodie Oversized Heavy Cotton)',
    plannedQuantity: 3,
    materialSource: 'CUSTOMER',
    fee: 2500,
    size: 'L',
    color: 'BLACK',
    dueDate: '2026-11-01',
    designNotes: 'تطريز لوجو Brand Z عالي الكثافة على الصدر + خامة ميلتون من العميل',
    bomId: 'bom-hoodie-ovr-01',
    stages: [
      { name: 'قص الباترون', sequence: 1, stageType: 'CUTTING' },
      { name: 'خياطة وتجميع العينة', sequence: 2, stageType: 'SEWING' },
    ],
  });

  assert.strictEqual(liveSample.status, 'DRAFT');
  assert.strictEqual(liveSample.customerName, 'Brand Z');
  assert.strictEqual(liveSample.materialSource, 'CUSTOMER');
  assert.strictEqual(liveSample.plannedQuantity, 3);
  assert.strictEqual(Number(liveSample.fee), 2500);
  assert.strictEqual(liveSample.stages.length, 2);
  console.log(`✅ Sample created: ${liveSample.sampleNumber} (Status: ${liveSample.status})`);

  // 3.2 Advance stages
  const stage1 = liveSample.stages[0];
  const stage2 = liveSample.stages[1];

  const updatedStage1 = await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage1.id, {
    status: 'IN_PROGRESS',
    notes: 'تم استلام قماش العميل والبدء في القص',
  });
  assert.strictEqual(updatedStage1.status, 'IN_PROGRESS');
  assert.ok(updatedStage1.startedAt, 'startedAt should be set');

  // Verify sample auto-transitioned to IN_PROGRESS
  const sampleInProgress = await ManufacturingSampleService.getSampleOrderById(companyId, liveSample.id);
  assert.strictEqual(sampleInProgress.status, 'IN_PROGRESS', 'Sample should auto-transition to IN_PROGRESS');

  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage1.id, {
    status: 'COMPLETED',
  });
  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage2.id, {
    status: 'COMPLETED',
  });
  console.log('✅ Stages advanced to COMPLETED.');

  // 3.3 Add Attachment
  const att = await ManufacturingSampleService.uploadSampleFile(companyId, mockUser, liveSample.id, {
    fileName: 'hoodie-sample-approved.jpg',
    url: '/uploads/manufacturing/hoodie-brand-z.jpg',
    kind: 'IMAGE',
  });
  assert.strictEqual(att.kind, 'IMAGE');
  assert.strictEqual(att.fileName, 'hoodie-sample-approved.jpg');
  console.log(`✅ Attachment uploaded: ${att.fileName}`);

  // 3.4 Approve Sample
  const approved = await ManufacturingSampleService.approveSampleOrder(companyId, mockUser, liveSample.id, {
    resultNotes: 'تم فحص العينة واعتمادها مطابقة تماماً للمواصفات',
  });
  assert.strictEqual(approved.status, 'APPROVED');
  assert.strictEqual(approved.resultNotes, 'تم فحص العينة واعتمادها مطابقة تماماً للمواصفات');
  console.log(`✅ Sample approved: Status = ${approved.status}`);

  // 3.5 Convert to Production Order (300 pcs, FULL_PACKAGE, BOM-HOODIE-OVR-01)
  const convertRes = await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, liveSample.id, {
    plannedQuantity: 300,
    orderType: 'FULL_PACKAGE',
    bomId: 'bom-hoodie-ovr-01',
    notes: 'أمر تشغيل تجاري كامل',
  });

  const createdOrder = convertRes.order;
  const convertedSample = convertRes.sampleOrder;

  assert.strictEqual(convertedSample.status, 'CONVERTED', 'Sample status must be CONVERTED');
  assert.strictEqual(convertedSample.convertedOrderId, createdOrder.id, 'convertedOrderId must match created order id');
  assert.strictEqual(createdOrder.sourceSampleOrderId, liveSample.id, 'sourceSampleOrderId must match sample id');
  assert.strictEqual(createdOrder.plannedQuantity, 300, 'plannedQuantity must be 300');
  assert.strictEqual(createdOrder.orderType, 'FULL_PACKAGE', 'orderType must be FULL_PACKAGE');
  assert.ok(createdOrder.notes.includes(liveSample.sampleNumber), 'notes must reference source sample number');

  // Verify variant matrix inherited size L and color BLACK from sample
  assert.strictEqual(createdOrder.variants[0].size, 'L');
  assert.strictEqual(createdOrder.variants[0].color, 'BLACK');
  assert.strictEqual(createdOrder.variants[0].plannedQuantity, 300);
  console.log(`✅ Production Order ${createdOrder.orderNumber} successfully created with sourceSampleOrderId = ${createdOrder.sourceSampleOrderId}`);
  console.log(`✅ Sample ${convertedSample.sampleNumber} marked CONVERTED with convertedOrderId = ${convertedSample.convertedOrderId}`);
  console.log(`✅ Variant matrix inherited: Size=${createdOrder.variants[0].size}, Color=${createdOrder.variants[0].color}, Qty=${createdOrder.variants[0].plannedQuantity}`);

  // 3.6 Double Conversion Guard (Must throw 400)
  let doubleConvertThrew = false;
  try {
    await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, liveSample.id, {
      plannedQuantity: 500,
    });
  } catch (err) {
    doubleConvertThrew = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('تم تحويل هذه العينة بالفعل إلى أمر تصنيع مسبقاً'));
  }
  assert.ok(doubleConvertThrew, 'Double conversion must throw 400');
  console.log('✅ Double conversion correctly blocked with 400.');

  // 4. Listing & Filter Verification
  console.log('\n--- Test 4: List Samples and Filters ---');
  const allList = await ManufacturingSampleService.listSampleOrders(companyId, {});
  assert.strictEqual(allList.items.length, 4, 'Should have 4 samples total');

  const convertedList = await ManufacturingSampleService.listSampleOrders(companyId, { status: 'CONVERTED' });
  assert.strictEqual(convertedList.items.length, 1, 'Should have 1 CONVERTED sample');
  assert.strictEqual(convertedList.items[0].id, liveSample.id);

  const customerMaterialList = await ManufacturingSampleService.listSampleOrders(companyId, { materialSource: 'CUSTOMER' });
  assert.strictEqual(customerMaterialList.items.length, 1, 'Should have 1 CUSTOMER material sample');

  const searchList = await ManufacturingSampleService.listSampleOrders(companyId, { search: 'Brand Z' });
  assert.strictEqual(searchList.items.length, 1, 'Search for Brand Z should return 1 sample');
  console.log('✅ Filters (status, materialSource, search) verified.');

  console.log('\n================================================================');
  console.log('🎉 ALL WAVE 5 VERIFICATION SUITE ASSERTIONS PASSED (100%)!');
  console.log('================================================================');
}

testSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
