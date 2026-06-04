-- Ensure product review media is represented in the database schema, not only created lazily at runtime.
CREATE TABLE IF NOT EXISTS "product_review_media" (
  "id" TEXT NOT NULL,
  "review_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "poster_url" TEXT,
  "alt_text" TEXT,
  "file_name" TEXT,
  "mime_type" TEXT,
  "file_size" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_review_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_review_media_company_id_idx" ON "product_review_media"("company_id");
CREATE INDEX IF NOT EXISTS "product_review_media_review_id_idx" ON "product_review_media"("review_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_review_media_company_id_fkey'
  ) THEN
    ALTER TABLE "product_review_media"
    ADD CONSTRAINT "product_review_media_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_review_media_review_id_fkey'
  ) THEN
    ALTER TABLE "product_review_media"
    ADD CONSTRAINT "product_review_media_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
