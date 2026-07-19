-- Add WhatsApp channel support to broadcast campaigns
ALTER TABLE "broadcast_campaigns" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'facebook';
ALTER TABLE "broadcast_campaigns" ADD COLUMN "waTemplateName" TEXT;
ALTER TABLE "broadcast_campaigns" ADD COLUMN "waLanguageCode" TEXT DEFAULT 'en';

-- Index for channel filtering
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_channel_idx" ON "broadcast_campaigns"("channel");
