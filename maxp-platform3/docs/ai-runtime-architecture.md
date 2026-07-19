# AI Runtime Architecture

Last updated: 2026-05-19

## Customer Reply Runtime

The production customer reply path is Core-only:

1. Facebook Messenger inbound saves the message and dispatches it through the durable queue.
2. `messengerLiveExecutionService` prepares the live run and calls `CoreAIAgent.prepareContextBag`.
3. `contextPreparationService` builds grounded context: recent memory, conversation state, catalog grounding, image intent, pricing/shipping facts, and skill runtime facts.
4. `readOnlyToolPlanningService` and `toolOrchestratorService` provide real tool execution evidence for grounded facts.
5. `providerGenerationService` builds the section-based dynamic system prompt as the primary prompt.
6. The model generates the customer-facing reply.
7. `customerReplyFinalizationService` applies final fact gates, suppression, and reply-source metadata.
8. Delivery goes through queue/outbox workers, not legacy direct-send agents.

## Removed Runtime Paths

The following legacy customer-message modules were physically removed:

- `backend/services/aiAgent/legacy/LegacyAgent.js`
- `backend/services/aiAgent/modern/ModernAgent.js`
- `backend/services/aiAgent/modern/tools/ToolRegistry.js`
- `backend/services/aiAgent/modern/tools/PriceTool.js`
- `backend/services/aiAgent/modern/tools/ShippingTool.js`

`AgentFactory` and `messageProcessor` remain as disabled compatibility shells only. They must not instantiate or import legacy/modern agents.

## Legacy/Modern Toggle Status

The `useModernAgent` database field may still exist for old records and API compatibility, but it has no runtime effect.

Bulk legacy/modern updates are no-op compatibility calls. They return Core-only metadata and do not update AI settings.

## Skills Runtime

`/ai-skills` is no longer treated as a prompt-only feature in the customer context path.

Current runtime:

1. Load enabled company skills.
2. Match the customer message against skill trigger phrases.
3. Parse the skill `tools` list.
4. Execute supported read-only tools through `toolOrchestratorService`.
5. Block unsupported/write tools from direct customer reply execution.
6. Add skill runtime facts and tool outputs to the system prompt as internal facts.

Supported direct skill tools:

- `product.search`
- `faq.retrieve`
- `shipping.quote`
- `order.lookup`

Write tools must go through approval flows, not direct skill execution in a customer reply.

## System Prompt

The primary prompt builder is now the section-based dynamic system prompt. The legacy monolithic builder remains only as an emergency fallback when the dynamic builder fails or when `CORE_AI_DYNAMIC_SYSTEM_PROMPT_PRIMARY=false`.

Active prompt sections include:

- base persona
- channel context
- read-only tool results
- RAG data
- learning corrections
- few-shot examples
- AI-first fact references
- order execution facts
- matched product
- recommended images
- authoritative reply facts
- conversation summary
- image intent
- skills
- shipping context
- promotions
- customer profile
- page info
- personalization

## Workspace Files

Workspace self-editing is available through a restricted internal service and API.

Allowed files only:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`

Protections:

- allowlist enforcement
- path traversal blocking
- max file size
- obvious secret rejection
- atomic write
- audit log at `memory/workspace-file-audit.jsonl`
- API access restricted to super admins

Admin surface:

- Backend API: `GET/PUT/POST /api/v1/workspace-files`
- Frontend route: `/settings/workspace-files`
- Sidebar: AI section, `Workspace Files`

This feature is intentionally not exposed to customer-facing AI replies. It is an operator/runtime maintenance surface for controlled agent instructions, not a commerce conversation tool.

## Frontend AI Cleanup Decisions

Confirmed deletion:

- `frontend/src/components/ai/PromptTemplateManager.tsx` was removed because its only UI tab called `/ai/templates`, a backend route that is not mounted in the active API. It also duplicated prompt/template control in a way that looked like fixed customer replies.
- `backend/routes/promptTemplateRoutes.js` and `backend/controller/promptTemplateController.js` were removed because they were unmounted duplicates for the same dead `/ai/templates` surface. The active prompt-template API remains `aiRoutes.js` -> `aiPromptController` at `/ai/prompt-templates`.

Kept for now:

- `/settings/smart-replies` remains the only fixed customer-reply surface.
- `ResponseRulesSettings` remains as prompt-guideline configuration, not a fixed-reply source. Its defaults were narrowed so they no longer push unverified price, offer, shipping-time, emoji, or gratitude behavior.

## Current Known Cleanup Backlog

- Rename the compatibility `legacyAgentModeService` surface after all admin clients stop sending `useModernAgent`.
- Split the largest AI modules (`modelManager`, `catalogImageGroundingService`, `imageProcessor`, `orderProcessor`, `contextPreparationService`) into smaller runtime-owned modules.
- Promote route inventory into CI for frontend dead-page cleanup.
- Convert skill matching from substring-only to model/embedding-assisted selection with deterministic guardrails.
