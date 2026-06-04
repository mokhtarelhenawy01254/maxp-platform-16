-- Allow one order to be split across multiple merchants while keeping
-- at most one MerchantOrder per (merchant, order) pair.

DROP INDEX IF EXISTS "merchant_orders_orderId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_orders_merchantId_orderId_key"
ON "merchant_orders"("merchantId", "orderId");
