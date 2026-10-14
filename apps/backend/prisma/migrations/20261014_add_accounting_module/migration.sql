-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FiscalPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable accounts
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable journal_entries
CREATE TABLE IF NOT EXISTS "journal_entries" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable journal_lines
CREATE TABLE IF NOT EXISTS "journal_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "narration" TEXT,
    "costCenter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable fiscal_periods
CREATE TABLE IF NOT EXISTS "fiscal_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "FiscalPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "isYearEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable accounting_settings
CREATE TABLE IF NOT EXISTS "accounting_settings" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_settings_pkey" PRIMARY KEY ("id")
);

-- Unique constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_companyId_code_key" ON "accounts"("companyId", "code");
CREATE INDEX IF NOT EXISTS "accounts_companyId_type_idx" ON "accounts"("companyId", "type");
CREATE INDEX IF NOT EXISTS "accounts_companyId_parentId_idx" ON "accounts"("companyId", "parentId");
CREATE INDEX IF NOT EXISTS "accounts_companyId_isActive_idx" ON "accounts"("companyId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_companyId_entryNumber_key" ON "journal_entries"("companyId", "entryNumber");
CREATE INDEX IF NOT EXISTS "journal_entries_companyId_date_idx" ON "journal_entries"("companyId", "date");
CREATE INDEX IF NOT EXISTS "journal_entries_companyId_status_idx" ON "journal_entries"("companyId", "status");
CREATE INDEX IF NOT EXISTS "journal_entries_companyId_sourceType_sourceId_idx" ON "journal_entries"("companyId", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "journal_lines_entryId_idx" ON "journal_lines"("entryId");
CREATE INDEX IF NOT EXISTS "journal_lines_accountId_idx" ON "journal_lines"("accountId");

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_companyId_year_month_key" ON "fiscal_periods"("companyId", "year", "month");
CREATE INDEX IF NOT EXISTS "fiscal_periods_companyId_status_idx" ON "fiscal_periods"("companyId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "accounting_settings_companyId_key" ON "accounting_settings"("companyId");

-- Foreign key constraints
DO $$ BEGIN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
