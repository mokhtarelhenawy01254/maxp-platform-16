-- CreateTable: agent_definitions
-- Stores global AI agent configurations (Soul / Rules / Skills) per agent type.
-- Each AgentDefinition is a named "template" that companies inherit from
-- unless they have a company-specific AiSetting override.

CREATE TABLE IF NOT EXISTS "agent_definitions" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "type"        TEXT        NOT NULL,
  "description" TEXT,
  "icon"        TEXT        DEFAULT '🤖',
  "settings"    TEXT,
  "isBuiltIn"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- Unique index on type (each agent type appears once globally)
CREATE UNIQUE INDEX IF NOT EXISTS "agent_definitions_type_key" ON "agent_definitions"("type");
