ALTER TABLE "storefront_settings"
  ADD COLUMN IF NOT EXISTS "hideUtilityBar" BOOLEAN NOT NULL DEFAULT false;
