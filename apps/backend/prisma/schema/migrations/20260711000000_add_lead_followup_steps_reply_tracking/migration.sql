-- Add multi-step support, reply tracking, and business hours to lead follow-up

ALTER TABLE "lead_follow_up_settings"
    ADD COLUMN IF NOT EXISTS "steps" TEXT,
    ADD COLUMN IF NOT EXISTS "businessHourStart" INTEGER,
    ADD COLUMN IF NOT EXISTS "businessHourEnd" INTEGER,
    ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';

ALTER TABLE "lead_follow_up_enrollments"
    ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 0;
