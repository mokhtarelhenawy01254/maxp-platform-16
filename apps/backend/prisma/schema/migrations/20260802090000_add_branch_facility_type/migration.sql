-- Add facilityType to booking branches (clinic | medical_center | hospital | polyclinic | dental | cosmetic)
ALTER TABLE booking_branches ADD COLUMN IF NOT EXISTS "facilityType" TEXT NOT NULL DEFAULT 'clinic';
