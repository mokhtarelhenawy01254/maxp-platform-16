-- DropTable: company_agents
-- 2026 refactor: company_agents replaced by ai.agents (managed by ai-service)
-- All data has been migrated to ai.agents (migration 0015) + department_id/manager_type backfilled

DROP TABLE IF EXISTS "company_agents";
