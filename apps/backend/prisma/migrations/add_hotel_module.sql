-- Hotel Module Migration
-- Compatible with Prisma camelCase field names (companyId, propertyId, etc.)

-- Enums (idempotent)
DO $$ BEGIN CREATE TYPE "hotel_room_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "hotel_reservation_status" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "hotel_folio_item_type" AS ENUM ('ROOM_CHARGE', 'SERVICE', 'RESTAURANT', 'SPA', 'TOUR', 'TRANSPORT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Hotel Properties
CREATE TABLE IF NOT EXISTS "hotel_properties" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    description TEXT,
    amenities JSONB,
    images JSONB,
    "checkInTime" TEXT DEFAULT '14:00',
    "checkOutTime" TEXT DEFAULT '12:00',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_properties_company ON hotel_properties("companyId");

-- Hotel Room Types
CREATE TABLE IF NOT EXISTS "hotel_room_types" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "propertyId" TEXT NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "nameAr" TEXT,
    description TEXT,
    capacity INT DEFAULT 2,
    "basePrice" FLOAT NOT NULL DEFAULT 0,
    amenities JSONB,
    images JSONB,
    "totalRooms" INT DEFAULT 1,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_room_types_company ON hotel_room_types("companyId");
CREATE INDEX IF NOT EXISTS idx_hotel_room_types_property ON hotel_room_types("propertyId");

-- Hotel Rooms
CREATE TABLE IF NOT EXISTS "hotel_rooms" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "propertyId" TEXT NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id) ON DELETE CASCADE,
    "roomNumber" TEXT NOT NULL,
    floor INT,
    status "hotel_room_status" DEFAULT 'AVAILABLE',
    notes TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("propertyId", "roomNumber")
);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_company ON hotel_rooms("companyId");
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_property ON hotel_rooms("propertyId");
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_type ON hotel_rooms("roomTypeId");
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_status ON hotel_rooms(status);

-- Hotel Reservations
CREATE TABLE IF NOT EXISTS "hotel_reservations" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "propertyId" TEXT NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
    "customerId" TEXT REFERENCES customers(id),
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerNotes" TEXT,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    adults INT DEFAULT 1,
    children INT DEFAULT 0,
    "totalAmount" FLOAT NOT NULL DEFAULT 0,
    "paidAmount" FLOAT DEFAULT 0,
    status "hotel_reservation_status" DEFAULT 'PENDING',
    source TEXT,
    "createdById" TEXT,
    "createdByType" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_company ON hotel_reservations("companyId");
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_property ON hotel_reservations("propertyId");
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_customer ON hotel_reservations("customerId");
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_status ON hotel_reservations(status);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_dates ON hotel_reservations("checkIn", "checkOut");

-- Hotel Reservation Rooms (join table)
CREATE TABLE IF NOT EXISTS "hotel_reservation_rooms" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "reservationId" TEXT NOT NULL REFERENCES hotel_reservations(id) ON DELETE CASCADE,
    "roomId" TEXT NOT NULL REFERENCES hotel_rooms(id),
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id),
    "nightlyRate" FLOAT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("reservationId", "roomId")
);
CREATE INDEX IF NOT EXISTS idx_hotel_reservation_rooms_reservation ON hotel_reservation_rooms("reservationId");
CREATE INDEX IF NOT EXISTS idx_hotel_reservation_rooms_room ON hotel_reservation_rooms("roomId");

-- Hotel Folio Items (additional charges)
CREATE TABLE IF NOT EXISTS "hotel_folio_items" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "reservationId" TEXT NOT NULL REFERENCES hotel_reservations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount FLOAT NOT NULL DEFAULT 0,
    "itemType" "hotel_folio_item_type" DEFAULT 'SERVICE',
    quantity INT DEFAULT 1,
    "chargedAt" TIMESTAMP DEFAULT now(),
    "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_folio_items_company ON hotel_folio_items("companyId");
CREATE INDEX IF NOT EXISTS idx_hotel_folio_items_reservation ON hotel_folio_items("reservationId");

-- Hotel Room Rates (seasonal pricing)
CREATE TABLE IF NOT EXISTS "hotel_room_rates" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id) ON DELETE CASCADE,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    price FLOAT NOT NULL,
    label TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotel_room_rates_company ON hotel_room_rates("companyId");
CREATE INDEX IF NOT EXISTS idx_hotel_room_rates_type ON hotel_room_rates("roomTypeId");
CREATE INDEX IF NOT EXISTS idx_hotel_room_rates_dates ON hotel_room_rates("dateFrom", "dateTo");

-- v2: HotelPricingModel enum + new columns (per-person pricing, room view/wing, extra bed, deposit)
DO $$ BEGIN
  CREATE TYPE "HotelPricingModel" AS ENUM ('PER_ROOM', 'PER_PERSON');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE hotel_room_types
  ADD COLUMN IF NOT EXISTS "pricingModel" "HotelPricingModel" NOT NULL DEFAULT 'PER_ROOM',
  ADD COLUMN IF NOT EXISTS "pricePerExtraAdult" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE hotel_rooms
  ADD COLUMN IF NOT EXISTS "view" TEXT,
  ADD COLUMN IF NOT EXISTS "wing" TEXT,
  ADD COLUMN IF NOT EXISTS "hasExtraBed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "extraBedCapacity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "extraBedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "basePriceOverride" DOUBLE PRECISION;

ALTER TABLE hotel_reservations
  ADD COLUMN IF NOT EXISTS "adults" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "children" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
