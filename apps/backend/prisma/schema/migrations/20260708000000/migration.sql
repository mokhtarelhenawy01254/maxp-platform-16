-- Track who created appointments (ai_service / user)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "createdByType" TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "createdByName" TEXT;
