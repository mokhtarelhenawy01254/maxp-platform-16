ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHORTAGE_FAILED';

INSERT INTO migration_logs (name, executed_at, description)
VALUES ('20260808_add_shortage_failed_status', NOW(), 'Added SHORTAGE_FAILED status for permanent stock shortage orders')
ON CONFLICT (name) DO NOTHING;
