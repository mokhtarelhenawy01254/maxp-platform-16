-- OTP brute-force guard: count wrong delivery-code attempts per shipment (lock after 5)
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
