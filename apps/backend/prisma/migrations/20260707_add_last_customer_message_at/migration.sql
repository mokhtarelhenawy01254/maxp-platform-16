-- Add lastCustomerMessageAt column to whatsapp_contacts
-- Used for tracking the 24-hour WhatsApp messaging window expiry
ALTER TABLE `whatsapp_contacts`
ADD COLUMN `lastCustomerMessageAt` DATETIME(3) NULL AFTER `lastMessageAt`;
