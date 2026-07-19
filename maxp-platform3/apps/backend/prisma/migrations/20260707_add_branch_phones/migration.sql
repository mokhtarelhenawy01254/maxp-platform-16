-- AlterTable: add multiple phone numbers to booking branches
ALTER TABLE "booking_branches" ADD COLUMN IF NOT EXISTS "phones" JSONB;
