-- Add billing-hold columns to orders
-- Orders are hidden from the orders list while pending wallet top-up,
-- then auto-released once the pending PPU charge is collected.

ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "billingHoldAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "billingHoldAmount" DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS "orders_billingHoldAt_idx" ON "orders"("billingHoldAt");
