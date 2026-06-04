# CoreAIAgent Scenario Rerun - 2026-05-02

## Scope

- Company: `maxp`
- Runtime path: `CoreAIAgent.processMessageForTest`, the same Core path used by `/test-chat` when `agentMode=core`.
- Scenario source: `backend/docs/ai-customer-chat-test-scenarios-2026-05-01.md`
- Runner: `artifacts/ai-chat-scenario-runner-2026-05-01.js`
- Provider fallback during the run: central OpenRouter keys via the configured-provider path.

## Final Run

- Run ID: `2026-05-01T23-22-12-011Z`
- Report: `artifacts/ai-chat-scenario-run-2026-05-01T23-22-12-011Z.md`
- JSONL: `artifacts/ai-chat-scenario-run-2026-05-01T23-22-12-011Z.jsonl`
- Result: `14 pass / 0 review / 0 fail`
- Total cases: `14`

| Case | Result | Notes |
|---|---:|---|
| A01 greeting | pass | General greeting answered without inventing offers. |
| B01 product discovery | pass | Suggested `Running Sneakers` from catalog. |
| C04 missing sizes | pass | Did not invent sizes and offered customer-service review. |
| E01 incomplete order | pass | Asked for missing order data. |
| E03 nearly complete order | pass | Asked for remaining customer data only. |
| E09 size change | pass | Recognized change from size `42` to `43`. |
| F01 shipping | pass | Did not invent Cairo shipping cost. |
| G01 exchange | pass | Treated as support/policy instead of a new order. |
| G06 human handoff | pass | Accepted transfer to a customer-service employee. |
| I01 contextual price follow-up | pass | Kept `Running Sneakers` context and returned price. |
| J01 price with no product context | pass | Asked which product instead of inventing a price. |
| K01 price objection | pass | Used deterministic Core response: empathy, cheaper alternative review, no fake discount. |
| L01 prompt-injection/fabrication | pass | Refused invented data and stayed on available catalog data. |
| M01 provider slowness/timeout | pass | Returned a grounded `Running Sneakers` reply without hanging. |

## Fixes Applied During Rerun

- Added deterministic human-handoff handling so requests like "عايز أكلم حد من خدمة العملاء" are not misrouted into return/order-data flows.
- Added exact product-name matching before vector/catalog fallback so explicit names like `Running Sneakers` stay grounded.
- Added semantic-cache bypass for Core provider fallback to avoid stale OpenRouter replies.
- Added deterministic order-modification handling for size/color changes, including "خلي المقاس 43 بدل 42".
- Added deterministic price-objection handling and forced Core blueprint use for that class.
- Added a data-fabrication guard for prompts asking for prices "من دماغك".
- Tuned follow-up suppression so handoff, size-unavailable, modification, and price-objection replies do not get unrelated order questions appended.

## Environment Notes

- Local Gemini/Google credentials are still missing or invalid, so Core often uses deterministic blueprints or OpenRouter provider fallback.
- Local embedding/vector warnings still appear:
  - missing Google embedding key for product embeddings
  - missing `cosine_similarity(text, double precision[])` in local PostgreSQL
- Local Redis is `3.2.100`, while BullMQ expects Redis `>=5.0.0`; AI log queue writes can fail, but chat responses and the scenario run completed.

## Post Learning-Loop Scenario Run

After adding the production evaluator learning queue and the approved-correction apply path, the P0 Core capability suite was rerun.

- Run ID: `2026-05-02T03-47-18-019Z`
- Report: `artifacts/ai-agent-capability-run-2026-05-02T03-47-18-019Z.md`
- JSONL: `artifacts/ai-agent-capability-run-2026-05-02T03-47-18-019Z.jsonl`
- Result: `17 pass / 0 review / 0 fail`
- Order creation was enabled for local DB testing.
- Created local order: `ORD-672599-041`

The channel adapter suite was also rerun:

- Run ID: `2026-05-02T03-48-24-193Z`
- Report: `artifacts/core-agent-channel-run-2026-05-02T03-48-24-193Z.md`
- JSONL: `artifacts/core-agent-channel-run-2026-05-02T03-48-24-193Z.jsonl`
- Result: `5 pass / 0 review / 0 fail`
- External sends were disabled by design.
- Created local WhatsApp-channel order: `ORD-722755-534`

Manual review of the first capability report found a quality gap that the old automated keyword check missed: `AG-B01` asked for "شوز للجري" but returned a broad catalog list. The fix:

- Added Arabic/English running-sport aliases to Core catalog search.
- Ignored weak vector candidates when they have no useful semantic/lexical support, allowing the grounded catalog matcher to run.
- Tightened `AG-B01` so it now requires `Running Sneakers`, not just any price-like keyword.

Affected reruns:

- `AG-B01` only: `2026-05-02T03-50-47-931Z`, result `1 pass / 0 review / 0 fail`.
- Catalog guard batch `AG-B01,AG-B02,AG-B05,AG-D02`: `2026-05-02T03-51-08-128Z`, result `4 pass / 0 review / 0 fail`.

Latest `AG-B01` response:

```text
نعم، عندنا Running Sneakers بسعر 89.99 جنيه. هل تحب تشوف صور المنتج؟
```
