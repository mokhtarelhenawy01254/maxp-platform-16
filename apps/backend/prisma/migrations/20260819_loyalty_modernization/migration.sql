-- Migration: 20260819_loyalty_modernization
-- Loyalty / Rewards modernization ΓÇö Part 1 (DB & Schema layer)
-- Adds wallet transaction release lifecycle, customer loyalty pending/release fields,
-- coupon loyalty stacking flag, company loyalty settings, and the loyalty_activities table.

-- ---------------------------------------------------------------------------
-- 1. wallet_transactions ΓÇö release lifecycle
-- ---------------------------------------------------------------------------
ALTER TABLE "wallet_transactions"
  ADD COLUMN IF NOT EXISTS "status"        TEXT   NOT NULL DEFAULT 'RELEASED';
ALTER TABLE "wallet_transactions"
  ADD COLUMN IF NOT EXISTS "releasedAt"    TIMESTAMP(3);
ALTER TABLE "wallet_transactions"
  ADD COLUMN IF NOT EXISTS "cancelledAt"   TIMESTAMP(3);
ALTER TABLE "wallet_transactions"
  ADD COLUMN IF NOT EXISTS "referenceId"   TEXT;

CREATE INDEX IF NOT EXISTS "wallet_transactions_status_idx"        ON "wallet_transactions" ("status");
CREATE INDEX IF NOT EXISTS "wallet_transactions_referenceId_idx"   ON "wallet_transactions" ("referenceId");

-- ---------------------------------------------------------------------------
-- 2. customer_loyalty_records ΓÇö pending/release + check-in gamification
-- ---------------------------------------------------------------------------
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "pendingPoints"    DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "pendingCashback"  DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "releasedAt"       TIMESTAMP(3);
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "cancelledAt"      TIMESTAMP(3);
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "lastCheckInAt"    TIMESTAMP(3);
ALTER TABLE "customer_loyalty_records"
  ADD COLUMN IF NOT EXISTS "checkInStreak"    INTEGER      NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "customer_loyalty_records_releasedAt_idx"     ON "customer_loyalty_records" ("releasedAt");
CREATE INDEX IF NOT EXISTS "customer_loyalty_records_cancelledAt_idx"    ON "customer_loyalty_records" ("cancelledAt");
CREATE INDEX IF NOT EXISTS "customer_loyalty_records_lastCheckInAt_idx"  ON "customer_loyalty_records" ("lastCheckInAt");

-- ---------------------------------------------------------------------------
-- 3. coupons ΓÇö loyalty stacking flag
-- ---------------------------------------------------------------------------
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "allowWithLoyalty" BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- 4. companies ΓÇö loyalty modernization settings
-- ---------------------------------------------------------------------------
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "maxDiscountCap"           DOUBLE PRECISION;
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "cashbackReturnWindowDays" INTEGER;
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "dynamicCashbackEnabled"   BOOLEAN         NOT NULL DEFAULT FALSE;

-- Default values applied via app-level seeding; SQL default set below for new rows.
ALTER TABLE "companies" ALTER COLUMN "maxDiscountCap"           SET DEFAULT 0.25;
ALTER TABLE "companies" ALTER COLUMN "cashbackReturnWindowDays" SET DEFAULT 14;

-- ---------------------------------------------------------------------------
-- 5. loyalty_activities ΓÇö new table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "loyalty_activities" (
  "id"          TEXT        NOT NULL,
  "companyId"   TEXT        NOT NULL,
  "customerId"  TEXT        NOT NULL,
  "type"        TEXT        NOT NULL,
  "points"      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "status"      TEXT        NOT NULL DEFAULT 'PENDING',
  "referenceId" TEXT,
  "approvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "loyalty_activities_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_activities_companyId_fkey"
    FOREIGN KEY ("companyId")  REFERENCES "companies"  ("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_activities_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "loyalty_activities_companyId_idx"   ON "loyalty_activities" ("companyId");
CREATE INDEX IF NOT EXISTS "loyalty_activities_customerId_idx"  ON "loyalty_activities" ("customerId");
CREATE INDEX IF NOT EXISTS "loyalty_activities_type_idx"       ON "loyalty_activities" ("type");
CREATE INDEX IF NOT EXISTS "loyalty_activities_status_idx"     ON "loyalty_activities" ("status");
