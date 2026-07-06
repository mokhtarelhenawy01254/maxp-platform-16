## Late Cancellation — Dynamic Statuses (2026-07-04)

- `LateCancellationSettings.tsx` had a hardcoded `PREPARATION_STATUSES` array that didn't match actual company statuses
- Fixed by fetching from `GET /api/v1/order-status?statusType=order` + `?statusType=preparation`
- Terminal statuses excluded: CANCELLED, PENDING_CANCELLATION, TRASH, DRAFT, DUPLICATE_ORDER, RETURNED, REFUNDED, EXCHANGED, etc.
- Company settings (late cancellation config) stored in `company.settings` JSON field, accessed via `PUT /api/v1/order-settings` (requires `order-invoicing` app access)
- Order statuses fetched from `GET /api/v1/order-status` (requires `order-core` app access)

## Cross-Layer Feature Pattern: Python → Express → React (2026-07-05)
- New super-admin features follow the chain: Python schema/model → Python endpoint → Express admin client method → Express route → Frontend component
- For Python endpoints accessed via `aiAdminProxyRoute`, the Frontend uses `/ai-admin/{path}` which proxies to `/admin/{path}` on the Python service
- For dedicated Express routes, the Frontend uses `/super-admin/{path}` which maps to `superAdminRoutes.js`
- `AgentTemplate` has a slug PK used everywhere; `Agent` has an `id` (auto-generated) + `company_id` FK
- Company-specific agent overrides are stored on the `Agent` record in `ai.agents` and compared to `AgentTemplate` defaults at query time (not stored as diffs)
- Per-field diff strategy: simple equality for scalar fields (model, soul, rules), set comparison for list fields (allowed_tools, allowed_skills, channels)

## Agent Vision — Follow-Up Fallback Missing (2026-07-05)
- `_raw_llm_call` (follow-up call after tool execution) had no vision fallback — images in the follow-up user message were sent to non-vision models
- `_llm_call` had the fallback (checks `supports_vision`, switches to Gemini), but `_raw_llm_call` didn't
- Fixed: detect `image_url` in messages list, apply same Gemini fallback in `_raw_llm_call`
- Placeholder: tests for the follow-up vision path (needs `_raw_llm_call` invocation with mocking); coverage is manual/QA for now

## Agent System Prompt — Follow-Up Phase Contamination (2026-07-05)
- `_technical_formatting_constraints()` instructs the LLM to leave text empty when calling tools — must NOT be injected into follow-up (message-generation) calls
- Follow-up calls need a positive instruction: what TO do, not what NOT to do
- Fallback chain `final_response.text or _format_tool_results(executed) or 'تم البحث...'` must never let generic fallback text reach the customer — every tool result in `_format_tool_results` should produce a meaningful message

## Deploy Workflow — SSH Timeout Retry (2026-07-04)
- `Deploy to Server` workflow sometimes fails at `Test SSH Connection (with retry)` step with `Connection timed out` (exit code 255)
- This is a transient SSH connectivity issue — re-running the workflow from GitHub UI typically succeeds
- GitHub Actions runner IP changes each run, so whitelisting a single IP won't fix it permanently
- If persistent across multiple retries, check server firewall (ufw/iptables) or GitHub Actions meta IP range at `https://api.github.com/meta`

## Order Workflow — `isOverride` Required (2026-07-04)
- Companies with `orderWorkflowConfig.enabled: true` + `enforceTransitions: true` block direct status changes
- The `POST /api/v1/order-workflow/change-status` endpoint requires `isOverride: true` in the request body to bypass transition validation
- Without `isOverride`, the backend throws "الحالة المستهدفة غير موجودة في تعريفات المسار"
- Also: backend's `findStatusByCode` only matches DB-defined `OrderStatusDefinition` records. For raw Prisma enum values, a fallback to `VALID_STATUSES` array is needed in the route handler. See `routes/orderWorkflowRoutes.js:154`

## Order Workflow — Missing System Statuses Fallback (2026-07-06)
- The issue where changing order status returns 400 Bad Request with "الحالة المستهدفة غير موجودة في تعريفات المسار" was caused by `orderWorkflowService.validateStatusChange` strictly looking for `OrderStatusDefinition` records in the database.
- It did not properly fallback to valid system statuses (like `PENDING`, `CONFIRMED`, etc.) for companies with `orderWorkflowConfig.enabled: true` that hadn't explicitly defined them.
- Fixed in `evaluateStatusChange` by introducing a `VALID_STATUSES` array as a fallback when `findStatusByCode` fails to find the status definition.
- Also fixed an issue where `isOverride` was not bypassing the `config.enforceTransitions` check if a transition rule wasn't found.

## CI Workflow Audit — Secrets & Dead Code (2026-07-06)
- 11 workflows → 6 remaining (deploy.yml, deploy-staging.yml, storefront-validation.yml, migrate-agents.yml, trigger-embedding-backfill.yml, mirror-to-maxp4.yml)
- `--testPathPatterns` must be `--testPathPattern` (no trailing 's') — Jest silently skips with wrong flag
- `cancel-in-progress: true` with DB migrations is dangerous — set to `false` for production CI
- Breaking inline SSH scripts into `scripts/deploy-remote.sh` reduces deploy.yml from 941→292 lines
- `appleboy/ssh-action` handles its own SSH key setup; don't add a separate `setup-ssh` step before it
- `request_pty: true` with `appleboy/ssh-action` causes issues — avoid
- `actions/cache` for node_modules significantly speeds up CI (2-3min saved)
- For `paths-ignore`, use `'*.md'` not `'./*.md'` — glob is relative to repo root

## Codebase Secrets Audit — 50+ Hardcoded Credentials (2026-07-06)
- This repo is private, but hardcoded secrets were pervasive: 30+ files with `postgres:0165676135@localhost`, scripts with production DB credentials (92.113.22.70), live JWT tokens and signing secrets, a GitHub PAT in `scripts/upload-github-secrets.js`, and SSH root password in `services/check_replies.py`
- Fix strategy: delete the ad-hoc scripts entirely rather than refactoring to env vars (they were one-off debug tools, not part of the running service)
- Result: 133 files changed, 9458 lines deleted
- The production service (Express backend, Python AI service) uses proper `.env`-based configuration — the secrets were only in ad-hoc/debug scripts
- Action: if credentials were rotated, update the production .env files and inform the team

## AI Agent Architecture Doc Was Completely Wrong (2026-07-06)
- `ai-agent-system.md` described a Node.js-based system (`backend/services/aiAgent/BaseAgent.js`, `CEOAgent.js`, etc.) that **does not exist**
- The real architecture: Node.js Express → HTTP proxy → Python FastAPI + Microsoft Agent Framework
- 21 agents defined (not 5 as documented)
- Tools are Pydantic modules auto-discovered, not JSON files
- MCP is integrated Python client, not a separate directory
- The doc has been fully rewritten with the actual architecture
