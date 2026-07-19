-- Add a non-destructive fulfillment layer for affiliate/dropshipping orders.
-- Existing orders, merchants, inventory, and shipping companies remain untouched.

ALTER TABLE "Merchant"
  ADD COLUMN IF NOT EXISTS "fulfillmentMode" TEXT NOT NULL DEFAULT 'MERCHANT',
  ADD COLUMN IF NOT EXISTS "defaultWarehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultShippingCompanyId" TEXT;

ALTER TABLE "merchant_orders"
  ADD COLUMN IF NOT EXISTS "fulfillmentSource" TEXT NOT NULL DEFAULT 'MERCHANT',
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCompanyId" TEXT;

CREATE TABLE IF NOT EXISTS "shipments" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "orderId" TEXT,
  "merchantOrderId" TEXT,
  "merchantId" TEXT,
  "fulfillmentSource" TEXT NOT NULL DEFAULT 'MERCHANT',
  "warehouseId" TEXT,
  "shippingCompanyId" TEXT,
  "carrierType" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "trackingNumber" TEXT,
  "externalShipmentId" TEXT,
  "labelUrl" TEXT,
  "serviceLevel" TEXT,
  "cost" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "destinationGovernorate" TEXT,
  "destinationCity" TEXT,
  "destinationAddress" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_merchantOrderId_key"
ON "shipments"("merchantOrderId");

CREATE INDEX IF NOT EXISTS "Merchant_fulfillmentMode_idx" ON "Merchant"("fulfillmentMode");
CREATE INDEX IF NOT EXISTS "Merchant_defaultWarehouseId_idx" ON "Merchant"("defaultWarehouseId");
CREATE INDEX IF NOT EXISTS "Merchant_defaultShippingCompanyId_idx" ON "Merchant"("defaultShippingCompanyId");

CREATE INDEX IF NOT EXISTS "merchant_orders_fulfillmentSource_idx" ON "merchant_orders"("fulfillmentSource");
CREATE INDEX IF NOT EXISTS "merchant_orders_warehouseId_idx" ON "merchant_orders"("warehouseId");
CREATE INDEX IF NOT EXISTS "merchant_orders_shippingCompanyId_idx" ON "merchant_orders"("shippingCompanyId");

CREATE INDEX IF NOT EXISTS "shipments_companyId_idx" ON "shipments"("companyId");
CREATE INDEX IF NOT EXISTS "shipments_orderId_idx" ON "shipments"("orderId");
CREATE INDEX IF NOT EXISTS "shipments_merchantId_idx" ON "shipments"("merchantId");
CREATE INDEX IF NOT EXISTS "shipments_fulfillmentSource_idx" ON "shipments"("fulfillmentSource");
CREATE INDEX IF NOT EXISTS "shipments_warehouseId_idx" ON "shipments"("warehouseId");
CREATE INDEX IF NOT EXISTS "shipments_shippingCompanyId_idx" ON "shipments"("shippingCompanyId");
CREATE INDEX IF NOT EXISTS "shipments_status_idx" ON "shipments"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_companyId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_orderId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_merchantOrderId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_merchantOrderId_fkey"
      FOREIGN KEY ("merchantOrderId") REFERENCES "merchant_orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_merchantId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_warehouseId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_shippingCompanyId_fkey'
  ) THEN
    ALTER TABLE "shipments"
      ADD CONSTRAINT "shipments_shippingCompanyId_fkey"
      FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
