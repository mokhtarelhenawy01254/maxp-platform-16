-- AlterTable: Add business fields to competitors table
ALTER TABLE "competitors" ADD COLUMN "activity_type" TEXT;
ALTER TABLE "competitors" ADD COLUMN "location" TEXT;
ALTER TABLE "competitors" ADD COLUMN "target_market" TEXT;
ALTER TABLE "competitors" ADD COLUMN "founded_year" INTEGER;
ALTER TABLE "competitors" ADD COLUMN "employee_count" TEXT;
ALTER TABLE "competitors" ADD COLUMN "strengths" TEXT;
ALTER TABLE "competitors" ADD COLUMN "weaknesses" TEXT;
