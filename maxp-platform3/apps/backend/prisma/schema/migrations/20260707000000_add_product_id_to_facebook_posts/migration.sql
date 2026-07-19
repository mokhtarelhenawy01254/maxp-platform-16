-- Add productId FK to facebook_posts so each post can link to a specific product
ALTER TABLE "facebook_posts" ADD COLUMN IF NOT EXISTS "productId" TEXT;
CREATE INDEX IF NOT EXISTS "facebook_posts_productId_idx" ON "facebook_posts"("productId");
