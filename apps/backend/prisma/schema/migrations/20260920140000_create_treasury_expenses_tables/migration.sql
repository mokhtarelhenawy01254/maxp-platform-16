-- CreateTable treasury_accounts
CREATE TABLE IF NOT EXISTS "treasury_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CASH',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "holderName" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable capital_transactions
CREATE TABLE IF NOT EXISTS "capital_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "treasuryAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CAPITAL_INJECTION',
    "investorName" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capital_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable expense_categories
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OPEX',
    "color" TEXT DEFAULT '#3b82f6',
    "icon" TEXT DEFAULT 'Tag',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable company_expenses
CREATE TABLE IF NOT EXISTS "company_expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable treasury_transactions
CREATE TABLE IF NOT EXISTS "treasury_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "treasuryAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "treasury_accounts_companyId_idx" ON "treasury_accounts"("companyId");
CREATE INDEX IF NOT EXISTS "treasury_accounts_type_idx" ON "treasury_accounts"("type");
CREATE INDEX IF NOT EXISTS "treasury_accounts_isActive_idx" ON "treasury_accounts"("isActive");

CREATE INDEX IF NOT EXISTS "capital_transactions_companyId_idx" ON "capital_transactions"("companyId");
CREATE INDEX IF NOT EXISTS "capital_transactions_treasuryAccountId_idx" ON "capital_transactions"("treasuryAccountId");
CREATE INDEX IF NOT EXISTS "capital_transactions_date_idx" ON "capital_transactions"("date");

CREATE INDEX IF NOT EXISTS "expense_categories_companyId_idx" ON "expense_categories"("companyId");

CREATE INDEX IF NOT EXISTS "company_expenses_companyId_idx" ON "company_expenses"("companyId");
CREATE INDEX IF NOT EXISTS "company_expenses_treasuryAccountId_idx" ON "company_expenses"("treasuryAccountId");
CREATE INDEX IF NOT EXISTS "company_expenses_categoryId_idx" ON "company_expenses"("categoryId");
CREATE INDEX IF NOT EXISTS "company_expenses_paymentDate_idx" ON "company_expenses"("paymentDate");
CREATE INDEX IF NOT EXISTS "company_expenses_type_idx" ON "company_expenses"("type");

CREATE INDEX IF NOT EXISTS "treasury_transactions_companyId_idx" ON "treasury_transactions"("companyId");
CREATE INDEX IF NOT EXISTS "treasury_transactions_treasuryAccountId_idx" ON "treasury_transactions"("treasuryAccountId");
CREATE INDEX IF NOT EXISTS "treasury_transactions_date_idx" ON "treasury_transactions"("date");

-- AddForeignKeys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treasury_accounts_companyId_fkey') THEN
        ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capital_transactions_companyId_fkey') THEN
        ALTER TABLE "capital_transactions" ADD CONSTRAINT "capital_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capital_transactions_treasuryAccountId_fkey') THEN
        ALTER TABLE "capital_transactions" ADD CONSTRAINT "capital_transactions_treasuryAccountId_fkey" FOREIGN KEY ("treasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_companyId_fkey') THEN
        ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_expenses_companyId_fkey') THEN
        ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_expenses_treasuryAccountId_fkey') THEN
        ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_treasuryAccountId_fkey" FOREIGN KEY ("treasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_expenses_categoryId_fkey') THEN
        ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treasury_transactions_companyId_fkey') THEN
        ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treasury_transactions_treasuryAccountId_fkey') THEN
        ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_treasuryAccountId_fkey" FOREIGN KEY ("treasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
