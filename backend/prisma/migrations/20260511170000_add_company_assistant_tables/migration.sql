CREATE TABLE IF NOT EXISTS "company_assistant_channels" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "company_assistant_channel_identity"
  ON "company_assistant_channels"("companyId", "channel", "provider", "channelConfigId", "externalUserId");
CREATE INDEX IF NOT EXISTS "company_assistant_channels_companyId_channel_isActive_idx"
  ON "company_assistant_channels"("companyId", "channel", "isActive");
CREATE INDEX IF NOT EXISTS "company_assistant_channels_companyId_externalUserId_idx"
  ON "company_assistant_channels"("companyId", "externalUserId");
CREATE INDEX IF NOT EXISTS "company_assistant_channels_channelConfigId_idx"
  ON "company_assistant_channels"("channelConfigId");

CREATE TABLE IF NOT EXISTS "company_assistant_command_logs" (
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

CREATE INDEX IF NOT EXISTS "company_assistant_command_logs_companyId_createdAt_idx"
  ON "company_assistant_command_logs"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "company_assistant_command_logs_companyId_status_idx"
  ON "company_assistant_command_logs"("companyId", "status");
CREATE INDEX IF NOT EXISTS "company_assistant_command_logs_channelId_idx"
  ON "company_assistant_command_logs"("channelId");
CREATE INDEX IF NOT EXISTS "company_assistant_command_logs_confirmationToken_idx"
  ON "company_assistant_command_logs"("confirmationToken");

CREATE TABLE IF NOT EXISTS "company_assistant_memories" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "channelId" TEXT,
  "externalUserId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'FACT',
  "content" TEXT NOT NULL,
  "importance" INTEGER NOT NULL DEFAULT 3,
  "metadata" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_assistant_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_assistant_memories_companyId_type_importance_idx"
  ON "company_assistant_memories"("companyId", "type", "importance");
CREATE INDEX IF NOT EXISTS "company_assistant_memories_companyId_channelId_externalUserId_idx"
  ON "company_assistant_memories"("companyId", "channelId", "externalUserId");
CREATE INDEX IF NOT EXISTS "company_assistant_memories_companyId_expiresAt_idx"
  ON "company_assistant_memories"("companyId", "expiresAt");

CREATE TABLE IF NOT EXISTS "company_assistant_memory_indexes" (
  "id" TEXT NOT NULL,
  "memoryId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "channelId" TEXT,
  "externalUserId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'FACT',
  "contentHash" TEXT NOT NULL,
  "chunkText" TEXT NOT NULL,
  "keywords" TEXT,
  "embedding" TEXT,
  "embeddingProvider" TEXT,
  "embeddingGeneratedAt" TIMESTAMP(3),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_assistant_memory_indexes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_assistant_memory_index_memory_chunk"
  ON "company_assistant_memory_indexes"("memoryId", "contentHash");
CREATE INDEX IF NOT EXISTS "company_assistant_memory_indexes_companyId_type_idx"
  ON "company_assistant_memory_indexes"("companyId", "type");
CREATE INDEX IF NOT EXISTS "company_assistant_memory_indexes_companyId_channelId_externalUserId_idx"
  ON "company_assistant_memory_indexes"("companyId", "channelId", "externalUserId");
CREATE INDEX IF NOT EXISTS "company_assistant_memory_indexes_memoryId_idx"
  ON "company_assistant_memory_indexes"("memoryId");

CREATE TABLE IF NOT EXISTS "company_assistant_memory_feedback" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "memoryId" TEXT,
  "commandLogId" TEXT,
  "channelId" TEXT,
  "externalUserId" TEXT,
  "signal" TEXT NOT NULL DEFAULT 'HELPFUL',
  "reason" TEXT,
  "metadata" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_assistant_memory_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_assistant_memory_feedback_companyId_memoryId_idx"
  ON "company_assistant_memory_feedback"("companyId", "memoryId");
CREATE INDEX IF NOT EXISTS "company_assistant_memory_feedback_companyId_commandLogId_idx"
  ON "company_assistant_memory_feedback"("companyId", "commandLogId");
CREATE INDEX IF NOT EXISTS "company_assistant_memory_feedback_companyId_createdAt_idx"
  ON "company_assistant_memory_feedback"("companyId", "createdAt");

CREATE TABLE IF NOT EXISTS "company_assistant_pending_actions" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "company_assistant_pending_actions_actionKey_key"
  ON "company_assistant_pending_actions"("actionKey");
CREATE INDEX IF NOT EXISTS "company_assistant_pending_actions_companyId_status_expiresAt_idx"
  ON "company_assistant_pending_actions"("companyId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "company_assistant_pending_actions_channelId_idx"
  ON "company_assistant_pending_actions"("channelId");
