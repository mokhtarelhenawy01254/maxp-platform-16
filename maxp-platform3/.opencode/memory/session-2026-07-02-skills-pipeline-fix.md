# Session: Skills Pipeline Fix — 11/19 Agent Tools Missing

## Date: 2026-07-02

## Root Cause
The skills pipeline (`process_with_skills` in `src/pipeline/stages/skills_pipeline.py`) only passes registered Skill objects from `SkillRegistry` to the LLM as callable OpenAI function definitions. Only 8 of 19 SALES_REP tool names have matching registered skills. The other 11 are mentioned in the system prompt (TOOLS.md) but aren't available as proper `tool_calls` functions. When the LLM tries to call one, the raw XML `<invoke>` tag is displayed as text.

## Skills vs Tools mismatch for SALES_REP (نور)

**8 tools WITH matching skill:** product_search, customer_info, order_lookup, inventory_check, shipping_rates, facebook_reply, knowledge_search, offers_list_active

**11 tools WITHOUT matching skill:** product_top_selling, product_performance, category_list, customer_top_buyers, order_create_confirmed, discount_create_draft, whatsapp_send, knowledge_ask_merchant, knowledge_create_faq, abandoned_carts, coupon_validate

## Fix Applied
**File:** `apps/ai-service/src/pipeline/stages/skills_pipeline.py`

**Change 1 — `_execute_one()` fallback (lines 102-115):**
When `registry.get(func_name)` returns None, fall back to `ALL_TOOLS.get(func_name)`. If found, validate via `tool.input_model(**arguments)` and execute via `await tool.func(validated)`.

**Change 2 — Native tools as OpenAI functions in `_llm_call()` (lines 249-256):**
After `tool_dicts = [s.to_openai_tool() for s in skills]`, iterate `ctx.agent.allowed_tools` and append `ALL_TOOLS[name].to_json_schema_spec()` for each tool without a matching skill.

**Change 3 — Same fix for retry path (lines 139-144):**
Applied identical logic in the JSON parse error retry path.

## Test Results Before Fix
- **product_search** ✅ Works (has skill)
- **offers_list_active** ✅ Works (has skill)
- **customer_info** ✅ Works (has skill)
- **shipping_rates** ✅ Works (has skill, 70 EGP Cairo)
- **product_top_selling** ❌ Shows raw `<invoke>` XML (no skill)
- **category_list** ❌ Hangs when called (no skill)
- **inventory_check** ❌ Hangs (has skill but other issue)
- **multiple parallel tool calls** ❌ Hangs

## Deploy Needed
Docker not available locally. Changes need deployment to maxp.online server for verification.
