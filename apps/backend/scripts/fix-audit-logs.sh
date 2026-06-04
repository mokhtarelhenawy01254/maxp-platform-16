#!/bin/bash
# سكريبت لإصلاح أنواع بيانات Audit Logs في قاعدة البيانات
# Script to fix Audit Logs data types in the database

ENV_FILE="/var/www/backend2/.env"
echo "🔍 Checking for .env file at $ENV_FILE"

if [ -f "$ENV_FILE" ]; then
    echo "✅ .env file found. Proceeding with database fix..."
    
    # Cast columns to their respective enum types using sudo -u postgres psql
    # This is necessary because Prisma db push cannot cast TEXT to ENUM automatically when data exists
    
    sudo -u postgres psql -d maxp <<EOF
-- Create AuditAction enum if it doesn't exist
DO \$\$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SETTLEMENT', 'ASSIGN', 'UNASSIGN', 'ACTIVATE', 'DEACTIVATE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT', 'SYNC', 'REOPEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Create AuditEntityType enum if it doesn't exist
DO \$\$ BEGIN
    CREATE TYPE "AuditEntityType" AS ENUM ('LEAVE', 'ADVANCE', 'ADVANCE_REQUEST', 'RESIGNATION', 'EMPLOYEE', 'DEPARTMENT', 'POSITION', 'SHIFT', 'ATTENDANCE', 'PERMISSION_REQUEST', 'POLICY', 'DEDUCTION', 'MANUAL_DEDUCTION', 'PAYROLL', 'SALARY_UPDATE', 'GOAL', 'FEEDBACK', 'CLEARANCE', 'SETTLEMENT', 'USER', 'COMPANY', 'SETTINGS');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Alter the table columns with explicit casting
-- We use USING clause to convert existing text data to the new enum types
ALTER TABLE hr_audit_logs 
  ALTER COLUMN action TYPE "AuditAction" USING action::"AuditAction",
  ALTER COLUMN "entityType" TYPE "AuditEntityType" USING "entityType"::"AuditEntityType";

COMMIT;
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Database columns casted successfully to Enum types"
    else
        echo "⚠️ Database cast might have failed or types already exist"
    fi
else
    echo "❌ .env file NOT found. Cannot proceed with database fix."
fi
