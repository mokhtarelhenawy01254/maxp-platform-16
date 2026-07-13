-- Drop old flow and step tables (cascade removes FK references)
DROP TABLE IF EXISTS "lead_follow_up_steps" CASCADE;
DROP TABLE IF EXISTS "lead_follow_up_flows" CASCADE;

-- Create lead_follow_up_settings table
CREATE TABLE "lead_follow_up_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "delayHours" INTEGER NOT NULL DEFAULT 24,
    "message" TEXT NOT NULL DEFAULT '',
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_follow_up_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_follow_up_settings_companyId_key" ON "lead_follow_up_settings"("companyId");

ALTER TABLE "lead_follow_up_settings" ADD CONSTRAINT "lead_follow_up_settings_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Simplify lead_follow_up_enrollments: drop flowId FK constraint, flowId column, and currentStep column
ALTER TABLE "lead_follow_up_enrollments" DROP CONSTRAINT IF EXISTS "lead_follow_up_enrollments_flowId_fkey";
ALTER TABLE "lead_follow_up_enrollments" DROP COLUMN IF EXISTS "flowId";
ALTER TABLE "lead_follow_up_enrollments" DROP COLUMN IF EXISTS "currentStep";
