# AI Intent/Reply Heuristics Service - 2026-05-07

## Purpose

Prepare the next behavior-sensitive `CoreAIAgent` extraction without touching the
live Core wiring yet.

This slice captures the pure or mostly-pure heuristic helpers that classify:

- greeting / Messenger CTA messages
- support vs order-like customer text
- return/shipping/availability overlap
- gratitude/closing text
- prompt-or-secret disclosure requests
- out-of-scope coding/scraping requests
- unsafe data-fabrication requests
- repair / objection style follow-ups

## Files

- `backend/services/aiAgent/intentReplyHeuristicsService.js`
- `backend/tests/services/intentReplyHeuristicsService.test.js`

## Design Notes

- The service is intentionally **not wired into `CoreAIAgent` yet**.
- Dependencies that are still owned by Core remain injected:
  - semantic-intent scoring
  - post-purchase issue detection
  - order-status follow-up detection
  - recent order-collection prompt context
- This keeps the first extraction conservative: we get a tested service seam
  before moving runtime behavior.

## Verification

Run:

```powershell
npx jest tests/services/intentReplyHeuristicsService.test.js --runInBand --testTimeout=30000
```

and include it in:

```powershell
npm run test:ai:tools
```
