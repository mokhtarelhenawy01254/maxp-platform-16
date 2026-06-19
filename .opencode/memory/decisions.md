# Decisions

## 2024-06-14: Long-term memory setup
- Activated `.opencode/memory/` directory for cross-session persistence
- Created categorized files: project-context, user-preferences, decisions, session-logs
- Goal: remember work context across sessions

## 2026-06-16: Strict CI/CD Compliance & Pre-Push Rules
- **TypeScript & ESLint**: NEVER push frontend code without running `npm run build` or `npx tsc --noEmit` and `npx eslint <changed_files>` to ensure zero strict typing (`any`) errors or hook dependency warnings.
- **Documentation Compliance**: The CI enforces a strict `verify-docs.js` check. If any source code files are modified, a corresponding `.md` file must be updated/created in the relevant `docs/` folder (e.g. `apps/frontend/docs/`), OR the commit message must contain `[no-doc]`.
- **Translations/i18n**: Whenever translation files or components using translations change, `npm run build` runs `i18n:merge`. These generated `translation.json` files must be staged and committed alongside the original code.
- **Git Workflow**: Always adhere to the `git add && git commit && git pull --rebase && git push` workflow to prevent stash data loss.

## 2026-06-18: Platform Plans Center Removal
- Removed the Platform Plans (خطط المنصة) administration tab and route from the Super Admin dashboard.
- Frontend files updated: `SubscriptionCenter.tsx`, `App.tsx`, `SuperAdminSidebar.tsx`, `projectMapData.tsx`.
- Automated test updated: `SubscriptionCenter.catalogDiff.test.tsx`.
- Added documentation under `apps/frontend/docs/super-admin-plans-center-removal.md` to satisfy CI requirements.
- Left the database models and backend routes intact to support active subscriptions.

## 2026-06-18: AI Service Agent Runtime is Not Unified
- Observation: The `maxp-ai-service` Python service has multiple inconsistent ways to build, configure, and run agents.
- Evidence:
  - `BaseAgent.build()` is synchronous and uses `build_agent_client()`, which hardcodes provider selection to `settings.default_llm_provider` (currently `google`). This means any agent config that specifies `provider="DEEPSEEK"` or `model="deepseek-v4-flash"` is ignored when the SDK runtime (A2A/internal) is used.
  - `BaseAgent.ensure_client()` is async and uses `build_provider_client_async()`, which respects `config.provider` and `model`, but it is only used by some pipeline paths.
  - `create_order_agent()` / `create_ceo_agent()` factory functions also hardcode `settings.default_model` and ignore DB/agent-specific model/provider settings.
  - `AgentRegistry.spawn()` persists model name but does not persist or use provider/key_id.
  - The pipeline runtime and the SDK runtime (Microsoft Agent Framework) have different memory models: pipeline uses caller-supplied `memory_context` only, while SDK runtime has built-in session memory. There is no automatic working memory injection in the pipeline path.
  - `LLMFallbackProvider` is used by classifiers/orchestrator and defaults to Gemini regardless of the agent's configured model/provider.
- Decision: Before expanding DeepSeek/OpenRouter/etc. support, unify the agent client construction so every runtime path honors a single source of truth: agent config (model, provider, key_id) backed by `ModelManager` and DB keys. Treat the current mixed runtime as a known architectural debt item, not a per-bug fix.
- Affected files: `apps/ai-service/src/agents/base.py`, `apps/ai-service/src/agents/order.py`, `apps/ai-service/src/agents/ceo.py`, `apps/ai-service/src/services/agent_registry.py`, `apps/ai-service/src/llm/agent_client_factory.py`, `apps/ai-service/src/observability/llm_fallback.py`, `apps/ai-service/src/pipeline/context.py`.
