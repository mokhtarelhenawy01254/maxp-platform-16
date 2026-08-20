ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "whatsapp_lid_mappings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lidJid" TEXT NOT NULL,
    "phoneJid" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'HISTORY_SYNC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_lid_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_lid_mappings_sessionId_lidJid_key" ON "whatsapp_lid_mappings"("sessionId", "lidJid");
CREATE INDEX IF NOT EXISTS "whatsapp_lid_mappings_sessionId_phoneJid_idx" ON "whatsapp_lid_mappings"("sessionId", "phoneJid");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_isHidden_idx" ON "whatsapp_messages"("isHidden");

ALTER TABLE "whatsapp_lid_mappings"
    ADD CONSTRAINT "whatsapp_lid_mappings_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
