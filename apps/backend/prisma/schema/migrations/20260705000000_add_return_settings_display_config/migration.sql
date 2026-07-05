-- Add reviewDisplayConfig JSON column to return_settings for per-company display customization
ALTER TABLE "return_settings" ADD COLUMN IF NOT EXISTS "reviewDisplayConfig" JSONB NOT NULL DEFAULT '{}';
