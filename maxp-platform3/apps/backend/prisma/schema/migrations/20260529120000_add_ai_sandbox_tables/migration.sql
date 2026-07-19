-- CreateTable
CREATE TABLE "ai_sandbox_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Session',
    "agentId" TEXT NOT NULL,
    "agentName" TEXT,
    "agentRole" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyId" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "avgLatency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_sandbox_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sandbox_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "provider" TEXT,
    "keyId" TEXT,
    "keyName" TEXT,
    "tokensInput" INTEGER NOT NULL DEFAULT 0,
    "tokensOutput" INTEGER NOT NULL DEFAULT 0,
    "tokensTotal" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toolCalls" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_sandbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_sandbox_sessions_companyId_idx" ON "ai_sandbox_sessions"("companyId");

-- CreateIndex
CREATE INDEX "ai_sandbox_sessions_companyId_userId_idx" ON "ai_sandbox_sessions"("companyId", "userId");

-- CreateIndex
CREATE INDEX "ai_sandbox_sessions_companyId_updatedAt_idx" ON "ai_sandbox_sessions"("companyId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_sandbox_messages_sessionId_idx" ON "ai_sandbox_messages"("sessionId");

-- CreateIndex
CREATE INDEX "ai_sandbox_messages_sessionId_createdAt_idx" ON "ai_sandbox_messages"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_sandbox_messages" ADD CONSTRAINT "ai_sandbox_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sandbox_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sandbox_sessions" ADD CONSTRAINT "ai_sandbox_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
