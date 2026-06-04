CREATE TABLE "company_assistant_channels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channelConfigId" TEXT,
    "externalUserId" TEXT,
    "externalChatId" TEXT,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "scopes" TEXT NOT NULL DEFAULT '["assistant:read"]',
    "mode" TEXT NOT NULL DEFAULT 'OPERATOR_ASSISTANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_assistant_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_assistant_command_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channelId" TEXT,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalUserId" TEXT,
    "externalChatId" TEXT,
    "input" TEXT NOT NULL,
    "normalizedIntent" TEXT,
    "toolName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "riskLevel" TEXT NOT NULL DEFAULT 'READ',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmationToken" TEXT,
    "result" TEXT,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_assistant_command_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_assistant_pending_actions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channelId" TEXT,
    "actionKey" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "arguments" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "requestedByExternalUserId" TEXT,
    "externalChatId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_assistant_pending_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_assistant_channel_identity" ON "company_assistant_channels"("companyId", "channel", "provider", "channelConfigId", "externalUserId");
CREATE INDEX "company_assistant_channels_companyId_channel_isActive_idx" ON "company_assistant_channels"("companyId", "channel", "isActive");
CREATE INDEX "company_assistant_channels_companyId_externalUserId_idx" ON "company_assistant_channels"("companyId", "externalUserId");
CREATE INDEX "company_assistant_channels_channelConfigId_idx" ON "company_assistant_channels"("channelConfigId");

CREATE INDEX "company_assistant_command_logs_companyId_createdAt_idx" ON "company_assistant_command_logs"("companyId", "createdAt");
CREATE INDEX "company_assistant_command_logs_companyId_status_idx" ON "company_assistant_command_logs"("companyId", "status");
CREATE INDEX "company_assistant_command_logs_channelId_idx" ON "company_assistant_command_logs"("channelId");
CREATE INDEX "company_assistant_command_logs_confirmationToken_idx" ON "company_assistant_command_logs"("confirmationToken");

CREATE UNIQUE INDEX "company_assistant_pending_actions_actionKey_key" ON "company_assistant_pending_actions"("actionKey");
CREATE INDEX "company_assistant_pending_actions_companyId_status_expiresAt_idx" ON "company_assistant_pending_actions"("companyId", "status", "expiresAt");
CREATE INDEX "company_assistant_pending_actions_channelId_idx" ON "company_assistant_pending_actions"("channelId");
