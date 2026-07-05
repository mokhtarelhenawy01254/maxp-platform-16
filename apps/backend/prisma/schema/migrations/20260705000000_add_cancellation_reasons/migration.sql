-- Create cancellation reason categories table
CREATE TABLE IF NOT EXISTS "cancellation_reason_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_reason_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cancellation_reason_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cancellation_reason_categories_companyId_idx" ON "cancellation_reason_categories"("companyId");

-- Create cancellation reasons table
CREATE TABLE IF NOT EXISTS "cancellation_reasons" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_reasons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cancellation_reasons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cancellation_reason_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "cancellation_reasons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cancellation_reasons_categoryId_idx" ON "cancellation_reasons"("categoryId");
CREATE INDEX IF NOT EXISTS "cancellation_reasons_companyId_idx" ON "cancellation_reasons"("companyId");
