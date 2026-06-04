# Facebook Ads AI Builder Bulk Review - 2026-05-08

## What Changed

- Added a compact review center to the Facebook Ads AI Builder.
- Operators can filter AI drafts by lifecycle: all, ready, publishing, published, partial, or needs review.
- Ready drafts can be selected across multiple products and published in one batch.
- Bulk publish always sends `PAUSED` status, with a confirmation prompt that shows draft count and potential daily budget before any Meta write.
- Published drafts stay visible in the builder history so operators can see what was already sent and avoid duplicate action.
- The draft review layout now keeps only high-signal text visible by default: product, status, target, budget, headline, and the primary copy excerpt.

## Safety Notes

- The backend idempotency ledger remains the final duplicate guard.
- The UI excludes published and failed drafts from bulk selection.
- Selection follows the current filter, so hidden drafts are not published by surprise.
- Drafts already marked `PUBLISHING` are visible but blocked from another bulk-publish attempt.
- Partial Meta/local-save states are displayed as warning states, not green published successes.
- The bulk publish payload forces `allowActivePublish: false` and `status: PAUSED`; active publishing still belongs in the full wizard confirmation path.
- If Meta returns an empty page or pixel asset list, the builder preserves the page/pixel values stored on recent AI draft history so the review center is not cleared by asset-sync timing.

## Current Capability Gap

- AI Builder targeting is currently fixed from user controls: country, age, gender, page, pixel, and default non-Advantage audience settings.
- The full ad wizard/backend support richer targeting payloads, but AI-generated detailed targeting suggestions are not yet exposed in AI Builder.
- Frontend types mention text variations and flexible creatives, but the full-ad backend does not yet publish those through the main `createFullAd` flow.
