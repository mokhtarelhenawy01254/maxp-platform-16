-- Add PPU billing method field to marketplace apps
-- Values: PER_ORDER, PER_ITEM, PERCENTAGE

ALTER TABLE "marketplace_apps"
    ADD COLUMN IF NOT EXISTS "ppuBillingMethod" TEXT DEFAULT 'PER_ORDER';
