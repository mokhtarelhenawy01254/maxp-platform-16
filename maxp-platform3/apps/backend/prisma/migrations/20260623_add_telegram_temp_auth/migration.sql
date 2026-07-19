-- Migration: Add Telegram temp auth fields
-- Date: 2026-06-23
-- Description: Persist temp auth session and phoneCodeHash to survive restarts and multi-instance deployments

ALTER TABLE `telegram_configs` 
ADD COLUMN `temp_auth_session` TEXT NULL COMMENT 'Temporary auth session string (pre-login)' AFTER `sessionString`,
ADD COLUMN `temp_phone_code_hash` TEXT NULL COMMENT 'Temporary phone code hash from sendCode' AFTER `temp_auth_session`;
