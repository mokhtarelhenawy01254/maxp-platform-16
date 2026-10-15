/**
 * Accounting & Double-Entry General Ledger Service
 * Handles Chart of Accounts (COA), Journal Entries, Fiscal Periods, Egyptian Standard Seed,
 * Opening Balances, and Financial Reports (Trial Balance, Ledger, P&L, Balance Sheet, VAT).
 *
 * Strict Change Isolation: Adds new accounting capabilities with zero side-effects on existing models.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class AccountingService {
  /**
   * Helper to ensure database tables and enums exist (idempotent dual-layer guard)
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "FiscalPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "accounts" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "nameEn" TEXT,
          "type" "AccountType" NOT NULL,
          "parentId" TEXT,
          "isGroup" BOOLEAN NOT NULL DEFAULT false,
          "isPostable" BOOLEAN NOT NULL DEFAULT true,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "description" TEXT,
          "currency" TEXT NOT NULL DEFAULT 'EGP',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "accounts_companyId_code_key" ON "accounts"("companyId", "code");
        CREATE INDEX IF NOT EXISTS "accounts_companyId_type_idx" ON "accounts"("companyId", "type");
        CREATE INDEX IF NOT EXISTS "accounts_companyId_parentId_idx" ON "accounts"("companyId", "parentId");
        CREATE INDEX IF NOT EXISTS "accounts_companyId_isActive_idx" ON "accounts"("companyId", "isActive");

        CREATE TABLE IF NOT EXISTS "journal_entries" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "entryNumber" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "narration" TEXT NOT NULL,
          "sourceType" TEXT,
          "sourceId" TEXT,
          "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
          "postedAt" TIMESTAMP(3),
          "postedById" TEXT,
          "createdById" TEXT,
          "reversalOfId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_companyId_entryNumber_key" ON "journal_entries"("companyId", "entryNumber");
        CREATE INDEX IF NOT EXISTS "journal_entries_companyId_date_idx" ON "journal_entries"("companyId", "date");
        CREATE INDEX IF NOT EXISTS "journal_entries_companyId_status_idx" ON "journal_entries"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "journal_entries_companyId_sourceType_sourceId_idx" ON "journal_entries"("companyId", "sourceType", "sourceId");

        CREATE TABLE IF NOT EXISTS "journal_lines" (
          "id" TEXT PRIMARY KEY,
          "entryId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "debit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
          "credit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
          "narration" TEXT,
          "costCenter" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "journal_lines_entryId_idx" ON "journal_lines"("entryId");
        CREATE INDEX IF NOT EXISTS "journal_lines_accountId_idx" ON "journal_lines"("accountId");

        CREATE TABLE IF NOT EXISTS "fiscal_periods" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "year" INTEGER NOT NULL,
          "month" INTEGER NOT NULL,
          "status" "FiscalPeriodStatus" NOT NULL DEFAULT 'OPEN',
          "closedAt" TIMESTAMP(3),
          "closedById" TEXT,
          "isYearEnd" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_companyId_year_month_key" ON "fiscal_periods"("companyId", "year", "month");
        CREATE INDEX IF NOT EXISTS "fiscal_periods_companyId_status_idx" ON "fiscal_periods"("companyId", "status");

        CREATE TABLE IF NOT EXISTS "accounting_settings" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
          "defaultCashAccountId" TEXT,
          "defaultBankAccountId" TEXT,
          "defaultArAccountId" TEXT,
          "defaultApAccountId" TEXT,
          "defaultSalesAccountId" TEXT,
          "defaultCogsAccountId" TEXT,
          "defaultInventoryAccountId" TEXT,
          "defaultExpenseAccountId" TEXT,
          "defaultRetainedEarningsAccountId" TEXT,
          "defaultVatOutputAccountId" TEXT,
          "defaultVatInputAccountId" TEXT,
          "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 14.00,
          "autoPostingEnabled" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "accounting_settings_companyId_key" ON "accounting_settings"("companyId");

        CREATE TABLE IF NOT EXISTS "unposted_entries" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "sourceType" TEXT NOT NULL,
          "sourceId" TEXT NOT NULL,
          "documentNo" TEXT,
          "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reason" TEXT NOT NULL,
          "errorDetails" TEXT,
          "payload" JSONB,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "retriedAt" TIMESTAMP(3),
          "retriedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "unposted_entries_companyId_status_idx" ON "unposted_entries"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "unposted_entries_companyId_sourceType_sourceId_idx" ON "unposted_entries"("companyId", "sourceType", "sourceId");
      `);
    } catch (err) {
      // In testing environments with mock Prisma clients, $executeRawUnsafe may not exist or fail gracefully
    }
  }

  // ==========================================================================
  // 1. Chart of Accounts (COA)
  // ==========================================================================

  static async listAccounts(companyId, filter = {}) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (filter.type) where.type = filter.type;
    if (filter.isPostable !== undefined) where.isPostable = filter.isPostable === 'true' || filter.isPostable === true;
    if (filter.isGroup !== undefined) where.isGroup = filter.isGroup === 'true' || filter.isGroup === true;
    if (filter.isActive !== undefined) where.isActive = filter.isActive === 'true' || filter.isActive === true;
    if (filter.parentId) where.parentId = filter.parentId;
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search } },
        { name: { contains: filter.search } },
        { nameEn: { contains: filter.search } },
      ];
    }

    return await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  static async getAccountTree(companyId) {
    const accounts = await this.listAccounts(companyId, { isActive: true });
    const map = {};
    const roots = [];

    for (const acc of accounts) {
      map[acc.id] = { ...acc, children: [] };
    }

    for (const acc of accounts) {
      if (acc.parentId && map[acc.parentId]) {
        map[acc.parentId].children.push(map[acc.id]);
      } else {
        roots.push(map[acc.id]);
      }
    }

    return roots;
  }

  static async getAccountById(companyId, accountId) {
    const prisma = getSharedPrismaClient();
    const account = await prisma.account.findFirst({
      where: { id: accountId, companyId },
      include: {
        parent: true,
        children: true,
        _count: { select: { journalLines: true } },
      },
    });

    if (!account) {
      const error = new Error('الحساب غير موجود');
      error.statusCode = 404;
      throw error;
    }
    return account;
  }

  static async createAccount(companyId, data) {
    const prisma = getSharedPrismaClient();
    const { code, name, nameEn, type, parentId, isGroup = false, isPostable = true, description, currency = 'EGP' } = data;

    if (!code || !name || !type) {
      const error = new Error('كود الحساب واسمه ونوعه حقول إلزامية');
      error.statusCode = 400;
      throw error;
    }

    // Check unique code per company
    const existing = await prisma.account.findFirst({
      where: { companyId, code: String(code).trim() },
    });
    if (existing) {
      const error = new Error(`كود الحساب (${code}) مسجل مسبقاً لهذه الشركة`);
      error.statusCode = 409;
      throw error;
    }

    // Validate parent if provided
    if (parentId) {
      const parent = await prisma.account.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parent) {
        const error = new Error('الحساب الأب المحدد غير موجود');
        error.statusCode = 400;
        throw error;
      }
      if (!parent.isGroup) {
        // Upgrade parent to group if needed
        await prisma.account.update({
          where: { id: parentId },
          data: { isGroup: true, isPostable: false },
        });
      }
    }

    return await prisma.account.create({
      data: {
        companyId,
        code: String(code).trim(),
        name: String(name).trim(),
        nameEn: nameEn ? String(nameEn).trim() : null,
        type,
        parentId: parentId || null,
        isGroup: Boolean(isGroup),
        isPostable: isGroup ? false : Boolean(isPostable),
        isActive: true,
        description: description || null,
        currency: currency || 'EGP',
      },
    });
  }

  static async updateAccount(companyId, accountId, data) {
    const prisma = getSharedPrismaClient();
    const account = await this.getAccountById(companyId, accountId);

    // Prevent making a postable account a group if it has journal lines
    if (data.isGroup === true && account._count.journalLines > 0) {
      const error = new Error('لا يمكن تحويل حساب يحتوي على قيود يومية مسجلة إلى حساب تجميعي');
      error.statusCode = 400;
      throw error;
    }

    // Prevent setting parent to itself
    if (data.parentId && data.parentId === accountId) {
      const error = new Error('لا يمكن للحساب أن يكون أباً لنفسه');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.account.update({
      where: { id: accountId },
      data: {
        name: data.name !== undefined ? String(data.name).trim() : undefined,
        nameEn: data.nameEn !== undefined ? (data.nameEn ? String(data.nameEn).trim() : null) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        description: data.description !== undefined ? data.description : undefined,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
      },
    });
  }

  static async deleteAccount(companyId, accountId) {
    const prisma = getSharedPrismaClient();
    const account = await this.getAccountById(companyId, accountId);

    if (account.children && account.children.length > 0) {
      const error = new Error('لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية');
      error.statusCode = 400;
      throw error;
    }

    if (account._count.journalLines > 0) {
      const error = new Error('لا يمكن حذف حساب مرتبط بحركات وقيود يومية سابقة. يمكنك تعطيل الحساب بدلاً من حذفه');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.account.delete({
      where: { id: accountId },
    });
  }

  // ==========================================================================
  // 2. Sequential Auto-Numbering
  // ==========================================================================

  static async getNextEntryNumber(companyId, date = new Date()) {
    const prisma = getSharedPrismaClient();
    const entryDate = new Date(date);
    const year = entryDate.getFullYear();
    const prefix = `JE-${year}-`;

    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        entryNumber: { startsWith: prefix },
      },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });

    let nextSeq = 1;
    if (lastEntry && lastEntry.entryNumber) {
      const parts = lastEntry.entryNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) nextSeq = num + 1;
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  // ==========================================================================
  // 3. Fiscal Periods
  // ==========================================================================

  static async listPeriods(companyId, year = null) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (year) where.year = parseInt(year, 10);

    return await prisma.fiscalPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  static async checkPeriodStatus(companyId, date = new Date()) {
    const prisma = getSharedPrismaClient();
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const period = await prisma.fiscalPeriod.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    return period ? period.status : 'OPEN';
  }

  static async isPeriodClosed(companyId, date = new Date()) {
    const status = await this.checkPeriodStatus(companyId, date);
    return status === 'CLOSED';
  }

  static async openPeriod(companyId, year, month, userId = null) {
    const prisma = getSharedPrismaClient();
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    return await prisma.fiscalPeriod.upsert({
      where: {
        companyId_year_month: { companyId, year: y, month: m },
      },
      create: {
        companyId,
        year: y,
        month: m,
        status: 'OPEN',
      },
      update: {
        status: 'OPEN',
        closedAt: null,
        closedById: null,
      },
    });
  }

  static async closePeriod(companyId, year, month, userId = null) {
    const prisma = getSharedPrismaClient();
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    // Verify no DRAFT entries exist in this period
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const draftEntriesCount = await prisma.journalEntry.count({
      where: {
        companyId,
        status: 'DRAFT',
        date: { gte: startDate, lte: endDate },
      },
    });

    if (draftEntriesCount > 0) {
      const error = new Error(`لا يمكن إقفال الفترة ${m}/${y} لوجود عدد (${draftEntriesCount}) قيود بحالة مسودة غير مرحلة`);
      error.statusCode = 400;
      throw error;
    }

    return await prisma.fiscalPeriod.upsert({
      where: {
        companyId_year_month: { companyId, year: y, month: m },
      },
      create: {
        companyId,
        year: y,
        month: m,
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: userId,
      },
      update: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: userId,
      },
    });
  }

  // ==========================================================================
  // 4. Journal Entries
  // ==========================================================================

  static async listEntries(companyId, options = {}) {
    const prisma = getSharedPrismaClient();
    const { page = 1, limit = 50, status, startDate, endDate, sourceType, search } = options;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = { companyId };
    if (status) where.status = status;
    if (sourceType) where.sourceType = sourceType;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { entryNumber: { contains: search } },
        { narration: { contains: search } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
        skip,
        take,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      entries,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        pages: Math.ceil(total / take) || 1,
      },
    };
  }

  static async getEntryById(companyId, entryId) {
    const prisma = getSharedPrismaClient();
    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, companyId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    if (!entry) {
      const error = new Error('قيد اليومية غير موجود');
      error.statusCode = 404;
      throw error;
    }
    return entry;
  }

  static async validateLines(companyId, lines) {
    if (!Array.isArray(lines) || lines.length < 2) {
      const error = new Error('يجب أن يحتوي القيد المحاسبي على سطرين على الأقل');
      error.statusCode = 400;
      throw error;
    }

    const prisma = getSharedPrismaClient();
    let totalDebit = 0;
    let totalCredit = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = round2(line.debit);
      const credit = round2(line.credit);

      if (debit < 0 || credit < 0) {
        const error = new Error(`السطر رقم ${i + 1}: لا يمكن للمبالغ أن تكون سالبة`);
        error.statusCode = 400;
        throw error;
      }

      if (debit === 0 && credit === 0) {
        const error = new Error(`السطر رقم ${i + 1}: يجب تحديد مبلغ مدين أو دائن أكبر من صفر`);
        error.statusCode = 400;
        throw error;
      }

      if (debit > 0 && credit > 0) {
        const error = new Error(`السطر رقم ${i + 1}: لا يمكن أن يحتوي السطر الواحد على مدين ودائن معاً`);
        error.statusCode = 400;
        throw error;
      }

      const account = await prisma.account.findFirst({
        where: { id: line.accountId, companyId },
      });

      if (!account) {
        const error = new Error(`الحساب المحدد في السطر رقم ${i + 1} غير موجود`);
        error.statusCode = 400;
        throw error;
      }

      if (!account.isActive) {
        const error = new Error(`الحساب (${account.code} - ${account.name}) معطّل ولا يقبل حركات`);
        error.statusCode = 400;
        throw error;
      }

      if (!account.isPostable || account.isGroup) {
        const error = new Error(`الحساب (${account.code} - ${account.name}) حساب تجميعي ولا يقبل ترحيل قيود مباشرة`);
        error.statusCode = 400;
        throw error;
      }

      totalDebit = round2(totalDebit + debit);
      totalCredit = round2(totalCredit + credit);
    }

    return { totalDebit, totalCredit };
  }

  static async createEntry(companyId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const entryDate = data.date ? new Date(data.date) : new Date();
    const status = data.status || 'DRAFT';

    // Check closed fiscal period
    const periodStatus = await this.checkPeriodStatus(companyId, entryDate);
    if (periodStatus === 'CLOSED') {
      const error = new Error('لا يمكن تسجيل قيود في فترة مالية مقفلة');
      error.statusCode = 400;
      throw error;
    }

    // Validate lines
    const { totalDebit, totalCredit } = await this.validateLines(companyId, data.lines);

    // If creating directly as POSTED, enforce balance
    if (status === 'POSTED') {
      if (round2(totalDebit) !== round2(totalCredit)) {
        const diff = round2(Math.abs(totalDebit - totalCredit));
        const error = new Error(`القيد غير متوازن رياضياً: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}) بفارق (${diff})`);
        error.statusCode = 400;
        throw error;
      }
      if (totalDebit <= 0) {
        const error = new Error('لا يمكن ترحيل قيد بإجمالي صفر');
        error.statusCode = 400;
        throw error;
      }
    }

    const entryNumber = data.entryNumber || (await this.getNextEntryNumber(companyId, entryDate));

    return await prisma.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        date: entryDate,
        narration: String(data.narration || '').trim(),
        sourceType: data.sourceType || 'MANUAL',
        sourceId: data.sourceId ? String(data.sourceId) : null,
        status,
        postedAt: status === 'POSTED' ? new Date() : null,
        postedById: status === 'POSTED' ? userId : null,
        createdById: userId,
        lines: {
          create: data.lines.map((l) => ({
            accountId: l.accountId,
            debit: round2(l.debit),
            credit: round2(l.credit),
            narration: l.narration ? String(l.narration).trim() : null,
            costCenter: l.costCenter ? String(l.costCenter).trim() : null,
          })),
        },
      },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
  }

  static async updateEntry(companyId, entryId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const entry = await this.getEntryById(companyId, entryId);

    if (entry.status !== 'DRAFT') {
      const error = new Error('لا يمكن تعديل قيد مرحل أو ملغي. القيود المسودة فقط هي القابلة للتعديل');
      error.statusCode = 400;
      throw error;
    }

    const entryDate = data.date ? new Date(data.date) : entry.date;
    const periodStatus = await this.checkPeriodStatus(companyId, entryDate);
    if (periodStatus === 'CLOSED') {
      const error = new Error('لا يمكن تعديل القيد لتاريخ يقع في فترة مالية مقفلة');
      error.statusCode = 400;
      throw error;
    }

    if (data.lines) {
      await this.validateLines(companyId, data.lines);
    }

    // Delete existing lines and re-create if lines provided
    if (data.lines) {
      await prisma.journalLine.deleteMany({ where: { entryId } });
    }

    return await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        date: entryDate,
        narration: data.narration !== undefined ? String(data.narration).trim() : undefined,
        lines: data.lines
          ? {
              create: data.lines.map((l) => ({
                accountId: l.accountId,
                debit: round2(l.debit),
                credit: round2(l.credit),
                narration: l.narration ? String(l.narration).trim() : null,
                costCenter: l.costCenter ? String(l.costCenter).trim() : null,
              })),
            }
          : undefined,
      },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
  }

  static async postEntry(companyId, entryId, userId = null) {
    const prisma = getSharedPrismaClient();
    const entry = await this.getEntryById(companyId, entryId);

    if (entry.status === 'POSTED') {
      const error = new Error('القيد مرحل بالفعل مسبقاً');
      error.statusCode = 400;
      throw error;
    }

    if (entry.status === 'VOID') {
      const error = new Error('لا يمكن ترحيل قيد تم إلغاؤه مسبقاً');
      error.statusCode = 400;
      throw error;
    }

    const periodStatus = await this.checkPeriodStatus(companyId, entry.date);
    if (periodStatus === 'CLOSED') {
      const error = new Error('لا يمكن ترحيل القيد في فترة مالية مقفلة');
      error.statusCode = 400;
      throw error;
    }

    // Revalidate balance
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of entry.lines) {
      const d = round2(line.debit);
      const c = round2(line.credit);
      totalDebit = round2(totalDebit + d);
      totalCredit = round2(totalCredit + c);

      // Recheck account postability
      const acc = await prisma.account.findFirst({
        where: { id: line.accountId, companyId },
      });
      if (!acc || !acc.isActive || !acc.isPostable || acc.isGroup) {
        const error = new Error(`الحساب (${line.account?.code}) غير مسموح بالترحيل عليه`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (totalDebit !== totalCredit) {
      const diff = round2(Math.abs(totalDebit - totalCredit));
      const error = new Error(`القيد غير متوازن: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}) بفارق (${diff})`);
      error.statusCode = 400;
      throw error;
    }

    if (totalDebit <= 0) {
      const error = new Error('لا يمكن ترحيل قيد بإجمالي صفر');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedById: userId,
      },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
  }

  static async voidEntry(companyId, entryId, userId = null, reason = 'إلغاء قيد') {
    const prisma = getSharedPrismaClient();
    const entry = await this.getEntryById(companyId, entryId);

    if (entry.status !== 'POSTED') {
      const error = new Error('لا يمكن إلغاء قيد إلا إذا كان مرحلاً (POSTED). المسودات تُحذف مباشرة');
      error.statusCode = 400;
      throw error;
    }

    const today = new Date();
    const periodStatus = await this.checkPeriodStatus(companyId, today);
    if (periodStatus === 'CLOSED') {
      const error = new Error('لا يمكن إلغاء القيد لأن الفترة المالية الحالية مقفلة');
      error.statusCode = 400;
      throw error;
    }

    // Build reversing entry
    const reversingNarration = `قيد عكسي لإلغاء القيد رقم (${entry.entryNumber})${reason ? ` — سبب: ${reason}` : ''}`;
    const reversingEntryNumber = await this.getNextEntryNumber(companyId, today);

    const reversingLines = entry.lines.map((line) => ({
      accountId: line.accountId,
      debit: round2(line.credit), // Flip credit to debit
      credit: round2(line.debit), // Flip debit to credit
      narration: reversingNarration,
      costCenter: line.costCenter,
    }));

    const result = await prisma.$transaction(async (tx) => {
      const updatedOriginal = await tx.journalEntry.update({
        where: { id: entryId },
        data: { status: 'VOID' },
      });

      const reversingEntry = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber: reversingEntryNumber,
          date: today,
          narration: reversingNarration,
          sourceType: 'REVERSAL',
          sourceId: entryId,
          reversalOfId: entryId,
          status: 'POSTED',
          postedAt: new Date(),
          postedById: userId,
          createdById: userId,
          lines: {
            create: reversingLines,
          },
        },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
          },
        },
      });

      return { updatedOriginal, reversingEntry };
    });

    return {
      voidedEntry: result.updatedOriginal,
      reversingEntry: result.reversingEntry,
    };
  }

  // ==========================================================================
  // 5. Standard Egyptian COA Seed (Idempotent)
  // ==========================================================================

  static getEgyptianStandardCOA() {
    return [
      // 1 الأصول (ASSETS)
      { code: '1', name: 'الأصول', nameEn: 'Assets', type: 'ASSET', isGroup: true, isPostable: false, parentCode: null },
      { code: '11', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '1' },
      { code: '1101', name: 'النقدية وما في حكمها', nameEn: 'Cash & Cash Equivalents', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '11' },
      { code: '110101', name: 'الخزينة النقدية الرئيسية', nameEn: 'Main Cash Vault', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1101' },
      { code: '110102', name: 'عهد نقدية ومصروفات نثرية', nameEn: 'Petty Cash & Custody', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1101' },
      { code: '1102', name: 'البنوك والمحافظ الإلكترونية', nameEn: 'Banks & Digital Wallets', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '11' },
      { code: '110201', name: 'الحساب البنكي الجاري الرئيسي', nameEn: 'Main Bank Account', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1102' },
      { code: '110202', name: 'محفظة إلكترونية وInstaPay', nameEn: 'InstaPay & Wallets', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1102' },
      { code: '1103', name: 'العملاء والمدينون', nameEn: 'Accounts Receivable', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '11' },
      { code: '110301', name: 'عملاء التجزئة والمتجر الإلكتروني', nameEn: 'Retail & Store Customers', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1103' },
      { code: '110302', name: 'عملاء الجملة والتوزيع', nameEn: 'Wholesale Customers', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1103' },
      { code: '110303', name: 'أوراق قبض', nameEn: 'Notes Receivable', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1103' },
      { code: '1104', name: 'المخزون', nameEn: 'Inventory', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '11' },
      { code: '110401', name: 'مخزون الخامات ومستلزمات الإنتاج', nameEn: 'Raw Materials Inventory', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1104' },
      { code: '110402', name: 'مخزون إنتاج تحت التشغيل (WIP)', nameEn: 'Work in Progress (WIP)', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1104' },
      { code: '110403', name: 'مخزون الإنتاج التام والبضاعة الجاهزة', nameEn: 'Finished Goods Inventory', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1104' },
      { code: '1105', name: 'أرصدة مدينة أخرى', nameEn: 'Other Debit Balances', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '11' },
      { code: '110501', name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1105' },
      { code: '110502', name: 'مصلحة الضرائب - ضريبة ق.م مدخلات (مشتريات)', nameEn: 'VAT Input Tax Paid', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1105' },
      { code: '110503', name: 'تأمينات مستردة لدى الغير', nameEn: 'Refundable Deposits', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1105' },

      // الأصول الثابتة
      { code: '12', name: 'الأصول غير المتداولة (الثابتة)', nameEn: 'Fixed Assets', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '1' },
      { code: '1201', name: 'الأصول الثابتة بالتكلفة', nameEn: 'Fixed Assets at Cost', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '12' },
      { code: '120101', name: 'آلات ومعدات وماكينات تصنيع', nameEn: 'Machinery & Equipment', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1201' },
      { code: '120102', name: 'أجهزة كمبيوتر وخوادم وشبكات', nameEn: 'Computers & IT Hardware', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1201' },
      { code: '120103', name: 'أثاث وتجهيزات مقرات ومخازن', nameEn: 'Furniture & Fixtures', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1201' },
      { code: '120104', name: 'وسائل نقل وانتقال', nameEn: 'Vehicles', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1201' },
      { code: '1202', name: 'مجمع الإهلاك للأصول الثابتة', nameEn: 'Accumulated Depreciation', type: 'ASSET', isGroup: true, isPostable: false, parentCode: '12' },
      { code: '120201', name: 'مجمع إهلاك آلات ومعدات', nameEn: 'Acc. Dep. - Machinery', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1202' },
      { code: '120202', name: 'مجمع إهلاك أجهزة كمبيوتر', nameEn: 'Acc. Dep. - Computers', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1202' },
      { code: '120203', name: 'مجمع إهلاك أثاث وتجهيزات', nameEn: 'Acc. Dep. - Furniture', type: 'ASSET', isGroup: false, isPostable: true, parentCode: '1202' },

      // 2 الخصوم / الالتزامات (LIABILITIES)
      { code: '2', name: 'الخصوم والالتزامات', nameEn: 'Liabilities', type: 'LIABILITY', isGroup: true, isPostable: false, parentCode: null },
      { code: '21', name: 'الالتزامات المتداولة', nameEn: 'Current Liabilities', type: 'LIABILITY', isGroup: true, isPostable: false, parentCode: '2' },
      { code: '2101', name: 'الموردون والدائنون', nameEn: 'Accounts Payable', type: 'LIABILITY', isGroup: true, isPostable: false, parentCode: '21' },
      { code: '210101', name: 'موردو الخامات ومستلزمات الإنتاج', nameEn: 'Raw Materials Suppliers', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2101' },
      { code: '210102', name: 'موردو الخدمات والتشغيل للغير', nameEn: 'Subcontracting & Services AP', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2101' },
      { code: '210103', name: 'أوراق دفع', nameEn: 'Notes Payable', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2101' },
      { code: '2102', name: 'مستحقات وأرصدة دائنة أخرى', nameEn: 'Accrued & Other Liabilities', type: 'LIABILITY', isGroup: true, isPostable: false, parentCode: '21' },
      { code: '210201', name: 'رواتب وأجور مستحقة', nameEn: 'Accrued Salaries & Wages', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '210202', name: 'مصلحة الضرائب - ضريبة ق.م مخرجات (مبيعات)', nameEn: 'VAT Output Tax Collected', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '210203', name: 'مصلحة الضرائب - ضريبة كسب العمل', nameEn: 'Payroll Tax Payable', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '210204', name: 'مصلحة الضرائب - ضريبة الخصم والإضافة', nameEn: 'Withholding Tax Payable', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '210205', name: 'مصروفات تشغيلية مستحقة', nameEn: 'Accrued Operating Expenses', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '210206', name: 'دفعات مقدمة من العملاء', nameEn: 'Customer Advances', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '2102' },
      { code: '22', name: 'الالتزامات طويلة الأجل', nameEn: 'Long-term Liabilities', type: 'LIABILITY', isGroup: true, isPostable: false, parentCode: '2' },
      { code: '220101', name: 'قروض وتسهيلات بنكية طويلة الأجل', nameEn: 'Bank Loans & Facilities', type: 'LIABILITY', isGroup: false, isPostable: true, parentCode: '22' },

      // 3 حقوق الملكية (EQUITY)
      { code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', isGroup: true, isPostable: false, parentCode: null },
      { code: '3101', name: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', type: 'EQUITY', isGroup: false, isPostable: true, parentCode: '3' },
      { code: '3102', name: 'جاري الشركاء / المالك', nameEn: "Partners' / Owner's Current", type: 'EQUITY', isGroup: false, isPostable: true, parentCode: '3' },
      { code: '3103', name: 'أرباح (خسائر) مرحلة / مبقاة', nameEn: 'Retained Earnings', type: 'EQUITY', isGroup: false, isPostable: true, parentCode: '3' },
      { code: '3104', name: 'أرباح (خسائر) العام الحالي', nameEn: 'Current Year Profit/Loss', type: 'EQUITY', isGroup: false, isPostable: true, parentCode: '3' },

      // 4 الإيرادات (REVENUE)
      { code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', isGroup: true, isPostable: false, parentCode: null },
      { code: '41', name: 'إيرادات النشاط الرئيسي', nameEn: 'Operating Revenue', type: 'REVENUE', isGroup: true, isPostable: false, parentCode: '4' },
      { code: '4101', name: 'مبيعات منتجات تامة الصنع', nameEn: 'Finished Goods Sales', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '41' },
      { code: '4102', name: 'مبيعات خامات وبضائع', nameEn: 'Raw Materials Sales', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '41' },
      { code: '4103', name: 'إيرادات خدمات صناعية وتشغيل للغير', nameEn: 'Industrial Services Revenue', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '41' },
      { code: '42', name: 'خصومات ومردودات المبيعات', nameEn: 'Sales Deductions', type: 'REVENUE', isGroup: true, isPostable: false, parentCode: '4' },
      { code: '4201', name: 'مردودات مبيعات', nameEn: 'Sales Returns', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '42' },
      { code: '4202', name: 'خصم مسموح به (مبيعات)', nameEn: 'Sales Discounts Allowed', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '42' },
      { code: '43', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', isGroup: true, isPostable: false, parentCode: '4' },
      { code: '4301', name: 'إيرادات تمويلية وفروق عملة', nameEn: 'Finance & FX Income', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '43' },
      { code: '4302', name: 'أرباح رأسمالية وبيع أصول', nameEn: 'Gain on Sale of Assets', type: 'REVENUE', isGroup: false, isPostable: true, parentCode: '43' },

      // 5 المصروفات (EXPENSES)
      { code: '5', name: 'المصروفات والتكاليف', nameEn: 'Expenses & Costs', type: 'EXPENSE', isGroup: true, isPostable: false, parentCode: null },
      { code: '51', name: 'تكلفة النشاط والمبيعات (COGS)', nameEn: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', isGroup: true, isPostable: false, parentCode: '51' },
      { code: '5101', name: 'تكلفة الخامات المستخدمة في الإنتاج', nameEn: 'Raw Materials Consumed', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '51' },
      { code: '5102', name: 'أجور عمال الإنتاج المباشرة', nameEn: 'Direct Manufacturing Labor', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '51' },
      { code: '5103', name: 'تكاليف صناعية غير مباشرة (طاقة وصيانة)', nameEn: 'Manufacturing Overheads', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '51' },
      { code: '5104', name: 'تشغيل لدى الغير ومراحل تصنيع خارجية', nameEn: 'External Subcontracting Cost', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '51' },
      { code: '52', name: 'مصروفات البيع والتسويق', nameEn: 'Selling & Marketing Expenses', type: 'EXPENSE', isGroup: true, isPostable: false, parentCode: '5' },
      { code: '5201', name: 'إعلانات وحملات تسويقية', nameEn: 'Marketing & Ads', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '52' },
      { code: '5202', name: 'شحن ونقل للعملاء وتوصيل', nameEn: 'Customer Shipping & Delivery', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '52' },
      { code: '5203', name: 'عمولات مناديب ومسوقين', nameEn: 'Sales Commissions', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '52' },
      { code: '53', name: 'المصروفات العمومية والإدارية', nameEn: 'General & Administrative (G&A)', type: 'EXPENSE', isGroup: true, isPostable: false, parentCode: '5' },
      { code: '5301', name: 'رواتب وأجور الإدارة والموظفين', nameEn: 'Administrative Salaries', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5302', name: 'إيجار مقرات ومكاتب', nameEn: 'Rent & Leases', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5303', name: 'مرافق ومياه وكهرباء للمكاتب', nameEn: 'Utilities (Electricity/Water)', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5304', name: 'اتصالات وإنترنت وسيرفرات وسحابة', nameEn: 'Telecom, Internet & Cloud', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5305', name: 'أدوات مكتبية ومطبوعات وضيافة', nameEn: 'Office Supplies & Hospitality', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5306', name: 'صيانة ونظافة', nameEn: 'Maintenance & Janitorial', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5307', name: 'إهلاك الأصول الثابتة', nameEn: 'Depreciation Expense', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
      { code: '5308', name: 'رسوم بنكية وعمولات بوابات دفع', nameEn: 'Bank Fees & Payment Gateways', type: 'EXPENSE', isGroup: false, isPostable: true, parentCode: '53' },
    ];
  }

  static async seedEgyptianCOA(companyId) {
    const prisma = getSharedPrismaClient();
    const tree = this.getEgyptianStandardCOA();
    const codeToIdMap = {};

    // Sort by code length to guarantee parent is inserted before child
    tree.sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));

    for (const item of tree) {
      const parentId = item.parentCode ? codeToIdMap[item.parentCode] || null : null;

      const acc = await prisma.account.upsert({
        where: {
          companyId_code: { companyId, code: item.code },
        },
        create: {
          companyId,
          code: item.code,
          name: item.name,
          nameEn: item.nameEn,
          type: item.type,
          parentId,
          isGroup: item.isGroup,
          isPostable: item.isPostable,
          isActive: true,
          currency: 'EGP',
        },
        update: {
          name: item.name,
          nameEn: item.nameEn,
          type: item.type,
          parentId,
          isGroup: item.isGroup,
          isPostable: item.isPostable,
          isActive: true,
        },
      });

      codeToIdMap[item.code] = acc.id;
    }

    // Configure company default accounting settings
    await prisma.accountingSettings.upsert({
      where: { companyId },
      create: {
        companyId,
        fiscalYearStartMonth: 1,
        defaultCashAccountId: codeToIdMap['110101'] || null,
        defaultBankAccountId: codeToIdMap['110201'] || null,
        defaultArAccountId: codeToIdMap['110301'] || null,
        defaultApAccountId: codeToIdMap['210101'] || null,
        defaultSalesAccountId: codeToIdMap['4101'] || null,
        defaultCogsAccountId: codeToIdMap['5101'] || null,
        defaultInventoryAccountId: codeToIdMap['110403'] || null,
        defaultExpenseAccountId: codeToIdMap['5301'] || null,
        defaultRetainedEarningsAccountId: codeToIdMap['3103'] || null,
        defaultVatOutputAccountId: codeToIdMap['210202'] || null,
        defaultVatInputAccountId: codeToIdMap['110502'] || null,
        defaultTaxRate: 14.0,
        autoPostingEnabled: false,
      },
      update: {
        defaultCashAccountId: codeToIdMap['110101'] || undefined,
        defaultBankAccountId: codeToIdMap['110201'] || undefined,
        defaultArAccountId: codeToIdMap['110301'] || undefined,
        defaultApAccountId: codeToIdMap['210101'] || undefined,
        defaultSalesAccountId: codeToIdMap['4101'] || undefined,
        defaultCogsAccountId: codeToIdMap['5101'] || undefined,
        defaultInventoryAccountId: codeToIdMap['110403'] || undefined,
        defaultExpenseAccountId: codeToIdMap['5301'] || undefined,
        defaultRetainedEarningsAccountId: codeToIdMap['3103'] || undefined,
        defaultVatOutputAccountId: codeToIdMap['210202'] || undefined,
        defaultVatInputAccountId: codeToIdMap['110502'] || undefined,
      },
    });

    return {
      success: true,
      seededAccounts: tree.length,
      message: 'تم بذر دليل الحسابات المصري الموحد وضبط الإعدادات الافتراضية بنجاح',
    };
  }

  // ==========================================================================
  // 6. Opening Balances (الأرصدة الافتتاحية)
  // ==========================================================================

  static async createOpeningBalance(companyId, data, userId = null) {
    const openingData = {
      ...data,
      narration: data.narration || 'قيد الأرصدة الافتتاحية للشركة',
      sourceType: 'OPENING_BALANCE',
      status: 'POSTED',
    };
    return await this.createEntry(companyId, openingData, userId);
  }

  // ==========================================================================
  // 7. Reporting Engine (From POSTED entries only)
  // ==========================================================================

  /**
   * Trial Balance (ميزان المراجعة)
   */
  static async getTrialBalance(companyId, query = {}) {
    const prisma = getSharedPrismaClient();
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const accounts = await prisma.account.findMany({
      where: { companyId, isPostable: true, isActive: true },
      orderBy: { code: 'asc' },
    });

    // Fetch all posted and voided/reversing journal lines (reversals offset voided entries)
    const lineWhere = {
      entry: {
        companyId,
        status: { in: ['POSTED', 'VOID'] },
      },
    };

    const allLines = await prisma.journalLine.findMany({
      where: lineWhere,
      include: {
        entry: { select: { date: true } },
      },
    });

    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;
    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalEndingDebit = 0;
    let totalEndingCredit = 0;

    const rows = accounts.map((acc) => {
      let openingBalance = 0;
      let periodDebit = 0;
      let periodCredit = 0;

      for (const line of allLines) {
        if (line.accountId !== acc.id) continue;
        const lineDate = new Date(line.entry.date);
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;

        if (startDate && lineDate < startDate) {
          // Opening balance accumulation
          if (['ASSET', 'EXPENSE'].includes(acc.type)) {
            openingBalance += debit - credit;
          } else {
            openingBalance += credit - debit;
          }
        } else if (!endDate || lineDate <= endDate) {
          periodDebit += debit;
          periodCredit += credit;
        }
      }

      let endingBalance = 0;
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        endingBalance = openingBalance + periodDebit - periodCredit;
      } else {
        endingBalance = openingBalance + periodCredit - periodDebit;
      }

      openingBalance = round2(openingBalance);
      periodDebit = round2(periodDebit);
      periodCredit = round2(periodCredit);
      endingBalance = round2(endingBalance);

      const isDebitNature = ['ASSET', 'EXPENSE'].includes(acc.type);
      let opDebit = 0;
      let opCredit = 0;
      let endDebit = 0;
      let endCredit = 0;

      if (isDebitNature) {
        opDebit = openingBalance >= 0 ? openingBalance : 0;
        opCredit = openingBalance < 0 ? Math.abs(openingBalance) : 0;
        endDebit = endingBalance >= 0 ? endingBalance : 0;
        endCredit = endingBalance < 0 ? Math.abs(endingBalance) : 0;
      } else {
        opCredit = openingBalance >= 0 ? openingBalance : 0;
        opDebit = openingBalance < 0 ? Math.abs(openingBalance) : 0;
        endCredit = endingBalance >= 0 ? endingBalance : 0;
        endDebit = endingBalance < 0 ? Math.abs(endingBalance) : 0;
      }

      totalOpeningDebit = round2(totalOpeningDebit + opDebit);
      totalOpeningCredit = round2(totalOpeningCredit + opCredit);
      totalPeriodDebit = round2(totalPeriodDebit + periodDebit);
      totalPeriodCredit = round2(totalPeriodCredit + periodCredit);
      totalEndingDebit = round2(totalEndingDebit + endDebit);
      totalEndingCredit = round2(totalEndingCredit + endCredit);

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        openingDebit: opDebit,
        openingCredit: opCredit,
        periodDebit,
        periodCredit,
        endingDebit: endDebit,
        endingCredit: endCredit,
      };
    });

    return {
      period: { startDate, endDate },
      rows,
      totals: {
        totalOpeningDebit,
        totalOpeningCredit,
        totalPeriodDebit,
        totalPeriodCredit,
        totalEndingDebit,
        totalEndingCredit,
        isBalanced: totalPeriodDebit === totalPeriodCredit && totalEndingDebit === totalEndingCredit,
      },
    };
  }

  /**
   * General Ledger & Account Statement (دفتر الأستاذ العام / كشف الحساب)
   */
  static async getGeneralLedger(companyId, query = {}) {
    const prisma = getSharedPrismaClient();
    const { accountId, startDate, endDate } = query;

    if (!accountId) {
      const error = new Error('يجب تحديد الحساب المطلوب (accountId)');
      error.statusCode = 400;
      throw error;
    }

    const account = await this.getAccountById(companyId, accountId);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    const where = {
      accountId,
      entry: {
        companyId,
        status: { in: ['POSTED', 'VOID'] },
      },
    };

    const lines = await prisma.journalLine.findMany({
      where,
      include: {
        entry: {
          select: { id: true, entryNumber: true, date: true, narration: true, sourceType: true },
        },
      },
      orderBy: { entry: { date: 'asc' } },
    });

    let openingBalance = 0;
    const periodMovements = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      const lineDate = new Date(line.entry.date);
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (start && lineDate < start) {
        if (['ASSET', 'EXPENSE'].includes(account.type)) {
          openingBalance += debit - credit;
        } else {
          openingBalance += credit - debit;
        }
      } else if (!end || lineDate <= end) {
        totalDebit = round2(totalDebit + debit);
        totalCredit = round2(totalCredit + credit);
        periodMovements.push({
          lineId: line.id,
          entryId: line.entry.id,
          entryNumber: line.entry.entryNumber,
          date: line.entry.date,
          narration: line.narration || line.entry.narration,
          sourceType: line.entry.sourceType,
          costCenter: line.costCenter,
          debit: round2(debit),
          credit: round2(credit),
        });
      }
    }

    openingBalance = round2(openingBalance);
    let runningBalance = openingBalance;

    const formattedMovements = periodMovements.map((m) => {
      if (['ASSET', 'EXPENSE'].includes(account.type)) {
        runningBalance = round2(runningBalance + m.debit - m.credit);
      } else {
        runningBalance = round2(runningBalance + m.credit - m.debit);
      }
      return {
        ...m,
        runningBalance,
      };
    });

    const closingBalance = runningBalance;

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      period: { startDate: start, endDate: end },
      openingBalance,
      movements: formattedMovements,
      totals: {
        totalDebit,
        totalCredit,
        closingBalance,
      },
    };
  }

  /**
   * Income Statement (قائمة الدخل والأرباح والخسائر)
   */
  static async getProfitAndLoss(companyId, query = {}) {
    const prisma = getSharedPrismaClient();
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const accounts = await prisma.account.findMany({
      where: { companyId, type: { in: ['REVENUE', 'EXPENSE'] }, isPostable: true },
      orderBy: { code: 'asc' },
    });

    const where = {
      entry: { companyId, status: { in: ['POSTED', 'VOID'] } },
      account: { type: { in: ['REVENUE', 'EXPENSE'] } },
    };
    if (startDate || endDate) {
      where.entry.date = {};
      if (startDate) where.entry.date.gte = startDate;
      if (endDate) where.entry.date.lte = endDate;
    }

    const lines = await prisma.journalLine.findMany({
      where,
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    const accountTotals = {};
    for (const line of lines) {
      const accId = line.accountId;
      if (!accountTotals[accId]) {
        accountTotals[accId] = { debit: 0, credit: 0 };
      }
      accountTotals[accId].debit += Number(line.debit) || 0;
      accountTotals[accId].credit += Number(line.credit) || 0;
    }

    const revenues = [];
    const costOfSales = [];
    const operatingExpenses = [];
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOpex = 0;

    for (const acc of accounts) {
      const t = accountTotals[acc.id] || { debit: 0, credit: 0 };
      if (acc.type === 'REVENUE') {
        const netAmount = round2(t.credit - t.debit);
        if (netAmount !== 0) {
          revenues.push({ code: acc.code, name: acc.name, amount: netAmount });
          totalRevenue = round2(totalRevenue + netAmount);
        }
      } else if (acc.type === 'EXPENSE') {
        const netAmount = round2(t.debit - t.credit);
        if (netAmount !== 0) {
          if (acc.code.startsWith('51')) {
            costOfSales.push({ code: acc.code, name: acc.name, amount: netAmount });
            totalCogs = round2(totalCogs + netAmount);
          } else {
            operatingExpenses.push({ code: acc.code, name: acc.name, amount: netAmount });
            totalOpex = round2(totalOpex + netAmount);
          }
        }
      }
    }

    const grossProfit = round2(totalRevenue - totalCogs);
    const netProfit = round2(grossProfit - totalOpex);

    return {
      period: { startDate, endDate },
      revenues: { items: revenues, total: totalRevenue },
      costOfSales: { items: costOfSales, total: totalCogs },
      grossProfit,
      operatingExpenses: { items: operatingExpenses, total: totalOpex },
      netProfit,
    };
  }

  /**
   * Balance Sheet (الميزانية العمومية والمركز المالي)
   */
  static async getBalanceSheet(companyId, query = {}) {
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const tb = await this.getTrialBalance(companyId, { endDate: asOfDate });
    const pnl = await this.getProfitAndLoss(companyId, { endDate: asOfDate });

    const currentAssets = [];
    const fixedAssets = [];
    const currentLiabilities = [];
    const longTermLiabilities = [];
    const equityItems = [];

    let totalCurrentAssets = 0;
    let totalFixedAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalLongTermLiabilities = 0;
    let totalEquity = 0;

    for (const r of tb.rows) {
      if (r.type === 'ASSET') {
        const balance = round2(r.endingDebit - r.endingCredit);
        if (balance !== 0) {
          if (r.code.startsWith('11')) {
            currentAssets.push({ code: r.code, name: r.name, amount: balance });
            totalCurrentAssets = round2(totalCurrentAssets + balance);
          } else {
            fixedAssets.push({ code: r.code, name: r.name, amount: balance });
            totalFixedAssets = round2(totalFixedAssets + balance);
          }
        }
      } else if (r.type === 'LIABILITY') {
        const balance = round2(r.endingCredit - r.endingDebit);
        if (balance !== 0) {
          if (r.code.startsWith('21')) {
            currentLiabilities.push({ code: r.code, name: r.name, amount: balance });
            totalCurrentLiabilities = round2(totalCurrentLiabilities + balance);
          } else {
            longTermLiabilities.push({ code: r.code, name: r.name, amount: balance });
            totalLongTermLiabilities = round2(totalLongTermLiabilities + balance);
          }
        }
      } else if (r.type === 'EQUITY') {
        const balance = round2(r.endingCredit - r.endingDebit);
        if (balance !== 0) {
          equityItems.push({ code: r.code, name: r.name, amount: balance });
          totalEquity = round2(totalEquity + balance);
        }
      }
    }

    // Add current period net profit/loss to equity
    const currentYearNetIncome = round2(pnl.netProfit);
    equityItems.push({
      code: '3104',
      name: 'أرباح (خسائر) الفترة الحالية حتى تاريخه',
      amount: currentYearNetIncome,
    });
    totalEquity = round2(totalEquity + currentYearNetIncome);

    const totalAssets = round2(totalCurrentAssets + totalFixedAssets);
    const totalLiabilities = round2(totalCurrentLiabilities + totalLongTermLiabilities);
    const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity);
    const balanceDiff = round2(Math.abs(totalAssets - totalLiabilitiesAndEquity));

    return {
      asOfDate,
      assets: {
        current: { items: currentAssets, total: totalCurrentAssets },
        fixed: { items: fixedAssets, total: totalFixedAssets },
        total: totalAssets,
      },
      liabilities: {
        current: { items: currentLiabilities, total: totalCurrentLiabilities },
        longTerm: { items: longTermLiabilities, total: totalLongTermLiabilities },
        total: totalLiabilities,
      },
      equity: {
        items: equityItems,
        total: totalEquity,
      },
      summary: {
        totalAssets,
        totalLiabilitiesAndEquity,
        difference: balanceDiff,
        isBalanced: balanceDiff === 0,
      },
    };
  }

  /**
   * VAT Report (تقرير ضريبة القيمة المضافة)
   */
  static async getVatReport(companyId, query = {}) {
    const settings = await this.getSettings(companyId);
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const outputAccountId = settings.defaultVatOutputAccountId;
    const inputAccountId = settings.defaultVatInputAccountId;

    let outputVatCollected = 0;
    let inputVatPaid = 0;

    if (outputAccountId) {
      const outputLedger = await this.getGeneralLedger(companyId, {
        accountId: outputAccountId,
        startDate,
        endDate,
      });
      outputVatCollected = round2(outputLedger.totals.closingBalance);
    }

    if (inputAccountId) {
      const inputLedger = await this.getGeneralLedger(companyId, {
        accountId: inputAccountId,
        startDate,
        endDate,
      });
      inputVatPaid = round2(inputLedger.totals.closingBalance);
    }

    const netVatPayable = round2(outputVatCollected - inputVatPaid);

    return {
      period: { startDate, endDate },
      taxRate: Number(settings.defaultTaxRate) || 14.0,
      outputVatCollected,
      inputVatPaid,
      netVatPayable,
      status: netVatPayable >= 0 ? 'DUE_TO_TAX_AUTHORITY' : 'REFUNDABLE_OR_CREDIT',
    };
  }

  // ==========================================================================
  // 8. Settings
  // ==========================================================================

  static async getSettings(companyId) {
    const prisma = getSharedPrismaClient();
    let settings = await prisma.accountingSettings.findUnique({
      where: { companyId },
    });

    if (!settings) {
      settings = await prisma.accountingSettings.create({
        data: {
          companyId,
          fiscalYearStartMonth: 1,
          defaultTaxRate: 14.0,
          autoPostingEnabled: false,
        },
      });
    }

    return settings;
  }

  static async updateSettings(companyId, data) {
    const prisma = getSharedPrismaClient();
    return await prisma.accountingSettings.upsert({
      where: { companyId },
      create: {
        companyId,
        ...data,
      },
      update: {
        ...data,
      },
    });
  }
}

module.exports = AccountingService;
