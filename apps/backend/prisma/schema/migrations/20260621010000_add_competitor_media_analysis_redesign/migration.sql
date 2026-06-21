-- Add new fields to competitors table
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "founderName" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "founderLinkedIn" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "geoLocation" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "monthlyPrice" DECIMAL(10, 2);
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "yearlyPrice" DECIMAL(10, 2);
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "pricingNotes" TEXT;
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "trafficSource" TEXT;

-- Add email and password fields to competitor_social_profiles
ALTER TABLE "competitor_social_profiles" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "competitor_social_profiles" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Create competitor_media_notes table
CREATE TABLE IF NOT EXISTS "competitor_media_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_media_notes_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_media_notes_competitorId_idx" ON "competitor_media_notes"("competitorId");
CREATE INDEX IF NOT EXISTS "competitor_media_notes_competitorId_createdAt_idx" ON "competitor_media_notes"("competitorId", "createdAt" DESC);

-- Create competitor_comparisons table
CREATE TABLE IF NOT EXISTS "competitor_comparisons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "competitorDescription" TEXT,
    "ourDescription" TEXT,
    "easiestToUse" TEXT,
    "stronger" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_comparisons_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_comparisons_competitorId_idx" ON "competitor_comparisons"("competitorId");

-- Create competitor_dev_ideas table
CREATE TABLE IF NOT EXISTS "competitor_dev_ideas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_dev_ideas_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_dev_ideas_competitorId_idx" ON "competitor_dev_ideas"("competitorId");

-- Create competitor_dev_idea_images table
CREATE TABLE IF NOT EXISTS "competitor_dev_idea_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ideaId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_dev_idea_images_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "competitor_dev_ideas"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_dev_idea_images_ideaId_idx" ON "competitor_dev_idea_images"("ideaId");

-- Create competitor_activity_images table
CREATE TABLE IF NOT EXISTS "competitor_activity_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_activity_images_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_activity_images_competitorId_idx" ON "competitor_activity_images"("competitorId");

-- Create competitor_feature_images table
CREATE TABLE IF NOT EXISTS "competitor_feature_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_feature_images_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competitor_feature_images_competitorId_idx" ON "competitor_feature_images"("competitorId");
