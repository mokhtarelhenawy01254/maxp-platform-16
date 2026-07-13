# AI Text Pattern Utility Service - 2026-05-07

## What changed

- Added `backend/services/aiAgent/textPatternUtilityService.js` as an isolated home for `escapeRegExp(value)`.
- Added focused Jest coverage in `backend/tests/services/textPatternUtilityService.test.js`.

## Current scope

- Own the shared regex-escaping helper with the same `String(value || '')` behavior already used by the AI runtime helpers.
- Stay factory-shaped so future runtime wiring can inject or reuse the utility without changing the helper contract.

## Why this is isolated

- This task intentionally avoids `CoreAIAgent`, bootstrap, and existing services.
- That keeps the extraction ready for later adoption without interfering with parallel workers already changing runtime wiring.

## Verification

- `npx jest tests/services/textPatternUtilityService.test.js --runInBand --testTimeout=30000`
