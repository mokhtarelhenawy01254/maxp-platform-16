# AI Production Evaluator And Learning Queue - 2026-05-02

## Goal

Add a safe first step toward production AI governance:

- Evaluate every successful `CoreAIAgent` reply in shadow mode.
- Persist the evaluation result for audit and dashboards.
- Create correction queue items for risky replies.
- Keep learning human-approved; behavior only changes after an approved correction is explicitly applied.

## What Was Added

### Database

Migration:

`backend/prisma/schema/migrations/20260502065000_add_ai_response_evaluation_queue/migration.sql`

New models:

- `AiResponseEvaluation`
  - Stores reply status: `PASS`, `REVIEW`, or `FAIL`.
  - Stores score, issue types, evidence, user message, AI response, channel, model/provider, and metadata.

- `AiCorrectionQueueItem`
  - Stores one proposed correction per medium/high/critical issue.
  - Starts as `PENDING`.
  - Can be moved to `APPROVED`, `REJECTED`, `APPLIED`, or `ARCHIVED`.
  - Stores the applied artifact type/id once an approved correction is converted.

### Service

`backend/services/productionEvaluatorService.js`

Current deterministic checks:

- Empty customer-facing reply.
- Internal/system/provider leakage, including API-key-like text.
- Order confirmation wording without a persisted order id.
- Product price mismatch against grounded catalog prices.
- Missing grounded price when the customer asks for price.
- Weak complaint/escalation handling.
- Sales follow-up after privacy/system refusal.

The evaluator is intentionally conservative. It is a safety layer, not a replacement for scenario testing.

### CoreAIAgent Integration

`CoreAIAgent` now records shadow evaluations after successful replies from:

- Facebook Messenger production delivery.
- Channel reply adapter: Facebook comments / WhatsApp adapter paths.
- `/test-chat` Core mode.

The evaluator does not block, modify, or resend replies. If evaluation fails internally, Core continues safely and logs a warning.

Core now also reads human-applied learning artifacts:

- `AiSetting.responseRules.learningCorrections` is injected into Core generation prompts as approved production-review guidance.
- Enabled few-shot examples are injected through the existing `fewShotService` selection path.
- The guidance is prompt-level learning, not model fine-tuning.

### API

Mounted at:

`/api/v1/ai-learning`

Routes:

- `GET /summary`
- `GET /evaluations`
- `GET /corrections`
- `PATCH /corrections/:id`
- `POST /corrections/:id/apply`

All routes require authenticated company context and `ai-chat-basic` access.

### Admin Review UI

Frontend route:

`/ai-learning`

Sidebar:

`الذكاء الاصطناعي` -> `تعلم وتصحيح AI`

The page shows:

- Last 7-day evaluation summary.
- Pending/approved/rejected/applied/archived correction queue filters.
- Correction detail panel with customer message, AI reply, suggested action, suggested rule, and suggested few-shot draft.
- Review actions: approve, reject, archive.
- Apply action for approved corrections:
  - `response_rule`: stores an active learning correction under `AiSetting.responseRules.learningCorrections`.
  - `few_shot`: creates a `FewShotExample` and enables few-shot selection for the company.
- Recent evaluation log with status, score, channel, issue labels, and customer message.

Approval still does not change behavior by itself. The admin must click `Apply correction` after approval.

## Learning Behavior

This is not model fine-tuning.

It is operational learning:

1. The evaluator detects a likely mistake.
2. A correction queue item is created.
3. A human reviews the correction.
4. A human applies an approved correction as a Core rule or few-shot example.
5. The same scenario should be rerun in shadow mode before enabling the correction broadly.

## Verification

Passed:

```bash
npx prisma validate --schema=prisma/schema
npx prisma generate --schema=prisma/schema
npx jest tests/services/productionEvaluatorService.test.js tests/integration/aiLearningRouteMount.test.js --runInBand --testTimeout=30000 --forceExit
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/ar/translation.json','utf8')); JSON.parse(require('fs').readFileSync('frontend/src/locales/en/translation.json','utf8'))"
node --check backend/services/productionEvaluatorService.js
node --check backend/controller/aiLearningController.js
node --check backend/routes/aiLearningRoutes.js
node --check backend/services/CoreAIAgent.js
npx eslint src/pages/ai/AIProductionLearning.tsx src/services/aiLearningService.ts --max-warnings=0
```

Local DB note:

- `prisma migrate deploy` is currently blocked by an older failed local migration: `20260329074000_add_canonical_governorates`.
- The new migration SQL was applied locally with:

```bash
npx prisma db execute --schema=prisma/schema --file prisma/schema/migrations/20260502065000_add_ai_response_evaluation_queue/migration.sql
```

Smoke result:

- A deliberately wrong grounded product price was recorded as `REVIEW`.
- It created one pending correction queue item.

Frontend verification:

- Targeted TypeScript check reported no errors in `AIProductionLearning.tsx` or `aiLearningService.ts`.
- Targeted ESLint passed for `AIProductionLearning.tsx` and `aiLearningService.ts`.
- The targeted run still reports existing imported dependency errors in `apiClient` / `import.meta.env`, outside the touched files.
- Full frontend `tsc --noEmit` timed out locally after about 184 seconds, consistent with existing broad frontend type-check debt.
- Unauthenticated `GET /api/v1/ai-learning/summary` returned `401`, confirming the route is mounted and protected.

## Next Step

Re-run affected AI scenarios after applying a correction:

- Use the issue type to pick matching scenario cases.
- Compare the new Core reply against the original failure.
- Keep the correction active only if shadow evaluation improves or stays safe.
