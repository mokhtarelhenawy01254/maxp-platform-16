CREATE TABLE "affiliate_identity_document_versions" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedByUserId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'REGISTRATION',
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "replacedAt" TIMESTAMP(3),

  CONSTRAINT "affiliate_identity_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_identity_document_versions_affiliateId_uploadedAt_idx"
ON "affiliate_identity_document_versions"("affiliateId", "uploadedAt");

CREATE INDEX "affiliate_identity_document_versions_affiliateId_isCurrent_idx"
ON "affiliate_identity_document_versions"("affiliateId", "isCurrent");

ALTER TABLE "affiliate_identity_document_versions"
ADD CONSTRAINT "affiliate_identity_document_versions_affiliateId_fkey"
FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
