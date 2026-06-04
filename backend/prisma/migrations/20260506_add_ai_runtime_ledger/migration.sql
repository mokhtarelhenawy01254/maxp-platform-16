-- CreateTable: ai_runtime_ledger
CREATE TABLE `ai_runtime_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RUNNING',
    `traceId` VARCHAR(191) NULL,
    `conversationId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `userMessageId` VARCHAR(191) NULL,
    `outputMessageId` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_runtime_ledger_idempotencyKey_key`(`idempotencyKey`),
    INDEX `ai_runtime_ledger_companyId_idx`(`companyId`),
    INDEX `ai_runtime_ledger_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    INDEX `ai_runtime_ledger_conversationId_idx`(`conversationId`),
    INDEX `ai_runtime_ledger_expiresAt_idx`(`expiresAt`),
    INDEX `ai_runtime_ledger_traceId_idx`(`traceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
