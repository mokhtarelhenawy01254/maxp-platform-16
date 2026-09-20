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

// Helper: Ensure default accounts and categories exist for tenant
async function ensureDefaults(prisma, companyId) {
  const accountCount = await prisma.treasuryAccount.count({ where: { companyId } });
  if (accountCount === 0) {
    for (const acc of DEFAULT_ACCOUNTS) {
      await prisma.treasuryAccount.create({
        data: {
          companyId,
          name: acc.name,
          type: acc.type,
          isDefault: acc.isDefault,
          description: acc.description,
          balance: 0.0,
          currency: "EGP",
        }
      });
    }
  }

  const catCount = await prisma.expenseCategory.count({ where: { companyId } });
  if (catCount === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.expenseCategory.create({
        data: {
          companyId,
          name: cat.name,
          nameEn: cat.nameEn,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
          isSystem: true,
        }
      });
    }
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

    return res.status(201).json({ success: true, message: 'تم إيداع رأس المال بنجاح وتغذية الخزينة', data: result });
  } catch (error) {
    console.error('[treasury] depositCapital error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل إيداع رأس المال' });
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

      if (Number(account.balance) < expenseAmount) {
        throw new Error(`رصيد الخزينة المحددة (${account.name}) غير كافٍ لإتمام الصرف. الرصيد المتاح: ${Number(account.balance).toLocaleString()} ${account.currency}`);
      }

      // 2. Generate expense number
      const expenseNumber = await generateExpenseNumber(tx, companyId);
      const newBalance = Number(account.balance) - expenseAmount;
      const txDate = paymentDate ? new Date(paymentDate) : new Date();

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
          status: 'PAID',
          notes: notes ? notes.trim() : null,
          createdById: userId,
        },
        include: {
          category: true,
          treasuryAccount: { select: { id: true, name: true, type: true, currency: true } }
        }
      });

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

      return {
        expense,
        updatedBalance: newBalance
      };
    });

    return res.status(201).json({ success: true, message: 'تم تسجيل النفقة وخصمها من الخزينة بنجاح', data: result });
  } catch (error) {
    console.error('[treasury] createExpense error:', error);
    return res.status(400).json({ success: false, message: error.message || 'فشل تسجيل النفقة' });
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
              createdById: userId,
            }
          });
        }
      }

      await tx.companyExpense.delete({ where: { id } });

      return { id, expenseNumber: expense.expenseNumber };
    });

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
    const runwayMonths = burnRate > 0 ? (liquidTotal / burnRate).toFixed(1) : 0;

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
    const { treasuryAccountId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    const prisma = getSharedPrismaClient();
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

    const [transactions, totalCount] = await Promise.all([
      safeQuery(() =>
        prisma.treasuryTransaction.findMany({
          where,
          include: {
            treasuryAccount: { select: { id: true, name: true, type: true, currency: true } }
          },
          orderBy: { date: 'desc' },
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
