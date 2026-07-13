-- Add status field to competitors table
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS "competitors_company_id_status_idx" ON "competitors" ("companyId", "status");
