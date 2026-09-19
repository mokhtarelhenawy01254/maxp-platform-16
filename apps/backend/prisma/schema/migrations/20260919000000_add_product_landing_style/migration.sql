-- Landing page style presets + merchant overrides, stored as JSON:
--   { preset: string, brandColor: "#rrggbb", buttonRadius: number, headingFont: "almarai"|"cairo"|"tajawal" }
ALTER TABLE "product_landing_pages" ADD COLUMN IF NOT EXISTS "style" TEXT;
