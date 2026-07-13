ALTER TABLE "whatsapp_notification_settings"
  ADD COLUMN IF NOT EXISTS "companyLifecycleNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "whatsapp_notification_settings"
  ADD COLUMN IF NOT EXISTS "newSignupWelcomeEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "newSignupAdminAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "company_lifecycle_admin_phones" TEXT,
  ADD COLUMN IF NOT EXISTS "company_lifecycle_admin_routing_mode" TEXT NOT NULL DEFAULT 'AUTO',
  ADD COLUMN IF NOT EXISTS "subscriptionCreatedEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "subscriptionRenewedEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "subscriptionCancelledEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "newsletterSubscribedEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "benefitGrantedEnabled" BOOLEAN NOT NULL DEFAULT true;
