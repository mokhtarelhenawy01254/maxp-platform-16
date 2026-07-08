# Learned Patterns

## 2026-07-08 — Skill/Tool System Unification

### Problem
MaxP had two parallel systems: `ALL_TOOLS` (47 FunctionTools from `definitions/`) and `SkillRegistry` (19 Skills from `register_all.py`). Pipeline used fallback chain: `registry.get()` → `ALL_TOOLS.get()`. This caused silent failures and registration gaps.

### Solution
Unified both systems into `SkillRegistry` as single source of truth:
- `SkillRegistry.register_tool(FunctionTool)` — new method
- `SkillRegistry.resolve(name)` — single lookup, converts Skill → FunctionTool automatically
- Pipeline `_execute_one()` uses `registry.resolve()` only — no fallback
- ALL_TOOLS kept as deprecated dict for backward-compatible re-exports

### Key Files Changed
- `apps/ai-service/src/skills/registry.py` — expanded with FunctionTool support
- `apps/ai-service/src/tools/registry.py` — auto-registers tools, updated consumers
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — removed ALL_TOOLS fallback + import
- `scripts/validate-agent-skills.js` — unified CI validation (23 agents, 31 skills, 0 errors)

### Lesson
Single-registry pattern matches 2026 industry standard (OpenAI Agents SDK, Microsoft Agent Framework). DeepSeek V4 API compatible (same OpenAI wire format).
