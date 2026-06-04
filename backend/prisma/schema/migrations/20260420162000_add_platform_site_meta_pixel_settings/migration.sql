CREATE TABLE IF NOT EXISTS "platform_site_meta_pixel_settings" (
    "id" TEXT NOT NULL,
    "siteKey" TEXT NOT NULL DEFAULT 'maxp.online',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pixelId" TEXT,
    "trackPageView" BOOLEAN NOT NULL DEFAULT true,
    "trackLead" BOOLEAN NOT NULL DEFAULT true,
    "trackCompleteRegistration" BOOLEAN NOT NULL DEFAULT true,
    "trackLogin" BOOLEAN NOT NULL DEFAULT false,
    "loginEventName" TEXT NOT NULL DEFAULT 'PlatformLogin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_site_meta_pixel_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_site_meta_pixel_settings_siteKey_key"
  ON "platform_site_meta_pixel_settings"("siteKey");
