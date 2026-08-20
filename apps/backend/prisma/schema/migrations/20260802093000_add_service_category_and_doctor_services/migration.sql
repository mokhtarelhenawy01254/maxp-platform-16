-- Service categories (departments: Urology, Dental, ...)
CREATE TABLE IF NOT EXISTS booking_service_categories (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_service_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "booking_service_categories_companyId_idx" ON booking_service_categories("companyId");

-- Doctor-to-service link
CREATE TABLE IF NOT EXISTS booking_doctor_services (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "fee" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_doctor_services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_doctor_services_doctor_service_key" UNIQUE ("doctorId", "serviceId")
);
CREATE INDEX IF NOT EXISTS "booking_doctor_services_companyId_idx" ON booking_doctor_services("companyId");
CREATE INDEX IF NOT EXISTS "booking_doctor_services_serviceId_idx" ON booking_doctor_services("serviceId");

-- New service columns
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS "basePrice" DOUBLE PRECISION;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
CREATE INDEX IF NOT EXISTS "booking_services_categoryId_idx" ON booking_services("categoryId");

-- Foreign keys (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_service_categories_companyId_fkey') THEN
    ALTER TABLE booking_service_categories ADD CONSTRAINT "booking_service_categories_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES companies("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_doctor_services_companyId_fkey') THEN
    ALTER TABLE booking_doctor_services ADD CONSTRAINT "booking_doctor_services_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES companies("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_doctor_services_doctorId_fkey') THEN
    ALTER TABLE booking_doctor_services ADD CONSTRAINT "booking_doctor_services_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES booking_doctors("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_doctor_services_serviceId_fkey') THEN
    ALTER TABLE booking_doctor_services ADD CONSTRAINT "booking_doctor_services_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES booking_services("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_services_categoryId_fkey') THEN
    ALTER TABLE booking_services ADD CONSTRAINT "booking_services_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES booking_service_categories("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
