ALTER TABLE "affiliates"
ADD COLUMN "identityDocumentStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN "identityDocumentReviewNote" TEXT,
ADD COLUMN "identityDocumentReviewedAt" TIMESTAMP(3);

CREATE TABLE "affiliate_review_logs" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "companyId" TEXT,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "previousStatus" TEXT,
  "nextStatus" TEXT,
  "previousDocumentStatus" TEXT,
  "nextDocumentStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "affiliate_review_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_review_logs_affiliateId_idx" ON "affiliate_review_logs"("affiliateId");
CREATE INDEX "affiliate_review_logs_companyId_idx" ON "affiliate_review_logs"("companyId");
CREATE INDEX "affiliate_review_logs_eventType_idx" ON "affiliate_review_logs"("eventType");
CREATE INDEX "affiliate_review_logs_createdAt_idx" ON "affiliate_review_logs"("createdAt");

ALTER TABLE "affiliate_review_logs"
ADD CONSTRAINT "affiliate_review_logs_affiliateId_fkey"
FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
