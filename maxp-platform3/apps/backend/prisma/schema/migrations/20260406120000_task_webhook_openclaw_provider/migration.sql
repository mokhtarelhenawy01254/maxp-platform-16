ALTER TABLE "task_webhook_endpoints"
ADD COLUMN "providerType" TEXT NOT NULL DEFAULT 'GENERIC',
ADD COLUMN "providerConfig" TEXT;
