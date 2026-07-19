ALTER TABLE `ai_tool_approval_requests`
  ADD COLUMN `executionStatus` VARCHAR(191) NULL,
  ADD COLUMN `executionStartedAt` DATETIME(3) NULL,
  ADD COLUMN `executedAt` DATETIME(3) NULL,
  ADD COLUMN `executedByUserId` VARCHAR(191) NULL,
  ADD COLUMN `executionTraceId` VARCHAR(191) NULL,
  ADD COLUMN `executionResultSnapshot` TEXT NULL;

CREATE INDEX `ai_tool_approval_requests_companyId_executionStatus_createdAt_idx`
  ON `ai_tool_approval_requests`(`companyId`, `executionStatus`, `createdAt`);
