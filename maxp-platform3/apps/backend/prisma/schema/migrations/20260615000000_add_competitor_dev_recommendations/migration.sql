-- CreateTable: CompetitorDevRecommendation
CREATE TABLE "competitor_dev_recommendations" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_dev_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CompetitorDevTask
CREATE TABLE "competitor_dev_tasks" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_dev_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitor_dev_recommendations_competitorId_idx" ON "competitor_dev_recommendations"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_dev_tasks_recommendationId_idx" ON "competitor_dev_tasks"("recommendationId");

-- CreateIndex
CREATE INDEX "competitor_dev_tasks_recommendationId_status_idx" ON "competitor_dev_tasks"("recommendationId", "status");

-- AddForeignKey
ALTER TABLE "competitor_dev_recommendations" ADD CONSTRAINT "competitor_dev_recommendations_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_dev_tasks" ADD CONSTRAINT "competitor_dev_tasks_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "competitor_dev_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
