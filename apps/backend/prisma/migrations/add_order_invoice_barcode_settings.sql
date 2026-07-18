ALTER TABLE "order_invoice_settings"
  ADD COLUMN IF NOT EXISTS "showBarcodeOrderCode" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showBarcodeShippingCode" BOOLEAN NOT NULL DEFAULT true;
