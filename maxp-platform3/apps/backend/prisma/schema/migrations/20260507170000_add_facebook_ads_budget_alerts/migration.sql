-- CreateTable
CREATE TABLE "facebook_ads_budget_alert_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "campaignId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'AD_ACCOUNT',
    "metric" TEXT NOT NULL DEFAULT 'ACCOUNT_BALANCE',
    "thresholdAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "recipientPhones" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 720,
    "lastState" TEXT NOT NULL DEFAULT 'OK',
    "lastCheckedAt" TIMESTAMP(3),
    "lastTriggeredAt" TIMESTAMP(3),
    "lastObservedValue" DOUBLE PRECISION,
    "lastObservedLabel" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ads_budget_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ads_budget_alert_logs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "companyId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "campaignId" TEXT,
    "metric" TEXT NOT NULL,
    "thresholdAmount" DOUBLE PRECISION NOT NULL,
    "observedValue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "recipientPhone" TEXT NOT NULL,
    "whatsappNotificationLogId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "failureReason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facebook_ads_budget_alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_rules_companyId_isEnabled_idx" ON "facebook_ads_budget_alert_rules"("companyId", "isEnabled");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_rules_adAccountId_idx" ON "facebook_ads_budget_alert_rules"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_rules_campaignId_idx" ON "facebook_ads_budget_alert_rules"("campaignId");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_rules_metric_idx" ON "facebook_ads_budget_alert_rules"("metric");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_logs_ruleId_idx" ON "facebook_ads_budget_alert_logs"("ruleId");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_logs_companyId_createdAt_idx" ON "facebook_ads_budget_alert_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_logs_adAccountId_idx" ON "facebook_ads_budget_alert_logs"("adAccountId");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_logs_campaignId_idx" ON "facebook_ads_budget_alert_logs"("campaignId");

-- CreateIndex
CREATE INDEX "facebook_ads_budget_alert_logs_status_idx" ON "facebook_ads_budget_alert_logs"("status");

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_rules" ADD CONSTRAINT "facebook_ads_budget_alert_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_rules" ADD CONSTRAINT "facebook_ads_budget_alert_rules_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_rules" ADD CONSTRAINT "facebook_ads_budget_alert_rules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "facebook_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_logs" ADD CONSTRAINT "facebook_ads_budget_alert_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "facebook_ads_budget_alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_logs" ADD CONSTRAINT "facebook_ads_budget_alert_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_logs" ADD CONSTRAINT "facebook_ads_budget_alert_logs_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "facebook_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facebook_ads_budget_alert_logs" ADD CONSTRAINT "facebook_ads_budget_alert_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "facebook_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
