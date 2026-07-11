-- Add location and landmarkImage fields to booking branches
ALTER TABLE booking_branches ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE booking_branches ADD COLUMN IF NOT EXISTS "landmarkImage" TEXT;
