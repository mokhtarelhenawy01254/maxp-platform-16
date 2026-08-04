-- Patient identity fields (national ID + card image + address)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "nationalIdImage" TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "address" TEXT;
CREATE INDEX IF NOT EXISTS "patients_nationalId_idx" ON patients("nationalId");
