-- CreateTable
CREATE TABLE "dev_task_api_credentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "defaultReporterMemberId" TEXT,
    "defaultAssigneeMemberId" TEXT,
    "defaultProjectId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_task_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dev_task_api_credentials_keyPrefix_key" ON "dev_task_api_credentials"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "dev_task_api_credentials_keyHash_key" ON "dev_task_api_credentials"("keyHash");

-- CreateIndex
CREATE INDEX "dev_task_api_credentials_defaultProjectId_idx" ON "dev_task_api_credentials"("defaultProjectId");

-- CreateIndex
CREATE INDEX "dev_task_api_credentials_expiresAt_idx" ON "dev_task_api_credentials"("expiresAt");

-- CreateIndex
CREATE INDEX "dev_task_api_credentials_isActive_revokedAt_idx" ON "dev_task_api_credentials"("isActive", "revokedAt");

-- AddForeignKey
ALTER TABLE "dev_task_api_credentials" ADD CONSTRAINT "dev_task_api_credentials_defaultAssigneeMemberId_fkey" FOREIGN KEY ("defaultAssigneeMemberId") REFERENCES "dev_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_api_credentials" ADD CONSTRAINT "dev_task_api_credentials_defaultProjectId_fkey" FOREIGN KEY ("defaultProjectId") REFERENCES "dev_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_task_api_credentials" ADD CONSTRAINT "dev_task_api_credentials_defaultReporterMemberId_fkey" FOREIGN KEY ("defaultReporterMemberId") REFERENCES "dev_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
