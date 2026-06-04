ALTER TABLE "ai_settings"
  ADD COLUMN "writeToolScopes" TEXT,
  ADD COLUMN "humanApprovalRequiredForWrite" BOOLEAN NOT NULL DEFAULT true;
