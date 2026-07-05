-- AlterTable
ALTER TABLE "order_workflow_configs" ADD COLUMN "overrideRoles" TEXT NOT NULL DEFAULT '["OWNER","SUPER_ADMIN"]';

-- AlterTable
ALTER TABLE "order_status_definitions" ADD COLUMN "notifyCustomer" BOOLEAN NOT NULL DEFAULT true;
