-- Add channels column to company_agents (Prisma/Node.js managed)
ALTER TABLE "company_agents" ADD COLUMN IF NOT EXISTS "channels" TEXT;

-- Add channels column to ai.company_agents (SQLAlchemy/Python managed)
ALTER TABLE "ai"."company_agents" ADD COLUMN IF NOT EXISTS "channels" JSONB DEFAULT '[]'::jsonb;

-- Add channels column to ai.agents (SQLAlchemy/Python managed — template instances)
ALTER TABLE "ai"."agents" ADD COLUMN IF NOT EXISTS "channels" JSONB DEFAULT '[]'::jsonb;
