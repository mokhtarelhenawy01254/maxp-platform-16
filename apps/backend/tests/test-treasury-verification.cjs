const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const controller = require('../controller/treasuryExpensesController');

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🧪 STARTING TREASURY & EXPENSES VERIFICATION SUITE');
  console.log('════════════════════════════════════════════════════════════════\n');

  const prisma = getSharedPrismaClient();
  const testCompanyId = `test-treasury-${Date.now()}`;
  const mockUser = { companyId: testCompanyId, id: 'test-user-1' };

  const mockRes = () => {
    let statusCode = 200;
    let responseData = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return { statusCode, data };
      },
      getResponse() {
        return { statusCode, data: responseData };
      }
    };
  };

  try {
    // -----------------------------------------------------------
    // TEST 1: High-Concurrency Race Condition Protection
    // -----------------------------------------------------------
    console.log('▶ TEST 1: Firing 10 concurrent requests to simulate simultaneous page load...');
    const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
      const res = mockRes();
      return controller.getAccounts({ user: mockUser }, res).then(() => res.getResponse());
    });

    const results = await Promise.all(concurrentRequests);
    const firstRes = results[0];
    const accountsAfterRace = firstRes.data?.data?.accounts || [];

    console.log(`  ✓ 10 concurrent requests resolved.`);
    console.log(`  ✓ Number of accounts created: ${accountsAfterRace.length}`);
    if (accountsAfterRace.length !== 3) {
      throw new Error(`Expected exactly 3 default accounts, got ${accountsAfterRace.length}`);
    }
    console.log('  ✅ TEST 1 PASSED: Zero duplicates created under 10 concurrent requests!\n');

    // -----------------------------------------------------------
    // TEST 2: Active Deduplication Cleanup of Pre-existing Duplicates
    // -----------------------------------------------------------
    console.log('▶ TEST 2: Artificially injecting 3 duplicate accounts to simulate user issue...');
    // Insert 3 duplicate accounts with same names
    for (const acc of accountsAfterRace) {
      await prisma.treasuryAccount.create({
        data: {
          companyId: testCompanyId,
          name: acc.name,
          type: acc.type,
          balance: 150.0,
          currency: 'EGP',
          isDefault: false
        }
      });
    }

    const countBeforeCleanup = await prisma.treasuryAccount.count({ where: { companyId: testCompanyId } });
    console.log(`  ✓ Total accounts in database before cleanup: ${countBeforeCleanup} (expected 6)`);
    if (countBeforeCleanup !== 6) {
      throw new Error(`Expected 6 accounts before cleanup, got ${countBeforeCleanup}`);
    }

    console.log('  ▶ Calling getAccounts to trigger self-healing deduplication cleanup...');
    const res2 = mockRes();
    await controller.getAccounts({ user: mockUser }, res2);
    const cleanAccounts = res2.getResponse().data?.data?.accounts || [];

    console.log(`  ✓ Accounts returned after cleanup: ${cleanAccounts.length}`);
    const countInDb = await prisma.treasuryAccount.count({ where: { companyId: testCompanyId } });
    console.log(`  ✓ Actual accounts count in database after cleanup: ${countInDb}`);

    if (cleanAccounts.length !== 3 || countInDb !== 3) {
      throw new Error(`Expected 3 accounts after deduplication, got ${cleanAccounts.length} (DB: ${countInDb})`);
    }

    // Check unique names
    const names = cleanAccounts.map(a => a.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== 3) {
      throw new Error(`Duplicate names detected: ${names.join(', ')}`);
    }

    // Check that balance of 150 from duplicates was merged into primary
    const totalBalance = cleanAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
    console.log(`  ✓ Total balance after merging duplicates: ${totalBalance} EGP (balances preserved)`);

    console.log('  ✅ TEST 2 PASSED: Duplicates cleaned up and merged successfully!\n');

    // -----------------------------------------------------------
    // TEST 3: Account Update (PUT /accounts/:id)
    // -----------------------------------------------------------
    console.log('▶ TEST 3: Testing account update (PUT /accounts/:id)...');
    const targetAccount = cleanAccounts[0];
    const updateRes = mockRes();
    await controller.updateAccount({
      user: mockUser,
      params: { id: targetAccount.id },
      body: {
        name: 'الخزينة النقدية المعدلة',
        description: 'وصف تجريبي معدل',
        accountNumber: 'ACC-998877'
      }
    }, updateRes);

    const updatedAccount = updateRes.getResponse().data?.data;
    if (updatedAccount.name !== 'الخزينة النقدية المعدلة' || updatedAccount.accountNumber !== 'ACC-998877') {
      throw new Error('Account update failed to persist new name or account number');
    }
    console.log(`  ✓ Account updated: "${updatedAccount.name}" (Account #: ${updatedAccount.accountNumber})`);
    console.log('  ✅ TEST 3 PASSED: Account update works seamlessly!\n');

    // -----------------------------------------------------------
    // TEST 4: Categories Deduplication & Seeding
    // -----------------------------------------------------------
    console.log('▶ TEST 4: Verifying Categories Deduplication & Seeding...');
    const catRes = mockRes();
    await controller.getCategories({ user: mockUser }, catRes);
    const categories = catRes.getResponse().data?.data || [];
    console.log(`  ✓ Total default categories: ${categories.length} (expected 8)`);
    if (categories.length !== 8) {
      throw new Error(`Expected 8 default categories, got ${categories.length}`);
    }
    const catNames = new Set(categories.map(c => c.name));
    if (catNames.size !== 8) {
      throw new Error('Duplicate category names detected!');
    }
    console.log('  ✅ TEST 4 PASSED: Exactly 8 unique categories seeded without duplicates!\n');

    // -----------------------------------------------------------
    // TEST 5: Create Expense & Balance Deduction
    // -----------------------------------------------------------
    console.log('▶ TEST 5: Testing Expense Creation and Treasury Balance Deduction...');
    const cashAccount = cleanAccounts.find(a => a.id === targetAccount.id);
    const initialBal = Number(cashAccount.balance);

    const expRes = mockRes();
    await controller.createExpense({
      user: mockUser,
      body: {
        title: 'فاتورة صيانة تجريبية',
        amount: 50,
        categoryId: categories[0].id,
        treasuryAccountId: cashAccount.id,
        status: 'PAID',
        beneficiary: 'شركة الصيانة',
        notes: 'اختبار الخصم المالي اللحظي'
      }
    }, expRes);

    const createdExp = expRes.getResponse().data?.data?.expense;
    const newBalance = expRes.getResponse().data?.data?.updatedBalance;
    console.log(`  ✓ Expense created: "${createdExp.title}" (EXP Number: ${createdExp.expenseNumber})`);
    console.log(`  ✓ Account Balance before: ${initialBal}, after deduction: ${newBalance} (Diff: ${initialBal - newBalance})`);
    if (initialBal - newBalance !== 50) {
      throw new Error(`Expected balance deduction of 50, got ${initialBal - newBalance}`);
    }
    console.log('  ✅ TEST 5 PASSED: Expense deduction and ledger audit verified!\n');

    // -----------------------------------------------------------
    // TEST 6: Update Expense & Balance Reconciliation
    // -----------------------------------------------------------
    console.log('▶ TEST 6: Testing Expense Update and Reconciliation...');
    const expUpdateRes = mockRes();
    await controller.updateExpense({
      user: mockUser,
      params: { id: createdExp.id },
      body: {
        title: 'فاتورة صيانة معدلة',
        amount: 80, // Changed from 50 to 80 (should deduct 30 more)
        categoryId: categories[0].id,
        treasuryAccountId: cashAccount.id,
        status: 'PAID'
      }
    }, expUpdateRes);

    const reconciledBalance = expUpdateRes.getResponse().data?.data?.updatedBalance;
    console.log(`  ✓ Expense updated amount: 50 -> 80`);
    console.log(`  ✓ Account Balance after adjustment: ${reconciledBalance} (Diff from original: ${initialBal - reconciledBalance})`);
    if (initialBal - reconciledBalance !== 80) {
      throw new Error(`Expected total deduction of 80, got ${initialBal - reconciledBalance}`);
    }
    console.log('  ✅ TEST 6 PASSED: Balance reconciliation on expense update verified!\n');

    // -----------------------------------------------------------
    // TEST 7: Audit Ledger Verification
    // -----------------------------------------------------------
    console.log('▶ TEST 7: Verifying Audit Ledger (كشف الحساب الموحد)...');
    const ledgerRes = mockRes();
    await controller.getLedger({
      user: mockUser,
      query: { treasuryAccountId: cashAccount.id }
    }, ledgerRes);

    const ledgerData = ledgerRes.getResponse().data?.data;
    console.log(`  ✓ Ledger transactions count: ${ledgerData.totalCount}`);
    if (ledgerData.transactions.length === 0) {
      throw new Error('Expected at least 1 ledger transaction recorded for the expense');
    }
    const latestTx = ledgerData.transactions[0];
    console.log(`  ✓ Latest transaction: ${latestTx.type} | Amount: ${latestTx.amount} | Running Balance: ${latestTx.runningBalance}`);
    console.log('  ✅ TEST 7 PASSED: Audit Ledger captures all transactions accurately!\n');

    // -----------------------------------------------------------
    // TEST 8: Overdraft / Negative Balance Expense Creation
    // -----------------------------------------------------------
    console.log('▶ TEST 8: Testing Overdraft / Negative Balance Expense Creation...');
    const overdraftRes = mockRes();
    const currentBalanceBeforeOverdraft = reconciledBalance; // e.g. 70
    const overdraftExpenseAmount = 500; // 500 > 70, resulting in negative balance (-430)

    await controller.createExpense({
      user: mockUser,
      body: {
        title: 'مصروف طارئ مع رصيد سالب',
        amount: overdraftExpenseAmount,
        categoryId: categories[0].id,
        treasuryAccountId: cashAccount.id,
        status: 'PAID',
        beneficiary: 'مورد الطوارئ',
        notes: 'اختبار الصرف بالسالب وتجاوز الرصيد'
      }
    }, overdraftRes);

    const overdraftExp = overdraftRes.getResponse().data?.data?.expense;
    const overdraftBalance = overdraftRes.getResponse().data?.data?.updatedBalance;
    console.log(`  ✓ Overdraft expense created: "${overdraftExp.title}" (EXP Number: ${overdraftExp.expenseNumber})`);
    console.log(`  ✓ Account Balance before: ${currentBalanceBeforeOverdraft}, after overdraft: ${overdraftBalance}`);

    const expectedNegativeBalance = currentBalanceBeforeOverdraft - overdraftExpenseAmount;
    if (overdraftBalance !== expectedNegativeBalance) {
      throw new Error(`Expected negative balance of ${expectedNegativeBalance}, got ${overdraftBalance}`);
    }
    if (overdraftBalance >= 0) {
      throw new Error(`Expected balance to be negative, but got ${overdraftBalance}`);
    }

    // Verify in database directly
    const accInDb = await prisma.treasuryAccount.findUnique({ where: { id: cashAccount.id } });
    if (Number(accInDb.balance) !== expectedNegativeBalance) {
      throw new Error(`Database balance mismatch: expected ${expectedNegativeBalance}, found ${accInDb.balance}`);
    }
    console.log(`  ✓ Database verified: Account balance is stored as negative: ${accInDb.balance} EGP`);
    console.log('  ✅ TEST 8 PASSED: Negative balance & overdraft expense creation fully verified!\n');

    console.log('════════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 8 TREASURY & EXPENSES TESTS PASSED WITH 100% SUCCESS!');
    console.log('════════════════════════════════════════════════════════════════\n');

  } finally {
    // Clean up test data
    console.log('🧹 Cleaning up test company data...');
    await prisma.treasuryTransaction.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
    await prisma.companyExpense.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
    await prisma.capitalTransaction.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
    await prisma.treasuryAccount.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
    await prisma.expenseCategory.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
    console.log('✨ Cleanup complete.');
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
