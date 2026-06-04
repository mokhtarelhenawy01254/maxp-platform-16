# AI Deterministic Intent Reply Builders Service

## Summary

Added `backend/services/aiAgent/deterministicIntentReplyBuildersService.js` as a safe standalone extraction for conservative deterministic replies around:

- gratitude / closing
- privacy / secret disclosure refusal
- out-of-scope coding or scraping refusal
- conversation repair
- unsafe data fabrication guard
- price objection
- order-data reason clarification
- shipping objection

## Why It Is Standalone For Now

`CoreAIAgent.js` is being edited concurrently in the main integration lane, so this slice intentionally avoids touching the Core file. The new service is prepared for later wiring by depending on heuristics/build helpers through injection rather than owning runtime orchestration.

## Verification

- `node --check services/aiAgent/deterministicIntentReplyBuildersService.js`
- `npx jest tests/services/deterministicIntentReplyBuildersService.test.js --runInBand --testTimeout=30000`
