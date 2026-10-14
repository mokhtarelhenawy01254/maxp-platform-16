/**
 * Mandatory Unit & Regression Test Suite for Accounting Engine (Wave 1)
 *
 * Tests:
 * 1. Journal Entry balance enforcement (unbalanced rejected, single-line rejected)
 * 2. Closed fiscal period protection (posting rejected in closed periods)
 * 3. Sequential entry numbering (JE-YYYY-XXXXX)
 * 4. Mathematical accuracy of Trial Balance, P&L, and Balance Sheet on known fixture
 * 5. Entry voiding and automatic reversing entry generation
 * 6. Tenant data isolation (companyId_1 cannot view or modify companyId_2 data)
 */

let currentPrisma = null;

// Mock sharedDatabase before requiring AccountingService so it works in both Jest and Node
const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => currentPrisma,
  },
};

if (typeof jest !== 'undefined') {
  jest.mock('../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => currentPrisma,
  }));
}

const AccountingService = require('../services/accountingService');

// In-Memory Database Store for Testing
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    accounts: [],
    journalEntries: [],
    journalLines: [],
    fiscalPeriods: [],
    accountingSettings: [],
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
          if (where.parentId !== undefined && a.parentId !== where.parentId) return false;
          return true;
        }).sort((x, y) => (x.code > y.code ? 1 : -1));
      },
      findFirst: async ({ where = {} }) => {
        return state.accounts.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.companyId && a.companyId !== where.companyId) return false;
          if (where.code && a.code !== where.code) return false;
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
      delete: async ({ where }) => {
        const idx = state.accounts.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new Error('Account not found');
        const [deleted] = state.accounts.splice(idx, 1);
        return deleted;
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
          lines: state.journalLines
            .filter((l) => l.entryId === e.id)
            .map((l) => ({
              ...l,
              account: state.accounts.find((a) => a.id === l.accountId) || null,
            })),
        }));
      },
      findFirst: async ({ where = {}, orderBy }) => {
        let list = state.journalEntries.filter((e) => {
          if (where.id && e.id !== where.id) return false;
          if (where.companyId && e.companyId !== where.companyId) return false;
          if (where.entryNumber?.startsWith && !e.entryNumber.startsWith(where.entryNumber.startsWith)) return false;
          return true;
        });
        if (orderBy?.entryNumber === 'desc') {
          list.sort((a, b) => b.entryNumber.localeCompare(a.entryNumber));
        }
        const entry = list[0];
        if (!entry) return null;
        return {
          ...entry,
          lines: state.journalLines
            .filter((l) => l.entryId === entry.id)
            .map((l) => ({
              ...l,
              account: state.accounts.find((a) => a.id === l.accountId) || null,
            })),
        };
      },
      count: async ({ where = {} }) => {
        return state.journalEntries.filter((e) => {
          if (where.companyId && e.companyId !== where.companyId) return false;
          if (where.status && e.status !== where.status) return false;
          return true;
        }).length;
      },
      create: async ({ data }) => {
        const entryId = generateId('entry');
        const entry = {
          id: entryId,
          companyId: data.companyId,
          entryNumber: data.entryNumber,
          date: data.date || new Date(),
          narration: data.narration,
          sourceType: data.sourceType || 'MANUAL',
          sourceId: data.sourceId || null,
          status: data.status || 'DRAFT',
          postedAt: data.postedAt || null,
          postedById: data.postedById || null,
          createdById: data.createdById || null,
          reversalOfId: data.reversalOfId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.journalEntries.push(entry);

        if (data.lines?.create) {
          for (const l of data.lines.create) {
            state.journalLines.push({
              id: generateId('line'),
              entryId,
              accountId: l.accountId,
              debit: l.debit || 0,
              credit: l.credit || 0,
              narration: l.narration || null,
              costCenter: l.costCenter || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        return {
          ...entry,
          lines: state.journalLines
            .filter((l) => l.entryId === entryId)
            .map((l) => ({
              ...l,
              account: state.accounts.find((a) => a.id === l.accountId) || null,
            })),
        };
      },
      update: async ({ where, data }) => {
        const entry = state.journalEntries.find((e) => e.id === where.id);
        if (!entry) throw new Error('Entry not found');
        Object.assign(entry, data, { updatedAt: new Date() });
        return {
          ...entry,
          lines: state.journalLines
            .filter((l) => l.entryId === entry.id)
            .map((l) => ({
              ...l,
              account: state.accounts.find((a) => a.id === l.accountId) || null,
            })),
        };
      },
    },
    journalLine: {
      findMany: async ({ where = {} }) => {
        return state.journalLines
          .filter((l) => {
            if (where.accountId && l.accountId !== where.accountId) return false;
            const entry = state.journalEntries.find((e) => e.id === l.entryId);
            if (!entry) return false;
            if (where.entry?.companyId && entry.companyId !== where.entry.companyId) return false;
            if (where.entry?.status) {
              if (where.entry.status.in && !where.entry.status.in.includes(entry.status)) return false;
              if (typeof where.entry.status === 'string' && entry.status !== where.entry.status) return false;
            }
            if (where.entry?.date?.gte && new Date(entry.date) < new Date(where.entry.date.gte)) return false;
            if (where.entry?.date?.lte && new Date(entry.date) > new Date(where.entry.date.lte)) return false;
            return true;
          })
          .map((l) => {
            const entry = state.journalEntries.find((e) => e.id === l.entryId);
            const account = state.accounts.find((a) => a.id === l.accountId);
            return {
              ...l,
              entry: { id: entry.id, date: entry.date, entryNumber: entry.entryNumber, narration: entry.narration, sourceType: entry.sourceType },
              account: { id: account?.id, code: account?.code, name: account?.name, type: account?.type },
            };
          });
      },
      deleteMany: async ({ where = {} }) => {
        if (where.entryId) {
          state.journalLines = state.journalLines.filter((l) => l.entryId !== where.entryId);
        }
      },
    },
    fiscalPeriod: {
      findMany: async ({ where = {} }) => {
        return state.fiscalPeriods.filter((p) => {
          if (where.companyId && p.companyId !== where.companyId) return false;
          if (where.year && p.year !== where.year) return false;
          return true;
        });
      },
      findUnique: async ({ where = {} }) => {
        const u = where.companyId_year_month;
        if (!u) return null;
        return state.fiscalPeriods.find(
          (p) => p.companyId === u.companyId && p.year === u.year && p.month === u.month
        ) || null;
      },
      upsert: async ({ where, create, update }) => {
        const u = where.companyId_year_month;
        let existing = state.fiscalPeriods.find(
          (p) => p.companyId === u.companyId && p.year === u.year && p.month === u.month
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
        const item = { id: generateId('set'), ...data, createdAt: new Date(), updatedAt: new Date() };
        state.accountingSettings.push(item);
        return item;
      },
      upsert: async ({ where, create, update }) => {
        let existing = state.accountingSettings.find((s) => s.companyId === where.companyId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: generateId('set'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.accountingSettings.push(created);
        return created;
      },
    },
    $transaction: async (actions) => {
      if (Array.isArray(actions)) {
        return await Promise.all(actions);
      }
      return await actions(prisma);
    },
  };

  return { state, prisma };
};

describe('Accounting Engine & General Ledger Test Suite (Wave 1)', () => {
  const companyA = 'comp_test_factory_egypt_01';
  const companyB = 'comp_test_retailer_cairo_02';
  const userAdmin = 'user_accountant_001';

  beforeEach(() => {
    const store = createInMemoryStore();
    currentPrisma = store.prisma;
  });

  // --------------------------------------------------------------------------
  // Test 1: Journal Entry Balance Enforcement
  // --------------------------------------------------------------------------
  test('1. Enforces strict double-entry balance: rejects unbalanced entries and single lines', async () => {
    // 1. Setup Cash and Capital accounts for companyA
    const cash = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'الخزينة النقدية الرئيسية',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });
    const capital = await AccountingService.createAccount(companyA, {
      code: '3101',
      name: 'رأس المال المدفوع',
      type: 'EQUITY',
      isGroup: false,
      isPostable: true,
    });

    // 2. Single-line entry must be rejected
    await expect(
      AccountingService.createEntry(companyA, {
        narration: 'قيد غير صالح بسطر واحد',
        status: 'POSTED',
        lines: [{ accountId: cash.id, debit: 5000, credit: 0 }],
      }, userAdmin)
    ).rejects.toThrow('يجب أن يحتوي القيد المحاسبي على سطرين على الأقل');

    // 3. Unbalanced entry (debit: 5000, credit: 4000) must be rejected
    await expect(
      AccountingService.createEntry(companyA, {
        narration: 'قيد غير متوازن',
        status: 'POSTED',
        lines: [
          { accountId: cash.id, debit: 5000, credit: 0 },
          { accountId: capital.id, debit: 0, credit: 4000 },
        ],
      }, userAdmin)
    ).rejects.toThrow('القيد غير متوازن رياضياً');

    // 4. Balanced entry (debit: 5000, credit: 5000) must succeed
    const balancedEntry = await AccountingService.createEntry(companyA, {
      narration: 'إيداع رأس مال مبدئي بالخزينة',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 5000, credit: 0 },
        { accountId: capital.id, debit: 0, credit: 5000 },
      ],
    }, userAdmin);

    expect(balancedEntry).toBeDefined();
    expect(balancedEntry.status).toBe('POSTED');
    expect(balancedEntry.entryNumber).toBe('JE-2026-00001');
    expect(balancedEntry.lines).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // Test 2: Closed Period Protection
  // --------------------------------------------------------------------------
  test('2. Prevents posting entries into closed fiscal periods', async () => {
    const cash = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'الخزينة',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });
    const capital = await AccountingService.createAccount(companyA, {
      code: '3101',
      name: 'رأس المال',
      type: 'EQUITY',
      isGroup: false,
      isPostable: true,
    });

    // Close period 10/2026
    await AccountingService.closePeriod(companyA, 2026, 10, userAdmin);

    // Attempting to post in October 2026 must be rejected
    const octDate = new Date('2026-10-14T12:00:00Z');
    await expect(
      AccountingService.createEntry(companyA, {
        date: octDate,
        narration: 'محاولة ترحيل في فترة مقفولة',
        status: 'POSTED',
        lines: [
          { accountId: cash.id, debit: 1000, credit: 0 },
          { accountId: capital.id, debit: 0, credit: 1000 },
        ],
      }, userAdmin)
    ).rejects.toThrow('لا يمكن تسجيل قيود في فترة مالية مقفلة');

    // Reopening period allows posting
    await AccountingService.openPeriod(companyA, 2026, 10, userAdmin);
    const entry = await AccountingService.createEntry(companyA, {
      date: octDate,
      narration: 'ترحيل بعد إعادة فتح الفترة',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 1000, credit: 0 },
        { accountId: capital.id, debit: 0, credit: 1000 },
      ],
    }, userAdmin);

    expect(entry.status).toBe('POSTED');
  });

  // --------------------------------------------------------------------------
  // Test 3: Sequential Entry Numbering
  // --------------------------------------------------------------------------
  test('3. Generates sequential annual entry numbers per company', async () => {
    const cash = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'خزينة',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });
    const rev = await AccountingService.createAccount(companyA, {
      code: '4101',
      name: 'مبيعات',
      type: 'REVENUE',
      isGroup: false,
      isPostable: true,
    });

    const e1 = await AccountingService.createEntry(companyA, {
      narration: 'حركة 1',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 100, credit: 0 },
        { accountId: rev.id, debit: 0, credit: 100 },
      ],
    });
    const e2 = await AccountingService.createEntry(companyA, {
      narration: 'حركة 2',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 200, credit: 0 },
        { accountId: rev.id, debit: 0, credit: 200 },
      ],
    });
    const e3 = await AccountingService.createEntry(companyA, {
      narration: 'حركة 3',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 300, credit: 0 },
        { accountId: rev.id, debit: 0, credit: 300 },
      ],
    });

    expect(e1.entryNumber).toBe('JE-2026-00001');
    expect(e2.entryNumber).toBe('JE-2026-00002');
    expect(e3.entryNumber).toBe('JE-2026-00003');
  });

  // --------------------------------------------------------------------------
  // Test 4: Trial Balance, P&L, and Balance Sheet on Known Fixture
  // --------------------------------------------------------------------------
  test('4. Computes Trial Balance, P&L, and Balance Sheet with exact mathematical precision', async () => {
    // Accounts:
    // Cash (Asset): 110101
    // Capital (Equity): 3101
    // Sales (Revenue): 4101
    // Rent (Expense): 5302
    const cash = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'الخزينة النقدية',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });
    const capital = await AccountingService.createAccount(companyA, {
      code: '3101',
      name: 'رأس المال',
      type: 'EQUITY',
      isGroup: false,
      isPostable: true,
    });
    const sales = await AccountingService.createAccount(companyA, {
      code: '4101',
      name: 'مبيعات منتجات تامة',
      type: 'REVENUE',
      isGroup: false,
      isPostable: true,
    });
    const rent = await AccountingService.createAccount(companyA, {
      code: '5302',
      name: 'إيجار مقر ومصنع',
      type: 'EXPENSE',
      isGroup: false,
      isPostable: true,
    });

    // Transactions:
    // 1. Capital Injection: +50,000 Cash, +50,000 Capital
    await AccountingService.createEntry(companyA, {
      narration: 'إيداع رأس مال الشركاء',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 50000, credit: 0 },
        { accountId: capital.id, debit: 0, credit: 50000 },
      ],
    });

    // 2. Cash Sale: +20,000 Cash, +20,000 Sales
    await AccountingService.createEntry(companyA, {
      narration: 'مبيعات نقدية للعملاء',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 20000, credit: 0 },
        { accountId: sales.id, debit: 0, credit: 20000 },
      ],
    });

    // 3. Rent Payment: +5,000 Rent Expense, -5,000 Cash
    await AccountingService.createEntry(companyA, {
      narration: 'سداد إيجار المصنع نقداً',
      status: 'POSTED',
      lines: [
        { accountId: rent.id, debit: 5000, credit: 0 },
        { accountId: cash.id, debit: 0, credit: 5000 },
      ],
    });

    // A. Trial Balance Verification
    const tb = await AccountingService.getTrialBalance(companyA);
    expect(tb.totals.isBalanced).toBe(true);
    expect(tb.totals.totalPeriodDebit).toBe(75000); // 50,000 + 20,000 + 5,000
    expect(tb.totals.totalPeriodCredit).toBe(75000); // 50,000 + 20,000 + 5,000
    expect(tb.totals.totalEndingDebit).toBe(70000);  // Cash: 65,000 + Rent: 5,000
    expect(tb.totals.totalEndingCredit).toBe(70000); // Capital: 50,000 + Sales: 20,000

    const cashRow = tb.rows.find((r) => r.code === '110101');
    expect(cashRow.endingDebit).toBe(65000); // 50,000 + 20,000 - 5,000

    // B. Profit & Loss Verification
    const pnl = await AccountingService.getProfitAndLoss(companyA);
    expect(pnl.revenues.total).toBe(20000);
    expect(pnl.operatingExpenses.total).toBe(5000);
    expect(pnl.netProfit).toBe(15000); // 20,000 - 5,000

    // C. Balance Sheet Verification
    const bs = await AccountingService.getBalanceSheet(companyA);
    expect(bs.summary.isBalanced).toBe(true);
    expect(bs.summary.totalAssets).toBe(65000); // Cash
    expect(bs.summary.totalLiabilitiesAndEquity).toBe(65000); // Capital: 50,000 + Net Profit: 15,000
    expect(bs.summary.difference).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 5: Voiding Entry & Reversing Effect
  // --------------------------------------------------------------------------
  test('5. Correctly voids posted entries by creating an automated reversing entry', async () => {
    const cash = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'كاش',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });
    const rev = await AccountingService.createAccount(companyA, {
      code: '4101',
      name: 'مبيعات',
      type: 'REVENUE',
      isGroup: false,
      isPostable: true,
    });

    // 1. Post original entry of 12,000
    const original = await AccountingService.createEntry(companyA, {
      narration: 'فاتورة مبيعات خاطئة يراد إلغاؤها',
      status: 'POSTED',
      lines: [
        { accountId: cash.id, debit: 12000, credit: 0 },
        { accountId: rev.id, debit: 0, credit: 12000 },
      ],
    });
    expect(original.status).toBe('POSTED');

    // 2. Void the entry
    const voidResult = await AccountingService.voidEntry(companyA, original.id, userAdmin, 'خطأ في الفاتورة');
    expect(voidResult.voidedEntry.status).toBe('VOID');

    const reversing = voidResult.reversingEntry;
    expect(reversing.status).toBe('POSTED');
    expect(reversing.sourceType).toBe('REVERSAL');
    expect(reversing.reversalOfId).toBe(original.id);
    expect(reversing.lines).toHaveLength(2);

    // Verify reversing lines are opposite to original:
    const revCashLine = reversing.lines.find((l) => l.accountId === cash.id);
    const revSalesLine = reversing.lines.find((l) => l.accountId === rev.id);
    expect(Number(revCashLine.credit)).toBe(12000); // Flipped from Debit to Credit
    expect(Number(revSalesLine.debit)).toBe(12000);  // Flipped from Credit to Debit

    // 3. Trial Balance net movements must be zero
    const tb = await AccountingService.getTrialBalance(companyA);
    expect(tb.totals.isBalanced).toBe(true);
    expect(tb.totals.totalEndingDebit).toBe(0);
    expect(tb.totals.totalEndingCredit).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 6: Strict Tenant Isolation
  // --------------------------------------------------------------------------
  test('6. Strictly isolates company accounts and financial records (Zero cross-tenant leakage)', async () => {
    // Create account for Company A
    const accA = await AccountingService.createAccount(companyA, {
      code: '110101',
      name: 'خزينة شركة أ',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });

    // Create account for Company B with the same code (must be permitted per-company)
    const accB = await AccountingService.createAccount(companyB, {
      code: '110101',
      name: 'خزينة شركة ب',
      type: 'ASSET',
      isGroup: false,
      isPostable: true,
    });

    expect(accA.id).not.toBe(accB.id);

    // Listing accounts for Company B must NOT contain Company A's account
    const accountsB = await AccountingService.listAccounts(companyB);
    expect(accountsB).toHaveLength(1);
    expect(accountsB[0].name).toBe('خزينة شركة ب');
    expect(accountsB[0].companyId).toBe(companyB);

    // Company B trying to query or post to Company A's account must fail
    await expect(
      AccountingService.getAccountById(companyB, accA.id)
    ).rejects.toThrow('الحساب غير موجود');

    await expect(
      AccountingService.createEntry(companyB, {
        narration: 'محاولة اختراق عزل الشركات',
        status: 'POSTED',
        lines: [
          { accountId: accA.id, debit: 1000, credit: 0 },
          { accountId: accB.id, debit: 0, credit: 1000 },
        ],
      })
    ).rejects.toThrow('الحساب المحدد في السطر رقم 1 غير موجود');
  });
});
