-- Add TikTok Pixel + Events API settings to storefront_settings
ALTER TABLE "storefront_settings"
  ADD COLUMN IF NOT EXISTS "tiktokPixelEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tiktokPixelId" TEXT,
  ADD COLUMN IF NOT EXISTS "tiktokTrackPageView" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackViewContent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackAddToCart" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackInitiateCheckout" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackPurchase" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackSearch" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tiktokTrackAddToWishlist" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tiktokEventsApiEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tiktokEventsApiToken" TEXT,
  ADD COLUMN IF NOT EXISTS "tiktokEventsApiTestCode" TEXT;

CREATE INDEX IF NOT EXISTS "storefront_settings_tiktokPixelEnabled_idx" ON "storefront_settings"("tiktokPixelEnabled");
CREATE INDEX IF NOT EXISTS "storefront_settings_tiktokEventsApiEnabled_idx" ON "storefront_settings"("tiktokEventsApiEnabled");
