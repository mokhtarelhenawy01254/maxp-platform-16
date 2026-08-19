-- Add per-account Facebook page OAuth connection sources.
-- Each source represents one Facebook personal account that granted
-- Messenger/page permissions, so pages from different Facebook accounts
-- can be linked to the same company and refreshed independently.

CREATE TABLE "facebook_account_connections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "facebookUserId" TEXT NOT NULL,
    "facebookUserName" TEXT,
    "facebookUserEmail" TEXT,
    "accessToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_account_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facebook_account_connections_companyId_facebookUserId_key"
    ON "facebook_account_connections"("companyId", "facebookUserId");

CREATE INDEX "facebook_account_connections_companyId_idx"
    ON "facebook_account_connections"("companyId");

CREATE INDEX "facebook_account_connections_status_idx"
    ON "facebook_account_connections"("status");

ALTER TABLE "facebook_account_connections"
    ADD CONSTRAINT "facebook_account_connections_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "facebook_pages"
    ADD COLUMN "facebookAccountId" TEXT;

CREATE INDEX "facebook_pages_facebookAccountId_idx"
    ON "facebook_pages"("facebookAccountId");

ALTER TABLE "facebook_pages"
    ADD CONSTRAINT "facebook_pages_facebookAccountId_fkey"
    FOREIGN KEY ("facebookAccountId") REFERENCES "facebook_account_connections"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
