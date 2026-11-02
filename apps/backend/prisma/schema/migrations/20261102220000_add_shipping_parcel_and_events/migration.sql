-- AlterTable: Add Standalone parcel and shipping attributes to shipments
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "recipientPhone2" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "senderPhone" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "senderAddress" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(10,3);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "pieces" INTEGER DEFAULT 1;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "codAmount" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "declaredValue" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "contentDescription" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "isFragile" BOOLEAN DEFAULT false;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "allowOpenPackage" BOOLEAN DEFAULT true;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "clientRateCardId" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "failureReasonCode" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'SHIPMENT';

-- CreateIndexes on shipments
CREATE INDEX IF NOT EXISTS "shipments_companyId_createdAt_idx" ON "shipments"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "shipments_companyId_status_createdAt_idx" ON "shipments"("companyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");
CREATE INDEX IF NOT EXISTS "shipments_companyId_merchantId_createdAt_idx" ON "shipments"("companyId", "merchantId", "createdAt");

-- CreateTable: shipment_events
CREATE TABLE IF NOT EXISTS "shipment_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reasonCode" TEXT,
    "notes" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "branchId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shipment_events_companyId_shipmentId_createdAt_idx" ON "shipment_events"("companyId", "shipmentId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipment_events_shipmentId_fkey'
    ) THEN
        ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: client_rate_cards
CREATE TABLE IF NOT EXISTS "client_rate_cards" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "governorateCode" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "baseWeightKg" DECIMAL(10,3) NOT NULL DEFAULT 1.0,
    "extraKgPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "codFeeFixed" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "codFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "returnFee" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "minWeight" DECIMAL(10,3),
    "maxWeight" DECIMAL(10,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_rate_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_rate_cards_companyId_merchantId_name_key" ON "client_rate_cards"("companyId", "merchantId", "name");
CREATE INDEX IF NOT EXISTS "client_rate_cards_companyId_merchantId_isActive_idx" ON "client_rate_cards"("companyId", "merchantId", "isActive");

-- CreateTable: shipping_policy_settings
CREATE TABLE IF NOT EXISTS "shipping_policy_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "operatingModel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "codSettlementMode" TEXT NOT NULL DEFAULT 'STATEMENT_WITH_REMITTANCE',
    "intakeMode" TEXT NOT NULL DEFAULT 'MIXED',
    "pricingBasis" TEXT NOT NULL DEFAULT 'ZONE_WEIGHT',
    "codFeeType" TEXT NOT NULL DEFAULT 'FIXED',
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 3,
    "attemptIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "afterAttemptsAction" TEXT NOT NULL DEFAULT 'REVIEW',
    "proofOfDelivery" TEXT NOT NULL DEFAULT 'OTP,PIN',
    "requirePinOnShareLink" BOOLEAN NOT NULL DEFAULT true,
    "publicTrackingMode" TEXT NOT NULL DEFAULT 'WAYBILL',
    "publicTrackingMask" BOOLEAN NOT NULL DEFAULT true,
    "clientPortalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "courierPortalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "offlineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxWeightKg" DECIMAL(10,3),
    "maxCodAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "invoiceVatPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_policy_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipping_policy_settings_companyId_key" ON "shipping_policy_settings"("companyId");
