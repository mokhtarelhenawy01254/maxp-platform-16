-- AlterTable: conversations
-- Added isPinned column for unified inbox pinning support

ALTER TABLE "conversations" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
