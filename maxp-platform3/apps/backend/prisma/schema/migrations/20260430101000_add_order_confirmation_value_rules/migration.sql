ALTER TABLE "order_confirmation_settings"
  ADD COLUMN IF NOT EXISTS "orderValueRules" TEXT;
