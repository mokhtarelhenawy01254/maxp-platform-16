-- CreateTable: company_agents
-- Stores sub-agents created by CEO Agent per company.
-- Each agent has its own Soul, Rules, and Skills inherited from AgentDefinition.

CREATE TABLE IF NOT EXISTS "company_agents" (
  "id"           TEXT         NOT NULL,
  "companyId"    TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "role"         TEXT         NOT NULL,
  "description"  TEXT,
  "icon"         TEXT         DEFAULT '🤖',
  "soul"         TEXT,
  "rules"        TEXT,
  "skills"       TEXT,
  "model"        TEXT,
  "status"       TEXT         NOT NULL DEFAULT 'ACTIVE',
  "parentId"     TEXT,
  "templateSlug" TEXT,
  "createdBy"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "company_agents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_agents_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "company_agents_companyId_idx" ON "company_agents"("companyId");
