DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_payouts_status') THEN
    CREATE TYPE "merchant_payouts_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_payouts_paymentMethod') THEN
    CREATE TYPE "merchant_payouts_paymentMethod" AS ENUM ('TRANSFERS', 'WALLET', 'CASH');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "merchant_payouts" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" "merchant_payouts_status" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" "merchant_payouts_paymentMethod" NOT NULL,
  "paymentDetails" TEXT,
  "transactionId" TEXT,
  "externalReference" TEXT,
  "processedAt" TIMESTAMP(3),
  "processedBy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_payouts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchant_payouts_merchantId_fkey'
  ) THEN
    ALTER TABLE "merchant_payouts"
      ADD CONSTRAINT "merchant_payouts_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "merchant_payouts_merchantId_idx" ON "merchant_payouts"("merchantId");
CREATE INDEX IF NOT EXISTS "merchant_payouts_paymentMethod_idx" ON "merchant_payouts"("paymentMethod");
CREATE INDEX IF NOT EXISTS "merchant_payouts_status_idx" ON "merchant_payouts"("status");

ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "merchantPayoutId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_merchantPayoutId_fkey'
  ) THEN
    ALTER TABLE "commissions"
      ADD CONSTRAINT "commissions_merchantPayoutId_fkey"
      FOREIGN KEY ("merchantPayoutId") REFERENCES "merchant_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "commissions_merchantPayoutId_idx" ON "commissions"("merchantPayoutId");
