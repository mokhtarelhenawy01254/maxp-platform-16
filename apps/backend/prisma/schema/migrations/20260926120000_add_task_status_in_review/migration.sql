-- Add missing IN_REVIEW to Task_status enum
-- Idempotent migration matching 20260628120000 pattern

ALTER TYPE "Task_status" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
