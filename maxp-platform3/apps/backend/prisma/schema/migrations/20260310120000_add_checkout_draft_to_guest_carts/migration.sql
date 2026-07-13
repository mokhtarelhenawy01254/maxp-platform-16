-- Add checkout draft fields to guest_carts
ALTER TABLE "guest_carts"
  ADD COLUMN IF NOT EXISTS "checkoutData" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutStartedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "checkoutUpdatedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "guest_carts_checkoutStartedAt_idx"
  ON "guest_carts"("checkoutStartedAt");

CREATE INDEX IF NOT EXISTS "guest_carts_checkoutUpdatedAt_idx"
  ON "guest_carts"("checkoutUpdatedAt");
