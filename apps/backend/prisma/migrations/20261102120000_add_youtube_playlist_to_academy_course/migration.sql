-- AlterTable
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "youtubePlaylistId" TEXT;
ALTER TABLE "academy_courses" ADD COLUMN IF NOT EXISTS "youtubeSourceType" TEXT;
