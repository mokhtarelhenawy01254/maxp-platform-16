# Agent Management Refactor — 2026

## Problem
The platform had 5+ overlapping sources managing the same agent data:
1. `agent.json` files (backend/agents/*)
2. `AgentTemplate` table (ai.agent_templates)
3. `Agent` table (ai.agents)
4. `CompanyAgent` table (ai.company_agents + public.company_agents)
5. `AgentDefinition` table (public.agent_definitions)
6. `AiSetting.promptTemplate / agentSkills` fields

This caused:
- Same agent read from 4+ different places
- Template registry read `agent.json` separately from the loader
- Node.js backend dual-wrote to `public.company_agents` after ai-service API calls
- SuperAdmin edited `agent_definitions` while ai-service used `agent_templates`
- `agentConfigRoutes.js` stored soul/rules/skills in `AiSetting` independently

## Solution — Single Source of Truth

### Templates: `ai.agent_templates` (DB) → `agent.json` (dev fallback)
- `template_registry.py` now reads from DB first, falls back to files
- `loader.py` does upsert (not just insert) to keep DB in sync
- `agent.json` files are dev-time artifacts; run `scripts/seed_agent_templates.py` after changes

### Runtime Instances: `ai.agents` (unified table)
- `CompanyAgent` model removed; all fields merged into `Agent`
- New fields: description, icon, soul, rules, skills, department_id, manager_type, created_by
- Alembic migration 0015 handles schema change + data migration

### Deprecated / Removed
- `ai.company_agents` table → migrated into `ai.agents` by migration 0015
- `public.agent_definitions` table → Prisma migration drops it; data migrated to `ai.agent_templates`
- `agentConfigRoutes.js` soul/rules/skills → delegated to ai-service AgentTemplate API
- Dual-write sync in `agentManagerRoutes.js` and `agentControlRoutes.js` → removed

### New API Endpoints
- `GET /admin/agent-templates` — list all templates
- `GET /admin/agent-templates/{slug}` — get template
- `POST /admin/agent-templates` — create template
- `PUT /admin/agent-templates/{slug}` — update template
- `DELETE /admin/agent-templates/{slug}` — delete template

### New Client Methods (aiServiceAdminClient.js)
- `listAgentTemplates()`, `getAgentTemplate()`, `createAgentTemplate()`, `updateAgentTemplate()`, `deleteAgentTemplate()`

## Migration Steps (production)
1. Run Alembic migration 0015 (adds columns to ai.agents, migrates data from ai.company_agents, drops table)
2. Run Prisma migration 20260616_drop_agent_definitions (migrates data to ai.agent_templates, drops table)
3. Run `python -m scripts.seed_agent_templates` to ensure all agent.json templates are in DB
4. Restart ai-service (template_registry will now read from DB)
5. Restart backend (routes now use ai-service API)

## Files Changed
- apps/ai-service/src/db/models/agent.py — unified Agent model, removed CompanyAgent
- apps/ai-service/src/db/models/__init__.py — removed CompanyAgent export
- apps/ai-service/src/db/repo/agent_repo.py — uses Agent instead of CompanyAgent
- apps/ai-service/src/agents/loader.py — upsert templates, added docs
- apps/ai-service/src/prompts/template_registry.py — DB-first loading
- apps/ai-service/src/api/admin/agents.py — template management endpoints, unified queries
- apps/ai-service/src/services/agent_registry.py — uses Agent model
- apps/ai-service/migrations/versions/0015_unify_agents_table.py — migration
- apps/ai-service/scripts/seed_agent_templates.py — seed script
- apps/backend/routes/agentManagerRoutes.js — removed Prisma agent reads
- apps/backend/routes/superAdminRoutes.js — replaced AgentDefinition with ai-service API
- apps/backend/routes/agentConfigRoutes.js — delegated to ai-service for soul/rules/skills
- apps/backend/routes/agentControlRoutes.js — removed dual-write sync
- apps/backend/services/aiServiceAdminClient.js — added template management methods
- apps/backend/prisma/migrations/20260616_drop_agent_definitions/migration.sql
