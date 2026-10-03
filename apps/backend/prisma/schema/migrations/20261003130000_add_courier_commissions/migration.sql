-- Courier fleet commission ledger: payable commission per settled delivery (DUE → PAID)
CREATE TABLE IF NOT EXISTS "courier_commissions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "deliveryRunId" TEXT,
    "shipmentId" TEXT,
    "orderId" TEXT,
    "commissionType" TEXT NOT NULL DEFAULT 'FIXED_PER_ORDER',
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_commissions_companyId_idx" ON "courier_commissions"("companyId");
CREATE INDEX IF NOT EXISTS "courier_commissions_courierId_status_idx" ON "courier_commissions"("courierId", "status");
CREATE INDEX IF NOT EXISTS "courier_commissions_deliveryRunId_idx" ON "courier_commissions"("deliveryRunId");
