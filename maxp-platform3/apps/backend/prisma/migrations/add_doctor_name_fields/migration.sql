-- AlterTable: add name/specialty/phone to booking_doctors
ALTER TABLE "booking_doctors"
    ADD COLUMN "name" TEXT,
    ADD COLUMN "specialty" TEXT,
    ADD COLUMN "phone" TEXT;
