-- Add HotelPricingModel enum
DO $$ BEGIN
  CREATE TYPE "HotelPricingModel" AS ENUM ('PER_ROOM', 'PER_PERSON');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add pricing columns to hotel_room_types
ALTER TABLE hotel_room_types
  ADD COLUMN IF NOT EXISTS "pricingModel" "HotelPricingModel" NOT NULL DEFAULT 'PER_ROOM',
  ADD COLUMN IF NOT EXISTS "pricePerExtraAdult" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add room-level columns to hotel_rooms
ALTER TABLE hotel_rooms
  ADD COLUMN IF NOT EXISTS "view" TEXT,
  ADD COLUMN IF NOT EXISTS "wing" TEXT,
  ADD COLUMN IF NOT EXISTS "hasExtraBed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "extraBedCapacity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "extraBedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "basePriceOverride" DOUBLE PRECISION;

-- Add deposit columns to hotel_reservations
ALTER TABLE hotel_reservations
  ADD COLUMN IF NOT EXISTS "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
