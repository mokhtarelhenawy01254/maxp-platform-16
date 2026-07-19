-- Add configurable business specialties for first-time signup and scoped marketplace apps.
CREATE TABLE IF NOT EXISTS "business_specialties" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "icon" TEXT,
  "appSlugs" JSONB,
  "autoInstallOnSignup" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_specialties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_specialties_slug_key"
  ON "business_specialties"("slug");

CREATE INDEX IF NOT EXISTS "business_specialties_isActive_sortOrder_idx"
  ON "business_specialties"("isActive", "sortOrder");

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "businessSpecialtyId" TEXT;

CREATE INDEX IF NOT EXISTS "companies_businessSpecialtyId_idx"
  ON "companies"("businessSpecialtyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_businessSpecialtyId_fkey'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_businessSpecialtyId_fkey"
      FOREIGN KEY ("businessSpecialtyId") REFERENCES "business_specialties"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "business_specialties" (
  "id",
  "slug",
  "nameAr",
  "nameEn",
  "descriptionAr",
  "descriptionEn",
  "icon",
  "appSlugs",
  "sortOrder"
)
VALUES
  (
    'bizsp_ecommerce_retail',
    'ecommerce-retail',
    'التجارة والمتاجر',
    'E-commerce & Retail',
    'متجر إلكتروني، منتجات، طلبات، عروض، مشتريات وتحليلات.',
    'Online store, products, orders, offers, procurement, and analytics.',
    'ShoppingBag',
    '["ecommerce-basic","store-basic","quantity-offers-pro","commerce-advanced","procurement-pro","order-source-tracking","crm-lite","analytics-basic","ai-chat-basic","facebook-ads-pro","conversion-suite","ugc-reviews-pro"]'::jsonb,
    10
  ),
  (
    'bizsp_marketing_sales',
    'marketing-sales',
    'التسويق والمبيعات',
    'Marketing & Sales',
    'حملات، إعلانات، تتبع تحويلات، مراجعات العملاء وإدارة علاقات العملاء.',
    'Campaigns, ads, conversion tracking, customer reviews, and CRM.',
    'Megaphone',
    '["facebook-ads-pro","conversion-suite","ugc-reviews-pro","affiliate-pro","campaign-attribution","analytics-basic","crm-lite","ai-chat-basic","order-source-tracking"]'::jsonb,
    20
  ),
  (
    'bizsp_operations_fulfillment',
    'operations-fulfillment',
    'العمليات والتشغيل',
    'Operations & Fulfillment',
    'تشغيل الطلبات، توزيع التأكيدات، مشتريات، تنبيهات وأتمتة.',
    'Order workflows, confirmation distribution, procurement, alerts, and automation.',
    'Workflow',
    '["ecommerce-basic","procurement-pro","order-confirmation-distribution","notification-automation","order-source-tracking","analytics-basic","commerce-advanced"]'::jsonb,
    30
  ),
  (
    'bizsp_customer_support',
    'customer-support',
    'خدمة العملاء والدعم',
    'Customer Support',
    'محادثات ذكية، CRM، إشعارات، تأكيد طلبات وتحليلات لخدمة العملاء.',
    'Smart chat, CRM, notifications, order confirmations, and support analytics.',
    'MessagesSquare',
    '["ai-chat-basic","crm-lite","notification-automation","order-confirmation-distribution","analytics-basic","ecommerce-basic"]'::jsonb,
    40
  )
ON CONFLICT ("slug") DO NOTHING;
