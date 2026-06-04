-- AlterTable
ALTER TABLE `products` ADD COLUMN `embeddingImage` TEXT NULL,
    ADD COLUMN `embeddingImageGeneratedAt` DATETIME(3) NULL;
