# Facebook Ads AI Builder Advanced Controls - 2026-05-09

## Summary

The Facebook Ads AI Builder now supports production-safe operator controls beyond the original single-product, broad-audience draft flow.

## Changes

- Added advanced targeting overrides to AI draft generation:
  - interest and behavior search terms for Meta resolution
  - custom audiences, lookalike audiences, and audience exclusions
  - locale and device/platform constraints
  - Advantage audience and targeting expansion flags
- Added flexible creative inputs:
  - explicit operator AI instructions for creative direction, tone, product emphasis, and constraints
  - configurable copy variation count
  - manual primary text, headline, and description seed lists
  - generated drafts merge operator-provided copy with AI alternatives
- Added buyer safety controls to bulk publish:
  - maximum drafts per publish batch
  - maximum total daily budget selected for bulk publish
  - optional start/end schedule
  - optional spend limit and frequency cap metadata
  - winner guard / auto-pause metadata for future optimization automation
- Bulk publish still forces generated ads to `PAUSED` and clears active publish confirmation.
- Fixed a webhook regression where async Prisma initialization was used without `await` in Facebook comment/message handlers.
- Hardened the production deploy changed-file detection so `frontend/...` changes reliably rebuild and publish the updated SPA assets.

## Verification Intent

The release is covered by focused backend tests for draft generation, publish targeting resolution, and the Prisma await regression, plus frontend helper coverage for safe bulk publish override handling.
