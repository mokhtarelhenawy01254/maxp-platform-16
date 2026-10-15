/**
 * Comprehensive Automated Tests for Accounting Auto-Posting Engine (Wave 2)
 *
 * Tests:
 * 1. Event Mappings:
 *    - Sales Invoice (Debit Cash/AR, Credit Sales, Credit VAT Output)
 *    - Expense (Debit Expense, Credit Cash)
 *    - Capital Deposit (Debit Cash, Credit Capital)
 *    - Purchase Invoice (Debit Inventory, Debit VAT Input, Credit Suppliers AP)
 *    - Supplier Payment (Debit Suppliers AP, Credit Cash)
 * 2. Idempotency Guarantee: Multiple calls with same sourceType + sourceId create exactly 1 entry
 * 3. Dual Gates: Skipping when autoPostingEnabled is false, posting when true
 * 4. Closed Fiscal Period Protection:
 *    - Operational document succeeds, transaction routed to unposted_entries queue
 *    - Re-posting via retryUnpostedEntry once period opens marks status PROCESSED
 * 5. Automated Reversals: Document voiding produces matching reversing entry
 * 6. Strict Tenant Isolation: Cross-company posting and queue isolation
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

const AccountingService = require('../services/accountingService');
const AccountingAutoPostingService = require('../services/accountingAutoPostingService');

const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    accounts: [],
    journalEntries: [],
    journalLines: [],
    fiscalPeriods: [],
    accountingSettings: [],
    unpostedEntries: [],
    companyApps: [],
    orderInvoices: [],
    companyExpenses: [],
    capitalTransactions: [],
    purchaseInvoices: [],
    supplierPayments: [],
  };

  const prisma = {
    account: {
      findMany: async ({ where = {}, orderBy }) => {
        return state.accounts.filter((a) => {
          if (where.companyId && a.companyId !== where.companyId) return false;
          if (where.type) {
            if (where.type.in && !where.type.in.includes(a.type)) return false;
            if (typeof where.type === 'string' && a.type !== where.type) return false;
          }
          if (where.isPostable !== undefined && a.isPostable !== where.isPostable) return false;
          if (where.isGroup !== undefined && a.isGroup !== where.isGroup) return false;
          if (where.isActive !== undefined && a.isActive !== where.isActive) return false;
          return true;
        }).sort((x, y) => (x.code > y.code ? 1 : -1));
      },
      findFirst: async ({ where = {} }) => {
        return state.accounts.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.companyId && a.companyId !== where.companyId) return false;
          if (where.code && a.code !== where.code) return false;
          if (where.type && a.type !== where.type) return false;
          if (where.isPostable !== undefined && a.isPostable !== where.isPostable) return false;
          if (where.isActive !== undefined && a.isActive !== where.isActive) return false;
          return true;
        }) || null;
      },
      create: async ({ data }) => {
        const item = { id: generateId('acc'), ...data, createdAt: new Date(), updatedAt: new Date() };
        state.accounts.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const idx = state.accounts.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new Error('Account not found');
        state.accounts[idx] = { ...state.accounts[idx], ...data, updatedAt: new Date() };
        return state.accounts[idx];
      },
      upsert: async ({ where, create, update }) => {
        let existing = state.accounts.find(
          (a) => a.companyId === where.companyId_code?.companyId && a.code === where.companyId_code?.code
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: generateId('acc'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.accounts.push(created);
        return created;
      },
    },
    journalEntry: {
      findMany: async ({ where = {}, orderBy, skip = 0, take = 50 }) => {
        const list = state.journalEntries.filter((e) => {
          if (where.companyId && e.companyId !== where.companyId) return false;
          if (where.status && e.status !== where.status) return false;
          if (where.sourceType && e.sourceType !== where.sourceType) return false;
          return true;
        });
        return list.slice(skip, skip + take).map((e) => ({
          ...e,
          lines: state.journalLines.filter((l) => l.entryId === e.id).map((l) => ({
            ...l,
            account: state.accounts.find((a) => a.id === l.accountId),
          })),
        }));
      },
      findFirst: async ({ where = {}, orderBy }) => {
        let list = [...state.journalEntries];
        if (orderBy?.entryNumber === 'desc') {
          list.sort((a, b) => (a.entryNumber < b.entryNumber ? 1 : -1));
        }
        const found = list.find((e) => {
          if (where.id && e.id !== where.id) return false;
          if (where.companyId && e.companyId !== where.companyId) return false;
          if (where.sourceType && e.sourceType !== where.sourceType) return false;
          if (where.sourceId && e.sourceId !== where.sourceId) return false;
          if (where.status) {
            if (typeof where.status === 'string' && e.status !== where.status) return false;
            if (where.status.not && e.status === where.status.not) return false;
          }
          return true;
        });
        if (!found) return null;
        return {
          ...found,
          lines: state.journalLines.filter((l) => l.entryId === found.id).map((l) => ({
            ...l,
            account: state.accounts.find((a) => a.id === l.accountId),
          })),
        };
      },
      create: async ({ data, include }) => {
        const { lines, ...entryData } = data;
        const entry = {
          id: generateId('je'),
          ...entryData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.journalEntries.push(entry);

        if (lines?.create) {
          for (const lineData of lines.create) {
            const line = {
              id: generateId('jl'),
              entryId: entry.id,
              ...lineData,
              debit: Number(lineData.debit || 0),
              credit: Number(lineData.credit || 0),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            state.journalLines.push(line);
          }
        }

        const createdLines = state.journalLines
          .filter((l) => l.entryId === entry.id)
          .map((l) => ({
            ...l,
            account: state.accounts.find((a) => a.id === l.accountId),
          }));

        return { ...entry, lines: createdLines };
      },
      update: async ({ where, data }) => {
        const idx = state.journalEntries.findIndex((e) => e.id === where.id);
        if (idx === -1) throw new Error('Journal entry not found');
        state.journalEntries[idx] = { ...state.journalEntries[idx], ...data, updatedAt: new Date() };
        return state.journalEntries[idx];
      },
      count: async ({ where = {} }) => {
        return state.journalEntries.filter((e) => {
          if (where.companyId && e.companyId !== where.companyId) return false;
          return true;
        }).length;
      },
    },
    journalLine: {
      findMany: async ({ where = {} }) => {
        return state.journalLines.filter((l) => {
          if (where.entryId && l.entryId !== where.entryId) return false;
          if (where.accountId && l.accountId !== where.accountId) return false;
          if (where.entry) {
            const parent = state.journalEntries.find((e) => e.id === l.entryId);
            if (!parent) return false;
            if (where.entry.companyId && parent.companyId !== where.entry.companyId) return false;
            if (where.entry.status && parent.status !== where.entry.status) return false;
          }
          return true;
        }).map((l) => ({
          ...l,
          account: state.accounts.find((a) => a.id === l.accountId),
          entry: state.journalEntries.find((e) => e.id === l.entryId),
        }));
      },
    },
    fiscalPeriod: {
      findFirst: async ({ where = {} }) => {
        return state.fiscalPeriods.find((p) => {
          if (where.companyId && p.companyId !== where.companyId) return false;
          if (where.year !== undefined && p.year !== where.year) return false;
          if (where.month !== undefined && p.month !== where.month) return false;
          if (where.status && p.status !== where.status) return false;
          return true;
        }) || null;
      },
      findUnique: async ({ where = {} }) => {
        const key = where.companyId_year_month;
        if (key) {
          return state.fiscalPeriods.find(
            (p) => p.companyId === key.companyId && p.year === key.year && p.month === key.month
          ) || null;
        }
        if (where.id) {
          return state.fiscalPeriods.find((p) => p.id === where.id) || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const item = { id: generateId('fp'), ...data, createdAt: new Date(), updatedAt: new Date() };
        state.fiscalPeriods.push(item);
        return item;
      },
      upsert: async ({ where, create, update }) => {
        const key = where.companyId_year_month;
        let existing = state.fiscalPeriods.find(
          (p) => p.companyId === key.companyId && p.year === key.year && p.month === key.month
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: generateId('fp'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.fiscalPeriods.push(created);
        return created;
      },
    },
    accountingSettings: {
      findUnique: async ({ where = {} }) => {
        return state.accountingSettings.find((s) => s.companyId === where.companyId) || null;
      },
      create: async ({ data }) => {
        const item = { id: generateId('as'), ...data, createdAt: new Date(), updatedAt: new Date() };
        state.accountingSettings.push(item);
        return item;
      },
      upsert: async ({ where, create, update }) => {
        let existing = state.accountingSettings.find((s) => s.companyId === where.companyId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: generateId('as'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.accountingSettings.push(created);
        return created;
      },
      update: async ({ where, data }) => {
        let existing = state.accountingSettings.find((s) => s.companyId === where.companyId);
        if (!existing) throw new Error('Settings not found');
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      },
    },
    unpostedEntry: {
      findMany: async ({ where = {}, orderBy }) => {
        return state.unpostedEntries.filter((u) => {
          if (where.companyId && u.companyId !== where.companyId) return false;
          if (where.status && u.status !== where.status) return false;
          return true;
        });
      },
      findFirst: async ({ where = {} }) => {
        return state.unpostedEntries.find((u) => {
          if (where.id && u.id !== where.id) return false;
          if (where.companyId && u.companyId !== where.companyId) return false;
          return true;
        }) || null;
      },
      create: async ({ data }) => {
        const item = { id: generateId('unp'), ...data, createdAt: new Date(), updatedAt: new Date() };
        state.unpostedEntries.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const idx = state.unpostedEntries.findIndex((u) => u.id === where.id);
        if (idx === -1) throw new Error('Unposted entry not found');
        state.unpostedEntries[idx] = { ...state.unpostedEntries[idx], ...data, updatedAt: new Date() };
        return state.unpostedEntries[idx];
      },
    },
    companyApp: {
      findFirst: async ({ where = {} }) => {
        return state.companyApps.find((a) => a.companyId === where.companyId && ['ACTIVE', 'TRIAL'].includes(a.status)) || null;
      },
    },
    $transaction: async (fn) => {
      if (typeof fn === 'function') {
        return await fn(prisma);
      }
      throw new Error('All elements of the array need to be Prisma Client promises');
    },
    _rawState: state,
  };

  return prisma;
};

describe('Accounting Auto-Posting Engine Test Suite (Wave 2)', () => {
  const companyA = 'comp_alpha';
  const companyB = 'comp_beta';
  const userAdmin = { id: 'usr_admin', name: 'المحاسب المسؤول' };

  beforeEach(async () => {
    currentPrisma = createInMemoryStore();
    global.__testPrisma = currentPrisma;
    // Enable accounting app for Company A
    currentPrisma._rawState.companyApps.push({
      id: 'app_acc_a',
      companyId: companyA,
      slug: 'accounting',
      status: 'ACTIVE',
    });

    // Seed Egyptian Standard Chart of Accounts
    await AccountingService.seedEgyptianCOA(companyA);
    await AccountingService.updateSettings(companyA, { autoPostingEnabled: true });
  });

  // --------------------------------------------------------------------------
  // Test 1: Event 1 - Sales Invoice Auto-Posting
  // --------------------------------------------------------------------------
  test('1. Auto-posts Sales Invoice with balanced lines: Cash/AR, Sales Revenue, and VAT Output', async () => {
    const invoiceId = 'inv_101';
    const invoiceData = {
      invoiceNumber: 'INV-2026-001',
      totalAmount: 1140,
      taxAmount: 140, // 14% tax on 1000
      status: 'PAID',
      createdAt: new Date('2026-10-15T10:00:00Z'),
    };

    const res = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });

    if (!res.success) console.log('DEBUG RES 1:', res);
    expect(res.success).toBe(true);
    expect(res.posted).toBe(true);
    expect(res.entry).toBeDefined();
    expect(res.entry.status).toBe('POSTED');
    expect(res.entry.sourceType).toBe('SALES_INVOICE');
    expect(res.entry.sourceId).toBe(invoiceId);

    // Verify Lines:
    // Line 1: Debit Cash (110101) = 1140
    // Line 2: Credit Sales (4101) = 1000
    // Line 3: Credit VAT Output (210202) = 140
    const lines = res.entry.lines;
    expect(lines).toHaveLength(3);

    const cashLine = lines.find((l) => l.account?.code === '110101');
    const salesLine = lines.find((l) => l.account?.code === '4101');
    const vatLine = lines.find((l) => l.account?.code === '210202');

    expect(Number(cashLine.debit)).toBe(1140);
    expect(Number(cashLine.credit)).toBe(0);

    expect(Number(salesLine.debit)).toBe(0);
    expect(Number(salesLine.credit)).toBe(1000);

    expect(Number(vatLine.debit)).toBe(0);
    expect(Number(vatLine.credit)).toBe(140);

    // Verify Trial Balance is balanced
    const tb = await AccountingService.getTrialBalance(companyA);
    expect(tb.totals.isBalanced).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 2: Event 2 - Expense Auto-Posting
  // --------------------------------------------------------------------------
  test('2. Auto-posts Operating Expense: Debit Expense account, Credit Treasury/Cash', async () => {
    const expenseId = 'exp_201';
    const expenseData = {
      expenseNumber: 'EXP-2026-001',
      title: 'إيجار المقر والمخزن',
      amount: 5000,
      type: 'OPEX',
      paymentDate: new Date('2026-10-15T11:00:00Z'),
    };

    const res = await AccountingAutoPostingService.postExpense(companyA, expenseId, {
      userId: userAdmin.id,
      expenseData,
    });

    expect(res.success).toBe(true);
    expect(res.posted).toBe(true);
    expect(res.entry.sourceType).toBe('EXPENSE');
    expect(res.entry.sourceId).toBe(expenseId);

    const lines = res.entry.lines;
    expect(lines).toHaveLength(2);

    const debitLine = lines.find((l) => l.debit > 0);
    const creditLine = lines.find((l) => l.credit > 0);

    expect(Number(debitLine.debit)).toBe(5000);
    expect(Number(creditLine.credit)).toBe(5000);
    expect(creditLine.account?.code).toBe('110101'); // Treasury cash
  });

  // --------------------------------------------------------------------------
  // Test 3: Event 3 - Capital Deposit Auto-Posting
  // --------------------------------------------------------------------------
  test('3. Auto-posts Capital Injection: Debit Cash, Credit Paid-in Capital (3101)', async () => {
    const capitalTxId = 'cap_301';
    const capitalData = {
      referenceNumber: 'CAP-2026-001',
      amount: 100000,
      investorName: 'الشريك المؤسس مختار',
      date: new Date('2026-10-15T09:00:00Z'),
    };

    const res = await AccountingAutoPostingService.postCapitalDeposit(companyA, capitalTxId, {
      userId: userAdmin.id,
      capitalData,
    });

    expect(res.success).toBe(true);
    expect(res.posted).toBe(true);
    expect(res.entry.sourceType).toBe('CAPITAL');

    const lines = res.entry.lines;
    const cashLine = lines.find((l) => l.account?.code === '110101');
    const capitalLine = lines.find((l) => l.account?.code === '3101');

    expect(Number(cashLine.debit)).toBe(100000);
    expect(Number(capitalLine.credit)).toBe(100000);
  });

  // --------------------------------------------------------------------------
  // Test 4: Event 4 - Purchase Invoice & Supplier Payment Auto-Posting
  // --------------------------------------------------------------------------
  test('4. Auto-posts Purchase Invoice and Supplier Payment with Accounts Payable (210101)', async () => {
    // 4a. Purchase Invoice
    const piId = 'pi_401';
    const piData = {
      invoiceNumber: 'PI-2026-001',
      totalAmount: 5700,
      subtotal: 5000,
      taxAmount: 700, // 14% VAT input
      invoiceDate: new Date('2026-10-15T12:00:00Z'),
      supplier: { name: 'مصنع الأهرام للغزل والنسيج' },
    };

    const piRes = await AccountingAutoPostingService.postPurchaseInvoice(companyA, piId, {
      userId: userAdmin.id,
      invoiceData: piData,
    });

    expect(piRes.success).toBe(true);
    expect(piRes.posted).toBe(true);
    expect(piRes.entry.lines).toHaveLength(3);

    const invLine = piRes.entry.lines.find((l) => l.account?.code?.startsWith('1104')); // Inventory account
    const vatInputLine = piRes.entry.lines.find((l) => l.account?.code === '110502'); // VAT Input
    const apLine = piRes.entry.lines.find((l) => l.account?.code === '210101'); // Suppliers AP

    expect(Number(invLine.debit)).toBe(5000);
    expect(Number(vatInputLine.debit)).toBe(700);
    expect(Number(apLine.credit)).toBe(5700);

    // 4b. Supplier Payment
    const spId = 'sp_501';
    const spData = {
      paymentNumber: 'SP-2026-001',
      amount: 5700,
      paymentDate: new Date('2026-10-15T14:00:00Z'),
      supplier: { name: 'مصنع الأهرام للغزل والنسيج' },
    };

    const spRes = await AccountingAutoPostingService.postSupplierPayment(companyA, spId, {
      userId: userAdmin.id,
      paymentData: spData,
    });

    expect(spRes.success).toBe(true);
    expect(spRes.posted).toBe(true);

    const spApLine = spRes.entry.lines.find((l) => l.account?.code === '210101');
    const spCashLine = spRes.entry.lines.find((l) => l.account?.code === '110101');

    expect(Number(spApLine.debit)).toBe(5700); // AP Cleared!
    expect(Number(spCashLine.credit)).toBe(5700); // Cash disbursed
  });

  // --------------------------------------------------------------------------
  // Test 5: Idempotency Guarantee
  // --------------------------------------------------------------------------
  test('5. Idempotency: Multiple calls with same sourceType and sourceId create strictly 1 entry', async () => {
    const invoiceId = 'inv_idempotent_test';
    const invoiceData = {
      invoiceNumber: 'INV-IDEM-001',
      totalAmount: 2000,
      taxAmount: 0,
      status: 'PAID',
    };

    // First Call
    const call1 = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });
    expect(call1.posted).toBe(true);

    // Second Call (Duplicate event)
    const call2 = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });
    expect(call2.skipped).toBe(true);
    expect(call2.idempotent).toBe(true);
    expect(call2.entryId).toBe(call1.entry.id);

    // Verify only 1 entry in DB
    const all = await currentPrisma.journalEntry.findMany({
      where: { companyId: companyA, sourceType: 'SALES_INVOICE', sourceId: invoiceId },
    });
    expect(all).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // Test 6: Dual Gates
  // --------------------------------------------------------------------------
  test('6. Dual Gates: Skipping when autoPostingEnabled is false, posting when true', async () => {
    // Turn autoPosting off
    await AccountingService.updateSettings(companyA, { autoPostingEnabled: false });

    const invoiceId = 'inv_gate_test';
    const invoiceData = { totalAmount: 500, taxAmount: 0 };

    const disabledRes = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });
    expect(disabledRes.skipped).toBe(true);
    expect(disabledRes.reason).toBe('AUTO_POSTING_DISABLED');

    // Turn autoPosting on
    await AccountingService.updateSettings(companyA, { autoPostingEnabled: true });

    const enabledRes = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });
    expect(enabledRes.posted).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 7: Closed Fiscal Period Protection & Deferred Unposted Queue
  // --------------------------------------------------------------------------
  test('7. Closed Fiscal Period: Enqueues to unposted queue, master operation never breaks, retry succeeds upon opening', async () => {
    // Close period 10/2026
    await AccountingService.closePeriod(companyA, 2026, 10, userAdmin.id);

    const invoiceId = 'inv_closed_period_test';
    const invoiceData = {
      invoiceNumber: 'INV-CLOSED-001',
      totalAmount: 4500,
      taxAmount: 0,
      createdAt: new Date('2026-10-15T15:00:00Z'),
    };

    // Auto-post attempt into closed period
    const res = await AccountingAutoPostingService.postSalesInvoice(companyA, invoiceId, {
      userId: userAdmin.id,
      invoiceData,
    });

    // Must NOT throw error! Master operational document continues!
    expect(res.success).toBe(true);
    expect(res.pending).toBe(true);
    expect(res.reason).toBe('PERIOD_CLOSED');

    // Verify item is in unposted queue
    const queue = await AccountingAutoPostingService.listUnpostedQueue(companyA, { status: 'PENDING' });
    expect(queue).toHaveLength(1);
    expect(queue[0].sourceId).toBe(invoiceId);
    expect(queue[0].status).toBe('PENDING');

    // Reopen period 10/2026
    await AccountingService.openPeriod(companyA, 2026, 10);

    // Mock orderInvoice in store for retry
    currentPrisma.orderInvoice = {
      findFirst: async () => invoiceData,
    };

    // Retry deferred posting
    const retryRes = await AccountingAutoPostingService.retryUnpostedEntry(companyA, queue[0].id, {
      userId: userAdmin.id,
    });

    expect(retryRes.success).toBe(true);
    expect(retryRes.processed).toBe(true);

    // Queue status updated to PROCESSED
    const updatedItem = await currentPrisma.unpostedEntry.findFirst({ where: { id: queue[0].id } });
    expect(updatedItem.status).toBe('PROCESSED');

    // Entry is now POSTED in journal
    const entry = await currentPrisma.journalEntry.findFirst({
      where: { companyId: companyA, sourceType: 'SALES_INVOICE', sourceId: invoiceId },
    });
    expect(entry).toBeDefined();
    expect(entry.status).toBe('POSTED');
  });

  // --------------------------------------------------------------------------
  // Test 8: Document Voiding & Automatic Reversal
  // --------------------------------------------------------------------------
  test('8. Automated Reversal: Voiding an operational expense produces an exact reversing entry', async () => {
    const expenseId = 'exp_void_test';
    const expenseData = {
      expenseNumber: 'EXP-VOID-001',
      title: 'شراء حبر طابعات',
      amount: 1500,
      type: 'OPEX',
    };

    // 1. Post expense
    await AccountingAutoPostingService.postExpense(companyA, expenseId, {
      userId: userAdmin.id,
      expenseData,
    });

    // 2. Void document
    const revRes = await AccountingAutoPostingService.reverseDocument(companyA, 'EXPENSE', expenseId, {
      userId: userAdmin.id,
      reason: 'إلغاء فاتورة الشراء واسترداد المبلغ',
    });

    expect(revRes.success).toBe(true);
    expect(revRes.reversed).toBe(true);
    expect(revRes.result.voidedEntry.status).toBe('VOID');
    expect(revRes.result.reversingEntry.status).toBe('POSTED');
    expect(revRes.result.reversingEntry.sourceType).toBe('REVERSAL');
  });

  // --------------------------------------------------------------------------
  // Test 9: Zero Cross-Tenant Leakage
  // --------------------------------------------------------------------------
  test('9. Strictly isolates company accounts and auto-posted entries across tenants', async () => {
    // Company B has NO autoPostingEnabled and NO accounts seeded
    const resB = await AccountingAutoPostingService.postSalesInvoice(companyB, 'inv_b_001', {
      userId: 'usr_b',
      invoiceData: { totalAmount: 1000 },
    });
    expect(resB.skipped).toBe(true);

    // Company A queue is completely empty of Company B items
    const queueA = await AccountingAutoPostingService.listUnpostedQueue(companyA);
    const queueB = await AccountingAutoPostingService.listUnpostedQueue(companyB);

    expect(queueA.every((q) => q.companyId === companyA)).toBe(true);
    expect(queueB).toHaveLength(0);
  });
});
