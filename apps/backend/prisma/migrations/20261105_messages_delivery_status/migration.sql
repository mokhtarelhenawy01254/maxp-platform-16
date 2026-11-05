ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deliveryStatus" text DEFAULT 'PENDING';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "failureReason" text;
CREATE INDEX IF NOT EXISTS "messages_deliveryStatus_createdAt_idx"
  ON "messages" ("deliveryStatus", "createdAt");
