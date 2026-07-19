ALTER TABLE "hr_settings"
ADD COLUMN "contractRenewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "notifyOnLeaveRequest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnAttendanceIssue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnPayrollGeneration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyManagers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnWarning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnProbationEnd" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnContractExpiry" BOOLEAN NOT NULL DEFAULT true;
