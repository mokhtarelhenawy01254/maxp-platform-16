-- CreateTable
CREATE TABLE IF NOT EXISTS "governorates" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "governorate_aliases" (
  "id" TEXT NOT NULL,
  "governorateId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "governorate_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shipping_zone_governorates" (
  "id" TEXT NOT NULL,
  "shippingZoneId" TEXT NOT NULL,
  "governorateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shipping_zone_governorates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "governorates_code_key" ON "governorates"("code");
CREATE INDEX IF NOT EXISTS "governorates_isActive_idx" ON "governorates"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "governorate_aliases_governorateId_normalizedAlias_key" ON "governorate_aliases"("governorateId", "normalizedAlias");
CREATE INDEX IF NOT EXISTS "governorate_aliases_normalizedAlias_idx" ON "governorate_aliases"("normalizedAlias");
CREATE UNIQUE INDEX IF NOT EXISTS "shipping_zone_governorates_shippingZoneId_governorateId_key" ON "shipping_zone_governorates"("shippingZoneId", "governorateId");
CREATE INDEX IF NOT EXISTS "shipping_zone_governorates_governorateId_idx" ON "shipping_zone_governorates"("governorateId");
CREATE INDEX IF NOT EXISTS "shipping_zone_governorates_shippingZoneId_idx" ON "shipping_zone_governorates"("shippingZoneId");

-- AddForeignKey
ALTER TABLE "governorate_aliases"
  ADD CONSTRAINT "governorate_aliases_governorateId_fkey"
  FOREIGN KEY ("governorateId") REFERENCES "governorates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipping_zone_governorates"
  ADD CONSTRAINT "shipping_zone_governorates_shippingZoneId_fkey"
  FOREIGN KEY ("shippingZoneId") REFERENCES "shipping_zones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipping_zone_governorates"
  ADD CONSTRAINT "shipping_zone_governorates_governorateId_fkey"
  FOREIGN KEY ("governorateId") REFERENCES "governorates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
