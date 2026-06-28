# Session: Product-search diagnosis for Center Fekrya (سنتر فكية)

## Date: 2026-06-28

## Test performed
- Created a throw-away company + 3 cable products in local Postgres (rolled back).
- Ran real `ProductSearchRepository.search_products(company_id, "كابل")`.
- Simulated the real intent planner (`build_intent_contract_async`) with a mocked classifier returning intent `products`.

## Result
- Direct text search: 3 cable products found (USB-C, Lightning, Micro-USB). Product search code is fine.
- MEDICAL_CENTER agent (booking-only tools): planner sets `requiresTool=False`, `primaryTool=None`, `allowedTools=[]`.
  → `product_search` is never executed.
- SALES/ORDER agent (includes `product_search`): planner keeps `requiresTool=True`, `primaryTool=product_search`.
  → Search runs normally.

## Root cause
The agent assigned to the company has role `MEDICAL_CENTER` / allowed tools limited to booking. When a customer asks about a product, the classifier correctly sees a `products` intent, but the planner drops it because `product_search` is not in the agent's native tool list. With `toolChoice: required` and an empty scoped tool list, the fallback reply may also come back empty.

## Reproduction script
`apps/ai-service/scripts/reproduce_center_fekrya_issue.py`

## Weaknesses identified
1. Agent role / tool scoping mismatch silently kills product intents.
2. `to_tool_plan` fallback returns the full configured allowedTools when the filtered set is empty, masking the mismatch.
3. Vector search requires embeddings; without them short Arabic queries rely only on text ILIKE.
4. Text search has no Arabic morphology/plurals/synonyms; "كابلات" vs "كابل" can miss.
5. Product variants are not searched; only product name/SKU/tags are used.
