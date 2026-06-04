CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_company_id_user_id_key"
ON "notification_preferences"("company_id", "user_id");

CREATE INDEX IF NOT EXISTS "notification_preferences_company_id_idx"
ON "notification_preferences"("company_id");

CREATE INDEX IF NOT EXISTS "notification_preferences_user_id_idx"
ON "notification_preferences"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_preferences_company_id_fkey'
    ) THEN
        ALTER TABLE "notification_preferences"
        ADD CONSTRAINT "notification_preferences_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE "notification_preferences"
        ADD CONSTRAINT "notification_preferences_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "browser_push_subscriptions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "subscription" JSONB NOT NULL,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "last_error_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "browser_push_subscriptions_endpoint_key"
ON "browser_push_subscriptions"("endpoint");

CREATE INDEX IF NOT EXISTS "browser_push_subscriptions_company_id_is_active_idx"
ON "browser_push_subscriptions"("company_id", "is_active");

CREATE INDEX IF NOT EXISTS "browser_push_subscriptions_company_id_user_id_is_active_idx"
ON "browser_push_subscriptions"("company_id", "user_id", "is_active");

CREATE INDEX IF NOT EXISTS "browser_push_subscriptions_user_id_is_active_idx"
ON "browser_push_subscriptions"("user_id", "is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'browser_push_subscriptions_company_id_fkey'
    ) THEN
        ALTER TABLE "browser_push_subscriptions"
        ADD CONSTRAINT "browser_push_subscriptions_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'browser_push_subscriptions_user_id_fkey'
    ) THEN
        ALTER TABLE "browser_push_subscriptions"
        ADD CONSTRAINT "browser_push_subscriptions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
