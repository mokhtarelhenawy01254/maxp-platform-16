-- DropTable: agent_definitions
-- 2026 refactor: agent_definitions replaced by ai.agent_templates (managed by ai-service)

-- Migrate any remaining data from agent_definitions to ai.agent_templates
INSERT INTO ai.agent_templates (slug, role, name, version, model_policy, allowed_tools, allowed_skills, channels, guardrails, persona_meta, instructions_agents, instructions_soul, instructions_tools, instructions_persona, human_approval, handoffs, mcp_servers, budget, output_schema, config)
SELECT 
    ad.type AS slug,
    COALESCE((ad.settings::jsonb->>'role'), ad.type) AS role,
    ad.name,
    '1.0.0' AS version,
    '{}'::jsonb AS model_policy,
    COALESCE((ad.settings::jsonb->>'allowedTools'), '[]'::jsonb) AS allowed_tools,
    COALESCE((ad.settings::jsonb->>'allowedSkills'), '[]'::jsonb) AS allowed_skills,
    '[]'::jsonb AS channels,
    '{}'::jsonb AS guardrails,
    '{}'::jsonb AS persona_meta,
    NULL AS instructions_agents,
    (ad.settings::jsonb->>'soul') AS instructions_soul,
    NULL AS instructions_tools,
    NULL AS instructions_persona,
    '{}'::jsonb AS human_approval,
    '[]'::jsonb AS handoffs,
    '[]'::jsonb AS mcp_servers,
    '{}'::jsonb AS budget,
    NULL AS output_schema,
    '{}'::jsonb AS config
FROM agent_definitions ad
WHERE NOT EXISTS (
    SELECT 1 FROM ai.agent_templates at WHERE at.slug = ad.type
)
ON CONFLICT DO NOTHING;

-- Now drop the table
DROP TABLE IF EXISTS agent_definitions;
