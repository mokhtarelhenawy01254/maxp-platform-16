-- Add cancellation reason presets to order invoice settings
ALTER TABLE "order_invoice_settings"
  ADD COLUMN IF NOT EXISTS "cancellationReasonOptions" TEXT;
