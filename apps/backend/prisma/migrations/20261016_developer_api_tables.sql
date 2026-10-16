-- Merchant Developer Hub — API/MCP credentials + usage audit
-- Applied automatically by `prisma db push` on backend start; kept here as a
-- manual reference for environments where push is not run (production).

CREATE TYPE "MerchantCredentialType" AS ENUM ('API', 'MCP');

CREATE TABLE IF NOT EXISTS "merchant_api_credentials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "credentialType" "MerchantCredentialType" NOT NULL DEFAULT 'API',
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_api_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_api_credentials_keyHash_key"
    ON "merchant_api_credentials"("keyHash");
CREATE INDEX IF NOT EXISTS "merchant_api_credentials_companyId_idx"
    ON "merchant_api_credentials"("companyId");
CREATE INDEX IF NOT EXISTS "merchant_api_credentials_companyId_credentialType_idx"
    ON "merchant_api_credentials"("companyId", "credentialType");

ALTER TABLE "merchant_api_credentials"
    ADD CONSTRAINT "merchant_api_credentials_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "api_usage_logs" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "tool" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_usage_logs_credentialId_createdAt_idx"
    ON "api_usage_logs"("credentialId", "createdAt");
CREATE INDEX IF NOT EXISTS "api_usage_logs_companyId_createdAt_idx"
    ON "api_usage_logs"("companyId", "createdAt");

ALTER TABLE "api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_credentialId_fkey"
    FOREIGN KEY ("credentialId") REFERENCES "merchant_api_credentials"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
