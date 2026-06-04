-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'manual',
    "logo" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "price" DECIMAL(10,2),
    "comparePrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "image" TEXT,
    "url" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_price_history" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_ads" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'facebook',
    "adId" TEXT,
    "creativeUrl" TEXT,
    "copy" TEXT,
    "headline" TEXT,
    "cta" TEXT,
    "destinationUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "competitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_reports" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'weekly',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "insights" JSONB,
    "data" JSONB,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- CreateIndex
-- CreateIndex
CREATE INDEX "competitors_companyId_idx" ON "competitors"("companyId");

-- CreateIndex
CREATE INDEX "competitors_companyId_isActive_idx" ON "competitors"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_companyId_slug_key" ON "competitors"("companyId", "slug");

-- CreateIndex
CREATE INDEX "competitor_products_competitorId_idx" ON "competitor_products"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_products_competitorId_sku_idx" ON "competitor_products"("competitorId", "sku");

-- CreateIndex
CREATE INDEX "competitor_products_competitorId_isAvailable_idx" ON "competitor_products"("competitorId", "isAvailable");

-- CreateIndex
CREATE INDEX "competitor_products_competitorId_lastSeen_idx" ON "competitor_products"("competitorId", "lastSeen");

-- CreateIndex
CREATE INDEX "competitor_price_history_productId_idx" ON "competitor_price_history"("productId");

-- CreateIndex
CREATE INDEX "competitor_price_history_productId_recordedAt_idx" ON "competitor_price_history"("productId", "recordedAt");

-- CreateIndex
CREATE INDEX "competitor_ads_competitorId_idx" ON "competitor_ads"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_ads_competitorId_platform_idx" ON "competitor_ads"("competitorId", "platform");

-- CreateIndex
CREATE INDEX "competitor_ads_competitorId_status_idx" ON "competitor_ads"("competitorId", "status");

-- CreateIndex
CREATE INDEX "competitor_reports_competitorId_idx" ON "competitor_reports"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_reports_companyId_idx" ON "competitor_reports"("companyId");

-- CreateIndex
CREATE INDEX "competitor_reports_companyId_type_idx" ON "competitor_reports"("companyId", "type");

-- CreateIndex
CREATE INDEX "competitor_reports_companyId_generatedAt_idx" ON "competitor_reports"("companyId", "generatedAt" DESC);

-- CreateIndex
-- AddForeignKey
-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_products" ADD CONSTRAINT "competitor_products_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_price_history" ADD CONSTRAINT "competitor_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "competitor_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_ads" ADD CONSTRAINT "competitor_ads_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_reports" ADD CONSTRAINT "competitor_reports_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_reports" ADD CONSTRAINT "competitor_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey