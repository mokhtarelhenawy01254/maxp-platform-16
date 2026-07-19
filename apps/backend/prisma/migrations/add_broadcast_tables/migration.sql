-- Create broadcast_campaigns table
CREATE TABLE IF NOT EXISTS `broadcast_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'facebook',
    `message` TEXT NOT NULL,
    `targetAudience` VARCHAR(191) NOT NULL,
    `waTemplateName` VARCHAR(191) NULL,
    `waLanguageCode` VARCHAR(191) NULL DEFAULT 'en',
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `tags` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `includeImages` BOOLEAN NOT NULL DEFAULT false,
    `trackClicks` BOOLEAN NOT NULL DEFAULT true,
    `autoResend` BOOLEAN NOT NULL DEFAULT false,
    `images` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `recipientCount` INT NOT NULL DEFAULT 0,
    `sentCount` INT NOT NULL DEFAULT 0,
    `deliveredCount` INT NOT NULL DEFAULT 0,
    `openedCount` INT NOT NULL DEFAULT 0,
    `clickedCount` INT NOT NULL DEFAULT 0,
    `failedCount` INT NOT NULL DEFAULT 0,
    `companyId` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `broadcast_campaigns_companyId_idx`(`companyId`),
    INDEX `broadcast_campaigns_scheduledAt_idx`(`scheduledAt`),
    INDEX `broadcast_campaigns_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS `broadcast_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `messengerUserId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `repliedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `messageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `broadcast_recipients_campaignId_idx`(`campaignId`),
    INDEX `broadcast_recipients_conversationId_idx`(`conversationId`),
    INDEX `broadcast_recipients_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create broadcast_settings table
CREATE TABLE IF NOT EXISTS `broadcast_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `defaultSendTime` VARCHAR(191) NOT NULL DEFAULT '10:00',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Riyadh',
    `maxRecipientsPerCampaign` INT NOT NULL DEFAULT 5000,
    `maxCampaignsPerDay` INT NOT NULL DEFAULT 10,
    `enableDeliveryReports` BOOLEAN NOT NULL DEFAULT true,
    `enableOpenTracking` BOOLEAN NOT NULL DEFAULT true,
    `enableClickTracking` BOOLEAN NOT NULL DEFAULT true,
    `enableUnsubscribeTracking` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnCampaignSent` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnHighUnsubscribeRate` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnLowDeliveryRate` BOOLEAN NOT NULL DEFAULT true,
    `adminEmail` VARCHAR(191) NULL,
    `requireApprovalForHighVolume` BOOLEAN NOT NULL DEFAULT false,
    `highVolumeThreshold` INT NOT NULL DEFAULT 1000,
    `enableContentFiltering` BOOLEAN NOT NULL DEFAULT false,
    `blockedWords` TEXT NULL,
    `messagesPerMinute` INT NOT NULL DEFAULT 60,
    `messagesPerHour` INT NOT NULL DEFAULT 1000,
    `messagesPerDay` INT NOT NULL DEFAULT 10000,
    `defaultFooter` TEXT NULL,
    `unsubscribeText` TEXT NOT NULL DEFAULT 'للإلغاء اكتب STOP',
    `companyName` VARCHAR(191) NULL,
    `companyAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `broadcast_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create customer_lists table
CREATE TABLE IF NOT EXISTS `customer_lists` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `criteria` TEXT NOT NULL,
    `count` INT NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_lists_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
