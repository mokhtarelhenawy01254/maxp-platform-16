-- 1. Create a full reversible backup of platform_subscriptions before dropping legacy plan column
CREATE TABLE IF NOT EXISTS "public"."platform_subscriptions_backup_20261001" AS
SELECT * FROM "public"."platform_subscriptions";

-- Convert backup table's plan column to TEXT so the legacy enum type can be cleanly dropped while preserving all values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'platform_subscriptions_backup_20261001'
      AND column_name = 'plan'
  ) THEN
    ALTER TABLE "public"."platform_subscriptions_backup_20261001"
      ALTER COLUMN "plan" TYPE TEXT USING "plan"::text;
  END IF;
END $$;

-- 2. Drop empty legacy enterprise plan tables
DROP TABLE IF EXISTS "public"."enterprise_plans" CASCADE;
DROP TABLE IF EXISTS "public"."platform_enterprise_plans" CASCADE;

-- 3. Drop legacy plan column from platform_subscriptions (preserving all subscription records & billing fields)
ALTER TABLE "public"."platform_subscriptions" DROP COLUMN IF EXISTS "plan";

-- 4. Drop legacy plan enums if no longer referenced
DROP TYPE IF EXISTS "public"."SubscriptionsPlanType";
DROP TYPE IF EXISTS "public"."subscriptions_planType";
DROP TYPE IF EXISTS "public"."companies_plan";
