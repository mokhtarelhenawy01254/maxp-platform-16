ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "labels" TEXT;

-- Backfill empty array for existing rows
UPDATE "whatsapp_contacts" SET "labels" = '[]' WHERE "labels" IS NULL;
