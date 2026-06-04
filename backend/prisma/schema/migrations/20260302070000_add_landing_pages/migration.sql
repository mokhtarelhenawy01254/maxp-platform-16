-- Create landing_pages table for PostgreSQL schema
CREATE TABLE IF NOT EXISTS "landing_pages" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "productId" TEXT,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "content" JSONB NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "views" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "metaTitle" VARCHAR(255),
  "metaDescription" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "landing_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "landing_pages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "landing_pages_companyId_slug_key"
  ON "landing_pages"("companyId", "slug");

CREATE INDEX IF NOT EXISTS "landing_pages_companyId_idx"
  ON "landing_pages"("companyId");

CREATE INDEX IF NOT EXISTS "landing_pages_productId_idx"
  ON "landing_pages"("productId");

CREATE INDEX IF NOT EXISTS "landing_pages_slug_idx"
  ON "landing_pages"("slug");

CREATE INDEX IF NOT EXISTS "landing_pages_isPublished_idx"
  ON "landing_pages"("isPublished");
