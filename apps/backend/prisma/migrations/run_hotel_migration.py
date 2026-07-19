import subprocess, sys

cmds = [
    '''DO $$ BEGIN CREATE TYPE "HotelPricingModel" AS ENUM ('PER_ROOM', 'PER_PERSON'); EXCEPTION WHEN duplicate_object THEN null; END $$;''',
    '''ALTER TABLE hotel_room_types ADD COLUMN IF NOT EXISTS "pricingModel" "HotelPricingModel" NOT NULL DEFAULT 'PER_ROOM';''',
    '''ALTER TABLE hotel_room_types ADD COLUMN IF NOT EXISTS "pricePerExtraAdult" DOUBLE PRECISION NOT NULL DEFAULT 0;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "view" TEXT;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "wing" TEXT;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "hasExtraBed" BOOLEAN NOT NULL DEFAULT false;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "extraBedCapacity" INTEGER NOT NULL DEFAULT 0;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "extraBedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;''',
    '''ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS "basePriceOverride" DOUBLE PRECISION;''',
    '''ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS "depositRequired" BOOLEAN NOT NULL DEFAULT false;''',
    '''ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;''',
    '''ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false;''',
    '''ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;''',
]

env = {"PGPASSWORD": "mokhtar1234"}
base = ["psql", "-h", "localhost", "-U", "appuser", "-d", "maxp"]

for i, cmd in enumerate(cmds):
    r = subprocess.run(base + ["-c", cmd], capture_output=True, text=True, env=env)
    if r.returncode != 0:
        print(f"Step {i} FAILED: {r.stderr.strip()}")
        sys.exit(1)
    print(f"Step {i} OK")

print("ALL STEPS PASSED")
