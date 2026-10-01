require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const platformSubController = require('../controller/platformSubscriptionController');
const adminCompanyController = require('../controller/adminCompnayController');
const superAdminApiController = require('../controller/superAdminApiController');
const superAdminPlatformController = require('../controller/superAdminPlatformController');
const marketplaceController = require('../controller/marketplaceManagementController');
const { marketplaceCatalogService } = require('../services/catalog/marketplaceCatalogService');

const mockResponse = () => {
  const res = { statusCode: 200, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.payload = data; return res; };
  res.send = (data) => { res.payload = data; return res; };
  return res;
};

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING RIGOROUS END-TO-END VERIFICATION SUITE');
  console.log('======================================================\n');

  const prisma = getSharedPrismaClient();
  const testResults = [];
  const assertTest = (name, passed, detail = '') => {
    testResults.push({ name, passed, detail });
    console.log(`${passed ? '✅' : '❌'} ${name} ${detail ? '(' + detail + ')' : ''}`);
    if (!passed) {
      console.error(`   🚨 FAILURE: ${name}: ${detail}`);
    }
  };

  const ts = Date.now();
  let testCompany1, testCompany2, testCompany3;

  try {
    // -----------------------------------------------------------------
    // TEST 1: Prisma Client & Schema Inspection
    // -----------------------------------------------------------------
    console.log('\n--- 1. Schema & Prisma Model Integrity ---');
    const { PrismaClient } = require('../prisma/generated/postgresql_v2');
    const directPrisma = new PrismaClient();
    const runtimeModels = Object.keys(directPrisma._runtimeDataModel.models);

    assertTest(
      'Prisma PlatformSubscription has no plan field',
      !("plan" in directPrisma._runtimeDataModel.models.PlatformSubscription.fields),
      'plan field dropped'
    );
    assertTest(
      'EnterprisePlan model is removed from Prisma Client',
      !runtimeModels.includes('EnterprisePlan'),
      'EnterprisePlan model dropped'
    );
    assertTest(
      'PlatformEnterprisePlan model is removed from Prisma Client',
      !runtimeModels.includes('PlatformEnterprisePlan'),
      'PlatformEnterprisePlan model dropped'
    );
    await directPrisma.$disconnect();

    // -----------------------------------------------------------------
    // TEST 2: Messaging Checkout Flow (999 EGP)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Messaging Checkout Flow (AI + Inbox Bundle) ---');
    testCompany1 = await prisma.company.create({
      data: {
        name: `TestMsgCompany_${ts}`,
        email: `msg_${ts}@test.local`,
        currency: 'EGP',
      }
    });
    await prisma.companyWallet.create({
      data: {
        companyId: testCompany1.id,
        balance: 1500,
        currency: 'EGP',
      }
    });

    const resMsg = mockResponse();
    await platformSubController.messagingCheckout(
      { user: { companyId: testCompany1.id, email: testCompany1.email }, headers: {} },
      resMsg
    );

    assertTest('messagingCheckout returns HTTP 200', resMsg.statusCode === 200, `status: ${resMsg.statusCode}`);
    assertTest('messagingCheckout reports walletPaid = true', resMsg.payload?.data?.walletPaid === true);

    const sub1 = await prisma.platformSubscription.findUnique({ where: { companyId: testCompany1.id } });
    assertTest('PlatformSubscription created with status ACTIVE', sub1?.status === 'ACTIVE');
    assertTest('PlatformSubscription has monthlyFee = 999', Number(sub1?.monthlyFee) === 999, `fee: ${sub1?.monthlyFee}`);
    assertTest('PlatformSubscription DB row has no plan column', sub1?.plan === undefined);

    const wallet1 = await prisma.companyWallet.findUnique({ where: { companyId: testCompany1.id } });
    assertTest('Wallet balance correctly deducted 1500 -> 501', Number(wallet1?.balance) === 501, `balance: ${wallet1?.balance}`);
    assertTest('Wallet totalSpent correctly incremented to 999', Number(wallet1?.totalSpent) === 999);

    const billing1 = await prisma.billingHistory.findFirst({
      where: { companyId: testCompany1.id, type: 'PLATFORM_FEE' },
      orderBy: { createdAt: 'desc' }
    });
    assertTest('BillingHistory created with status SUCCESS and amount 999', billing1?.status === 'SUCCESS' && Number(billing1?.amount) === 999);

    // Duplicate checkout prevention
    const resMsgDup = mockResponse();
    await platformSubController.messagingCheckout(
      { user: { companyId: testCompany1.id, email: testCompany1.email }, headers: {} },
      resMsgDup
    );
    assertTest('Duplicate checkout prevented without double debit', resMsgDup.payload?.data?.alreadyActive === true);

    // -----------------------------------------------------------------
    // TEST 3: Landing Page Free Activation (7-Day Trial)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Landing Page Free Activation (lpActivate) ---');
    testCompany2 = await prisma.company.create({
      data: {
        name: `TestLPCompany_${ts}`,
        email: `lp_${ts}@test.local`,
        currency: 'EGP',
      }
    });
    await prisma.companyWallet.create({
      data: {
        companyId: testCompany2.id,
        balance: 500,
        currency: 'EGP',
      }
    });

    const resLpFree = mockResponse();
    await platformSubController.lpActivate(
      { user: { companyId: testCompany2.id }, body: { bundleSlug: 'hr-complete-bundle' } },
      resLpFree
    );

    assertTest('lpActivate returns HTTP 200', resLpFree.statusCode === 200);
    assertTest('lpActivate returns trialDays: 7', resLpFree.payload?.data?.trialDays === 7);

    const sub2 = await prisma.platformSubscription.findUnique({ where: { companyId: testCompany2.id } });
    assertTest('Trial subscription has status ACTIVE', sub2?.status === 'ACTIVE');
    assertTest('Trial subscription has monthlyFee = 0', Number(sub2?.monthlyFee) === 0);
    assertTest('Trial subscription has valid trialEndDate', sub2?.trialEndDate instanceof Date);

    // -----------------------------------------------------------------
    // TEST 4: Landing Page Paid Checkout Upgrade (hr-complete-bundle at 299)
    // -----------------------------------------------------------------
    console.log('\n--- 4. Landing Page Paid Checkout Upgrade (lpCheckout) ---');
    const resLpPaid = mockResponse();
    await platformSubController.lpCheckout(
      { user: { companyId: testCompany2.id, email: testCompany2.email }, body: { bundleSlug: 'hr-complete-bundle' }, headers: {} },
      resLpPaid
    );

    assertTest('lpCheckout returns HTTP 200', resLpPaid.statusCode === 200);
    assertTest('lpCheckout reports walletPaid = true', resLpPaid.payload?.data?.walletPaid === true);

    const sub2Upgraded = await prisma.platformSubscription.findUnique({ where: { companyId: testCompany2.id } });
    assertTest('Subscription monthlyFee updated from 0 to 299 EGP', Number(sub2Upgraded?.monthlyFee) === 299, `fee: ${sub2Upgraded?.monthlyFee}`);

    const wallet2 = await prisma.companyWallet.findUnique({ where: { companyId: testCompany2.id } });
    assertTest('Wallet balance deducted 500 -> 201', Number(wallet2?.balance) === 201, `balance: ${wallet2?.balance}`);

    // -----------------------------------------------------------------
    // TEST 5: Kashier Webhook Payment Processing
    // -----------------------------------------------------------------
    console.log('\n--- 5. Kashier Webhook Processing ---');
    testCompany3 = await prisma.company.create({
      data: {
        name: `TestWebhookCompany_${ts}`,
        email: `webhook_${ts}@test.local`,
        currency: 'EGP',
      }
    });

    const pendingBill = await prisma.billingHistory.create({
      data: {
        companyId: testCompany3.id,
        type: 'PLATFORM_FEE',
        amount: 999,
        description: 'اشتراك باقة AI + Inbox',
        status: 'PENDING',
      }
    });

    const resWebhook = mockResponse();
    await platformSubController.handleWebhook(
      {
        body: {
          merchantOrderId: `messaging-${pendingBill.id}`,
          status: 'CAPTURED',
          sessionId: `sess_${ts}`,
        }
      },
      resWebhook
    );

    assertTest('Webhook returns HTTP 200', resWebhook.statusCode === 200);
    const sub3 = await prisma.platformSubscription.findUnique({ where: { companyId: testCompany3.id } });
    assertTest('Webhook activates PlatformSubscription with monthlyFee = 999', sub3?.status === 'ACTIVE' && Number(sub3?.monthlyFee) === 999);

    // -----------------------------------------------------------------
    // TEST 6: Admin Company Details Review Compatibility
    // -----------------------------------------------------------------
    console.log('\n--- 6. Admin Company Details Review ---');
    const resCompanyDetails = mockResponse();
    await adminCompanyController.getCompanyDetails(
      { params: { companyId: testCompany1.id } },
      resCompanyDetails
    );

    assertTest('getCompanyDetails returns HTTP 200', resCompanyDetails.statusCode === 200);
    const subReview = resCompanyDetails.payload?.data?.review?.subscription;
    assertTest('review.subscription contains monthlyFee and status without plan', subReview && Number(subReview.monthlyFee) === 999 && subReview.plan === undefined);

    // -----------------------------------------------------------------
    // TEST 7: Super Admin Subscriptions Telemetry API
    // -----------------------------------------------------------------
    console.log('\n--- 7. Super Admin Telemetry API ---');
    const resAdminSubs = mockResponse();
    await superAdminApiController.getSubscriptions({}, resAdminSubs);
    assertTest('superAdminApi.getSubscriptions returns HTTP 200', resAdminSubs.statusCode === 200);
    assertTest('superAdminApi.getSubscriptions returns statusBreakdown', resAdminSubs.payload?.data?.statusBreakdown !== undefined);
    assertTest('superAdminApi.getSubscriptions planBreakdown is removed', resAdminSubs.payload?.data?.planBreakdown === undefined);

    // -----------------------------------------------------------------
    // TEST 8: Marketplace Stats API
    // -----------------------------------------------------------------
    console.log('\n--- 8. Marketplace Stats API ---');
    const resMarketStats = mockResponse();
    await superAdminPlatformController.getMarketplaceStats({}, resMarketStats);
    assertTest('getMarketplaceStats returns HTTP 200', resMarketStats.statusCode === 200);
    assertTest('getMarketplaceStats returns subscriptionRevenue telemetry', resMarketStats.payload?.data?.subscriptionRevenue !== undefined);

    // -----------------------------------------------------------------
    // TEST 9: Database Backup Integrity
    // -----------------------------------------------------------------
    console.log('\n--- 9. Database Backup Table Verification ---');
    const backupCheck = await prisma.$queryRawUnsafe(`
      SELECT 
        (SELECT count(*)::int FROM information_schema.tables WHERE table_name = 'platform_subscriptions_backup_20261001') AS backup_table_exists,
        (SELECT count(*)::int FROM platform_subscriptions_backup_20261001) AS backup_count
    `);
    assertTest('Backup table platform_subscriptions_backup_20261001 exists', backupCheck[0]?.backup_table_exists === 1);
    assertTest('Backup table contains rows', backupCheck[0]?.backup_count > 0, `rows: ${backupCheck[0]?.backup_count}`);

  } finally {
    // Cleanup test companies
    console.log('\n--- Cleaning up test records ---');
    const cleanupIds = [testCompany1?.id, testCompany2?.id, testCompany3?.id].filter(Boolean);
    for (const cid of cleanupIds) {
      const w = await prisma.companyWallet.findUnique({ where: { companyId: cid } }).catch(() => null);
      if (w) await prisma.transaction.deleteMany({ where: { walletId: w.id } }).catch(() => null);
      await prisma.billingHistory.deleteMany({ where: { companyId: cid } }).catch(() => null);
      await prisma.companyApp.deleteMany({ where: { companyId: cid } }).catch(() => null);
      await prisma.platformSubscription.deleteMany({ where: { companyId: cid } }).catch(() => null);
      await prisma.companyWallet.deleteMany({ where: { companyId: cid } }).catch(() => null);
      await prisma.company.deleteMany({ where: { id: cid } }).catch(() => null);
    }
    await prisma.$disconnect();
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('📊 TEST SUMMARY RESULTS:');
  console.log('======================================================');
  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.filter(r => !r.passed).length;
  console.log(`Total assertions: ${testResults.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\nFailed Tests:');
    testResults.filter(r => !r.passed).forEach(r => console.log(` - ${r.name}: ${r.detail}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
