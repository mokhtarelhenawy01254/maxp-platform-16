ALTER TABLE "order_invoice_settings"
  ADD COLUMN IF NOT EXISTS "cancellationReasonOptions" TEXT;
