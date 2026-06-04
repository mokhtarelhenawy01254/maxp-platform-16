-- Drop the table and any associated types to start fresh for this model
DROP TABLE IF EXISTS "hr_audit_logs" CASCADE;
DROP TYPE IF EXISTS "AuditAction" CASCADE;
DROP TYPE IF EXISTS "AuditEntityType" CASCADE;
