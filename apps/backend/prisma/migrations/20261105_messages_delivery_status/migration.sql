-- 2026-11-05 — delivery status for outbound Facebook messages (task f508775c)
--
-- Both columns are NULLABLE with NO default, on purpose:
--   * `messages` holds ~4.77M rows / 7.3 GB in production. A DEFAULT 'PENDING' would make every
--     historical outgoing message read as "pending", and the inbox renders deliveryStatus='PENDING'
--     as a spinner — i.e. the whole message history would look unsent.
--   * New rows get 'PENDING' from the application code (messagingController / enhancedOrderService),
--     which already passes deliveryStatus explicitly on create.
-- ADD COLUMN without a default is metadata-only in PostgreSQL 11+ (no table rewrite, no long lock).
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deliveryStatus" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "failureReason" text;

-- The (deliveryStatus, createdAt) index is deliberately NOT created here.
-- On a 7.3 GB table it must be built with CREATE INDEX CONCURRENTLY outside a transaction,
-- and nothing queries by deliveryStatus yet. Create it later, when a query needs it:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "messages_deliveryStatus_createdAt_idx"
--     ON "messages" ("deliveryStatus", "createdAt");
