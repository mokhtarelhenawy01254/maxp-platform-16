const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

// Default initial categories for a new company
const DEFAULT_CATEGORIES = [
  { name: "مرتبات وأجور الموظفين", nameEn: "Salaries & Payroll", type: "OPEX", color: "#10b981", icon: "Users" },
  { name: "مرافق وفواتير (كهرباء، ماء، غاز)", nameEn: "Utilities (Electricity, Water, Gas)", type: "OPEX", color: "#f59e0b", icon: "Zap" },
  { name: "إنترنت واتصالات وسيرفرات", nameEn: "Internet, Telecom & Cloud", type: "OPEX", color: "#06b6d4", icon: "Wifi" },
  { name: "إيجارات مقرات ومستودعات", nameEn: "Rent & Facilities", type: "OPEX", color: "#6366f1", icon: "Home" },
  { name: "أجهزة ومعدات وأصول (CAPEX)", nameEn: "Equipment & Hardware (CAPEX)", type: "CAPEX", color: "#8b5cf6", icon: "Laptop" },
  { name: "تسويق وحملات إعلانية", nameEn: "Marketing & Ads", type: "OPEX", color: "#ec4899", icon: "Megaphone" },
  { name: "صيانة وضيافة ونثريات", nameEn: "Maintenance & Hospitality", type: "OPEX", color: "#64748b", icon: "Coffee" },
  { name: "أدوات ومستلزمات تشغيل", nameEn: "Operating Supplies", type: "OPEX", color: "#14b8a6", icon: "Package" },
];

// Default initial treasury accounts for a new company
const DEFAULT_ACCOUNTS = [
  { name: "الخزينة النقدية الرئيسية (الكاش)", type: "CASH", isDefault: true, description: "خزينة النقدية اليومية والمصروفات النثرية للمقر" },
  { name: "الحساب البنكي الرئيسي", type: "BANK", isDefault: false, description: "الحساب البنكي للمؤسسة للمرتبات والتحويلات الرسمية" },
  { name: "محفظة إلكترونية / InstaPay", type: "WALLET", isDefault: false, description: "المدفوعات الإلكترونية السريعة" },
];

let tablesEnsured = false;

// DDL Statements executed individually for multi-statement driver safety
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "treasury_accounts" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CASH',
    "balance" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "holderName" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "capital_transactions" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "treasuryAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CAPITAL_INJECTION',
    "investorName" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OPEX',
    "color" TEXT DEFAULT '#3b82f6',
    "icon" TEXT DEFAULT 'Tag',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "company_expenses" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "categoryId" TEXT,
    "treasuryAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OPEX',
    "beneficiary" TEXT,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "treasury_transactions" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "treasuryAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "type" TEXT NOT NULL,
    "runningBalance" DECIMAL(12, 2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "treasury_accounts_companyId_idx" ON "treasury_accounts"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "treasury_accounts_type_idx" ON "treasury_accounts"("type")`,
  `CREATE INDEX IF NOT EXISTS "treasury_accounts_isActive_idx" ON "treasury_accounts"("isActive")`,
  `CREATE INDEX IF NOT EXISTS "capital_transactions_companyId_idx" ON "capital_transactions"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "capital_transactions_treasuryAccountId_idx" ON "capital_transactions"("treasuryAccountId")`,
  `CREATE INDEX IF NOT EXISTS "capital_transactions_date_idx" ON "capital_transactions"("date")`,
  `CREATE INDEX IF NOT EXISTS "expense_categories_companyId_idx" ON "expense_categories"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "company_expenses_companyId_idx" ON "company_expenses"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "company_expenses_treasuryAccountId_idx" ON "company_expenses"("treasuryAccountId")`,
  `CREATE INDEX IF NOT EXISTS "company_expenses_categoryId_idx" ON "company_expenses"("categoryId")`,
  `CREATE INDEX IF NOT EXISTS "company_expenses_paymentDate_idx" ON "company_expenses"("paymentDate")`,
  `CREATE INDEX IF NOT EXISTS "company_expenses_type_idx" ON "company_expenses"("type")`,
  `CREATE INDEX IF NOT EXISTS "treasury_transactions_companyId_idx" ON "treasury_transactions"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "treasury_transactions_treasuryAccountId_idx" ON "treasury_transactions"("treasuryAccountId")`,
  `CREATE INDEX IF NOT EXISTS "treasury_transactions_date_idx" ON "treasury_transactions"("date")`
];

// Helper: Self-healing DDL bootstrap for treasury & expenses tables
async function ensureTablesExist(prisma) {
  if (tablesEnsured) return;
  try {
    for (const stmt of DDL_STATEMENTS) {
      await prisma.$executeRawUnsafe(stmt).catch((err) => {
        console.warn('[treasury] DDL stmt warning:', err.message);
      });
    }
    tablesEnsured = true;
  } catch (err) {
    console.warn('[treasury] ensureTablesExist notice:', err.message);
  }
}

// In-flight mutex per companyId to eliminate concurrent race conditions
const inFlightEnsures = new Map();

async function cleanupDuplicateAccountsAndCategories(prisma, companyId) {
  try {
    // 1. Cleanup duplicate accounts
    const allAccounts = await prisma.treasuryAccount.findMany({
      where: { companyId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    const accountsByName = new Map();
    for (const acc of allAccounts) {
      const key = (acc.name || "").trim();
      if (!accountsByName.has(key)) {
        accountsByName.set(key, []);
      }
      accountsByName.get(key).push(acc);
    }

    for (const [name, list] of accountsByName.entries()) {
      if (list.length > 1) {
        const primary = list[0];
        const duplicates = list.slice(1);

        for (const dup of duplicates) {
          // Reassign any transactions, capital, or expenses to primary
          await prisma.treasuryTransaction.updateMany({
            where: { treasuryAccountId: dup.id },
            data: { treasuryAccountId: primary.id },
          }).catch(() => {});

          await prisma.capitalTransaction.updateMany({
            where: { treasuryAccountId: dup.id },
            data: { treasuryAccountId: primary.id },
          }).catch(() => {});

          await prisma.companyExpense.updateMany({
            where: { treasuryAccountId: dup.id },
            data: { treasuryAccountId: primary.id },
          }).catch(() => {});

          // Merge any non-zero balance
          if (Number(dup.balance) !== 0) {
            await prisma.treasuryAccount.update({
              where: { id: primary.id },
              data: { balance: { increment: Number(dup.balance) } },
            }).catch(() => {});
          }

          // Delete duplicate
          await prisma.treasuryAccount.delete({
            where: { id: dup.id },
          }).catch((err) => {
            console.warn("[treasury] failed to delete duplicate account:", err.message);
          });
        }
      }
    }

    // 2. Ensure only ONE default account
    const defaultAccounts = await prisma.treasuryAccount.findMany({
      where: { companyId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
    if (defaultAccounts.length > 1) {
      const [keepDefault, ...extraDefaults] = defaultAccounts;
      for (const extra of extraDefaults) {
        await prisma.treasuryAccount.update({
          where: { id: extra.id },
          data: { isDefault: false },
        }).catch(() => {});
      }
    }

    // 3. Cleanup duplicate categories
    const allCategories = await prisma.expenseCategory.findMany({
      where: { companyId },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    const categoriesByName = new Map();
    for (const cat of allCategories) {
      const key = (cat.name || "").trim();
      if (!categoriesByName.has(key)) {
        categoriesByName.set(key, []);
      }
      categoriesByName.get(key).push(cat);
    }

    for (const [name, list] of categoriesByName.entries()) {
      if (list.length > 1) {
        const primary = list[0];
        const duplicates = list.slice(1);

        for (const dup of duplicates) {
          await prisma.companyExpense.updateMany({
            where: { categoryId: dup.id },
            data: { categoryId: primary.id },
          }).catch(() => {});

          await prisma.expenseCategory.delete({
            where: { id: dup.id },
          }).catch((err) => {
            console.warn("[treasury] failed to delete duplicate category:", err.message);
          });
        }
      }
    }
  } catch (err) {
    console.warn("[treasury] cleanupDuplicateAccountsAndCategories notice:", err.message);
  }
}

async function seedMissingDefaults(prisma, companyId) {
  try {
    for (const acc of DEFAULT_ACCOUNTS) {
      const existing = await prisma.treasuryAccount.findFirst({
        where: { companyId, name: acc.name },
      });
      if (!existing) {
        await prisma.treasuryAccount.create({
          data: {
            companyId,
            name: acc.name,
            type: acc.type,
            isDefault: acc.isDefault,
            description: acc.description,
            balance: 0.0,
            currency: "EGP",
          },
        });
      }
    }

    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await prisma.expenseCategory.findFirst({
        where: { companyId, name: cat.name },
      });
      if (!existing) {
        await prisma.expenseCategory.create({
          data: {
            companyId,
            name: cat.name,
            nameEn: cat.nameEn,
            type: cat.type,
            color: cat.color,
            icon: cat.icon,
            isSystem: true,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[treasury] seedMissingDefaults notice:", err.message);
  }
}

// Helper: Ensure transaction dates preserve true creation time and eliminate midnight shifts
function resolveTransactionDate(inputDate) {
  if (!inputDate) return new Date();
  
  if (inputDate instanceof Date) {
    return isNaN(inputDate.getTime()) ? new Date() : inputDate;
  }
  
  const str = String(inputDate).trim();
  if (!str) return new Date();

  // If input contains time (ISO string with T or contains :)
  if (str.includes('T') || str.includes(':')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // If input is purely date format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // If it's today's date, preserve current execution timestamp (hours, minutes, seconds, ms)
    if (str === todayStr) {
      return now;
    }
    
    // If it's another date, preserve current time of day so transactions on that date retain exact execution order
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Self-healing migration: Align dates for past transactions created with midnight timestamps
async function autoFixChronologyAndDates(prisma, companyId) {
  try {
    // 1. In treasury_transactions: if date was stored with midnight/timezone shift (minute=0 and second=0),
    // and was created on roughly the same day, update date to match createdAt to restore real chronological time
    await prisma.$executeRawUnsafe(`
      UPDATE "treasury_transactions"
      SET "date" = "createdAt"
      WHERE "companyId" = $1
        AND EXTRACT(MINUTE FROM "date") = 0
        AND EXTRACT(SECOND FROM "date") = 0
        AND (
          DATE("date") = DATE("createdAt")
          OR ABS(EXTRACT(EPOCH FROM ("createdAt" - "date"))) <= 86400
        )
    `, companyId).catch((err) => {
      console.warn('[treasury] autoFixChronologyAndDates tt warning:', err.message);
    });

    // 2. In company_expenses: similarly restore paymentDate
    await prisma.$executeRawUnsafe(`
      UPDATE "company_expenses"
      SET "paymentDate" = "createdAt"
      WHERE "companyId" = $1
        AND EXTRACT(MINUTE FROM "paymentDate") = 0
        AND EXTRACT(SECOND FROM "paymentDate") = 0
        AND (
          DATE("paymentDate") = DATE("createdAt")
          OR ABS(EXTRACT(EPOCH FROM ("createdAt" - "paymentDate"))) <= 86400
        )
    `, companyId).catch((err) => {
      console.warn('[treasury] autoFixChronologyAndDates ce warning:', err.message);
    });
  } catch (err) {
    console.warn('[treasury] autoFixChronologyAndDates notice:', err.message);
  }
}

// Helper: Ensure default accounts and categories exist for tenant
async function ensureDefaults(prisma, companyId) {
  if (!companyId) return;
  if (inFlightEnsures.has(companyId)) {
    return inFlightEnsures.get(companyId);
  }

  const promise = (async () => {
    await ensureTablesExist(prisma);
    await cleanupDuplicateAccountsAndCategories(prisma, companyId);
    await autoFixChronologyAndDates(prisma, companyId);
    await seedMissingDefaults(prisma, companyId);
  })();

  inFlightEnsures.set(companyId, promise);
  try {
    await promise;
  } finally {
    inFlightEnsures.delete(companyId);
  }
}

// Helper: Generate sequential expense number (EXP-YYMM-XXXX)
async function generateExpenseNumber(prisma, companyId) {
  const now = new Date();
  const yearMonth = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `EXP-${yearMonth}-`;

  const lastExpense = await prisma.companyExpense.findFirst({
    where: {
      companyId,
      expenseNumber: { startsWith: prefix }
    },
    orderBy: { createdAt: 'desc' },
    select: { expenseNumber: true }
  });

  let seq = 1;
  if (lastExpense && lastExpense.expenseNumber) {
    const parts = lastExpense.expenseNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// -------------------------------------------------------------
// 1. ACCOUNTS & TREASURY
// -------------------------------------------------------------

exports.getAccounts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    await ensureDefaults(prisma, companyId);

    const accounts = await safeQuery(() =>
      prisma.treasuryAccount.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
          _count: {
            select: { expenses: true, transactions: true }
          }
        }
      })
    );

    const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);

    return res.json({
      success: true,
      data: {
        accounts,
        totalBalance,
        count: accounts.length
      }
    });
  } catch (error) {
    console.error('[treasury] getAccounts error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الخزائن والحسابات' });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, type, accountNumber, bankName, holderName, description, currency, initialBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم الخزينة أو الحساب مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const initAmount = Math.max(0, parseFloat(initialBalance) || 0);

    const account = await prisma.$transaction(async (tx) => {
      const newAcc = await tx.treasuryAccount.create({
        data: {
          companyId,
          name: name.trim(),
          type: type || 'CASH',
          accountNumber: accountNumber ? accountNumber.trim() : null,
          bankName: bankName ? bankName.trim() : null,
          holderName: holderName ? holderName.trim() : null,
          description: description ? description.trim() : null,
          currency: currency || 'EGP',
          balance: initAmount,
        }
      });

      if (initAmount > 0) {
        // Record initial deposit transaction
        await tx.treasuryTransaction.create({
          data: {
            companyId,
            treasuryAccountId: newAcc.id,
            amount: initAmount,
            type: 'DEPOSIT',
            runningBalance: initAmount,
            referenceType: 'CAPITAL',
            description: `رصيد افتتاحي عند إنشاء الحساب: ${name.trim()}`,
            createdById: req.user.id,
          }
        });
      }

      return newAcc;
    });

    return res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('[treasury] createAccount error:', error);
    return res.status(500).json({ success: false, message: 'فشل إنشاء الحساب/الخزينة' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, accountNumber, bankName, holderName, description, isActive, isDefault } = req.body;

    const prisma = getSharedPrismaClient();

    const existing = await prisma.treasuryAccount.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الخزينة أو الحساب غير موجود' });
    }

    const updated = await prisma.treasuryAccount.update({
      where: { id },
      data: {
        name: name !== undefined && name.trim() ? name.trim() : existing.name,
        accountNumber: accountNumber !== undefined ? (accountNumber ? accountNumber.trim() : null) : existing.accountNumber,
        bankName: bankName !== undefined ? (bankName ? bankName.trim() : null) : existing.bankName,
        holderName: holderName !== undefined ? (holderName ? holderName.trim() : null) : existing.holderName,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
      }
    });

    return res.json({ success: true, message: 'تم تحديث بيانات الحساب بنجاح', data: updated });
  } catch (error) {
    console.error('[treasury] updateAccount error:', error);
    return res.status(500).json({ success: false, message: 'فشل تحديث بيانات الحساب' });
  }
};

exports.transferBetweenAccounts = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { fromAccountId, toAccountId, amount, description, date } = req.body;

    const transferAmount = parseFloat(amount);
    if (!fromAccountId || !toAccountId || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الخزينة المصدر، الخزينة المستهدفة، ومبلغ التحويل بشكل صحيح' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ success: false, message: 'لا يمكن التحويل لنفس الخزينة' });
    }

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const fromAccount = await tx.treasuryAccount.findFirst({
        where: { id: fromAccountId, companyId, isActive: true }
      });

      if (!fromAccount) {
        throw new Error('الخزينة المصدر غير موجودة');
      }

      if (Number(fromAccount.balance) < transferAmount) {
        throw new Error(`رصيد الخزينة المصدر غير كافٍ. المتاح حالياً: ${Number(fromAccount.balance).toLocaleString()} ${fromAccount.currency}`);
      }

      const toAccount = await tx.treasuryAccount.findFirst({
        where: { id: toAccountId, companyId, isActive: true }
      });

      if (!toAccount) {
        throw new Error('الخزينة المستهدفة غير موجودة');
      }

      const newFromBalance = Number(fromAccount.balance) - transferAmount;
      const newToBalance = Number(toAccount.balance) + transferAmount;
      const txDate = date ? new Date(date) : new Date();
      const desc = description ? description.trim() : `تحويل من ${fromAccount.name} إلى ${toAccount.name}`;

      // 1. Update fromAccount
      await tx.treasuryAccount.update({
        where: { id: fromAccountId },
        data: { balance: newFromBalance }
      });

      // 2. Update toAccount
      await tx.treasuryAccount.update({
        where: { id: toAccountId },
        data: { balance: newToBalance }
      });

      // 3. Record transfer out transaction
      await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId: fromAccountId,
          amount: -transferAmount,
          type: 'TRANSFER_OUT',
          runningBalance: newFromBalance,
          referenceType: 'TRANSFER',
          description: desc,
          date: txDate,
          createdById: userId,
        }
      });

      // 4. Record transfer in transaction
      await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId: toAccountId,
          amount: transferAmount,
          type: 'TRANSFER_IN',
          runningBalance: newToBalance,
          referenceType: 'TRANSFER',
          description: desc,
          date: txDate,
          createdById: userId,
        }
      });

      return {
        fromAccount: { ...fromAccount, balance: newFromBalance },
        toAccount: { ...toAccount, balance: newToBalance },
        transferAmount
      };
    });

    return res.json({ success: true, message: 'تم التحويل بين الخزائن بنجاح', data: result });
  } catch (error) {
    console.error('[treasury] transfer error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشلت عملية التحويل بين الخزائن' });
  }
};

// -------------------------------------------------------------
// 2. CAPITAL & INJECTIONS
// -------------------------------------------------------------

exports.getCapitalStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    await ensureDefaults(prisma, companyId);

    // Total capital injected
    const capitalDeposits = await safeQuery(() =>
      prisma.capitalTransaction.findMany({
        where: { companyId },
        select: { amount: true, type: true, date: true }
      })
    );
    const totalInjectedCapital = capitalDeposits.reduce((acc, c) => acc + Number(c.amount || 0), 0);

    // Current liquid cash across all active vaults
    const accounts = await safeQuery(() =>
      prisma.treasuryAccount.findMany({
        where: { companyId, isActive: true },
        select: { balance: true }
      })
    );
    const totalLiquidCash = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);

    // Total CAPEX (Assets value)
    const capexExpenses = await safeQuery(() =>
      prisma.companyExpense.findMany({
        where: { companyId, type: 'CAPEX', status: 'PAID' },
        select: { amount: true }
      })
    );
    const totalCapexAssets = capexExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

    // Total OPEX (Operating Expenses)
    const opexExpenses = await safeQuery(() =>
      prisma.companyExpense.findMany({
        where: { companyId, type: 'OPEX', status: 'PAID' },
        select: { amount: true }
      })
    );
    const totalOpexExpenses = opexExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

    // Total overall expenses
    const totalAllExpenses = totalCapexAssets + totalOpexExpenses;

    return res.json({
      success: true,
      data: {
        totalInjectedCapital,
        totalLiquidCash,
        totalCapexAssets,
        totalOpexExpenses,
        totalAllExpenses,
        netEquityValue: totalLiquidCash + totalCapexAssets,
        depositsCount: capitalDeposits.length
      }
    });
  } catch (error) {
    console.error('[treasury] getCapitalStats error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب إحصائيات رأس المال' });
  }
};

exports.depositCapital = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { treasuryAccountId, amount, type, investorName, referenceNumber, notes, date } = req.body;

    const depositAmount = parseFloat(amount);
    if (!treasuryAccountId || isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الخزينة المستهدفة ومبلغ الإيداع' });
    }

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId, isActive: true }
      });

      if (!account) {
        throw new Error('الخزينة المحددة غير موجودة');
      }

      const newBalance = Number(account.balance) + depositAmount;
      const txDate = date ? new Date(date) : new Date();

      // 1. Create capital transaction record
      const capitalTx = await tx.capitalTransaction.create({
        data: {
          companyId,
          treasuryAccountId,
          amount: depositAmount,
          type: type || 'CAPITAL_INJECTION',
          investorName: investorName ? investorName.trim() : null,
          referenceNumber: referenceNumber ? referenceNumber.trim() : null,
          notes: notes ? notes.trim() : null,
          date: txDate,
          createdById: userId,
        }
      });

      // 2. Update account balance
      await tx.treasuryAccount.update({
        where: { id: treasuryAccountId },
        data: { balance: newBalance }
      });

      // 3. Create TreasuryTransaction running ledger
      const desc = notes ? notes.trim() : `إيداع رأس مال / تمويل (${investorName || 'شريك/مستثمر'})`;
      await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId,
          amount: depositAmount,
          type: 'DEPOSIT',
          runningBalance: newBalance,
          referenceType: 'CAPITAL',
          referenceId: capitalTx.id,
          description: desc,
          date: txDate,
          createdById: userId,
        }
      });

      return {
        capitalTransaction: capitalTx,
        updatedBalance: newBalance,
        accountName: account.name
      };
    });

    // Accounting Auto-Posting Hook (Non-blocking & Zero Blast-Radius)
    try {
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      AccountingAutoPostingService.postCapitalDeposit(companyId, result.capitalTransaction.id, {
        userId,
        capitalData: result.capitalTransaction,
      }).catch((err) => console.error('[Accounting Auto-Posting] Capital async error:', err.message));
    } catch (autoErr) {
      console.error('[Accounting Auto-Posting] Capital hook error:', autoErr.message);
    }

    return res.status(201).json({ success: true, message: 'تم إيداع رأس المال بنجاح وتغذية الخزينة', data: result });
  } catch (error) {
    console.error('[treasury] depositCapital error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل إيداع رأس المال' });
  }
};

// T20: عكس وتصحيح إيداع رأس المال (Capital Deposit Reversal)
exports.reverseCapitalDeposit = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'معرف عملية رأس المال مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch capital transaction
      const capitalTx = await tx.capitalTransaction.findFirst({
        where: { id, companyId }
      });

      if (!capitalTx) {
        throw new Error('عملية رأس المال غير موجودة');
      }

      if (capitalTx.type === 'REVERSED') {
        throw new Error('هذه العملية تم عكسها بالفعل مسبقاً');
      }

      // 2. Fetch associated treasury account
      const account = await tx.treasuryAccount.findFirst({
        where: { id: capitalTx.treasuryAccountId, companyId }
      });

      if (!account) {
        throw new Error('الخزينة المرتبطة بعملية رأس المال غير موجودة');
      }

      const txAmount = Number(capitalTx.amount);
      const currentBalance = Number(account.balance);
      const newBalance = currentBalance - txAmount;

      if (newBalance < 0) {
        throw new Error(`لا يمكن عكس العملية: رصيد الخزينة الحالي (${currentBalance}) غير كافٍ لاستقطاع مبلغ رأس المال (${txAmount})`);
      }

      // 3. Update account balance
      await tx.treasuryAccount.update({
        where: { id: account.id },
        data: { balance: newBalance }
      });

      // 4. Update capital transaction record to mark as REVERSED
      const updatedNotes = [
        capitalTx.notes,
        `[تم العكس والتصحيح: ${reason ? reason.trim() : 'تصحيح إيداع رأس المال'} بواسطة المستخدم ${userId} في ${new Date().toISOString()}]`
      ].filter(Boolean).join(' | ');

      const updatedCapitalTx = await tx.capitalTransaction.update({
        where: { id: capitalTx.id },
        data: {
          type: 'REVERSED',
          notes: updatedNotes
        }
      });

      // 5. Create reversal transaction in TreasuryTransaction ledger
      const revDesc = `عكس/تصحيح إيداع رأس مال [${capitalTx.referenceNumber || capitalTx.id}]: ${reason ? reason.trim() : (capitalTx.investorName ? `المستثمر: ${capitalTx.investorName}` : 'تصحيح قيد')}`;
      const treasuryTx = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId: account.id,
          amount: txAmount,
          type: 'WITHDRAWAL',
          runningBalance: newBalance,
          referenceType: 'CAPITAL_REVERSAL',
          referenceId: capitalTx.id,
          description: revDesc,
          date: new Date(),
          createdById: userId,
        }
      });

      return {
        reversedCapitalTransaction: updatedCapitalTx,
        treasuryTransaction: treasuryTx,
        updatedBalance: newBalance,
        deductedAmount: txAmount,
        accountName: account.name
      };
    });

    // Accounting Auto-Posting Reversal Hook (Non-blocking & Zero Blast-Radius)
    try {
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      AccountingAutoPostingService.reverseDocument(companyId, 'CAPITAL', result.reversedCapitalTransaction.id, {
        userId,
        reason: `عكس إيداع رأس مال: ${result.reversedCapitalTransaction.referenceNumber || result.reversedCapitalTransaction.id}`,
      }).catch((err) => console.error('[Accounting Auto-Posting] Capital reversal async error:', err.message));
    } catch (autoErr) {
      console.error('[Accounting Auto-Posting] Capital reversal hook error:', autoErr.message);
    }

    return res.json({
      success: true,
      message: 'تم عكس إيداع رأس المال واستقطاع المبلغ من الخزينة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('[treasury] reverseCapitalDeposit error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل عكس إيداع رأس المال' });
  }
};

// -------------------------------------------------------------
// 3. CATEGORIES
// -------------------------------------------------------------

exports.getCategories = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    await ensureDefaults(prisma, companyId);

    const categories = await safeQuery(() =>
      prisma.expenseCategory.findMany({
        where: { companyId },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { expenses: true } }
        }
      })
    );

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[treasury] getCategories error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب تصنيفات النفقات' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, nameEn, type, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const category = await safeQuery(() =>
      prisma.expenseCategory.create({
        data: {
          companyId,
          name: name.trim(),
          nameEn: nameEn ? nameEn.trim() : null,
          type: type === 'CAPEX' ? 'CAPEX' : 'OPEX',
          color: color || '#3b82f6',
          icon: icon || 'Tag',
        }
      })
    );

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('[treasury] createCategory error:', error);
    return res.status(500).json({ success: false, message: 'فشل إضافة التصنيف' });
  }
};

// -------------------------------------------------------------
// 4. EXPENSES (OUTFLOWS)
// -------------------------------------------------------------

exports.getExpenses = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      search,
      categoryId,
      treasuryAccountId,
      type,
      startDate,
      endDate,
      isRecurring,
      status,
      page = 1,
      limit = 30
    } = req.query;

    const prisma = getSharedPrismaClient();
    await ensureDefaults(prisma, companyId);
    const where = { companyId };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { expenseNumber: { contains: q, mode: 'insensitive' } },
        { beneficiary: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (treasuryAccountId) where.treasuryAccountId = treasuryAccountId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (isRecurring !== undefined) where.isRecurring = isRecurring === 'true';

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.max(1, parseInt(limit, 10));

    const [expenses, totalCount, totals] = await Promise.all([
      safeQuery(() =>
        prisma.companyExpense.findMany({
          where,
          include: {
            category: true,
            treasuryAccount: { select: { id: true, name: true, type: true, currency: true } },
          },
          orderBy: { paymentDate: 'desc' },
          skip,
          take,
        })
      ),
      safeQuery(() => prisma.companyExpense.count({ where })),
      safeQuery(() =>
        prisma.companyExpense.aggregate({
          where,
          _sum: { amount: true }
        })
      )
    ]);

    return res.json({
      success: true,
      data: {
        expenses,
        totalCount,
        totalAmount: Number(totals._sum.amount || 0),
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(totalCount / take)
      }
    });
  } catch (error) {
    console.error('[treasury] getExpenses error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب سجل النفقات' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      title,
      amount,
      categoryId,
      treasuryAccountId,
      type,
      beneficiary,
      invoiceNumber,
      receiptUrl,
      paymentDate,
      isRecurring,
      recurringInterval,
      nextDueDate,
      status,
      notes
    } = req.body;

    const expenseAmount = parseFloat(amount);
    if (!title || !title.trim() || isNaN(expenseAmount) || expenseAmount <= 0 || !treasuryAccountId) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم النفقة والمبلغ واختيار الخزينة المصروف منها' });
    }

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify Treasury Account & Check Balance (Overdraft Guard)
      const account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId, isActive: true }
      });

      if (!account) {
        throw new Error('الخزينة المختارة غير موجودة أو غير نشطة');
      }

      const isPaid = (status || 'PAID') === 'PAID';

      // 2. Generate expense number (Overdraft permitted: balance may become negative)
      const expenseNumber = await generateExpenseNumber(tx, companyId);
      const newBalance = isPaid ? Number(account.balance) - expenseAmount : Number(account.balance);
      const txDate = resolveTransactionDate(paymentDate);

      // Determine OPEX vs CAPEX
      let resolvedType = type || 'OPEX';
      if (categoryId && !type) {
        const cat = await tx.expenseCategory.findUnique({ where: { id: categoryId } });
        if (cat) resolvedType = cat.type;
      }

      // 3. Create CompanyExpense
      const expense = await tx.companyExpense.create({
        data: {
          companyId,
          expenseNumber,
          title: title.trim(),
          amount: expenseAmount,
          categoryId: categoryId || null,
          treasuryAccountId,
          type: resolvedType,
          beneficiary: beneficiary ? beneficiary.trim() : null,
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
          receiptUrl: receiptUrl || null,
          paymentDate: txDate,
          isRecurring: Boolean(isRecurring),
          recurringInterval: isRecurring ? (recurringInterval || 'MONTHLY') : null,
          nextDueDate: isRecurring && nextDueDate ? new Date(nextDueDate) : null,
          status: isPaid ? 'PAID' : 'PENDING',
          notes: notes ? notes.trim() : null,
          createdById: userId,
        },
        include: {
          category: true,
          treasuryAccount: { select: { id: true, name: true, type: true, currency: true } }
        }
      });

      if (isPaid) {
        // 4. Deduct from Treasury Account
        await tx.treasuryAccount.update({
          where: { id: treasuryAccountId },
          data: { balance: newBalance }
        });

        // 5. Create Treasury Transaction running ledger
        await tx.treasuryTransaction.create({
          data: {
            companyId,
            treasuryAccountId,
            amount: -expenseAmount,
            type: 'EXPENSE',
            runningBalance: newBalance,
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            description: `صرف نفقة [${expenseNumber}]: ${title.trim()} (${beneficiary ? 'المستفيد: ' + beneficiary : 'نقداً'})`,
            date: txDate,
            createdById: userId,
          }
        });
      }

      return {
        expense,
        updatedBalance: newBalance
      };
    });

    // Accounting Auto-Posting Hook (Non-blocking & Zero Blast-Radius)
    try {
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      AccountingAutoPostingService.postExpense(companyId, result.expense.id, {
        userId,
        expenseData: result.expense,
      }).catch((err) => console.error('[Accounting Auto-Posting] Expense async error:', err.message));
    } catch (autoErr) {
      console.error('[Accounting Auto-Posting] Expense hook error:', autoErr.message);
    }

    return res.status(201).json({ success: true, message: 'تم تسجيل النفقة بنجاح', data: result });
  } catch (error) {
    console.error('[treasury] createExpense error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل تسجيل النفقة' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const {
      title,
      amount,
      categoryId,
      treasuryAccountId,
      type,
      beneficiary,
      invoiceNumber,
      receiptUrl,
      paymentDate,
      isRecurring,
      recurringInterval,
      nextDueDate,
      notes,
      status
    } = req.body;

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.companyExpense.findFirst({
        where: { id, companyId },
        include: { treasuryAccount: true }
      });

      if (!existing) {
        throw new Error('النفقة غير موجودة');
      }

      const targetAmount = amount !== undefined ? parseFloat(amount) : Number(existing.amount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        throw new Error('مبلغ النفقة غير صالح');
      }

      const targetAccountId = treasuryAccountId || existing.treasuryAccountId;
      const targetStatus = status || existing.status;
      const prevAmount = Number(existing.amount);
      const prevStatus = existing.status;
      const prevAccountId = existing.treasuryAccountId;

      // Reverse previous paid deduction if needed
      if (prevStatus === 'PAID') {
        const prevAcc = await tx.treasuryAccount.findFirst({
          where: { id: prevAccountId, companyId }
        });
        if (prevAcc) {
          await tx.treasuryAccount.update({
            where: { id: prevAccountId },
            data: { balance: Number(prevAcc.balance) + prevAmount }
          });
        }
      }

      // If new status is PAID, deduct from target account
      if (targetStatus === 'PAID') {
        const targetAcc = await tx.treasuryAccount.findFirst({
          where: { id: targetAccountId, companyId, isActive: true }
        });
        if (!targetAcc) {
          throw new Error('الخزينة المحددة غير موجودة أو غير نشطة');
        }
        const availableBalance = Number(targetAcc.balance);
        // Overdraft permitted: calculate new target balance directly (may become negative)
        const updatedTargetBalance = availableBalance - targetAmount;
        await tx.treasuryAccount.update({
          where: { id: targetAccountId },
          data: { balance: updatedTargetBalance }
        });

        // Record adjustment in ledger
        await tx.treasuryTransaction.create({
          data: {
            companyId,
            treasuryAccountId: targetAccountId,
            amount: -targetAmount,
            type: 'EXPENSE',
            runningBalance: updatedTargetBalance,
            referenceType: 'EXPENSE',
            referenceId: existing.id,
            description: `تعديل نفقة [${existing.expenseNumber}]: ${(title || existing.title).trim()}`,
            date: paymentDate ? resolveTransactionDate(paymentDate) : existing.paymentDate,
            createdById: userId,
          }
        });
      }

      const updated = await tx.companyExpense.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : existing.title,
          amount: targetAmount,
          categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
          treasuryAccountId: targetAccountId,
          type: type || existing.type,
          beneficiary: beneficiary !== undefined ? (beneficiary ? beneficiary.trim() : null) : existing.beneficiary,
          invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : existing.invoiceNumber,
          receiptUrl: receiptUrl !== undefined ? (receiptUrl || null) : existing.receiptUrl,
          paymentDate: paymentDate ? resolveTransactionDate(paymentDate) : existing.paymentDate,
          isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : existing.isRecurring,
          recurringInterval: isRecurring ? (recurringInterval || existing.recurringInterval || 'MONTHLY') : null,
          nextDueDate: isRecurring && nextDueDate ? new Date(nextDueDate) : existing.nextDueDate,
          status: targetStatus,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        },
        include: {
          category: true,
          treasuryAccount: { select: { id: true, name: true, type: true, currency: true } }
        }
      });

      const currentAcc = await tx.treasuryAccount.findUnique({
        where: { id: targetAccountId },
        select: { balance: true }
      });

      return {
        expense: updated,
        updatedBalance: Number(currentAcc?.balance || 0)
      };
    });

    return res.json({ success: true, message: 'تم تحديث النفقة بنجاح', data: result });
  } catch (error) {
    console.error('[treasury] updateExpense error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل تحديث النفقة' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;

    const prisma = getSharedPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.companyExpense.findFirst({
        where: { id, companyId },
        include: { treasuryAccount: true }
      });

      if (!expense) {
        throw new Error('النفقة غير موجودة');
      }

      // If already paid, refund the amount back into the treasury account
      if (expense.status === 'PAID') {
        const account = await tx.treasuryAccount.findFirst({
          where: { id: expense.treasuryAccountId, companyId }
        });

        if (account) {
          const newBalance = Number(account.balance) + Number(expense.amount);
          await tx.treasuryAccount.update({
            where: { id: account.id },
            data: { balance: newBalance }
          });

          // Record reversal transaction
          await tx.treasuryTransaction.create({
            data: {
              companyId,
              treasuryAccountId: account.id,
              amount: Number(expense.amount),
              type: 'DEPOSIT',
              runningBalance: newBalance,
              referenceType: 'EXPENSE',
              referenceId: expense.id,
              description: `استرداد وإلغاء نفقة محذوفة [${expense.expenseNumber}]: ${expense.title}`,
              date: new Date(),
              createdById: userId,
            }
          });
        }
      }

      await tx.companyExpense.delete({ where: { id } });

      return { id, expenseNumber: expense.expenseNumber };
    });

    // Accounting Auto-Posting Reversal Hook (Non-blocking & Zero Blast-Radius)
    try {
      const AccountingAutoPostingService = require('../services/accountingAutoPostingService');
      AccountingAutoPostingService.reverseDocument(companyId, 'EXPENSE', id, {
        userId,
        reason: `حذف النفقة رقم ${result.expenseNumber || id}`,
      }).catch((err) => console.error('[Accounting Auto-Posting] Expense reversal async error:', err.message));
    } catch (autoErr) {
      console.error('[Accounting Auto-Posting] Expense reversal hook error:', autoErr.message);
    }

    return res.json({ success: true, message: 'تم حذف النفقة وإعادة رصيدها للخزينة بنجاح', data: result });
  } catch (error) {
    console.error('[treasury] deleteExpense error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل حذف النفقة' });
  }
};

exports.getExpenseStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Current month expenses
    const currentMonthExpenses = await safeQuery(() =>
      prisma.companyExpense.findMany({
        where: {
          companyId,
          status: 'PAID',
          paymentDate: { gte: startOfCurrentMonth }
        },
        select: { amount: true, type: true, categoryId: true, category: { select: { name: true, color: true } } }
      })
    );

    // Last month expenses
    const lastMonthExpenses = await safeQuery(() =>
      prisma.companyExpense.findMany({
        where: {
          companyId,
          status: 'PAID',
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        select: { amount: true }
      })
    );

    const currentTotal = currentMonthExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const lastTotal = lastMonthExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

    const opexTotal = currentMonthExpenses.filter(e => e.type === 'OPEX').reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const capexTotal = currentMonthExpenses.filter(e => e.type === 'CAPEX').reduce((acc, e) => acc + Number(e.amount || 0), 0);

    // Breakdown by category
    const categoryMap = {};
    for (const e of currentMonthExpenses) {
      const catName = e.category ? e.category.name : 'أخرى';
      const color = e.category ? e.category.color : '#94a3b8';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, color, total: 0 };
      }
      categoryMap[catName].total += Number(e.amount || 0);
    }
    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);

    // Treasury accounts liquid total to calculate runway
    const accounts = await safeQuery(() =>
      prisma.treasuryAccount.findMany({
        where: { companyId, isActive: true },
        select: { balance: true }
      })
    );
    const liquidTotal = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);

    // Monthly burn rate = current month opex or average
    const burnRate = opexTotal > 0 ? opexTotal : (currentTotal > 0 ? currentTotal : 1);
    const runwayMonths = (liquidTotal > 0 && burnRate > 0) ? (liquidTotal / burnRate).toFixed(1) : 0;

    return res.json({
      success: true,
      data: {
        currentMonthTotal: currentTotal,
        lastMonthTotal: lastTotal,
        monthOverMonthDelta: lastTotal > 0 ? Math.round(((currentTotal - lastTotal) / lastTotal) * 100) : 0,
        opexTotal,
        capexTotal,
        categoryBreakdown,
        burnRate,
        runwayMonths: Number(runwayMonths),
        liquidCash: liquidTotal
      }
    });
  } catch (error) {
    console.error('[treasury] getExpenseStats error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب إحصائيات النفقات' });
  }
};

// -------------------------------------------------------------
// 5. LEDGER (كشف حساب الخزائن التراكمي)
// -------------------------------------------------------------

exports.getLedger = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { treasuryAccountId, type, startDate, endDate, sortOrder = 'desc', page = 1, limit = 50 } = req.query;

    const prisma = getSharedPrismaClient();
    await ensureDefaults(prisma, companyId);
    const where = { companyId };

    if (treasuryAccountId) where.treasuryAccountId = treasuryAccountId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.max(1, parseInt(limit, 10));
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const [transactions, totalCount] = await Promise.all([
      safeQuery(() =>
        prisma.treasuryTransaction.findMany({
          where,
          include: {
            treasuryAccount: { select: { id: true, name: true, type: true, currency: true } }
          },
          orderBy: [
            { date: orderDirection },
            { createdAt: orderDirection },
            { id: orderDirection },
          ],
          skip,
          take,
        })
      ),
      safeQuery(() => prisma.treasuryTransaction.count({ where }))
    ]);

    return res.json({
      success: true,
      data: {
        transactions,
        totalCount,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(totalCount / take)
      }
    });
  } catch (error) {
    console.error('[treasury] getLedger error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب كشف الحساب' });
  }
};
