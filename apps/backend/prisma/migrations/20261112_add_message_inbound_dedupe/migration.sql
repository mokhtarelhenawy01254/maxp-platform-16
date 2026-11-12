-- CreateTable: message_inbound_dedupe
CREATE TABLE IF NOT EXISTS "message_inbound_dedupe" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_inbound_dedupe_pkey" PRIMARY KEY ("id")
);

-- AlterTable: messages add channel and externalMessageId
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT;

-- CreateIndex: message_inbound_dedupe compound unique key
CREATE UNIQUE INDEX IF NOT EXISTS "message_inbound_dedupe_companyId_channel_externalMessageId_key"
    ON "message_inbound_dedupe"("companyId", "channel", "externalMessageId");

-- CreateIndex: message_inbound_dedupe conversation index
CREATE INDEX IF NOT EXISTS "message_inbound_dedupe_conversationId_idx"
    ON "message_inbound_dedupe"("conversationId");

-- CreateIndex: message_inbound_dedupe firstSeenAt index
CREATE INDEX IF NOT EXISTS "message_inbound_dedupe_firstSeenAt_idx"
    ON "message_inbound_dedupe"("firstSeenAt");

-- CreateIndex: messages conversation and externalMessageId index (regular, non-unique)
CREATE INDEX IF NOT EXISTS "messages_conversationId_externalMessageId_idx"
    ON "messages"("conversationId", "externalMessageId");
