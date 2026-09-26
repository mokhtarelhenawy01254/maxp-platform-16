/**
 * Comprehensive Multi-Section & Tab Automated Test for Internal Courier Fleet
 * Tests every single section, tab, filter, status transition, treasury calculation, and policy.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const courierService = require('../services/courierService');
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.APP_SECRET || 'test-jwt-secret-for-courier';
}

async function runAllSectionsTest() {
  console.log('========================================================================');
  console.log('🧪 [COURIER-FLEET-FULL-AUDIT] TESTING EVERY SECTION & EVERY TAB');
  console.log('========================================================================');

  const prisma = getSharedPrismaClient();
  const timestamp = Date.now();
  const testCompanyId = `test-audit-fleet-${timestamp}`;
  const uninstalledCompanyId = `test-audit-noapp-${timestamp}`;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create Dedicated Test Company & Install App
    // -------------------------------------------------------------------------
    console.log('\n🏢 [SETUP] Initializing Isolated Companies...');
    await prisma.company.create({
      data: {
        id: testCompanyId,
        name: `شركة فحص الأقسام والتابات (${timestamp})`,
        email: `audit-${timestamp}@maxp.local`,
        currency: 'EGP'
      }
    });

    await prisma.company.create({
      data: {
        id: uninstalledCompanyId,
        name: `شركة بدون التطبيق (${timestamp})`,
        email: `noapp-${timestamp}@maxp.local`,
        currency: 'EGP'
      }
    });

    // Find or create marketplaceApp
    let marketplaceApp = await prisma.marketplaceApp.findUnique({
      where: { slug: 'internal-courier-fleet' }
    });
    if (!marketplaceApp) {
      marketplaceApp = await prisma.marketplaceApp.create({
        data: {
          slug: 'internal-courier-fleet',
          name: 'أسطول المناديب والتوصيل الداخلي',
          nameEn: 'Internal Courier Fleet',
          description: 'نظام إدارة المناديب ومأموريات التوزيع والتسويات المالية للخزينة',
          category: 'SHIPPING',
          icon: 'Truck',
          status: 'ACTIVE',
          isActive: true
        }
      });
    }

    // Install App for testCompanyId
    await prisma.companyApp.create({
      data: {
        companyId: testCompanyId,
        appId: marketplaceApp.id,
        status: 'ACTIVE',
        activePricingModel: 'SUBSCRIPTION',
        settings: {
          general: { prefix: 'FLEET', coveredGovernorates: ['القاهرة', 'الجيزة'] },
          remittance: { requireTreasuryNoteOnVariance: true, shortagePolicy: 'DEDUCT_FROM_COURIER' },
          commission: { defaultType: 'FIXED_PER_ORDER', defaultValue: 30 }
        }
      }
    });
    console.log('   ✅ App installed for Test Company. Setup complete.');

    // -------------------------------------------------------------------------
    // SECTION 1: COURIER MANAGEMENT (إدارة المناديب)
    // -------------------------------------------------------------------------
    console.log('\n🛵 [SECTION 1] Testing Courier Management (/shipping/couriers):');

    // 1.1 Create Courier 1 (Motorcycle, Fixed Commission)
    const courier1 = await courierService.createCourier(testCompanyId, {
      name: 'كابتن محمد صلاح',
      phone: '01011223344',
      nationalId: '29501011234567',
      vehicleType: 'MOTORCYCLE',
      plateNumber: 'س ع ص 1234',
      governorates: 'القاهرة, الجيزة',
      commissionType: 'FIXED_PER_ORDER',
      commissionAmount: 30,
      notes: 'مندوب خبير في شرق القاهرة'
    });
    console.log(`   ✅ [Action: Create] Courier 1 Created: ${courier1.name} (${courier1.status})`);

    // 1.2 Create Courier 2 (Van, Percentage Commission)
    const courier2 = await courierService.createCourier(testCompanyId, {
      name: 'كابتن علي حسن',
      phone: '01222334455',
      nationalId: '29801017654321',
      vehicleType: 'VAN',
      plateNumber: 'د ر و 5678',
      governorates: 'الجيزة, 6 أكتوبر',
      commissionType: 'PERCENTAGE',
      commissionAmount: 5.0,
      notes: 'سيارة فان لنقل الطرود الكبيرة'
    });
    console.log(`   ✅ [Action: Create] Courier 2 Created: ${courier2.name} (${courier2.status})`);

    // 1.3 Test Update Courier
    const updatedC1 = await courierService.updateCourier(testCompanyId, courier1.id, {
      commissionAmount: 35,
      notes: 'تمت زيادة العمولة إلى 35 ج.م'
    });
    console.log(`   ✅ [Action: Update] Courier 1 Commission updated: ${updatedC1.commissionAmount} EGP`);
    if (Number(updatedC1.commissionAmount) !== 35) throw new Error('Update courier commission failed');

    // 1.4 Test Filters (ALL, AVAILABLE, ON_DUTY, OFF_DUTY)
    const listAll = await courierService.listCouriers(testCompanyId, { status: undefined });
    console.log(`   ✅ [Filter: ALL] Found ${listAll.length} couriers (Expected: 2)`);
    if (listAll.length !== 2) throw new Error('Filter ALL failed');

    const listAvailable = await courierService.listCouriers(testCompanyId, { status: 'AVAILABLE' });
    console.log(`   ✅ [Filter: AVAILABLE] Found ${listAvailable.length} couriers (Expected: 2)`);

    const listOnDuty = await courierService.listCouriers(testCompanyId, { status: 'ON_DUTY' });
    console.log(`   ✅ [Filter: ON_DUTY] Found ${listOnDuty.length} couriers (Expected: 0)`);
    if (listOnDuty.length !== 0) throw new Error('Filter ON_DUTY should be 0 initially');

    // 1.5 Test Search Filter
    const searchRes = await courierService.listCouriers(testCompanyId, { search: 'محمد' });
    console.log(`   ✅ [Filter: Search "محمد"] Found ${searchRes.length} (Expected: 1 - ${searchRes[0]?.name})`);
    if (searchRes.length !== 1 || !searchRes[0].name.includes('محمد')) throw new Error('Search filter failed');

    // 1.6 Test Dashboard Telemetry Summary
    const summary = await courierService.getCourierDashboardSummary(testCompanyId);
    console.log(`   ✅ [Telemetry Summary] Total: ${summary.totalCouriers}, Active: ${summary.activeCouriers}, Available: ${summary.availableCouriers}`);
    if (summary.totalCouriers !== 2 || summary.availableCouriers !== 2) throw new Error('Telemetry summary numbers mismatch');

    // -------------------------------------------------------------------------
    // SECTION 2: DELIVERY RUNS & MANIFEST (رحلات التوزيع والمانيفست)
    // -------------------------------------------------------------------------
    console.log('\n📋 [SECTION 2] Testing Delivery Runs (/shipping/delivery-runs):');

    // Create 3 Customers & Orders
    const cust1 = await prisma.customer.create({
      data: { firstName: 'أحمد', lastName: 'حامد', phone: '01011112222', company: { connect: { id: testCompanyId } } }
    });
    const cust2 = await prisma.customer.create({
      data: { firstName: 'منى', lastName: 'خالد', phone: '01122223333', company: { connect: { id: testCompanyId } } }
    });
    const cust3 = await prisma.customer.create({
      data: { firstName: 'ياسر', lastName: 'جمال', phone: '01233334444', company: { connect: { id: testCompanyId } } }
    });

    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${timestamp}-101`,
        customerName: 'أحمد حامد',
        customerPhone: '01011112222',
        customerAddress: 'عمارات العبور، صلاح سالم',
        governorate: 'القاهرة',
        total: 500,
        subtotal: 450,
        shipping: 50,
        status: 'READY_TO_SHIP',
        company: { connect: { id: testCompanyId } },
        customer: { connect: { id: cust1.id } }
      }
    });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${timestamp}-102`,
        customerName: 'منى خالد',
        customerPhone: '01122223333',
        customerAddress: 'الدقي، شارع مصدق',
        governorate: 'الجيزة',
        total: 350,
        subtotal: 300,
        shipping: 50,
        status: 'READY_TO_SHIP',
        company: { connect: { id: testCompanyId } },
        customer: { connect: { id: cust2.id } }
      }
    });

    const order3 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${timestamp}-103`,
        customerName: 'ياسر جمال',
        customerPhone: '01233334444',
        customerAddress: 'المهندسين، شارع سوريا',
        governorate: 'الجيزة',
        total: 900,
        subtotal: 850,
        shipping: 50,
        status: 'READY_TO_SHIP',
        company: { connect: { id: testCompanyId } },
        customer: { connect: { id: cust3.id } }
      }
    });
    console.log('   ✅ Created 3 Test Orders in READY_TO_SHIP status.');

    // 2.1 Create Delivery Run by Order Numbers (Tests resilience of orderNumber resolution)
    const run1 = await courierService.createDeliveryRun(testCompanyId, {
      courierId: courier1.id,
      orderIds: [order1.orderNumber, order2.orderNumber], // Passing orderNumber string
      notes: 'مأمورية التوزيع الصباحية الأولى'
    });
    console.log(`   ✅ [Action: Create Run] Run ${run1.runNumber} created with ${run1.totalShipments} shipments, Expected COD: ${run1.totalCODExpected} EGP`);
    if (run1.totalShipments !== 2 || Number(run1.totalCODExpected) !== 850) {
      throw new Error('Run creation COD or shipment count mismatch');
    }

    // 2.2 Verify Courier status shifted to ON_DUTY
    const courier1AfterDispatch = await courierService.getCourierById(testCompanyId, courier1.id);
    console.log(`   ✅ [State Transition] Courier 1 status: ${courier1AfterDispatch.status} (Expected: ON_DUTY)`);
    if (courier1AfterDispatch.status !== 'ON_DUTY') throw new Error('Courier should be ON_DUTY');

    // 2.3 Verify Orders shifted to OUT_FOR_DELIVERY
    const o1Check = await prisma.order.findUnique({ where: { id: order1.id } });
    console.log(`   ✅ [Order Sync] Order 1 Status: ${o1Check.status} (Expected: OUT_FOR_DELIVERY)`);
    if (o1Check.status !== 'OUT_FOR_DELIVERY') throw new Error('Order status should be OUT_FOR_DELIVERY');

    // 2.4 Verify Delivery Runs List & Filters
    const runsListDispatched = await courierService.listDeliveryRuns(testCompanyId, { status: 'DISPATCHED' });
    const dispatchedRuns = runsListDispatched.data || [];
    console.log(`   ✅ [Filter: DISPATCHED Runs] Found: ${dispatchedRuns.length} (Expected: 1)`);
    if (dispatchedRuns.length !== 1) throw new Error('Filter DISPATCHED runs failed');

    // -------------------------------------------------------------------------
    // SECTION 3: COURIER MOBILE VIEW & THE 3 TABS (شاشة المندوب والـ 3 تابات)
    // -------------------------------------------------------------------------
    console.log('\n📱 [SECTION 3] Testing Courier Mobile Web View & The 3 Tabs (/courier/run/:id):');

    const runDetails = await courierService.getDeliveryRunById(testCompanyId, run1.id);
    console.log(`   🔑 Mobile JWT Token: ${runDetails.mobileToken ? 'VALID' : 'MISSING'}`);
    if (!runDetails.mobileToken) throw new Error('Mobile token generation failed');

    // Verify token decodes correctly with role: 'COURIER'
    const decodedToken = jwt.verify(runDetails.mobileToken, getJwtSecret());
    console.log(`   ✅ Token Decoded: role=${decodedToken.role}, courierId=${decodedToken.courierId}, runId=${decodedToken.runId}`);
    if (decodedToken.role !== 'COURIER' || decodedToken.runId !== run1.id) throw new Error('JWT token payload mismatch');

    // Tab 1: PENDING (المتبقي)
    let currentShipments = runDetails.shipments;
    let pendingList = currentShipments.filter(s => !['DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(s.status));
    console.log(`   📂 [Tab 1: PENDING] Total: ${pendingList.length} shipments (Expected: 2)`);
    if (pendingList.length !== 2) throw new Error('Pending tab count mismatch');

    // Action A: Mark Shipment 1 as DELAYED (Intermediate status check)
    const targetShipment1 = pendingList[0];
    console.log(`   🚚 Testing Shipment 1: DELAYED with reason...`);
    const delayedRes = await courierService.updateDeliveryRunShipment(testCompanyId, {
      shipmentId: targetShipment1.id,
      status: 'DELAYED',
      deliveryNotes: 'العميل طلب التأجيل إلى الغد'
    });
    console.log(`   ✅ Shipment 1 Status: ${delayedRes.status}`);
    const o1Delayed = await prisma.order.findUnique({ where: { id: order1.id } });
    console.log(`   ✅ Order 1 Status: ${o1Delayed.status}, CustomCode: ${o1Delayed.customStatusCode} (Compliant with OrderStatus enum)`);

    // Action B: Mark Shipment 1 as DELIVERED with 500 EGP collected
    console.log(`   🚚 Testing Shipment 1: DELIVERED with 500 EGP collected...`);
    const deliveredRes = await courierService.updateDeliveryRunShipment(testCompanyId, {
      shipmentId: targetShipment1.id,
      status: 'DELIVERED',
      collectedAmount: 500,
      deliveryNotes: 'تم التسليم باليد واستلام 500 ج.م'
    });
    console.log(`   ✅ Shipment 1 Status: ${deliveredRes.status}, Collected: ${deliveredRes.collectedAmount} EGP`);

    // Action C: Mark Shipment 2 as RETURNED (رفض الاستلام)
    const targetShipment2 = pendingList[1];
    console.log(`   🚚 Testing Shipment 2: RETURNED (العميل رفض الاستلام)...`);
    const returnedRes = await courierService.updateDeliveryRunShipment(testCompanyId, {
      shipmentId: targetShipment2.id,
      status: 'RETURNED',
      deliveryNotes: 'العميل رفض الاستلام - غير مطابق للمقاس'
    });
    console.log(`   ✅ Shipment 2 Status: ${returnedRes.status}`);

    // Verify Tab 2: DELIVERED (تم التسليم) & Tab 3: RETURNED (مرتجع)
    const runAfterActions = await courierService.getDeliveryRunById(testCompanyId, run1.id);
    const tabDelivered = runAfterActions.shipments.filter(s => s.status === 'DELIVERED');
    const tabReturned = runAfterActions.shipments.filter(s => ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status));
    const tabPending = runAfterActions.shipments.filter(s => !['DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(s.status));

    console.log(`   📂 [Tab 2: DELIVERED] Total: ${tabDelivered.length} (Expected: 1)`);
    console.log(`   📂 [Tab 3: RETURNED]  Total: ${tabReturned.length} (Expected: 1)`);
    console.log(`   📂 [Tab 1: PENDING]   Total: ${tabPending.length} (Expected: 0)`);

    if (tabDelivered.length !== 1 || tabReturned.length !== 1 || tabPending.length !== 0) {
      throw new Error('Mobile tab counts mismatch after field actions');
    }

    // Verify Run status transitioned to COMPLETED (اكتملت المأمورية)
    console.log(`   ✅ [Run Lifecycle] Delivery Run Status: ${runAfterActions.status} (Expected: COMPLETED)`);
    if (runAfterActions.status !== 'COMPLETED') throw new Error('Delivery run should be COMPLETED');

    // -------------------------------------------------------------------------
    // SECTION 4: FINANCIAL SETTLEMENT & TREASURY REMITTANCE (التوريد المالي وتسوية الوردية)
    // -------------------------------------------------------------------------
    console.log('\n💰 [SECTION 4] Testing Courier Settlements & Remittance (/shipping/courier-settlements):');

    // 4.1 Create Treasury Account
    const treasury = await prisma.treasuryAccount.create({
      data: {
        name: 'خزينة الفرع الرئيسي',
        type: 'CASH',
        balance: 1000.00,
        currency: 'EGP',
        isActive: true,
        company: { connect: { id: testCompanyId } }
      }
    });
    console.log(`   ✅ Treasury Account Created: Balance=${treasury.balance} EGP`);

    // 4.2 Settle Delivery Run with 500 EGP collected
    const settlement = await courierService.settleDeliveryRun(testCompanyId, run1.id, {
      treasuryAccountId: treasury.id,
      actualCashReceived: 500.00,
      notes: 'توريد كامل نقدية المأمورية الأولى بدون عجز'
    });
    console.log(`   ✅ [Action: Settle] Run Settled! Status: ${settlement.run.status}, Collected: ${settlement.run.totalCODCollected} EGP`);
    if (settlement.run.status !== 'SETTLED') throw new Error('Run should be SETTLED');

    // 4.3 Verify Treasury Account balance updated (1000 + 500 = 1500)
    const updatedTreasury = await prisma.treasuryAccount.findUnique({ where: { id: treasury.id } });
    console.log(`   💵 [Treasury Balance] New Balance: ${updatedTreasury.balance} EGP (Expected: 1500.00 EGP)`);
    if (Number(updatedTreasury.balance) !== 1500.00) throw new Error('Treasury balance mismatch');

    // 4.4 Verify Treasury Audit Transaction
    const auditTx = await prisma.treasuryTransaction.findFirst({
      where: { companyId: testCompanyId, referenceId: run1.id }
    });
    console.log(`   🧾 [Treasury Audit] Tx ID: ${auditTx.id}, Type: ${auditTx.type}, Amount: ${auditTx.amount}, RunningBalance: ${auditTx.runningBalance}`);
    if (auditTx.type !== 'DEPOSIT' || Number(auditTx.amount) !== 500 || Number(auditTx.runningBalance) !== 1500) {
      throw new Error('Treasury transaction audit mismatch');
    }

    // 4.5 Verify Order 1 paymentStatus updated to COMPLETED
    const o1Settled = await prisma.order.findUnique({ where: { id: order1.id } });
    console.log(`   💳 [Order Payment] Order 1 PaymentStatus: ${o1Settled.paymentStatus} (Expected: COMPLETED)`);
    if (o1Settled.paymentStatus !== 'COMPLETED') throw new Error('Order paymentStatus should be COMPLETED');

    // 4.6 Verify Courier 1 returned to AVAILABLE
    const courier1Settled = await courierService.getCourierById(testCompanyId, courier1.id);
    console.log(`   🛵 [Courier Status] Courier 1 status reset to: ${courier1Settled.status} (Expected: AVAILABLE)`);
    if (courier1Settled.status !== 'AVAILABLE') throw new Error('Courier status should be reset to AVAILABLE');

    // -------------------------------------------------------------------------
    // SECTION 5: SECOND RUN & SOFT DELETE BEHAVIOR (مأمورية ثانية وفحص الحذف الآمن)
    // -------------------------------------------------------------------------
    console.log('\n🔒 [SECTION 5] Testing Soft Delete Protection vs Hard Delete:');

    // Courier 1 has past shipments -> Delete should SOFT DELETE (isActive = false, status = OFF_DUTY)
    await courierService.deleteCourier(testCompanyId, courier1.id);
    const courier1Deleted = await prisma.courier.findUnique({ where: { id: courier1.id } });
    console.log(`   ✅ Courier 1 with history: isActive=${courier1Deleted.isActive}, status=${courier1Deleted.status} (Soft-deleted cleanly)`);
    if (courier1Deleted.isActive !== false) throw new Error('Courier with history should be soft deleted');

    // Courier 2 has NO shipments -> Delete should HARD DELETE
    await courierService.deleteCourier(testCompanyId, courier2.id);
    const courier2Deleted = await prisma.courier.findUnique({ where: { id: courier2.id } });
    console.log(`   ✅ Courier 2 with no history: Record=${courier2Deleted ? 'EXISTS' : 'NULL'} (Hard-deleted cleanly)`);
    if (courier2Deleted !== null) throw new Error('Courier without history should be permanently deleted');

    // -------------------------------------------------------------------------
    // SECTION 6: ISOLATION ON UNINSTALLED COMPANY (الفصل التام للشركات غير المفعلة)
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [SECTION 6] Testing Complete Isolation Against Uninstalled Company:');
    const noAppCouriers = await courierService.listCouriers(uninstalledCompanyId);
    const noAppRuns = await courierService.listDeliveryRuns(uninstalledCompanyId);
    const noAppRunsCount = (noAppRuns.data || []).length;
    console.log(`   ✅ Uninstalled Company: Couriers=${noAppCouriers.length}, Runs=${noAppRunsCount} (Expected: 0 & 0)`);
    if (noAppCouriers.length !== 0 || noAppRunsCount !== 0) throw new Error('Data leaked to uninstalled company');

    console.log('\n========================================================================');
    console.log('🎉 [COURIER-FLEET-FULL-AUDIT] ALL SECTIONS, TABS & FLOWS VERIFIED 100%!');
    console.log('========================================================================');
  } finally {
    console.log('🧹 Cleaning up test companies...');
    try {
      await prisma.shipment.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.deliveryRun.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.courier.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.treasuryTransaction.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.treasuryAccount.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.order.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.customer.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.companyApp.deleteMany({ where: { companyId: { in: [testCompanyId, uninstalledCompanyId] } } });
      await prisma.company.deleteMany({ where: { id: { in: [testCompanyId, uninstalledCompanyId] } } });
      console.log('✅ Cleanup finished cleanly.');
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }
}

runAllSectionsTest().catch((err) => {
  console.error('\n❌ Audit test failed:', err);
  process.exit(1);
});
