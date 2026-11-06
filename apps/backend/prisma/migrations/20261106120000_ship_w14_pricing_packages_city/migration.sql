-- SHIP-W14: City-level pricing + monthly volume packages + client coverage profile
-- 1. Create client_pricing_packages table
CREATE TABLE IF NOT EXISTS "client_pricing_packages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyVolumeFrom" INTEGER NOT NULL DEFAULT 0,
    "monthlyVolumeTo" INTEGER,
    "pricingMode" TEXT NOT NULL DEFAULT 'PER_SHIPMENT',
    "flatMonthlyPrice" DECIMAL(10,2),
    "perShipmentPrice" DECIMAL(10,2),
    "coverageMode" TEXT NOT NULL DEFAULT 'BOTH',
    "governorates" TEXT,
    "cities" TEXT,
    "overagePricePerShipment" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_pricing_packages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "client_pricing_packages_companyId_merchantId_isActive_idx" ON "client_pricing_packages"("companyId", "merchantId", "isActive");
CREATE INDEX IF NOT EXISTS "client_pricing_packages_companyId_isActive_idx" ON "client_pricing_packages"("companyId", "isActive");

-- 2. Create client_profiles table
CREATE TABLE IF NOT EXISTS "client_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "expectedMonthlyOrders" INTEGER,
    "coverageMode" TEXT DEFAULT 'BOTH',
    "preferredCities" TEXT,
    "avgWeightKg" DECIMAL(10,3),
    "codSharePct" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_profiles_merchantId_key" ON "client_profiles"("merchantId");
CREATE INDEX IF NOT EXISTS "client_profiles_companyId_idx" ON "client_profiles"("companyId");
CREATE INDEX IF NOT EXISTS "client_profiles_merchantId_idx" ON "client_profiles"("merchantId");

-- 3. Alter shipping_zones table: add cities
ALTER TABLE "shipping_zones" ADD COLUMN IF NOT EXISTS "cities" TEXT;

-- 4. Alter client_rate_cards table: add cityName & cities
ALTER TABLE "client_rate_cards" ADD COLUMN IF NOT EXISTS "cityName" TEXT;
ALTER TABLE "client_rate_cards" ADD COLUMN IF NOT EXISTS "cities" TEXT;

-- 5. Alter merchants table: add expectedMonthlyOrders, coverageMode, preferredCities, avgWeightKg, codSharePct
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "expectedMonthlyOrders" INTEGER;
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "coverageMode" TEXT DEFAULT 'BOTH';
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "preferredCities" TEXT;
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "avgWeightKg" DECIMAL(10,3);
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "codSharePct" DECIMAL(5,2);

-- 6. Alter shipments table: add pricingPackageId & priceSource (nullable only)
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "pricingPackageId" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "priceSource" TEXT;
