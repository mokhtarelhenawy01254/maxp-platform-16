-- CreateTable
CREATE TABLE "task_openclaw_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "agentId" TEXT,
    "wakeMode" TEXT NOT NULL DEFAULT 'now',
    "sessionMode" TEXT NOT NULL DEFAULT 'default',
    "deliver" BOOLEAN NOT NULL DEFAULT false,
    "hookTokenEncrypted" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_openclaw_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_openclaw_profiles_companyId_idx" ON "task_openclaw_profiles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "task_openclaw_profiles_companyId_environment_key" ON "task_openclaw_profiles"("companyId", "environment");

-- AddForeignKey
ALTER TABLE "task_openclaw_profiles" ADD CONSTRAINT "task_openclaw_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
