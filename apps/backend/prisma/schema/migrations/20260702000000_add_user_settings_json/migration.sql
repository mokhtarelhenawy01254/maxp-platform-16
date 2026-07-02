-- Add settings JSON column to users table for per-user preferences
-- Stores sidebarLayout and future user-level settings

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "settings" TEXT;
