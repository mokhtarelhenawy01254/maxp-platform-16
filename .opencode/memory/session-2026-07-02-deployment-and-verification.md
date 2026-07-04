# Session: Skills Pipeline Fix — Deployed and Verified

## Summary
- **Root cause:** skills_pipeline.py only registered Skill objects from SkillRegistry. 11/19 SALES_REP tools had no matching skill, causing LLM to output raw XML `<invoke>` text instead of executing tools.
- **Fix:** Added fallback to `ALL_TOOLS` dict (FunctionTool wrappers) in `_execute_one()` for execution, and in `_llm_call()` for LLM tool registration.
- **Deployed:** commit `7ba591a7` pushed to main → GitHub Actions deploy succeeded (5m29s).
- **Verified:** `product_top_selling` now executes properly (Python badge appears, tool returns data). Returns `NO_SALES_DATA` for Swan store (no orders yet) — agent handles gracefully.

## Files Changed
1. `apps/ai-service/src/pipeline/stages/skills_pipeline.py` (+23 lines) — fallback logic
2. `apps/ai-service/docs/skills-pipeline-architecture.md` (new) — architecture documentation

## Known Remaining Issues
- `inventory_check` sometimes hangs for large product queries (pre-existing, unrelated to fix)
- `category_list` hangs when called in parallel (pre-existing)
- Swan store has no order data, so `product_top_selling` returns empty results

## Git
- Commit: `7ba591a7` — "fix: skills pipeline fallback for tools without registered skills"
- Branch: main (production)
- Deploy run: #28549868266 — success
