-- CreateTable
CREATE TABLE "competitor_features" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitor_features_competitorId_idx" ON "competitor_features"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_features_competitorId_status_idx" ON "competitor_features"("competitorId", "status");

-- CreateIndex
CREATE INDEX "competitor_features_competitorId_priority_idx" ON "competitor_features"("competitorId", "priority");

-- AddForeignKey
ALTER TABLE "competitor_features" ADD CONSTRAINT "competitor_features_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
