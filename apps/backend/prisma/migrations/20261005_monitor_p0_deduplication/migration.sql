-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛡️ Migration: 20261005_monitor_p0_deduplication
-- P0 Fixes:
-- 1. Deduplicate monitor_activity_logs and prepare for @@unique([companyId, employeeId, intervalStart])
-- 2. Add deviceId column to monitor_activity_logs
-- 3. Add createdById, updatedById, changeReason to hr_attendances
-- 4. Clamp inflated monitor_daily_summaries and remove non-canonical duplicate summaries
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add deviceId column to monitor_activity_logs if missing
ALTER TABLE "public"."monitor_activity_logs" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;

-- 2. Remove duplicate activity logs, keeping the highest activeSeconds/latest row
DELETE FROM "public"."monitor_activity_logs" a
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "companyId", "employeeId", "intervalStart"
           ORDER BY "activeSeconds" DESC, "createdAt" DESC, id ASC
         ) as rnum
  FROM "public"."monitor_activity_logs"
) ranked
WHERE a.id = ranked.id AND ranked.rnum > 1;

-- 3. Add audit columns to hr_attendances
ALTER TABLE "public"."hr_attendances" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "public"."hr_attendances" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "public"."hr_attendances" ADD COLUMN IF NOT EXISTS "changeReason" TEXT;

-- 4. Clamp impossible totalActiveSeconds and totalIdleSeconds in monitor_daily_summaries (max 86,400s per day)
UPDATE "public"."monitor_daily_summaries"
SET "totalActiveSeconds" = LEAST("totalActiveSeconds", 86400),
    "totalIdleSeconds" = LEAST("totalIdleSeconds", 86400)
WHERE "totalActiveSeconds" > 86400 OR "totalIdleSeconds" > 86400;

-- 5. Clamp active seconds when employee has clocked out
UPDATE "public"."monitor_daily_summaries"
SET "totalActiveSeconds" = LEAST("totalActiveSeconds", "totalClockSeconds" + 300)
WHERE "clockOutTime" IS NOT NULL
  AND "totalClockSeconds" > 0
  AND "totalActiveSeconds" > ("totalClockSeconds" + 300);

-- 6. Remove non-canonical duplicate daily summaries where both employee.id and employee.userId exist for same day
DELETE FROM "public"."monitor_daily_summaries" m
USING "public"."hr_employees" e
WHERE m."companyId" = e."companyId"
  AND m."employeeId" = e."userId"
  AND EXISTS (
    SELECT 1 FROM "public"."monitor_daily_summaries" c
    WHERE c."companyId" = m."companyId"
      AND c."employeeId" = e.id
      AND c.date = m.date
  );
