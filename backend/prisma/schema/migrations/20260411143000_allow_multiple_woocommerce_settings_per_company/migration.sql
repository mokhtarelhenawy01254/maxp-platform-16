DROP INDEX IF EXISTS "woocommerce_settings_companyId_key";

CREATE INDEX IF NOT EXISTS "woocommerce_settings_companyId_idx"
ON "woocommerce_settings"("companyId");
