-- CreateTable: app_explanations
-- Stores app feature explanations shown to users on specific routes.

CREATE TABLE IF NOT EXISTS "app_explanations" (
  "id"          TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "content"     TEXT         NOT NULL,
  "slug"        TEXT         NOT NULL,
  "targetRoute" TEXT         NOT NULL DEFAULT '',
  "videoUrl"    TEXT,
  "isActive"    BOOLEAN      NOT NULL DEFAULT true,
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_explanations_pkey" PRIMARY KEY ("id")
);

-- Unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "app_explanations_slug_key" ON "app_explanations"("slug");

-- Index on targetRoute for efficient lookups
CREATE INDEX IF NOT EXISTS "app_explanations_targetRoute_idx" ON "app_explanations"("targetRoute");
