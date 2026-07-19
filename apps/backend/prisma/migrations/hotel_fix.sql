-- Drop old tables if exist
DROP TABLE IF EXISTS hotel_room_rates CASCADE;
DROP TABLE IF EXISTS hotel_folio_items CASCADE;
DROP TABLE IF EXISTS hotel_reservation_rooms CASCADE;
DROP TABLE IF EXISTS hotel_reservations CASCADE;
DROP TABLE IF EXISTS hotel_rooms CASCADE;
DROP TABLE IF EXISTS hotel_room_types CASCADE;
DROP TABLE IF EXISTS hotel_properties CASCADE;

-- Drop enums if exist
DROP TYPE IF EXISTS hotel_folio_item_type CASCADE;
DROP TYPE IF EXISTS hotel_reservation_status CASCADE;
DROP TYPE IF EXISTS hotel_room_status CASCADE;

-- Enums
CREATE TYPE hotel_room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED');
CREATE TYPE hotel_reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
CREATE TYPE hotel_folio_item_type AS ENUM ('ROOM_CHARGE', 'SERVICE', 'RESTAURANT', 'SPA', 'TOUR', 'TRANSPORT', 'OTHER');

-- Hotel Properties
CREATE TABLE hotel_properties (
    id TEXT PRIMARY KEY,
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
CREATE INDEX idx_hotel_properties_company ON hotel_properties("companyId");

-- Hotel Room Types
CREATE TABLE hotel_room_types (
    id TEXT PRIMARY KEY,
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
CREATE INDEX idx_hotel_room_types_company ON hotel_room_types("companyId");
CREATE INDEX idx_hotel_room_types_property ON hotel_room_types("propertyId");

-- Hotel Rooms
CREATE TABLE hotel_rooms (
    id TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "propertyId" TEXT NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id) ON DELETE CASCADE,
    "roomNumber" TEXT NOT NULL,
    floor INT,
    status hotel_room_status DEFAULT 'AVAILABLE',
    notes TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("propertyId", "roomNumber")
);
CREATE INDEX idx_hotel_rooms_company ON hotel_rooms("companyId");
CREATE INDEX idx_hotel_rooms_property ON hotel_rooms("propertyId");
CREATE INDEX idx_hotel_rooms_type ON hotel_rooms("roomTypeId");
CREATE INDEX idx_hotel_rooms_status ON hotel_rooms(status);

-- Hotel Reservations
CREATE TABLE hotel_reservations (
    id TEXT PRIMARY KEY,
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
    status hotel_reservation_status DEFAULT 'PENDING',
    source TEXT,
    "createdById" TEXT,
    "createdByType" TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_hotel_reservations_company ON hotel_reservations("companyId");
CREATE INDEX idx_hotel_reservations_property ON hotel_reservations("propertyId");
CREATE INDEX idx_hotel_reservations_customer ON hotel_reservations("customerId");
CREATE INDEX idx_hotel_reservations_status ON hotel_reservations(status);
CREATE INDEX idx_hotel_reservations_dates ON hotel_reservations("checkIn", "checkOut");

-- Hotel Reservation Rooms
CREATE TABLE hotel_reservation_rooms (
    id TEXT PRIMARY KEY,
    "reservationId" TEXT NOT NULL REFERENCES hotel_reservations(id) ON DELETE CASCADE,
    "roomId" TEXT NOT NULL REFERENCES hotel_rooms(id),
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id),
    "nightlyRate" FLOAT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("reservationId", "roomId")
);
CREATE INDEX idx_hotel_reservation_rooms_reservation ON hotel_reservation_rooms("reservationId");
CREATE INDEX idx_hotel_reservation_rooms_room ON hotel_reservation_rooms("roomId");

-- Hotel Folio Items
CREATE TABLE hotel_folio_items (
    id TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "reservationId" TEXT NOT NULL REFERENCES hotel_reservations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount FLOAT NOT NULL DEFAULT 0,
    "itemType" hotel_folio_item_type DEFAULT 'SERVICE',
    quantity INT DEFAULT 1,
    "chargedAt" TIMESTAMP DEFAULT now(),
    "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_hotel_folio_items_company ON hotel_folio_items("companyId");
CREATE INDEX idx_hotel_folio_items_reservation ON hotel_folio_items("reservationId");

-- Hotel Room Rates
CREATE TABLE hotel_room_rates (
    id TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "roomTypeId" TEXT NOT NULL REFERENCES hotel_room_types(id) ON DELETE CASCADE,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    price FLOAT NOT NULL,
    label TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_hotel_room_rates_company ON hotel_room_rates("companyId");
CREATE INDEX idx_hotel_room_rates_type ON hotel_room_rates("roomTypeId");
CREATE INDEX idx_hotel_room_rates_dates ON hotel_room_rates("dateFrom", "dateTo");
