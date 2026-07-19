ALTER TABLE "affiliate_settings"
ADD COLUMN "requireIdentityDocument" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "identityDocumentLabel" TEXT DEFAULT 'مستند إثبات الهوية';

ALTER TABLE "affiliates"
ADD COLUMN "identityDocumentUrl" TEXT,
ADD COLUMN "identityDocumentUploadedAt" TIMESTAMP(3);
