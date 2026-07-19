# Facebook Ads AI Builder UX Tightening - 2026-05-07

## Context

The production AI builder page was reviewed for daily ad-ops use, not as a
marketing screen. The main problems were excessive vertical space, duplicated
static targeting labels, a single hard-coded product flow, and a compact account
panel that still behaved like a full dashboard card.

## Implemented

- Removed the Swan hard-coded default product URL from the AI builder.
- Replaced the single product input with a multi-product textarea.
- Generate three draft ideas per valid product URL, grouped by product.
- Keep partial results visible when one product fails and another succeeds.
- Condensed the builder header, controls, product summary, and draft cards.
- Made the account context panel truly compact when `compact` is passed.
- Validate page and pixel selections against the currently selected ad account
  assets, preventing stale page/pixel reuse after account changes.
- Removed Swan-specific fallback copy from the create ad wizard prefill path.

## Production Notes

The current endpoint still generates drafts for one product per request. The
frontend supports multiple products by running a small controlled queue over the
existing endpoint, which keeps failures isolated per product.

## Production Hardening - 2026-05-08

- Added server-side draft run persistence through `FacebookAdsAiDraftRun` and
  `FacebookAdsAiDraft`, including product URL, product snapshot, target,
  budget, fallback reason, and AI routing metadata.
- Added idempotency keys for AI draft generation so a repeated product request
  can reuse the stored run instead of producing duplicate draft history. The
  backend now rejects a reused idempotency key when the product/settings hash is
  different.
- Added `FacebookAdsPublishRequest` as the full-ad publish ledger. The wizard
  now sends a stable `clientRequestId`, and the backend returns the stored
  result for duplicate successful publish attempts or locks concurrent retries
  while the first publish is still running. Publish request hashes prevent a
  reused key from returning results for a different payload.
- Protected real spend by requiring explicit backend confirmation before
  publishing a full ad as `ACTIVE`. AI builder launches still default to
  `PAUSED`.
- Revalidated page and pixel readiness on the backend before Meta publishing,
  not only in the frontend.
- Hardened remote image upload by rejecting private/local image URLs and
  oversized remote payloads before forwarding images to Meta. Redirects are
  followed manually so every hop is checked before download; video uploads share
  the same remote URL guard and size cap.
- The AI builder now exposes flexible target controls for country, gender, age,
  budget currency, and multi-product batches instead of hiding fixed
  Egypt/female assumptions in static copy.
- Fallback copy now adapts to the selected country and gender target, and the UI
  shows total potential daily spend across all generated product drafts.
- The GitHub Actions production deploy path runs `prisma db push
  --schema=prisma/schema` after Prisma generate for the new draft/publish
  ledger tables. The direct `deploy.sh` helper intentionally stays away from
  schema pushes so manual deploys do not mutate production data unexpectedly.

## Follow-up Production Fixes - 2026-05-08

- Added a Prisma migration for the AI draft/publish ledger tables so the schema
  change is reviewable outside `db push`. The production workflow still uses
  `prisma db push` during deploy, but the migration records the intended table,
  index, unique-key, and foreign-key layout.
- Added a unique publish guard on `(companyId, aiDraftId)` and backend lookup by
  draft. Reopening the same generated draft with a new browser request id now
  returns the stored/locked publish request instead of risking a duplicate Meta
  campaign.
- Kept the wizard's publish request id stable after failed or timed-out publish
  attempts. The frontend no longer rotates the id automatically on errors, so a
  retry can safely reconcile with the backend publish ledger.
- Enforced `FACEBOOK_PIXEL_REQUIRED` server-side for website sales/leads style
  full-ad publishes before any Meta call or publish ledger row is created.
- Hardened remote media upload against DNS rebinding and IPv4-mapped localhost
  addresses by pinning the DNS lookup used by the HTTP(S) agent, blocking
  private/reserved IP ranges, and applying byte limits to streamed video uploads.
- Added focused Facebook Ads regression tests to the production GitHub Actions
  workflow before packaging/deploy so publish-idempotency, AI drafts, and remote
  creative upload guards run before the server is updated.
- Limited multi-product AI generation to 10 products per batch in the UI with a
  visible compact note. Extra valid links are ignored for the current batch
  rather than creating an unbounded queue.
- Set the direct wizard EGP default/minimum budget to 200 EGP and kept the
  selected account currency visible beside the minimum.
- The full-ad endpoint now fails closed when `clientRequestId`/`idempotencyKey`
  is missing instead of generating a server-side key. Direct API callers must
  provide a stable key so retries can reconcile with the publish ledger.
- Page publish preflight now requires the selected page to be an existing
  `facebookPage` row connected to the same company, not only visible to the
  current Meta token.
- Safe pre-Meta failures such as image upload validation clear the AI draft's
  publish link and return the draft to `DRAFT`, allowing a corrected retry for
  the same generated idea.
- Safe pre-Meta failures also release the publish ledger's `aiDraftId` lock, so
  a corrected retry with a new browser request id is not blocked by the failed
  attempt.
- Expired publish locks are now marked `STALE`, detached from the AI draft, and
  the draft is returned to `DRAFT`, allowing a fresh publish request instead of
  requiring manual database cleanup.
- AI draft generation runs now carry a lock expiry. A crashed or timed-out
  `RUNNING` generation is marked failed on the next idempotent check and exposed
  as a stale run instead of blocking the request key forever.
- Draft generation now requires a stable idempotency key whenever the draft
  ledger is available, preventing retry/lost-response loops from creating
  duplicate persisted runs and extra AI cost.
- Publishing an AI draft rechecks the current product row before Meta creation;
  inactive, hidden, deleted, or out-of-stock products fail before any campaign
  spend can be launched.
- Stock readiness respects `trackInventory=false`, and the public product
  payload now includes `stock` and `trackInventory` so AI draft readiness uses
  the same product availability facts operators see.
- The AI Builder frontend uses the same `trackInventory=false` rule before
  skipping products, so unlimited-stock products are not blocked from
  multi-product generation just because their stored stock count is zero.
- Meta campaign write timeouts/network uncertainty are treated as unsafe to
  retry automatically. The publish ledger keeps the draft lock attached for
  manual reconciliation instead of opening a duplicate live campaign path.
- Pixel publish preflight now checks storefront purchase-tracking readiness for
  the selected pixel, not only whether Meta can list the pixel on the ad
  account.
- Product launch metadata fetching now resolves and pins DNS for the public
  product API request and rejects private/reserved resolved IPs, aligning it
  with the remote media upload guard.
- The create-ad wizard now sends reliable advanced targeting controls
  (Meta interests, custom/lookalike audiences, exclusions, languages, devices,
  and relationship statuses) in the publish payload, while unsupported
  experimental demographic controls are hidden from operators.
- The backend now passes those reliable advanced targeting controls into the
  created Ad Set and reach estimate targeting specs instead of dropping them
  during Meta publish.
- AI Builder batch results are cached in session storage for six hours so an
  operator can open one draft in the wizard and return to the batch board
  without regenerating the other product drafts.
- AI Builder can also reload recent persisted draft batches from
  `GET /facebook-ads/ai/drafts`, scoped to the selected ad account so operators
  do not reopen drafts generated for another Meta account. It also clears stale
  visible drafts when product links, budget, account, page, pixel, age, gender,
  country, or status changes.
- The active-publish confirmation dialog now traps focus, restores focus on
  close, and supports `Escape`, making the real-spend confirmation usable from
  keyboard-only workflows.
- Opening an AI carousel draft in the wizard now preserves the original
  carousel card headlines, descriptions, links, and image URLs instead of
  rebuilding generic cards from the image list.
- Opening an AI draft now lands on a compact review/publish screen instead of
  forcing the operator through the full six-step wizard. The full wizard remains
  available from a deliberate edit action.
- AI draft publishing also verifies that the submitted destination URL and
  carousel card URLs still point at the same product slug the draft was
  generated for, preventing full-edit changes from spending against a different
  product under the original draft lock.
- The wizard rotates to a new publish request id only for safe retry states:
  pre-Meta validation/upload failures, stale publish locks, and payload-key
  mismatches. In-progress locks continue to reconcile against the existing
  ledger row.
- Already published AI drafts are hidden from recent batch reloads, and cached
  published drafts render as non-actionable so operators do not reopen them as
  fresh ideas.

