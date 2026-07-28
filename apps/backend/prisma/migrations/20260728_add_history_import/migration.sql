-- CreateEnum
CREATE TYPE "WhatsAppHistoryImportStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_session_history_imports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "WhatsAppHistoryImportStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "requestedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "importedMessages" INTEGER NOT NULL DEFAULT 0,
    "unsupportedMessages" INTEGER NOT NULL DEFAULT 0,
    "skippedMessages" INTEGER NOT NULL DEFAULT 0,
    "failedMessages" INTEGER NOT NULL DEFAULT 0,
    "chatsCount" INTEGER NOT NULL DEFAULT 0,
    "contactsCount" INTEGER NOT NULL DEFAULT 0,
    "lastProgress" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_session_history_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_session_history_imports_sessionId_key" ON "whatsapp_session_history_imports"("sessionId");

-- CreateIndex
CREATE INDEX "whatsapp_session_history_imports_sessionId_idx" ON "whatsapp_session_history_imports"("sessionId");

-- CreateIndex
CREATE INDEX "whatsapp_session_history_imports_status_idx" ON "whatsapp_session_history_imports"("status");

-- CreateIndex
CREATE INDEX "whatsapp_session_history_imports_sessionId_status_idx" ON "whatsapp_session_history_imports"("sessionId", "status");

-- AddForeignKey
ALTER TABLE "whatsapp_session_history_imports" ADD CONSTRAINT "whatsapp_session_history_imports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: إنشاء records للجلسات اللي importHistoryOnLink=true في metadata
INSERT INTO "whatsapp_session_history_imports" ("id", "sessionId", "status", "requestedAt", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    ws.id,
    'REQUESTED',
    NOW(),
    NOW(),
    NOW()
FROM "whatsapp_sessions" ws
WHERE ws.metadata IS NOT NULL
  AND ws.metadata LIKE '%"importHistoryOnLink":true%'
  AND ws.provider = 'BAILEYS'
  AND NOT EXISTS (
    SELECT 1 FROM "whatsapp_session_history_imports" wshi WHERE wshi."sessionId" = ws.id
  );
