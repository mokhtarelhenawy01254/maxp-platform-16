ALTER TABLE "shipping_companies"
  ADD COLUMN IF NOT EXISTS "providerKey" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "integrationMode" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "settings" TEXT;

CREATE INDEX IF NOT EXISTS "shipping_companies_providerKey_idx" ON "shipping_companies"("providerKey");
CREATE INDEX IF NOT EXISTS "shipping_companies_integrationMode_idx" ON "shipping_companies"("integrationMode");
