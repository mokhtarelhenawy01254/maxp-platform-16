-- Fleet OTP delivery proof: hashed 4-digit code sent to the customer on internal-courier dispatch
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);
