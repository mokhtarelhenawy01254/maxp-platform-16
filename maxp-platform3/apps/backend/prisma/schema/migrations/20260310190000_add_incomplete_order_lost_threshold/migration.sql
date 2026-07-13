-- Add incomplete order lost threshold to order_invoice_settings
ALTER TABLE "order_invoice_settings"
  ADD COLUMN IF NOT EXISTS "incompleteOrderLostAfterHours" INTEGER NOT NULL DEFAULT 24;
