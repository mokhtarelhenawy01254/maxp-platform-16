-- Fix Migration State and Data Truncation Issues
-- This script resolves the failed migration state and handles data type conversions

-- Step 1: Mark the failed migration as resolved
-- This will be handled by the deployment script with: npx prisma migrate resolve --applied 20250120_add_product_reviews

-- Step 2: Handle data truncation issues for 'type' columns
-- Update any invalid data in type columns before schema changes

-- Fix TelegramUserbot type column - ensure values match expected enum values
UPDATE telegram_userbot_chats 
SET type = 'GROUP' 
WHERE type NOT IN ('GROUP', 'CHANNEL') AND type IS NOT NULL;

-- Fix any other type columns that might have invalid data
-- Update task type columns to use valid values
UPDATE notifications 
SET type = 'general' 
WHERE type IS NULL OR type = '';

UPDATE task_notifications 
SET type = 'general' 
WHERE type IS NULL OR type = '';

UPDATE task_templates 
SET type = 'general' 
WHERE type IS NULL OR type = '';

UPDATE tasks 
SET type = 'general' 
WHERE type IS NULL OR type = '';

UPDATE task_dependencies 
SET type = 'blocked_by' 
WHERE type IS NULL OR type = '';

-- Step 3: Ensure product_reviews table exists (from the failed migration)
CREATE TABLE IF NOT EXISTS `product_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `rating` INT NOT NULL,
    `title` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `helpfulCount` INT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_reviews_productId_idx`(`productId`),
    INDEX `product_reviews_companyId_idx`(`companyId`),
    INDEX `product_reviews_isApproved_idx`(`isApproved`),
    INDEX `product_reviews_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraints if they don't exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
                  WHERE CONSTRAINT_NAME = 'product_reviews_productId_fkey' 
                  AND TABLE_SCHEMA = DATABASE());

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key product_reviews_productId_fkey already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
                  WHERE CONSTRAINT_NAME = 'product_reviews_companyId_fkey' 
                  AND TABLE_SCHEMA = DATABASE());

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key product_reviews_companyId_fkey already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Clean up any orphaned data that might cause foreign key issues
-- Remove any product_reviews that reference non-existent products or companies
DELETE pr FROM product_reviews pr 
LEFT JOIN products p ON pr.productId = p.id 
WHERE p.id IS NULL;

DELETE pr FROM product_reviews pr 
LEFT JOIN companies c ON pr.companyId = c.id 
WHERE c.id IS NULL;

SELECT 'Migration state fix completed successfully' as status;
