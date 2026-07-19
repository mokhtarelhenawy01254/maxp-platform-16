CREATE TABLE IF NOT EXISTS "customer_block_settings" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "blockCheckout" BOOLEAN NOT NULL DEFAULT true,
  "blockManualOrders" BOOLEAN NOT NULL DEFAULT true,
  "blockAffiliateManualOrders" BOOLEAN NOT NULL DEFAULT true,
  "blockAiOrderCreation" BOOLEAN NOT NULL DEFAULT true,
  "matchPhone" BOOLEAN NOT NULL DEFAULT true,
  "matchEmail" BOOLEAN NOT NULL DEFAULT true,
  "matchFacebook" BOOLEAN NOT NULL DEFAULT true,
  "matchWhatsapp" BOOLEAN NOT NULL DEFAULT true,
  "allowManagerOverride" BOOLEAN NOT NULL DEFAULT true,
  "defaultAction" TEXT NOT NULL DEFAULT 'BLOCK_ORDERS',
  "checkoutMessage" TEXT,
  "internalWarningMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_block_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_block_settings_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_block_settings_companyId_key"
  ON "customer_block_settings"("companyId");
CREATE INDEX IF NOT EXISTS "customer_block_settings_companyId_idx"
  ON "customer_block_settings"("companyId");

CREATE TABLE IF NOT EXISTS "customer_block_rules" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT,
  "phone" TEXT,
  "phoneNormalized" TEXT,
  "email" TEXT,
  "emailNormalized" TEXT,
  "facebookId" TEXT,
  "whatsappId" TEXT,
  "reasonCode" TEXT NOT NULL DEFAULT 'OTHER',
  "reasonNote" TEXT,
  "action" TEXT NOT NULL DEFAULT 'BLOCK_ORDERS',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdByName" TEXT,
  "liftedAt" TIMESTAMP(3),
  "liftedBy" TEXT,
  "liftedByName" TEXT,
  "liftedReason" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_block_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_block_rules_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "customer_block_rules_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_block_rules_companyId_idx"
  ON "customer_block_rules"("companyId");
CREATE INDEX IF NOT EXISTS "customer_block_rules_companyId_status_idx"
  ON "customer_block_rules"("companyId", "status");
CREATE INDEX IF NOT EXISTS "customer_block_rules_customerId_idx"
  ON "customer_block_rules"("customerId");
CREATE INDEX IF NOT EXISTS "customer_block_rules_phoneNormalized_idx"
  ON "customer_block_rules"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "customer_block_rules_emailNormalized_idx"
  ON "customer_block_rules"("emailNormalized");
CREATE INDEX IF NOT EXISTS "customer_block_rules_facebookId_idx"
  ON "customer_block_rules"("facebookId");
CREATE INDEX IF NOT EXISTS "customer_block_rules_whatsappId_idx"
  ON "customer_block_rules"("whatsappId");
CREATE INDEX IF NOT EXISTS "customer_block_rules_expiresAt_idx"
  ON "customer_block_rules"("expiresAt");
