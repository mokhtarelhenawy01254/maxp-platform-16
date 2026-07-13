-- Facebook Ads AI Builder draft and publish ledgers.
-- These tables make generated ad drafts reusable and make Meta publish requests idempotent.

CREATE TABLE IF NOT EXISTS "facebook_ads_ai_draft_runs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT,
  "idempotencyKey" TEXT,
  "inputHash" TEXT NOT NULL,
  "promptHash" TEXT,
  "productUrl" TEXT NOT NULL,
  "productSnapshot" TEXT,
  "adAccountId" TEXT,
  "pageId" TEXT,
  "pixelId" TEXT,
  "requestedCampaignCount" INTEGER NOT NULL DEFAULT 3,
  "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 200,
  "targetCountry" TEXT NOT NULL DEFAULT 'EG',
  "targetGenders" TEXT,
  "ageMin" INTEGER NOT NULL DEFAULT 18,
  "ageMax" INTEGER NOT NULL DEFAULT 45,
  "requestedStatus" TEXT NOT NULL DEFAULT 'PAUSED',
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "usedFallback" BOOLEAN NOT NULL DEFAULT false,
  "fallbackReason" TEXT,
  "routing" TEXT,
  "latencyMs" INTEGER,
  "errorMessage" TEXT,
  "lockExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facebook_ads_ai_draft_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facebook_ads_ai_draft_runs_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "facebook_ads_publish_requests" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT,
  "clientRequestId" TEXT NOT NULL,
  "requestHash" TEXT,
  "aiDraftId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "requestPayload" TEXT,
  "responsePayload" TEXT,
  "errorMessage" TEXT,
  "step" TEXT,
  "partialSuccess" BOOLEAN NOT NULL DEFAULT false,
  "facebookCampaignId" TEXT,
  "facebookAdSetId" TEXT,
  "facebookAdId" TEXT,
  "facebookCreativeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "lockExpiresAt" TIMESTAMP(3),
  CONSTRAINT "facebook_ads_publish_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facebook_ads_publish_requests_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "facebook_ads_ai_drafts" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT,
  "productUrl" TEXT NOT NULL,
  "productSnapshot" TEXT,
  "index" INTEGER NOT NULL,
  "angle" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "adSetName" TEXT NOT NULL,
  "adName" TEXT NOT NULL,
  "primaryText" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "description" TEXT,
  "callToAction" TEXT NOT NULL DEFAULT 'SHOP_NOW',
  "budgetAmount" DOUBLE PRECISION NOT NULL,
  "targetCountry" TEXT NOT NULL DEFAULT 'EG',
  "targetGenders" TEXT,
  "ageMin" INTEGER NOT NULL DEFAULT 18,
  "ageMax" INTEGER NOT NULL DEFAULT 45,
  "notes" TEXT,
  "createFullAdData" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "usedFallback" BOOLEAN NOT NULL DEFAULT false,
  "fallbackReason" TEXT,
  "routing" TEXT,
  "publishRequestId" TEXT,
  "facebookCampaignId" TEXT,
  "facebookAdSetId" TEXT,
  "facebookAdId" TEXT,
  "facebookCreativeId" TEXT,
  "openedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facebook_ads_ai_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facebook_ads_ai_drafts_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "facebook_ads_ai_draft_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "facebook_ads_ai_drafts_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "facebook_ads_ai_drafts_publishRequestId_fkey"
    FOREIGN KEY ("publishRequestId") REFERENCES "facebook_ads_publish_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_companyId_idempotencyKey_key"
  ON "facebook_ads_ai_draft_runs"("companyId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_companyId_createdAt_idx"
  ON "facebook_ads_ai_draft_runs"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_companyId_adAccountId_createdAt_idx"
  ON "facebook_ads_ai_draft_runs"("companyId", "adAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_companyId_productUrl_idx"
  ON "facebook_ads_ai_draft_runs"("companyId", "productUrl");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_status_idx"
  ON "facebook_ads_ai_draft_runs"("status");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_draft_runs_lockExpiresAt_idx"
  ON "facebook_ads_ai_draft_runs"("lockExpiresAt");

CREATE INDEX IF NOT EXISTS "facebook_ads_ai_drafts_runId_idx"
  ON "facebook_ads_ai_drafts"("runId");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_drafts_companyId_createdAt_idx"
  ON "facebook_ads_ai_drafts"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_drafts_companyId_productUrl_idx"
  ON "facebook_ads_ai_drafts"("companyId", "productUrl");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_drafts_status_idx"
  ON "facebook_ads_ai_drafts"("status");
CREATE INDEX IF NOT EXISTS "facebook_ads_ai_drafts_publishRequestId_idx"
  ON "facebook_ads_ai_drafts"("publishRequestId");

CREATE UNIQUE INDEX IF NOT EXISTS "facebook_ads_publish_requests_companyId_clientRequestId_key"
  ON "facebook_ads_publish_requests"("companyId", "clientRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "facebook_ads_publish_requests_companyId_aiDraftId_key"
  ON "facebook_ads_publish_requests"("companyId", "aiDraftId");
CREATE INDEX IF NOT EXISTS "facebook_ads_publish_requests_companyId_createdAt_idx"
  ON "facebook_ads_publish_requests"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "facebook_ads_publish_requests_status_idx"
  ON "facebook_ads_publish_requests"("status");
CREATE INDEX IF NOT EXISTS "facebook_ads_publish_requests_lockExpiresAt_idx"
  ON "facebook_ads_publish_requests"("lockExpiresAt");
CREATE INDEX IF NOT EXISTS "facebook_ads_publish_requests_aiDraftId_idx"
  ON "facebook_ads_publish_requests"("aiDraftId");
