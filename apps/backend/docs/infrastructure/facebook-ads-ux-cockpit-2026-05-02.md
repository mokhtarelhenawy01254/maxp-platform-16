# Facebook Ads UX Cockpit Improvements

Date: 2026-05-02

## Summary

The Facebook Ads operator experience now focuses on account-scoped decision making instead of presenting a raw list of synced campaigns. The dashboard and reports UI were updated so media buyers can filter, search, sort, and inspect Swan campaigns without mixing data from other ad accounts or losing the selected account context.

## Frontend Changes

- Reworked the Facebook Ads dashboard into a cockpit with search, status filtering, objective filtering, sorting, and progressive loading.
- Added decision cards for active campaigns, active daily budget, sales campaigns, and campaigns needing review.
- Added safer pause/resume confirmations and typed confirmation before deleting a campaign.
- Reworked the reports page to use an explicit analysis period and campaign sorting by spend, ROAS, purchases, CPA, CTR, or name.
- Added media-buyer summary signals for spend without purchases, winning campaigns, and rows sourced from Meta.
- Kept CSV async report runs visible after refreshing the performance summary.
- Kept async CSV report history per selected ad account in browser storage, so switching accounts no longer mixes report runs or hides recent runs after reload.
- Added mobile campaign performance cards on the reports page to avoid forcing operators into a wide table on phones.
- Added Meta performance cards to campaign details, preserving the selected ad account context when navigating from dashboard to details and back.
- Made campaign rows keyboard-accessible while keeping explicit pause/resume/delete buttons protected from accidental row clicks.
- Improved the ad-account selector with an accessible label and richer option text showing account ID, currency, and status.
- Fixed the full-ad wizard budget labels and review summary so the selected ad-account currency is used instead of hard-coded USD.
- Preserved `adAccountId` when navigating back to the dashboard after successful ad creation.

## Safety Notes

- Campaign list and report UI still depend on the selected ad account context; operators should confirm the Swan account is selected before creating, syncing, or reviewing ads.
- Delete remains available, but now requires a typed Arabic confirmation to reduce accidental destructive actions.
- UI changes are read/management-surface changes only; they do not create ads, change Meta permissions, or alter Page/Messenger tokens.
- Full TypeScript checking still has unrelated project-level debt, so production readiness should rely on targeted lint plus production build until that broader debt is resolved.

## Verification

- Targeted ESLint passed for the changed Facebook Ads UI files.
- Frontend production build passed with existing Vite warnings.
- `scripts/verify-docs.js` should pass once this file is staged with the runtime changes.

## Next Iteration

- Add virtualized campaign rows if synced campaign counts continue growing.
- Add ad set/ad drill-down with the same account-scoped guardrails.
- Add ad/adset-level Meta insights in the detail view now that the account-scoped structure is imported.
- Add benchmark configuration for CPA, ROAS, CTR, and frequency per product or category.
- Add trend charts for spend, purchases, CPA, ROAS, CTR, and frequency over the selected analysis period.
