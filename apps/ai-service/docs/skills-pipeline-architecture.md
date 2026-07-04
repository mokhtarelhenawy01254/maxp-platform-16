# Skills Pipeline Architecture

## Overview

The skills pipeline (`src/pipeline/stages/skills_pipeline.py`) is the execution engine for agent tool calls. It:

1. Loads registered **Skill** objects from `SkillRegistry` (defined in `src/skills/`)
2. Passes them to the LLM as OpenAI tool definitions via `Skill.to_openai_tool()`
3. Parses LLM function call responses
4. Executes tool calls using `_execute_one()`

## Tool Resolution

### Primary Path (Skills)

The pipeline primarily works with registered `Skill` objects. Each skill has a `name` and wraps one or more tool implementations.

### Fallback Path (Tool Definitions)

Some agent tools (11 of 19 for SALES_REP) have no matching registered skill. These tools exist as `FunctionTool` wrappers in `ALL_TOOLS` dict (`src/tools/registry.py`) but were never discoverable by the pipeline.

The fix adds two fallbacks:

1. **Execution fallback** (`_execute_one()`): When `registry.get(func_name)` returns None, checks `ALL_TOOLS.get(func_name)` and executes via `tool.func(tool.input_model(**arguments))`.

2. **Registration fallback** (`_llm_call()`): After building tool dicts from skills, appends `ALL_TOOLS[name].to_json_schema_spec()` for any tool in `ctx.agent.allowed_tools` that lacks a matching skill.

## Skill-to-Tool Name Mismatches

| Tool Name | Skill Name |
|-----------|------------|
| `order_create_confirmed` | `create_confirmed_order` |
| `knowledge_ask_merchant` | `ask_merchant` |
| `product_top_selling` | (none) |
| `product_performance` | (none) |
| `category_list` | (none) |
| `customer_top_buyers` | (none) |
| `discount_create_draft` | (none) |
| `whatsapp_send` | (none) |
| `knowledge_create_faq` | (none) |
| `abandoned_carts` | (none) |
| `coupon_validate` | (none) |

## Error Handling / Result Formatting

- Missing tools return `{"tool": func_name, "status": "unknown"}` from the fallback path
- JSON parse errors trigger a retry with cleaned function name
- Parallel tool calls may hang if the backend has long-running queries
- Formatting results (`_format_tool_results`) dynamically parses output lists from catalog searches (`products`, `items`, `results`), category queries (`categories`), single product dictionaries (`productName`), and active offers or coupons. Correct labels and statuses are extracted based on the active tool, ensuring friendly fallback states if follow-up LLM calls fail.
- Message normalization (`_normalize_openai_messages` in `client.py`) automatically serializes Python dictionary arguments within tool calls to JSON strings to maintain compatibility with DeepSeek and standard OpenAI-compatible API schemas.
- In `_generate_openai_compat`, if `tool_choice` is set to `"none"`, the `tools` parameter is omitted entirely from the chat completion payload, avoiding provider-level tool definition processing errors.

## Follow-up Completion Context & Timouts (SOTA 2026)

To prevent `AI_SANDBOX_EMPTY_REPLY` failures and timeout hangs during multi-turn tool execution, the follow-up completion call (`_build_followup_messages`) is strictly aligned with the primary call:

1. **System Prompt Alignment**: Full skill instructions (`get_skills_block`) are injected into the system prompt of the follow-up call, allowing the model to remember custom instructions (e.g. suggesting alternatives on empty search results) during tool output synthesis.
2. **Context Retention**: Previous conversation turns (`recentMessages`) are retrieved and prepended to the user message, maintaining complete thread history.
3. **Multimodal/Vision Support**: Current user messages are processed via `build_user_content(ctx.message, ctx.attachments)` rather than plain text, preserving attached image media context for vision-capable models.
4. **Client Timeouts**: Standard `AsyncOpenAI` client instances configure an explicit timeout wrapper (`httpx.Timeout(60.0, connect=10.0)`) to abort slow or unresponsive provider APIs early.

