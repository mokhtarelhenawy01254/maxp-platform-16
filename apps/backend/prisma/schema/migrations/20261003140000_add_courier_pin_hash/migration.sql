-- Courier field PIN (hashed): required on field status updates when requireCourierPin is enabled
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;
