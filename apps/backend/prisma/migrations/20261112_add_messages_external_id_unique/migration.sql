-- Add partial unique index on messages(conversationId, externalMessageId) where externalMessageId IS NOT NULL
-- Prevents duplicate inbound message persistence at the database level while allowing rows without external IDs (system/legacy).
-- NOTE: For zero-downtime live deployment on large tables, create the index CONCURRENTLY outside a transaction before running prisma migrate deploy.

CREATE UNIQUE INDEX IF NOT EXISTS "messages_conversationId_externalMessageId_unique_idx"
  ON "messages" ("conversationId", "externalMessageId")
  WHERE "externalMessageId" IS NOT NULL;
