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
