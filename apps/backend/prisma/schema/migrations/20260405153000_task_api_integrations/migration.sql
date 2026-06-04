CREATE TABLE "task_api_credentials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "defaultActingUserId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_api_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_webhook_endpoints" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "subscribedEvents" TEXT NOT NULL,
    "signingSecret" TEXT,
    "customHeaders" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "requestBody" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_api_credentials_keyPrefix_key" ON "task_api_credentials"("keyPrefix");
CREATE UNIQUE INDEX "task_api_credentials_keyHash_key" ON "task_api_credentials"("keyHash");

CREATE INDEX "task_api_credentials_companyId_isActive_idx" ON "task_api_credentials"("companyId", "isActive");
CREATE INDEX "task_api_credentials_companyId_userId_idx" ON "task_api_credentials"("companyId", "userId");
CREATE INDEX "task_api_credentials_expiresAt_idx" ON "task_api_credentials"("expiresAt");

CREATE INDEX "task_webhook_endpoints_companyId_isActive_idx" ON "task_webhook_endpoints"("companyId", "isActive");

CREATE INDEX "task_webhook_deliveries_companyId_createdAt_idx" ON "task_webhook_deliveries"("companyId", "createdAt");
CREATE INDEX "task_webhook_deliveries_success_createdAt_idx" ON "task_webhook_deliveries"("success", "createdAt");
CREATE INDEX "task_webhook_deliveries_webhookId_createdAt_idx" ON "task_webhook_deliveries"("webhookId", "createdAt");

ALTER TABLE "task_api_credentials"
ADD CONSTRAINT "task_api_credentials_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_webhook_endpoints"
ADD CONSTRAINT "task_webhook_endpoints_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_webhook_deliveries"
ADD CONSTRAINT "task_webhook_deliveries_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_webhook_deliveries"
ADD CONSTRAINT "task_webhook_deliveries_webhookId_fkey"
FOREIGN KEY ("webhookId") REFERENCES "task_webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
