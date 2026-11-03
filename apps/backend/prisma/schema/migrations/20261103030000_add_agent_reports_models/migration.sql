-- CreateTable: agent_report_types
CREATE TABLE IF NOT EXISTS "agent_report_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_report_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agent_reports
CREATE TABLE IF NOT EXISTS "agent_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "periodLabel" TEXT,
    "summary" TEXT,
    "html" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_report_types_companyId_slug_key" ON "agent_report_types"("companyId", "slug");
CREATE INDEX IF NOT EXISTS "agent_report_types_companyId_sortOrder_idx" ON "agent_report_types"("companyId", "sortOrder");
CREATE INDEX IF NOT EXISTS "agent_report_types_companyId_isActive_idx" ON "agent_report_types"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_reports_companyId_slug_key" ON "agent_reports"("companyId", "slug");
CREATE INDEX IF NOT EXISTS "agent_reports_companyId_typeId_createdAt_idx" ON "agent_reports"("companyId", "typeId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_reports_companyId_status_idx" ON "agent_reports"("companyId", "status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'agent_reports_typeId_fkey'
    ) THEN
        ALTER TABLE "agent_reports"
        ADD CONSTRAINT "agent_reports_typeId_fkey"
        FOREIGN KEY ("typeId") REFERENCES "agent_report_types"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
