-- CreateTable employee_devices
CREATE TABLE IF NOT EXISTS "employee_devices" (
    "id" VARCHAR(191) NOT NULL,
    "companyId" VARCHAR(191) NOT NULL,
    "userId" VARCHAR(191) NOT NULL,
    "deviceId" VARCHAR(191) NOT NULL,
    "deviceName" VARCHAR(191),
    "socketId" VARCHAR(191),
    "fcmToken" VARCHAR(191),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "appVersion" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_devices_pkey" PRIMARY KEY ("id")
);

-- Unique index on deviceId
CREATE UNIQUE INDEX IF NOT EXISTS "employee_devices_deviceId_key" ON "employee_devices"("deviceId");

-- Indexes on (companyId, userId), deviceId, isOnline
CREATE INDEX IF NOT EXISTS "employee_devices_companyId_userId_idx" ON "employee_devices"("companyId", "userId");
CREATE INDEX IF NOT EXISTS "employee_devices_deviceId_idx" ON "employee_devices"("deviceId");
CREATE INDEX IF NOT EXISTS "employee_devices_isOnline_idx" ON "employee_devices"("isOnline");

-- Foreign keys with CASCADE delete to companies and users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_devices_companyId_fkey') THEN
        ALTER TABLE "employee_devices" ADD CONSTRAINT "employee_devices_companyId_fkey" 
            FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_devices_userId_fkey') THEN
        ALTER TABLE "employee_devices" ADD CONSTRAINT "employee_devices_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable call_attempt_logs: add session_id and sessionId with unique constraint
ALTER TABLE "call_attempt_logs" ADD COLUMN IF NOT EXISTS "sessionId" VARCHAR(191);
ALTER TABLE "call_attempt_logs" ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(191);

CREATE UNIQUE INDEX IF NOT EXISTS "call_attempt_logs_sessionId_key" ON "call_attempt_logs"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "call_attempt_logs_session_id_key" ON "call_attempt_logs"("session_id");
