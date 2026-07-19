-- AlterTable
ALTER TABLE "hr_settings"
ADD COLUMN "autoCheckoutEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "autoCheckoutPolicy" TEXT NOT NULL DEFAULT 'SCHEDULED_END_AT_DAY_ROLLOVER',
ADD COLUMN "autoCheckoutReminderMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "autoCheckoutNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "attendance_auto_close_review_status" AS ENUM (
  'PENDING',
  'REVIEWED',
  'ADJUSTED',
  'DISMISSED'
);

-- CreateTable
CREATE TABLE "hr_attendance_auto_close_audits" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "attendanceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attendanceDate" DATE NOT NULL,
  "scheduledCheckOut" TIMESTAMP(3),
  "autoClosedAt" TIMESTAMP(3),
  "reminderSentAt" TIMESTAMP(3),
  "autoCloseReason" TEXT,
  "autoClosePolicy" TEXT NOT NULL DEFAULT 'SCHEDULED_END_AT_DAY_ROLLOVER',
  "reviewStatus" "attendance_auto_close_review_status" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hr_attendance_auto_close_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_attendance_auto_close_audits_attendanceId_key" ON "hr_attendance_auto_close_audits"("attendanceId");

-- CreateIndex
CREATE INDEX "hr_attendance_auto_close_audits_attendanceDate_idx" ON "hr_attendance_auto_close_audits"("attendanceDate");

-- CreateIndex
CREATE INDEX "hr_attendance_auto_close_audits_companyId_reviewStatus_idx" ON "hr_attendance_auto_close_audits"("companyId", "reviewStatus");

-- CreateIndex
CREATE INDEX "hr_attendance_auto_close_audits_companyId_autoClosedAt_idx" ON "hr_attendance_auto_close_audits"("companyId", "autoClosedAt");

-- CreateIndex
CREATE INDEX "hr_attendance_auto_close_audits_userId_idx" ON "hr_attendance_auto_close_audits"("userId");

-- AddForeignKey
ALTER TABLE "hr_attendance_auto_close_audits"
ADD CONSTRAINT "hr_attendance_auto_close_audits_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_auto_close_audits"
ADD CONSTRAINT "hr_attendance_auto_close_audits_attendanceId_fkey"
FOREIGN KEY ("attendanceId") REFERENCES "hr_attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_auto_close_audits"
ADD CONSTRAINT "hr_attendance_auto_close_audits_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_auto_close_audits"
ADD CONSTRAINT "hr_attendance_auto_close_audits_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
