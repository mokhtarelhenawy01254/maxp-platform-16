# Plan: MaxP AI Service Migration

**Generated**: 2026-06-03  
**Status**: In progress  
**Goal**: Move AI orchestration from MaxP's legacy Node.js runtime to `maxp-ai-service` while keeping the existing MaxP UI, inbox, approvals, channels, and business data as the source of truth.

## Architecture Decision

- MaxP remains the product shell and source of truth for companies, users, conversations, products, orders, approvals, permissions, delivery, and UI.
- `maxp-ai-service` becomes the AI runtime for agents, orchestration, model providers, tool planning, approval pause/resume, checkpoints, and AI observability.
- The legacy runtime stays as fallback until a pilot company has run stably in production.

## Phase 1: Stabilize Production Safety

- Match `AI_SERVICE_TOKEN` in MaxP with `MAXP_SERVICE_TOKEN` in `maxp-ai-service`.
- Bind Docker-exposed AI service ports to `127.0.0.1`.
- Fix `/ready` to validate the configured provider, including Google.
- Require `/ready` in deployment health checks.
- Do not use `AI_SERVICE_ENABLED_COMPANIES=*` unless `AI_SERVICE_MODE=primary` is explicitly set.

## Phase 2: Align Contracts

- MaxP exposes an internal service-token bridge:
  - `POST /api/v1/ai-bridge/tools/execute`
  - `POST /api/v1/ai-bridge/approvals/draft`
- `maxp-ai-service` calls the bridge instead of old `/api/v1/agent/*` endpoints.
- Tool execution uses the synthetic `agentId=ai-service` and still goes through MaxP's `toolOrchestratorService`.
- Write actions create approval drafts rather than executing directly.

## Phase 3: Same UI Runtime Switch

- MaxP routes selected companies through `aiServiceRouter`.
- Existing inbox and customer delivery stay unchanged.
- `AI_SERVICE_MODE` controls rollout:
  - `off`: no customer traffic goes to the new service.
  - `shadow`: reserved for comparison mode.
  - `pilot`: only explicit company IDs.
  - `primary`: broad rollout, wildcard allowed.

## Phase 4: Approval Resume

- Existing MaxP approval UI remains the decision surface.
- Approval decisions call `maxp-ai-service /resume`.
- Resume calls must be idempotent to avoid duplicate write actions.

## Phase 5: Pilot and Retirement

- Start with one pilot company.
- Run shadow or pilot traffic and compare quality, latency, tool accuracy, fallback rate, and approval completion.
- Promote to primary only after a stability window.
- Retire the legacy AI generation path after no production traffic depends on it.

## Current Implementation Started

- Added MaxP service bridge route and tests.
- Updated MaxP AI service token handling to reject missing tokens instead of using `dev-token`.
- Added rollout mode handling in `aiServiceRouter`.
- Normalized AI service responses from `thread_id/draft_id` to `threadId/draftId` in MaxP.
- Verified existing approval approve/reject flow resumes `maxp-ai-service` when the company is enabled.
- Updated AI service client endpoints to use `/api/v1/ai-bridge`.
- Fixed AI service readiness for Google provider.
- Bound production Docker ports to localhost.
- Added deploy readiness check.

## Rollback

1. Set `AI_SERVICE_MODE=off`.
2. Restart MaxP backend.
3. Keep `maxp-ai-service` running for investigation unless it causes server pressure.
4. Legacy AI runtime remains available during rollout.
