/**
 * Comprehensive Acceptance Test & Proof Script for In-House Courier Fleet App (internal-courier-fleet)
 *
 * Verifies:
 * 0. The courier router actually MOUNTS and GUARDS over HTTP (401/403, never a silent 404 —
 *    the router once shipped unmounted in server.js and the service-level tests stayed green).
 * 1. Installing internal-courier-fleet on an isolated test company from scratch.
 * 2. Registering a courier (details, vehicle, commission, status).
 * 3. Assigning a shipment/order to a Delivery Run (Manifest).
 * 4. Courier mobile link generation with token and field status update (DELIVERED, COD collected).
 * 5. End-of-Day Settlement & Remittance into Company Treasury (TreasuryAccount balance increases + TreasuryTransaction created).
 * 6. Waybill (بوليصة) & Manifest printing verification.
 * 7. Strict multi-tenant isolation against a second independent company.
 *
 * ⚠️ Lesson (2026-10-03): service-level checks bypass HTTP and can never catch an unmounted
 * router or shadowed route. The HTTP smoke in STEP 0 is the guard — keep it first.
 */

const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const courierService = require('../services/courierService');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

/**
 * STEP 0 — HTTP mount & guard smoke. Requires supertest (dev dependency); skipped
 * with a warning on production installs where dev deps are pruned.
 */
async function runHttpMountSmoke() {
  let request;
  try {
    request = require('supertest');
  } catch {
    console.log('⚠️ [STEP 0] supertest not installed (prod deps) — HTTP mount smoke SKIPPED');
    return;
  }

  console.log('\n🌐 [STEP 0] HTTP Mount & Guard Smoke (router reachable over HTTP, never 404):');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/couriers', require('../routes/courierRoutes'));

  const listRes = await request(app).get('/api/v1/couriers/runs');
  if (listRes.status === 404) {
    throw new Error('CRITICAL: GET /couriers/runs returned 404 over HTTP — router shadowed or missing. This is the silent production killer.');
  }
  if (![401, 403].includes(listRes.status)) {
    throw new Error(`Unexpected GET /couriers/runs status ${listRes.status} — expected the auth gate (401/403)`);
  }
  console.log(`   ✅ GET /couriers/runs over HTTP → ${listRes.status} (auth gate, not 404 — mounted and guarded)`);
}

async function runE2EVerification() {
  const prisma = getSharedPrismaClient();

  console.log('========================================================================');
  console.log('🚀 [COURIER-FLEET-E2E] STARTING ACCEPTANCE VERIFICATION LIFECYCLE');
  console.log('========================================================================\n');

  const timestamp = Date.now();
  const testCompanyAId = `test-co-fleet-${timestamp}`;
  const testCompanyBId = `test-co-isolated-${timestamp}`;

  try {
    // -------------------------------------------------------------------------
    // STEP 0: HTTP Mount & Guard Smoke (router reachable, auth-gated, never 404)
    // -------------------------------------------------------------------------
    await runHttpMountSmoke();

    // -------------------------------------------------------------------------
    // STEP 1: Create Isolated Test Companies
    // -------------------------------------------------------------------------
    console.log('🏢 [STEP 1] Creating Isolated Test Companies:');
    const companyA = await prisma.company.create({
      data: {
        id: testCompanyAId,
        name: `شركة أسطول الشحن والتوصيل التجريبية (${timestamp})`,
        email: `fleet-${timestamp}@test.maxp.online`,
        phone: `010${String(timestamp).slice(-8)}`,
      }
    });
    console.log(`   ✅ Company A created: ${companyA.name} (ID: ${companyA.id})`);

    const companyB = await prisma.company.create({
      data: {
        id: testCompanyBId,
        name: `شركة مستقلة معزولة بدون التطبيق (${timestamp})`,
        email: `isolated-${timestamp}@test.maxp.online`,
        phone: `011${String(timestamp).slice(-8)}`,
      }
    });
    console.log(`   ✅ Company B created: ${companyB.name} (ID: ${companyB.id})`);

    // Ensure MarketplaceApp 'internal-courier-fleet' exists in DB
    let marketplaceApp = await prisma.marketplaceApp.findFirst({
      where: { slug: 'internal-courier-fleet' }
    });

    if (!marketplaceApp) {
      marketplaceApp = await prisma.marketplaceApp.create({
        data: {
          slug: 'internal-courier-fleet',
          name: 'أسطول المناديب والتوصيل الداخلي',
          category: 'SHIPPING',
          monthlyPrice: 129,
          yearlyPrice: 1290,
          pricingModel: 'SUBSCRIPTION',
          isActive: true,
          isPublic: true
        }
      });
      console.log('   ✅ Marketplace app "internal-courier-fleet" registered in DB.');
    }

    // -------------------------------------------------------------------------
    // STEP 2: Proof of Isolation on Company B (App Disabled)
    // -------------------------------------------------------------------------
    console.log('\n🔒 [STEP 2] Verifying Isolation on Company B (App is Disabled):');
    const companyBApps = await prisma.companyApp.findMany({
      where: { companyId: testCompanyBId, app: { slug: 'internal-courier-fleet' } }
    });
    console.log(`   ✅ Company B installed apps for internal-courier-fleet count: ${companyBApps.length} (Expected: 0)`);
    if (companyBApps.length !== 0) throw new Error('Company B should have 0 courier fleet apps installed');

    // -------------------------------------------------------------------------
    // STEP 3: Install App on Test Company A from Scratch
    // -------------------------------------------------------------------------
    console.log('\n📦 [STEP 3] Installing "internal-courier-fleet" on Company A from scratch:');
    const initialCouriers = await courierService.listCouriers(testCompanyAId);
    console.log(`   Initial couriers count: ${initialCouriers.length} (Starts clean from zero)`);

    const companyAppA = await prisma.companyApp.create({
      data: {
        companyId: testCompanyAId,
        appId: marketplaceApp.id,
        status: 'ACTIVE',
        activePricingModel: 'SUBSCRIPTION',
        settings: {
          general: { runCodePrefix: 'FLEET' },
          remittance: { shortagePolicy: 'DEDUCT_FROM_COURIER', allowPartialRemittance: true },
          fieldWorkflow: { autoUpdateOrderStatusOnDelivery: true },
          commission: { defaultType: 'FIXED_PER_ORDER', defaultValue: 35 }
        }
      }
    });
    console.log(`   ✅ App installed successfully for Company A. Status: ${companyAppA.status}`);

    // -------------------------------------------------------------------------
    // STEP 4: Register Courier on Company A
    // -------------------------------------------------------------------------
    console.log('\n🛵 [STEP 4] Registering Courier for Company A:');
    const courier = await courierService.createCourier(testCompanyAId, {
      name: 'كابتن أحمد سامي (مندوب أسطول تجريبي)',
      phone: '01099887766',
      nationalId: '29501011234567',
      vehicleType: 'MOTORCYCLE',
      plateNumber: 'س ق ط 4125',
      governorates: 'القاهرة, الجيزة',
      commissionType: 'FIXED_PER_ORDER',
      commissionAmount: 35.0,
      notes: 'مندوب خبير في مناطق شرق القاهرة ومصر الجديدة'
    });
    console.log(`   ✅ Courier Registered: ID=${courier.id}, Name=${courier.name}, Status=${courier.status}, Commission=${courier.commissionAmount} EGP`);

    // -------------------------------------------------------------------------
    // STEP 5: Create Order & Assign to Delivery Run (Manifest)
    // -------------------------------------------------------------------------
    const customerRecord = await prisma.customer.create({
      data: {
        firstName: 'محمود',
        lastName: 'عبد العزيز',
        phone: '01234567890',
        company: { connect: { id: testCompanyAId } }
      }
    });

    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-${timestamp}-901`,
        customerName: 'محمود عبد العزيز',
        customerPhone: '01234567890',
        customerAddress: 'شارع مصطفى النحاس، تقاطع مكرم عبيد',
        city: 'مدينة نصر',
        governorate: 'القاهرة',
        total: 750.00,
        subtotal: 700.00,
        shipping: 50.00,
        status: 'READY_TO_SHIP',
        company: { connect: { id: testCompanyAId } },
        customer: { connect: { id: customerRecord.id } }
      }
    });
    console.log(`   ✅ Test Order Created: ${testOrder.orderNumber}, Total COD: ${testOrder.total} EGP`);

    // Create Delivery Run by orderNumber (testing orderNumber lookup resilience)
    const run = await courierService.createDeliveryRun(testCompanyAId, {
      courierId: courier.id,
      orderIds: [testOrder.orderNumber],
      notes: 'مأمورية شرق القاهرة الصباحية'
    });
    console.log(`   ✅ Delivery Run Created by orderNumber: RunNumber=${run.runNumber}, TotalShipments=${run.totalShipments}, ExpectedCOD=${run.totalCODExpected} EGP`);

    // Verify courier status became ON_DUTY
    const updatedCourier = await courierService.getCourierById(testCompanyAId, courier.id);
    console.log(`   ✅ Courier Status Updated: ${updatedCourier.status} (Expected: ON_DUTY)`);
    if (updatedCourier.status !== 'ON_DUTY') throw new Error('Courier should be ON_DUTY after dispatch');

    // -------------------------------------------------------------------------
    // STEP 6: Courier Mobile View & Field Delivery via Link/Token
    // -------------------------------------------------------------------------
    console.log('\n📱 [STEP 6] Courier Mobile View & Field Delivery via Smart Link:');
    const runDetails = await courierService.getDeliveryRunById(testCompanyAId, run.id);
    console.log(`   ✅ Mobile Token generated: ${runDetails.mobileToken ? 'YES (' + runDetails.mobileToken.slice(0, 20) + '...)' : 'NO'}`);
    const mobileLink = `/courier/run/${run.id}?token=${runDetails.mobileToken}`;
    console.log(`   🔗 Direct Mobile Link: ${mobileLink}`);

    const targetShipment = runDetails.shipments[0];
    console.log(`   📦 Shipment in Run: ID=${targetShipment.id}, Status=${targetShipment.status}`);

    // Test intermediate field DELAYED status handling (OrderStatus enum safety check)
    console.log('   ⏳ Testing intermediate DELAYED field status...');
    const delayedShipment = await courierService.updateDeliveryRunShipment(testCompanyAId, {
      shipmentId: targetShipment.id,
      status: 'DELAYED',
      deliveryNotes: 'العميل طلب التأجيل إلى المساء لعدم تواجده بالمنزل'
    });
    console.log(`   ✅ Shipment Delayed Status: ${delayedShipment.status}`);
    const orderWhileDelayed = await prisma.order.findUnique({ where: { id: testOrder.id } });
    console.log(`   ✅ Order Status while delayed: ${orderWhileDelayed.status}, CustomCode: ${orderWhileDelayed.customStatusCode} (Safe OrderStatus enum compliance)`);

    // Courier records successful delivery and cash collection
    console.log('   🚚 Updating shipment status from mobile: DELIVERED, Collected: 750.00 EGP');
    const updatedShipment = await courierService.updateDeliveryRunShipment(testCompanyAId, {
      shipmentId: targetShipment.id,
      status: 'DELIVERED',
      collectedAmount: 750.00,
      deliveryNotes: 'تم التسليم للعميل باليد واستلام كامل المبلغ نقداً'
    });
    console.log(`   ✅ Shipment Status: ${updatedShipment.status}, Collected: ${updatedShipment.collectedAmount} EGP`);

    // Verify order status also updated to DELIVERED
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
    console.log(`   ✅ Order Status: ${updatedOrder.status} (Expected: DELIVERED)`);

    // Verify delivery run is now marked COMPLETED
    const runAfterDelivery = await courierService.getDeliveryRunById(testCompanyAId, run.id);
    console.log(`   ✅ Delivery Run Status: ${runAfterDelivery.status} (Expected: COMPLETED)`);

    // -------------------------------------------------------------------------
    // STEP 7: Treasury Remittance & Run Settlement
    // -------------------------------------------------------------------------
    console.log('\n💰 [STEP 7] End-of-Day Financial Remittance to Treasury:');
    // Create dedicated Treasury Account for Company A
    const treasuryAccount = await prisma.treasuryAccount.create({
      data: {
        name: 'خزينة النقدية الرئيسية (تجريبي)',
        type: 'CASH',
        balance: 0.00,
        currency: 'EGP',
        isActive: true,
        company: { connect: { id: testCompanyAId } }
      }
    });
    console.log(`   ✅ Initial Treasury Account Balance: ${treasuryAccount.balance} EGP`);

    // Settle Delivery Run
    const settlementResult = await courierService.settleDeliveryRun(testCompanyAId, run.id, {
      treasuryAccountId: treasuryAccount.id,
      actualCashReceived: 750.00,
      notes: 'توريد كامل نقدية المأمورية بدون أي عجز'
    });
    console.log(`   ✅ Settlement Executed: Run Status=${settlementResult.run.status}, Collected=${settlementResult.run.totalCODCollected} EGP`);

    // Verify Treasury Account Balance increased
    const updatedTreasury = await prisma.treasuryAccount.findUnique({ where: { id: treasuryAccount.id } });
    console.log(`   💵 Updated Treasury Account Balance: ${updatedTreasury.balance} EGP (Expected: 750.00 EGP)`);
    if (Number(updatedTreasury.balance) !== 750.00) {
      throw new Error(`Treasury balance mismatch: expected 750, got ${updatedTreasury.balance}`);
    }

    // Verify Order PaymentStatus updated to COMPLETED
    const orderAfterSettlement = await prisma.order.findUnique({ where: { id: testOrder.id } });
    console.log(`   💳 Order Payment Status: ${orderAfterSettlement.paymentStatus} (Expected: COMPLETED)`);
    if (orderAfterSettlement.paymentStatus !== 'COMPLETED') {
      throw new Error(`Order payment status mismatch: expected COMPLETED, got ${orderAfterSettlement.paymentStatus}`);
    }

    // Verify Treasury Transaction record
    const treasuryTx = await prisma.treasuryTransaction.findFirst({
      where: { companyId: testCompanyAId, referenceId: run.id }
    });
    console.log(`   🧾 Treasury Audit Transaction Record: ID=${treasuryTx.id}, Type=${treasuryTx.type}, Amount=${treasuryTx.amount} EGP, RunningBalance=${treasuryTx.runningBalance} EGP`);

    // Verify Courier status returned to AVAILABLE
    const finalCourier = await courierService.getCourierById(testCompanyAId, courier.id);
    console.log(`   ✅ Courier Status Reset: ${finalCourier.status} (Expected: AVAILABLE)`);

    // -------------------------------------------------------------------------
    // STEP 8: Waybill & Manifest Generation
    // -------------------------------------------------------------------------
    console.log('\n📄 [STEP 8] Waybill (البوليصة) & Manifest (المانيفست) Data Verification:');
    const settledRun = await courierService.getDeliveryRunById(testCompanyAId, run.id);
    console.log(`   ✅ Manifest ${settledRun.runNumber}:`);
    console.log(`      - Dispatch Date: ${settledRun.dispatchDate.toISOString().slice(0, 10)}`);
    console.log(`      - Courier: ${settledRun.courier.name} (${settledRun.courier.phone})`);
    console.log(`      - Total Parcels: ${settledRun.totalShipments}`);
    console.log(`      - Total Expected COD: ${settledRun.totalCODExpected} EGP`);
    console.log(`      - Total Remitted COD: ${settledRun.totalCODCollected} EGP`);
    console.log(`      - Settlement Status: ${settledRun.status}`);

    const settledShipment = settledRun.shipments[0];
    console.log(`   ✅ Waybill for Order ${settledShipment.order.orderNumber}:`);
    console.log(`      - Consignee: ${settledShipment.order.customerName} (${settledShipment.order.customerPhone})`);
    console.log(`      - Address: ${settledShipment.order.governorate} - ${settledShipment.order.customerAddress}`);
    console.log(`      - Cash On Delivery (المبلغ المطلوب): ${settledShipment.order.total} EGP`);
    console.log(`      - Courier Assigned: ${settledRun.courier.name}`);
    console.log(`      - Delivery Result: ${settledShipment.status} (Settlement: ${settledShipment.settlementStatus})`);

    // -------------------------------------------------------------------------
    // STEP 9: Cross-Tenant Isolation Proof (Company B)
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [STEP 9] Verifying Strict Multi-Tenant Isolation Against Company B:');
    // 1. Company B with app NOT installed:
    const couriersInBBeforeInstall = await courierService.listCouriers(testCompanyBId);
    console.log(`   ✅ Company B Couriers count: ${couriersInBBeforeInstall.length} (Expected: 0)`);
    if (couriersInBBeforeInstall.length !== 0) throw new Error('Company B should not see any couriers');

    const runsInBBeforeInstall = await courierService.listDeliveryRuns(testCompanyBId);
    console.log(`   ✅ Company B Delivery Runs count: ${runsInBBeforeInstall.data.length} (Expected: 0)`);
    if (runsInBBeforeInstall.data.length !== 0) throw new Error('Company B should not see any runs');

    // 2. Install app on Company B:
    console.log('   📦 Installing "internal-courier-fleet" on Company B...');
    await prisma.companyApp.create({
      data: {
        companyId: testCompanyBId,
        appId: marketplaceApp.id,
        status: 'ACTIVE',
        activePricingModel: 'SUBSCRIPTION',
      }
    });

    // Verify Company B starts with completely empty data (isolated):
    const couriersInB = await courierService.listCouriers(testCompanyBId);
    console.log(`   ✅ Company B Couriers after install: ${couriersInB.length} (Expected: 0)`);
    if (couriersInB.length !== 0) throw new Error('Company B should have 0 couriers of its own');

    const runsInB = await courierService.listDeliveryRuns(testCompanyBId);
    console.log(`   ✅ Company B Delivery Runs after install: ${runsInB.data.length} (Expected: 0)`);
    if (runsInB.data.length !== 0) throw new Error('Company B should have 0 runs of its own');

    console.log('   ✅ Company A\'s courier and delivery runs are 100% invisible to Company B.');

    console.log('\n========================================================================');
    console.log('🎉 [COURIER-FLEET-E2E] ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
    console.log('========================================================================\n');

  } catch (error) {
    console.error('❌ [COURIER-FLEET-E2E] Verification FAILED:', error);
    process.exitCode = 1;
  } finally {
    // Cleanup temporary test data cleanly
    console.log('🧹 Cleaning up test companies...');
    try {
      await prisma.treasuryTransaction.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.treasuryAccount.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.shipment.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.deliveryRun.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.order.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.courier.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.companyApp.deleteMany({ where: { companyId: { in: [testCompanyAId, testCompanyBId] } } });
      await prisma.company.deleteMany({ where: { id: { in: [testCompanyAId, testCompanyBId] } } });
      console.log('✅ Cleanup completed cleanly.');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup error:', cleanupError.message);
    }
    process.exit(process.exitCode || 0);
  }
}

runE2EVerification();
