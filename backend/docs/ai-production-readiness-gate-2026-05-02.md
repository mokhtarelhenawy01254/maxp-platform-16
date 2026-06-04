# AI Production Readiness Gate - 2026-05-02

## Purpose

The Production Readiness Gate turns the current AI learning loop into an operational release decision for each company. It answers:

- Can the company stay in shadow mode only?
- Can the AI assist humans safely?
- Can auto replies run live with guardrails?
- Is the company clean enough for full live mode?

The gate is exposed at:

```http
GET /api/v1/ai-learning/readiness?days=7
```

The admin UI displays it on `/ai-learning`.

## Inputs

The gate reads only existing production data:

- `AiResponseEvaluation` rows for the selected company in the requested window.
- Open correction queue items with `PENDING` or `APPROVED` status.
- Company `AiSetting` flags such as auto reply, failover, evaluator status, and order creation.
- Active Super Admin provider config from `GlobalAiConfig`.
- Active company/central `AiKey` records for the selected provider, excluding keys already over daily quota.

## Decision States

- `READY`: no blockers and no warnings. Full live mode is allowed.
- `WARNING`: no hard blockers, but live mode should keep guardrails and monitoring.
- `BLOCKED`: do not move to full live mode. Use `shadow` or `assist`.

The response includes:

- `score`: 0-100 operational readiness score.
- `recommendedMode`: `shadow`, `assist`, `live_with_guardrails`, or `live`.
- `decision.canGoLive`: true only when the state is `READY`.
- `blockers`: hard reasons that prevent full live mode.
- `warnings`: risks that allow guarded live mode but need attention.

## Hard Blockers

Full live mode is blocked when any of these are true:

- No active provider is selected.
- No usable key exists for the active provider.
- No recent shadow evaluations exist.
- Any recent evaluation has `FAIL`.
- Any critical or high-risk correction is still open.
- Any approved correction has not yet been applied to Core rules/few-shot examples.
- Auto reply is enabled while another blocker exists.

## Warnings

The gate warns when:

- The recent shadow sample is below 10 evaluations.
- Corrections are waiting for human review.
- More than 15% of recent responses need review.
- Average evaluator score is below 85%.
- Quality evaluation or provider failover is disabled.
- Only one usable provider key exists.
- Auto reply is enabled while warnings are present.

## Current Role In The Release Flow

This gate does not change AI behavior by itself. It is a control surface for the human/operator before production exposure:

1. Run scenario and shadow traffic.
2. Review failed/reviewed responses in `/ai-learning`.
3. Approve and apply valid corrections.
4. Re-run scenarios or wait for fresh shadow evaluations.
5. Move from `shadow` to `assist` to `live_with_guardrails`, and only then to `live` when the gate is clean.

## Local Smoke And Remediation Result

Initial local `maxp` gate result returned `BLOCKED` with recommended mode `assist`.

Initial observed metrics:

- Recent evaluations: 31 total, 28 pass, 2 review, 1 fail.
- Active provider: `OPENROUTER`.
- Usable active-provider keys: 6.
- Open corrections: 3.
- Auto reply: enabled.

Review of the blockers found two evaluator false positives:

- Asking the customer for `رقم الطلب` during a damage complaint was incorrectly classified as an order confirmation.
- `خلي المقاس 43 بدل 42` was incorrectly treated as a complaint because the evaluator matched broad `بدل` wording.

Fixes applied:

- The evaluator no longer treats support requests for an order number as confirmation language.
- The evaluator no longer treats normal size-change wording as complaint escalation.
- The two affected evaluations were re-evaluated and now pass.
- Two false-positive corrections were archived.
- One synthetic local price-mismatch smoke correction was archived because it was not a live Core regression.

Targeted scenario rerun:

```bash
AI_CAPABILITY_IDS=AG-E07,AG-F03 node backend/scripts/run-core-agent-capability-scenarios.js
```

Result:

- Run artifact: `artifacts/ai-agent-capability-run-2026-05-02T04-10-42-665Z.md`.
- Summary: 2 pass, 0 review, 0 fail.

Final local `maxp` gate result:

- Status: `READY`.
- Score: 96.
- Recommended mode: `live_with_guardrails`.
- Recent evaluations: 34 total, 33 pass, 1 review, 0 fail.
- Open corrections: 0.
- Usable OpenRouter provider keys: 6.
- Blockers: none.
- Warnings: none.

## Post-Gate P0 Acceptance Rerun

After the local gate became ready, the P0 capability suite was rerun.

Full P0 command was started with order creation intended, but the background PowerShell launch did not pass the order-creation environment variable correctly. The first run therefore covered all non-order-creation P0 cases:

- Run artifact: `artifacts/ai-agent-capability-run-2026-05-02T04-12-52-656Z.md`.
- Result: 16 pass, 0 review, 0 fail.
- Skipped: 1 order-creation scenario.

The order-creation case was then run separately with explicit local order creation enabled:

```powershell
$env:AI_CAPABILITY_ALLOW_ORDER_CREATE='true'
$env:AI_CAPABILITY_IDS='AG-E05'
node backend\scripts\run-core-agent-capability-scenarios.js
```

Result:

- Run artifact: `artifacts/ai-agent-capability-run-2026-05-02T04-14-24-995Z.md`.
- Result: 1 pass, 0 review, 0 fail.
- Created local test order: `ORD-275734-388`.

Verified local order data:

- Customer: `أحمد محمود`.
- Phone: `01000000001`.
- Address: `مدينة نصر شارع عباس العقاد`.
- Product: `Running Sneakers`.
- Variant details: size `42`, color `أسود`.
- Subtotal: `89.99`.
- Shipping: `50`.
- Total: `139.99`.

Final gate result after the P0 rerun and order-creation scenario:

- Status: `READY`.
- Score: 96.
- Recommended mode: `live`.
- Recent evaluations: 53 total, 52 pass, 1 review, 0 fail.
- Pass rate: 98.1%.
- Average score: 99.2%.
- Open corrections: 0.
- Usable OpenRouter provider keys: 6.
- Blockers: none.
- Warnings: none.
