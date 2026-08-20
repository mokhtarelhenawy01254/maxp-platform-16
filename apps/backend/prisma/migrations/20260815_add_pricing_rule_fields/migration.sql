-- AlterTable
ALTER TABLE `app_pricing_rules` ADD COLUMN `feature` VARCHAR(200) NULL,
ADD COLUMN `unit` VARCHAR(100) NULL,
ADD COLUMN `description` VARCHAR(1000) NULL,
ADD COLUMN `price` DECIMAL(10, 2) NULL;

-- AlterTable: make appId/name optional (pricing rules are managed standalone)
ALTER TABLE `app_pricing_rules` MODIFY `appId` VARCHAR(191) NULL,
MODIFY `name` VARCHAR(191) NULL;

-- AlterTable: marketplace apps auto-install flag
ALTER TABLE `marketplace_apps` ADD COLUMN `isAutoInstall` BOOLEAN NOT NULL DEFAULT false;

