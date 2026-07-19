-- Add isolated Facebook Ads OAuth connection sources.
-- Each source represents one Facebook personal account that granted ads permissions.

CREATE TABLE "facebook_ads_connection_sources" (
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

    CONSTRAINT "facebook_ads_connection_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facebook_ads_connection_sources_companyId_facebookUserId_key"
    ON "facebook_ads_connection_sources"("companyId", "facebookUserId");

CREATE INDEX "facebook_ads_connection_sources_companyId_idx"
    ON "facebook_ads_connection_sources"("companyId");

CREATE INDEX "facebook_ads_connection_sources_status_idx"
    ON "facebook_ads_connection_sources"("status");

ALTER TABLE "facebook_ads_connection_sources"
    ADD CONSTRAINT "facebook_ads_connection_sources_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "facebook_ad_accounts"
    ADD COLUMN "connectionSourceId" TEXT;

ALTER TABLE "facebook_ad_accounts"
    ALTER COLUMN "accessToken" DROP NOT NULL;

CREATE INDEX "facebook_ad_accounts_connectionSourceId_idx"
    ON "facebook_ad_accounts"("connectionSourceId");

ALTER TABLE "facebook_ad_accounts"
    ADD CONSTRAINT "facebook_ad_accounts_connectionSourceId_fkey"
    FOREIGN KEY ("connectionSourceId") REFERENCES "facebook_ads_connection_sources"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
