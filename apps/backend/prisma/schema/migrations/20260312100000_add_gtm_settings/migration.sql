-- Add Google Tag Manager settings to storefront_settings
ALTER TABLE "storefront_settings"
  ADD COLUMN IF NOT EXISTS "gtmEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT,
  ADD COLUMN IF NOT EXISTS "gtmDataLayerEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "gtmTrackPageView" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "gtmSuppressPixels" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "storefront_settings_gtmEnabled_idx" ON "storefront_settings"("gtmEnabled");
