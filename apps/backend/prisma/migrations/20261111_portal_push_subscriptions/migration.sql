ALTER TABLE "browser_push_subscriptions" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "browser_push_subscriptions" ADD COLUMN IF NOT EXISTS "actor_type" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "browser_push_subscriptions" ADD COLUMN IF NOT EXISTS "actor_id" TEXT;
ALTER TABLE "browser_push_subscriptions" ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'WEB_PUSH';
UPDATE "browser_push_subscriptions" SET "actor_id" = "user_id" WHERE "actor_id" IS NULL AND "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "browser_push_subscriptions_company_id_actor_type_actor_id_is_active_idx"
  ON "browser_push_subscriptions" ("company_id", "actor_type", "actor_id", "is_active");
