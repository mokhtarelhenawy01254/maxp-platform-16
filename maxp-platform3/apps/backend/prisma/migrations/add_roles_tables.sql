-- Create PermissionDomain enum
DO  BEGIN
  CREATE TYPE "permission_domains" AS ENUM ('DASHBOARD','ORDERS','PRODUCTS','CUSTOMERS','CONVERSATIONS','SETTINGS','USERS','ROLES','REPORTS','WHATSAPP','FACEBOOK','MARKETING','STOREFRONT','HR','FINANCE','AI','INVENTORY');
EXCEPTION WHEN duplicate_object THEN NULL;
END ;

-- Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "domain" "permission_domains" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "permissions_key_key" UNIQUE ("key")
);

-- Create roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "companyId" TEXT,
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "roles_key_companyId_key" UNIQUE ("key", "companyId")
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

-- Add roleId column to user_companies
ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "roleId" TEXT;
