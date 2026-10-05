const { getSharedPrismaClient } = require('../services/sharedDatabase');
const treasuryController = require('../controller/treasuryExpensesController');

async function runTests() {
  console.log('=== [TEST SUITE: Treasury Chronological Order & Ledger Accuracy] ===\n');

  const prisma = getSharedPrismaClient();
  const testCompanyId = `test-comp-${Date.now()}`;
  const testUserId = `test-user-${Date.now()}`;

  // Create isolated test company in database
  await prisma.company.create({
    data: {
      id: testCompanyId,
      name: 'Test Chronology Company',
      email: `${testCompanyId}@test.local`,
    }
  });

  // Helper mock request/response
  function createMockReqRes(body = {}, query = {}, params = {}) {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { id: testUserId, companyId: testCompanyId, effectiveCompanyId: testCompanyId },
      body,
      query,
      params,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
      getStatusCode: () => statusCode,
      getJson: () => jsonResult,
    };
    return { req, res };
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Accounts initialization & seeding
    // -------------------------------------------------------------
    console.log('Test 1: Initializing default accounts for company...');
    const { req: req1, res: res1 } = createMockReqRes();
    await treasuryController.getAccounts(req1, res1);
    const accountsData = res1.getJson();
    if (!accountsData || !accountsData.success || !accountsData.data.accounts.length) {
      throw new Error('Failed to seed default accounts');
    }
    const defaultAccount = accountsData.data.accounts.find(a => a.isDefault) || accountsData.data.accounts[0];
    console.log(`✅ Default account initialized: "${defaultAccount.name}" (ID: ${defaultAccount.id})\n`);

    // -------------------------------------------------------------
    // Test 2: Sequence of 3 commands matching the user's exact case:
    // Action A: Deposit 2,500 EGP
    // Action B: Expense 500 EGP
    // Action C: Expense 2,000 EGP
    // -------------------------------------------------------------
    console.log('Test 2: Simulating 3 sequential commands...');

    // Action A: Deposit 2,500
    console.log(' -> Executing Command 1: Deposit Capital 2,500 EGP...');
    const todayStr = new Date().toISOString().split('T')[0];
    const { req: reqDep, res: resDep } = createMockReqRes({
      treasuryAccountId: defaultAccount.id,
      amount: 2500,
      type: 'CAPITAL_INJECTION',
      investorName: 'عبدالله',
      date: todayStr,
    });
    await treasuryController.depositCapital(reqDep, resDep);
    const depRes = resDep.getJson();
    if (!depRes.success) throw new Error(`Deposit failed: ${depRes.message}`);
    console.log(`    Result: Success. Updated balance: ${depRes.data.updatedBalance} EGP`);

    // Small delay to ensure separate microsecond timestamps
    await new Promise(r => setTimeout(r, 50));

    // Action B: Expense 500
    console.log(' -> Executing Command 2: Expense 500 EGP (Marketing Commission)...');
    const { req: reqExp1, res: resExp1 } = createMockReqRes({
      title: 'عمولة تسويق',
      amount: 500,
      treasuryAccountId: defaultAccount.id,
      paymentDate: todayStr,
      beneficiary: 'H2M',
      status: 'PAID',
    });
    await treasuryController.createExpense(reqExp1, resExp1);
    const exp1Res = resExp1.getJson();
    if (!exp1Res.success) throw new Error(`Expense 1 failed: ${exp1Res.message}`);
    console.log(`    Result: Success. Updated balance: ${exp1Res.data.updatedBalance} EGP`);

    // Small delay
    await new Promise(r => setTimeout(r, 50));

    // Action C: Expense 2,000
    console.log(' -> Executing Command 3: Expense 2,000 EGP (Facebook Ads)...');
    const { req: reqExp2, res: resExp2 } = createMockReqRes({
      title: 'اعلانات فيسبوك',
      amount: 2000,
      treasuryAccountId: defaultAccount.id,
      paymentDate: todayStr,
      beneficiary: 'فيسبوك',
      status: 'PAID',
    });
    await treasuryController.createExpense(reqExp2, resExp2);
    const exp2Res = resExp2.getJson();
    if (!exp2Res.success) throw new Error(`Expense 2 failed: ${exp2Res.message}`);
    console.log(`    Result: Success. Updated balance: ${exp2Res.data.updatedBalance} EGP\n`);

    // -------------------------------------------------------------
    // Test 3: Ledger query with sortOrder = 'desc' (Newest first)
    // -------------------------------------------------------------
    console.log("Test 3: Testing getLedger with sortOrder = 'desc' (Default / Newest first)...");
    const { req: reqLedgerDesc, res: resLedgerDesc } = createMockReqRes({}, { sortOrder: 'desc' });
    await treasuryController.getLedger(reqLedgerDesc, resLedgerDesc);
    const ledgerDescData = resLedgerDesc.getJson();
    const txsDesc = ledgerDescData.data.transactions;

    console.log(`Found ${txsDesc.length} transactions:`);
    txsDesc.forEach((tx, i) => {
      console.log(`  Row ${i + 1}: [${new Date(tx.date).toLocaleTimeString('ar-EG')}] ${tx.description} | Amount: ${tx.amount} | RunningBalance: ${tx.runningBalance}`);
    });

    // Verification:
    // Row 1 must be Expense 2,000 (Balance = 0)
    // Row 2 must be Expense 500 (Balance = 2,000)
    // Row 3 must be Deposit 2,500 (Balance = 2,500)
    if (Number(txsDesc[0].runningBalance) !== 0 || Number(txsDesc[0].amount) !== -2000) {
      throw new Error(`Row 1 should be Expense -2000 with balance 0, but got: amount=${txsDesc[0].amount}, balance=${txsDesc[0].runningBalance}`);
    }
    if (Number(txsDesc[1].runningBalance) !== 2000 || Number(txsDesc[1].amount) !== -500) {
      throw new Error(`Row 2 should be Expense -500 with balance 2000, but got: amount=${txsDesc[1].amount}, balance=${txsDesc[1].runningBalance}`);
    }
    if (Number(txsDesc[2].runningBalance) !== 2500 || Number(txsDesc[2].amount) !== 2500) {
      throw new Error(`Row 3 should be Deposit +2500 with balance 2500, but got: amount=${txsDesc[2].amount}, balance=${txsDesc[2].runningBalance}`);
    }
    console.log('✅ PASS: Descending order places newest command (Expense 2000 -> Bal 0) at the top!\n');

    // -------------------------------------------------------------
    // Test 4: Ledger query with sortOrder = 'asc' (Oldest first)
    // -------------------------------------------------------------
    console.log("Test 4: Testing getLedger with sortOrder = 'asc' (Oldest first / Step-by-step chronology)...");
    const { req: reqLedgerAsc, res: resLedgerAsc } = createMockReqRes({}, { sortOrder: 'asc' });
    await treasuryController.getLedger(reqLedgerAsc, resLedgerAsc);
    const ledgerAscData = resLedgerAsc.getJson();
    const txsAsc = ledgerAscData.data.transactions;

    console.log(`Found ${txsAsc.length} transactions:`);
    txsAsc.forEach((tx, i) => {
      console.log(`  Row ${i + 1}: [${new Date(tx.date).toLocaleTimeString('ar-EG')}] ${tx.description} | Amount: ${tx.amount} | RunningBalance: ${tx.runningBalance}`);
    });

    if (Number(txsAsc[0].runningBalance) !== 2500 || Number(txsAsc[0].amount) !== 2500) {
      throw new Error(`Row 1 in ASC should be Deposit +2500 with balance 2500, got: ${txsAsc[0].amount}`);
    }
    if (Number(txsAsc[1].runningBalance) !== 2000 || Number(txsAsc[1].amount) !== -500) {
      throw new Error(`Row 2 in ASC should be Expense -500 with balance 2000, got: ${txsAsc[1].amount}`);
    }
    if (Number(txsAsc[2].runningBalance) !== 0 || Number(txsAsc[2].amount) !== -2000) {
      throw new Error(`Row 3 in ASC should be Expense -2000 with balance 0, got: ${txsAsc[2].amount}`);
    }
    console.log('✅ PASS: Ascending order correctly traces deposit -> expense 1 -> expense 2 in chronological order!\n');

    // -------------------------------------------------------------
    // Test 5: Self-healing autoFixChronologyAndDates simulation
    // -------------------------------------------------------------
    console.log('Test 5: Simulating corrupt midnight-shifted records and testing autoFixChronologyAndDates...');
    // Artificially shift date to midnight 00:00:00 (simulate the old bug)
    const midnightDate = new Date();
    midnightDate.setHours(0, 0, 0, 0);

    await prisma.treasuryTransaction.updateMany({
      where: { companyId: testCompanyId },
      data: { date: midnightDate }
    });

    const shiftedTxs = await prisma.treasuryTransaction.findMany({
      where: { companyId: testCompanyId }
    });
    console.log(`  Intentionally set ${shiftedTxs.length} records to midnight 00:00:00.`);

    // Now call getLedger which triggers ensureDefaults -> autoFixChronologyAndDates
    console.log('  Calling getLedger to trigger self-healing alignment...');
    const { req: reqHeal, res: resHeal } = createMockReqRes({}, { sortOrder: 'desc' });
    await treasuryController.getLedger(reqHeal, resHeal);
    const healData = resHeal.getJson();
    const healedTxs = healData.data.transactions;

    console.log('  Healed records timestamps:');
    healedTxs.forEach((tx, i) => {
      console.log(`    Row ${i + 1}: [${new Date(tx.date).toLocaleTimeString('ar-EG')}] ${tx.description} | Balance: ${tx.runningBalance}`);
    });

    // Check that none of the rows are stuck at 00:00:00
    const stillMidnight = healedTxs.some(t => {
      const d = new Date(t.date);
      return d.getMinutes() === 0 && d.getSeconds() === 0 && [0, 2, 3].includes(d.getHours());
    });
    if (stillMidnight) {
      throw new Error('Self-healing failed: some records are still at midnight/shift time');
    }
    console.log('✅ PASS: Self-healing auto-fix successfully restored real creation timestamps from createdAt!\n');

    // Clean up test company data
    console.log('Cleaning up test company data...');
    await prisma.treasuryTransaction.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.companyExpense.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.capitalTransaction.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.treasuryAccount.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.expenseCategory.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
    console.log('✅ Clean up complete.');

    console.log('\n======================================================');
    console.log('🎉 ALL 5 COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
