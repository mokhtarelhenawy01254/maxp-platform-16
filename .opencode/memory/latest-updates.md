# Latest Updates

## 2026-07-04: AI Skills & Tools Merchant Sidebar Section — Bug Fix

### Root Cause
`buildCompanyResponseWithOnboarding` in `companyOnboarding.js:17` was deleting `settings` from the company response entirely. The sidebar's `isFeatureEnabled('aiToolsEnabled')` could never find `company.settings` — always returned `false`.

### Fix
- **Backend** (`companyOnboarding.js`): Instead of deleting `settings`, extract `aiToolsEnabled` as a top-level boolean in the company response
- **Frontend** (`sidebar.ts`): Changed `isFeatureEnabled` to check `currentCompany.aiToolsEnabled` (direct boolean) instead of parsing `company.settings` JSON

### Files Modified
- `apps/backend/utils/companyOnboarding.js` — 2 insertions, 5 deletions
- `apps/frontend/src/config/sidebar.ts` — removed `companySettings` parsing, simplified `isFeatureEnabled`

### Deploy
- Commit `95252c1d` → pushed to `main` → Deploy to Server workflow (retry succeeded after SSH timeout)

## 2026-07-06: Order Status Change 400 Bad Request Fix

### Root Cause
When changing order status via the quick status update button, the `/api/v1/orders-new/simple/:orderNumber/status` endpoint would fail with a 400 Bad Request and the message "الحالة المستهدفة غير موجودة في تعريفات المسار". This happened because `orderWorkflowService.evaluateStatusChange` strictly validated the target status against custom `OrderStatusDefinition` records, and did not properly fallback to valid system statuses if custom definitions were missing for companies with enabled workflow configurations. Also, it improperly enforced transition rules even when `isOverride: true` was passed.

### Fix
- **Backend** (`orderWorkflowService.js`): 
  - Added a `VALID_STATUSES` fallback inside `evaluateStatusChange` to recognize standard system statuses (e.g., `CONFIRMED`, `SHIPPED`) even if they lack explicit database definitions.
  - Adjusted the logic to correctly bypass the `config.enforceTransitions` rule when `isOverride` is true.

### Files Modified
- `apps/backend/services/orderWorkflowService.js` — modified `evaluateStatusChange` method.
