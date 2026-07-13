-- CreateTable
CREATE TABLE "ai_agent_tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dagPlan" JSONB,
    "checkpoint" JSONB,
    "checkedOutBy" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "parentTaskId" TEXT,
    "traceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_runs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "stepName" TEXT,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "costTokens" INTEGER,
    "latencyMs" INTEGER,
    "modelUsed" TEXT,
    "providerUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_agent_tasks_companyId_status_idx" ON "ai_agent_tasks"("companyId", "status");

-- CreateIndex
CREATE INDEX "ai_agent_tasks_companyId_agentId_idx" ON "ai_agent_tasks"("companyId", "agentId");

-- CreateIndex
CREATE INDEX "ai_agent_tasks_companyId_checkedOutBy_idx" ON "ai_agent_tasks"("companyId", "checkedOutBy");

-- CreateIndex
CREATE INDEX "ai_agent_tasks_parentTaskId_idx" ON "ai_agent_tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "ai_agent_runs_companyId_agentId_idx" ON "ai_agent_runs"("companyId", "agentId");

-- CreateIndex
CREATE INDEX "ai_agent_runs_taskId_idx" ON "ai_agent_runs"("taskId");

-- CreateIndex
CREATE INDEX "ai_agent_runs_createdAt_idx" ON "ai_agent_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ai_agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
