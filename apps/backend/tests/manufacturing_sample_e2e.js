/**
 * Wave 5: Standalone Sample Manufacturing Order E2E Verification Test
 *
 * Tests:
 * 1. ensureSchema idempotent DDL
 * 2. Atomic sequential numbering: SMP-YYYY-##### (isolated from MO)
 * 3. Negative validations:
 *    - Convert DRAFT -> 400
 *    - Convert twice -> 400
 *    - Reject without reason -> 400
 * 4. Full E2E Lifecycle:
 *    - Create sample: Brand Z, qty 3, CUSTOMER material, fee 2500, size L, color Black
 *    - Add stages (قص, خياطة)
 *    - Advance stages (PENDING -> IN_PROGRESS -> COMPLETED)
 *    - Add attachment
 *    - Approve with resultNotes
 *    - Convert to ProductionOrder: plannedQty 300, FULL_PACKAGE, BOM-HOODIE-OVR-01
 *    - Verify sample is CONVERTED, convertedOrderId is set
 *    - Verify ProductionOrder has sourceSampleOrderId, variantMatrix, and copied fields
 * 5. Zero Regression check:
 *    - Regular production order creation succeeds
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const ManufacturingSampleService = require('../services/manufacturingSampleService');
const ManufacturingService = require('../services/manufacturingService');

async function runTests() {
  console.log('================================================================');
  console.log('🚀 Running Wave 5: Standalone Sample Order E2E Verification Tests');
  console.log('================================================================');

  const prisma = getSharedPrismaClient();

  // Find or create test company
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Test Apparel Co.',
        currency: 'EGP',
      },
    });
  }
  const companyId = company.id;
  const mockUser = { id: 'usr-wave5-test', name: 'Mokhtar QA', email: 'test@maxp.com' };

  console.log(`\n🏢 Using test company: ${company.name} (${companyId})`);

  // 1. Ensure Schema
  console.log('\n--- Step 1: Idempotent DDL ensureSchema() ---');
  await ManufacturingSampleService.ensureSchema();
  console.log('✅ ensureSchema() executed cleanly.');

  // 2. Atomic Sequential Numbering (3 consecutive creations)
  console.log('\n--- Step 2: Atomic Sequential Numbering (SMP-YYYY-#####) ---');
  const seqSamples = [];
  for (let i = 1; i <= 3; i++) {
    const s = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
      productName: `عينة تسلسل ذرية رقم ${i}`,
      customerName: `عميل تجربة ${i}`,
      plannedQuantity: i,
    });
    seqSamples.push(s);
    console.log(`   Sample #${i} created: ${s.sampleNumber} (ID: ${s.id})`);
  }

  // Verify format SMP-YYYY-##### and increasing sequence
  const year = new Date().getFullYear();
  for (let i = 0; i < 3; i++) {
    const num = seqSamples[i].sampleNumber;
    if (!num.startsWith(`SMP-${year}-`)) {
      throw new Error(`Invalid sampleNumber format: ${num}`);
    }
  }
  const seq1 = parseInt(seqSamples[0].sampleNumber.split('-')[2], 10);
  const seq2 = parseInt(seqSamples[1].sampleNumber.split('-')[2], 10);
  const seq3 = parseInt(seqSamples[2].sampleNumber.split('-')[2], 10);
  if (seq2 !== seq1 + 1 || seq3 !== seq2 + 1) {
    throw new Error(`Sequential numbering not consecutive: ${seq1}, ${seq2}, ${seq3}`);
  }
  console.log(`✅ Atomic sequential numbering verified: SMP-${year}-${String(seq1).padStart(5, '0')} -> SMP-${year}-${String(seq2).padStart(5, '0')} -> SMP-${year}-${String(seq3).padStart(5, '0')}`);

  // 3. Negative Validations
  console.log('\n--- Step 3: Negative Validations (Reject / 400 Guards) ---');

  // Test 3.1: Reject without reason -> MUST fail
  console.log('   Testing reject without reason (should throw 400)...');
  let rejectWithoutReasonFailedAsExpected = false;
  try {
    await ManufacturingSampleService.rejectSampleOrder(companyId, mockUser, seqSamples[0].id, { resultNotes: '' });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('سبب الرفض إلزامي')) {
      rejectWithoutReasonFailedAsExpected = true;
      console.log(`   ✅ Correctly rejected with 400: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!rejectWithoutReasonFailedAsExpected) {
    throw new Error('Expected reject without reason to throw 400, but it did not!');
  }

  // Test 3.2: Convert DRAFT sample -> MUST fail
  console.log('   Testing convert DRAFT sample (should throw 400)...');
  let convertDraftFailedAsExpected = false;
  try {
    await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, seqSamples[0].id, {
      plannedQuantity: 100,
    });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('لا يمكن تحويل العينة لأمر تصنيع إلا بعد اعتمادها أولاً')) {
      convertDraftFailedAsExpected = true;
      console.log(`   ✅ Correctly rejected with 400: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!convertDraftFailedAsExpected) {
    throw new Error('Expected convert DRAFT sample to throw 400, but it did not!');
  }

  // 4. Live Full E2E Lifecycle
  console.log('\n--- Step 4: Full E2E Lifecycle: Brand Z Hoodie Sample -> Full Production Order ---');

  // 4.1 Ensure a BOM exists for the product/company (e.g. BOM-HOODIE-OVR-01)
  let testBom = await prisma.billOfMaterials.findFirst({
    where: { companyId, code: 'BOM-HOODIE-OVR-01' },
    include: { components: true, standardStages: true },
  });

  if (!testBom) {
    console.log('   Creating test BOM: BOM-HOODIE-OVR-01...');
    testBom = await ManufacturingService.createBom(companyId, {
      code: 'BOM-HOODIE-OVR-01',
      name: 'هودي أوفر سايز ملتون (Hoodie Oversized Heavy Cotton)',
      version: '1.0',
      baseQuantity: 1,
      wasteMarginPercent: 5.0,
      components: [
        {
          rawMaterialId: 'mat-cotton-fleece',
          rawMaterialName: 'قماش ميلتون قطن 100% (French Terry 320 GSM)',
          consumptionPerUnit: 1.4,
          unit: 'METER',
          scrapRate: 3.0,
        },
      ],
      standardStages: [
        { name: 'قص الباترون', sequence: 1, stageType: 'CUTTING' },
        { name: 'خياطة وتجميع', sequence: 2, stageType: 'SEWING' },
        { name: 'كي وتشطيب وفحص', sequence: 3, stageType: 'FINISHING' },
      ],
    });
  }
  console.log(`   Using BOM: ${testBom.code} - ${testBom.name} (ID: ${testBom.id})`);

  // 4.2 Create live sample: Brand Z, 3 pcs, customer material, fee 2500, size L, color Black
  console.log('   Creating live sample: Brand Z · 3 pcs · خامة من العميل · 2500 ج.م · L / Black...');
  const liveSample = await ManufacturingSampleService.createSampleOrder(companyId, mockUser, {
    customerName: 'Brand Z',
    brandName: 'Brand Z',
    productName: 'هودي كاجوال أوفر سايز (Hoodie Oversized)',
    plannedQuantity: 3,
    materialSource: 'CUSTOMER',
    fee: 2500,
    size: 'L',
    color: 'BLACK',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    designNotes: 'عينة مبدئية لعميل Brand Z - قماش ميلتون مقدم من العميل مع تطريز لوجو على الصدر',
    bomId: testBom.id,
    stages: [
      { name: 'قص الباترون الأولي', sequence: 1, stageType: 'CUTTING' },
      { name: 'خياطة وتجميع العينة', sequence: 2, stageType: 'SEWING' },
    ],
  });
  console.log(`   Sample created: ${liveSample.sampleNumber} (Status: ${liveSample.status})`);

  // 4.3 Advance Stages
  console.log('   Advancing stages (Start sequence 1 -> Complete sequence 1 -> Start sequence 2 -> Complete sequence 2)...');
  const stage1 = liveSample.stages[0];
  const stage2 = liveSample.stages[1];

  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage1.id, {
    status: 'IN_PROGRESS',
    notes: 'تم استلام قماش العميل والبدء في فرد وقص الباترون',
  });
  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage1.id, {
    status: 'COMPLETED',
    notes: 'تم الانتهاء من قص الـ 3 قطع بنجاح',
  });

  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage2.id, {
    status: 'IN_PROGRESS',
    notes: 'جاري تجميع وخياطة أجزاء الهودي',
  });
  await ManufacturingSampleService.updateSampleStage(companyId, mockUser, liveSample.id, stage2.id, {
    status: 'COMPLETED',
    notes: 'تم الانتهاء من الخياطة وتركيب الكابيشون والجيوب',
  });
  console.log('   ✅ All sample stages completed.');

  // 4.4 Add Attachment
  console.log('   Uploading sample attachment...');
  const attachment = await ManufacturingSampleService.uploadSampleFile(companyId, mockUser, liveSample.id, {
    fileName: 'brand-z-hoodie-sample-approved.jpg',
    url: '/uploads/manufacturing/sample-hoodie-brand-z.jpg',
    kind: 'IMAGE',
  });
  console.log(`   ✅ Attachment uploaded: ${attachment.fileName} (${attachment.kind})`);

  // 4.5 Approve Sample
  console.log('   Approving sample with result notes...');
  const approvedSample = await ManufacturingSampleService.approveSampleOrder(companyId, mockUser, liveSample.id, {
    resultNotes: 'تم فحص واعتماد العينة بنجاح - القياسات وتوزيع القماش مطابق تماماً لمواصفات Brand Z',
  });
  if (approvedSample.status !== 'APPROVED') {
    throw new Error(`Sample approval failed. Expected APPROVED, got: ${approvedSample.status}`);
  }
  console.log(`   ✅ Sample approved: Status = ${approvedSample.status}`);

  // 4.6 Convert Sample to Full Production Order (300 pcs, FULL_PACKAGE, BOM-HOODIE-OVR-01)
  console.log('   Converting approved sample to full Production Order (300 pcs, FULL_PACKAGE)...');
  const convertResult = await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, liveSample.id, {
    plannedQuantity: 300,
    orderType: 'FULL_PACKAGE',
    bomId: testBom.id,
    notes: 'أمر تشغيل تجاري كامل بعد اعتماد العينة بنجاح',
  });

  const createdOrder = convertResult.order;
  const updatedSample = convertResult.sampleOrder;

  console.log(`   ✅ Production Order created: ${createdOrder.orderNumber} (ID: ${createdOrder.id})`);
  console.log(`   ✅ Sample converted: Status = ${updatedSample.status}, convertedOrderId = ${updatedSample.convertedOrderId}`);

  // Verify all conversion requirements
  if (updatedSample.status !== 'CONVERTED') {
    throw new Error(`Sample status should be CONVERTED, got: ${updatedSample.status}`);
  }
  if (updatedSample.convertedOrderId !== createdOrder.id) {
    throw new Error(`Sample convertedOrderId mismatch: ${updatedSample.convertedOrderId} vs ${createdOrder.id}`);
  }
  if (createdOrder.sourceSampleOrderId !== liveSample.id) {
    throw new Error(`ProductionOrder.sourceSampleOrderId mismatch: ${createdOrder.sourceSampleOrderId} vs ${liveSample.id}`);
  }
  if (Number(createdOrder.plannedQuantity) !== 300) {
    throw new Error(`ProductionOrder.plannedQuantity should be 300, got: ${createdOrder.plannedQuantity}`);
  }
  if (!createdOrder.notes?.includes(`محوّل من أمر العينة ${liveSample.sampleNumber}`)) {
    throw new Error(`ProductionOrder.notes does not contain source sample reference: ${createdOrder.notes}`);
  }

  // Check variant matrix of created order
  const variant = createdOrder.variants?.[0];
  if (!variant || variant.size !== 'L' || variant.color !== 'BLACK' || Number(variant.plannedQuantity) !== 300) {
    throw new Error(`Variant matrix mismatch: ${JSON.stringify(variant)}`);
  }
  console.log(`   ✅ Variant matrix inherited from sample: Size=${variant.size}, Color=${variant.color}, Qty=${variant.plannedQuantity}`);

  // 4.7 Test Double Conversion Guard (Must throw 400)
  console.log('   Testing double conversion guard (should throw 400)...');
  let doubleConvertFailedAsExpected = false;
  try {
    await ManufacturingSampleService.convertSampleToOrder(companyId, mockUser, liveSample.id, {
      plannedQuantity: 500,
    });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('تم تحويل هذه العينة بالفعل إلى أمر تصنيع مسبقاً')) {
      doubleConvertFailedAsExpected = true;
      console.log(`   ✅ Correctly blocked double conversion with 400: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!doubleConvertFailedAsExpected) {
    throw new Error('Expected double conversion to throw 400, but it did not!');
  }

  // 5. Zero Regression Check
  console.log('\n--- Step 5: Zero Regression Check on Existing Manufacturing Flows ---');

  // Verify regular production order creation
  const regularOrder = await ManufacturingService.createOrder(companyId, {
    bomId: testBom.id,
    orderType: 'FULL_PACKAGE',
    variantMatrix: [
      { size: 'M', color: 'WHITE', plannedQuantity: 50 },
      { size: 'L', color: 'WHITE', plannedQuantity: 50 },
    ],
    notes: 'أمر إنتاج قياسي مباشر لا علاقة له بالعينات',
  });
  console.log(`   ✅ Regular production order created without regression: ${regularOrder.orderNumber}`);

  // Verify regular order list includes both orders
  const ordersList = await ManufacturingService.listOrders(companyId);
  const foundSampleOrder = ordersList.items.find((o) => o.id === createdOrder.id);
  const foundRegularOrder = ordersList.items.find((o) => o.id === regularOrder.id);

  if (!foundSampleOrder || !foundRegularOrder) {
    throw new Error('Could not find created orders in listOrders');
  }
  if (foundSampleOrder.sourceSampleOrderId !== liveSample.id) {
    throw new Error('sourceSampleOrderId missing in listOrders response');
  }
  console.log('   ✅ Regular orders listing verified with sourceSampleOrderId.');

  console.log('\n================================================================');
  console.log('🎉 ALL WAVE 5 E2E VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ E2E Test Failed with error:', err);
    process.exit(1);
  });
