ALTER TABLE "order_invoice_settings"
  ADD COLUMN IF NOT EXISTS "minimumOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "minimumOrderAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "minimumOrderMessage" TEXT;
