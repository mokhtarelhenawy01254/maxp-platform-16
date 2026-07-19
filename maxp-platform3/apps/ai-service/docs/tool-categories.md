# Tool Categories

Tools are organized into groups (categories) derived from their name prefix, with manual overrides for edge cases. The group is computed by `_tool_group()` in `apps/ai-service/src/api/admin/agents.py` and returned as `"group"` in the `GET /admin/tools` response.

## Group derivation

- Split tool name on `_`, take the first token as group
- Tools with ambiguous prefixes have explicit overrides (e.g. `scheduler_create_job` → `governance`, `lead_score` → `smart_seller`)
- Manager tools (e.g. `agent.spawn`) get `management` group

## Frontend display

The group is rendered as a sidebar filter in `AgentToolsPage.tsx` with Arabic labels (e.g. `product` → `المنتجات`).
