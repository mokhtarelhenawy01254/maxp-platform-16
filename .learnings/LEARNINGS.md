# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

## [LRN-20260615-001] insight

**Logged**: 2026-06-15

**Topic**: GitHub Actions deploy SSH timeout — transient runner IP issue

**Insight**: When the `Deploy to Server` workflow fails with `ssh: connect to host *** port ***: Connection timed out` (exit code 255), the cause is usually the GitHub Actions runner IP changing. The server firewall blocks the new IP. This is often transient — re-running the workflow after a few seconds usually picks a different runner IP that's already whitelisted.

**Fix**: Simply re-run the failed workflow (`gh run rerun <run-id>` or use the GitHub UI). If it fails multiple times in a row, whitelist the runner IP printed in the "Get Runner IP" step.

### Metadata
- Source: user_feedback
- Related Files: `.github/workflows/deploy.yml`
- Tags: deploy, ssh, ci, transient

## [LRN-20260615-002] insight

**Logged**: 2026-06-15

**Topic**: Vite manualChunks — all lazy-imported pages MUST have a manualChunks rule

**Insight**: Any page imported via `React.lazy(() => import("./pages/XXX/..."))` that doesn't have a matching manualChunks rule in `vite.config.ts` will be bundled into the DEFAULT chunk alongside `App.tsx`. This creates **same-chunk dynamic imports**, which cause Temporal Dead Zone (TDZ) errors (`ReferenceError: Cannot access 'X' before initialization`) at runtime.

**Root cause pattern**: `App.tsx` lives in the default chunk. `React.lazy(() => import("./pages/admin/..."))` targets a module also in the default chunk (no manualChunks rule for `admin/`). Rollup cannot create a separate chunk for the lazy import, so it evaluates the module synchronously inside the default chunk, causing TDZ.

**Fix**: Every directory under `src/pages/` that has `React.lazy` imports in `App.tsx` must have a corresponding manualChunks rule. Add a catch-all rule for any remaining unmatched pages: `if (normalizedId.includes('/src/pages/')) return 'route-pages-other';`

### Metadata
- Source: debugging_session
- Related Files: `apps/frontend/vite.config.ts`, `apps/frontend/src/App.tsx`
- Tags: vite, rollup, tdz, manualChunks, bundling, build

---


**Logged**: 2026-04-23T21:34:59.4577936+02:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
When the reported bug is company switching, keep the fix centered on the shared auth/switch flow and avoid expanding the patch into task workspace pages unless a direct dependency is proven.

### Details
The user reported that switching companies looked successful but required a refresh, and later corrected that the task-page edits felt unrelated. The actual durable root cause was in the shared switch flow (`useAuthSimple`) plus company state propagation, while the task-page coupling was an over-expansion of scope. The safer pattern here is to first prove whether the bug lives in shared auth/context state before adding page-level resets or workspace-specific listeners.

### Suggested Action
For future company-switch bugs, inspect and fix the shared switch pipeline first (`token update`, `/auth/me` hydration, auth-version invalidation, switch event propagation). Only touch feature pages if they have a demonstrated direct dependency on stale company state.

### Metadata
- Source: user_feedback
- Related Files: frontend/src/hooks/useAuthSimple.tsx, frontend/src/contexts/CompanyContext.tsx, frontend/src/pages/tasks/Tasks.tsx, frontend/src/pages/tasks/components/TaskIntegrationsTab.tsx
- Tags: scope-control, company-switch, frontend, auth

---

## [LRN-20260423-001] best_practice

**Logged**: 2026-04-23T03:56:00+03:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
Single-quoted PowerShell here-strings piped into `ssh ... 'bash -s'` are the safest way to run multiline remote scripts from this Windows workspace.

### Details
During the Facebook inbox production fix, direct double-quoted `ssh` commands kept breaking because PowerShell expanded `$(...)`, `$variable`, and some quoted fragments before the remote bash shell received them. Switching to `@' ... '@ | ssh host 'bash -s'` stopped local interpolation entirely and made remote backups, PM2 restarts, and ad hoc diagnostics deterministic.

### Suggested Action
Default to single-quoted here-strings for any multiline SSH/bash script from this environment, especially when the remote command contains `$`, heredocs, or nested quotes.

### Metadata
- Source: error
- Related Files: F:\max_p_new\max_p_new\.learnings\ERRORS.md
- Tags: powershell, ssh, quoting, workflow

---

## [LRN-20260422-001] correction

**Logged**: 2026-04-22T20:10:00+03:00
**Priority**: medium
**Status**: pending
**Area**: design

### Summary
Ad creatives that explain product tools need dedicated visual-design and art-direction skills, not only generic interface layout instincts.

### Details
The first MAXP ad concepts were serviceable but visually weak because they leaned on dashboard-style composition and safe UI patterns instead of a stronger campaign art direction. User feedback confirmed the gap. For future ad/image tasks, the workflow should start by loading design-specific skills such as `frontend-design`, `high-end-visual-design`, or other trusted visual-direction skills, then adapt the composition for the actual format (poster, social, banner) before building assets.

### Suggested Action
When the deliverable is an ad, poster, or marketing visual, prioritize discovery/installation of design-oriented skills first and treat product UI references as supporting material rather than the main layout.

### Metadata
- Source: user_feedback
- Related Files: artifacts/ads/maxp-tools-ad-1080x1350.html
- Tags: design, ads, art-direction, skills, workflow

---

## [LRN-20260419-002] correction

**Logged**: 2026-04-19T19:35:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
`CoreAIAgent` price validation cannot treat a multi-product catalog reply as if it describes one grounded product.

### Details
After moving browse replies to AI-generated wording, the product-list blueprint and Gemini output could already contain the correct prices, but `_validateResponsePrices(...)` still validated every mentioned amount against a single grounded product price. In real catalog replies that meant valid prices were rewritten to `0` or to another product's price after generation. The durable fix is to validate browse replies per product, preferring the nearest preceding product name in the response and falling back to browse order only when the response still mirrors the catalog list order.

### Suggested Action
Any future response-polishing or hallucination guard in `CoreAIAgent` should stay aware of whether the reply is `single-product` or `multi-product` before correcting numbers.

### Metadata
- Source: user_feedback
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: core-ai, catalog, pricing, validation, gemini
- See Also: LRN-20260419-001

---

## [LRN-20260419-001] correction

**Logged**: 2026-04-19T18:45:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Catalog replies and intent routing in `CoreAIAgent` cannot rely on `product.price` or exact regex matches alone.

### Details
The user surfaced two coupled failures in the sales agent flow: product-list replies were exposing `0 جنيه` even when the real price lived on an active variant, and typoed customer wording could fall off the expected browse/shipping path because routing depended too heavily on literal keyword matches. The durable fix was to resolve a display price from the parent product or first priced active variant, then add normalized semantic intent scoring for browse, shipping, price, image, order, and related routing helpers so the grounded path still activates when the message wording is imperfect.

### Suggested Action
Whenever a new reply family or browse flow is added to `CoreAIAgent`, make sure it uses a shared display-price helper and a typo-tolerant intent helper instead of introducing a new direct `product.price` read or exact-string-only matcher.

### Metadata
- Source: user_feedback
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: core-ai, catalog, pricing, intent, typo-tolerance

---

## [LRN-20260418-001] best_practice

**Logged**: 2026-04-18T13:35:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
When changing Gemini fallback behavior in `CoreAIAgent`, scope the multi-model retry to the exact path the user asked for and immediately rerun the targeted agent regression suite.

### Details
The image/text grounding flow was already stable, but broad edits around Gemini selection briefly introduced unnecessary scope expansion beyond the user's request and a runtime regression in the vision comparison path (`model.generateContent(...)` without a safely initialized `model`). The durable fix was to keep the existing grounding pipeline intact, apply multi-model retries only to the customer-image vs product-image comparison path, and verify with the focused `CoreAIAgent.catalogVariantContext` test suite rather than relying on syntax validation alone.

### Suggested Action
For future AI-provider fallback changes, isolate the patch to model selection helpers/loops, then run `node --check backend/services/CoreAIAgent.js` and `npm.cmd test -- --runInBand tests/services/CoreAIAgent.catalogVariantContext.test.js` from `backend/` before considering the change stable.

### Metadata
- Source: error
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: gemini, fallback, regression, ai, tests

---

## [LRN-20260419-001] correction

**Logged**: 2026-04-19T16:26:00+03:00
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
When the user asks for each marketing script to represent the whole platform, each script must explicitly walk through the full business lifecycle instead of touching only one or two linked stages.

### Details
The previous video scripts felt too narrow because each idea centered on a localized pain point and only implied the rest of the system. For this project, the user expects every script to clearly cover acquisition, storefront conversion, conversations, order execution, inventory, shipping, support, internal team coordination, and analytics in the same 60-90 second narrative.

### Suggested Action
For future marketing script requests on this repo, structure every script around a full end-to-end journey and name the major business phases inside the copy so the platform feels comprehensive rather than feature-fragmented.

### Metadata
- Source: user_feedback
- Related Files: D:\max_p_new\max_p_new\docs\video-scripts-hooks-ar.md
- Tags: marketing, scripts, messaging, positioning, full-platform

---

## [LRN-20260416-001] correction

**Logged**: 2026-04-16T17:20:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Catalog-browse classification must always defer to the canonical variant-intent detector before deciding that a message is a product-list request.

### Details
`CoreAIAgent` already had `isVariantIntentMessage(...)`, but `isCatalogBrowsingRequest(...)` was using a narrower duplicate regex. That mismatch let plural phrasing like `ايه الالوان المتاحه` bypass the variant path and get marked as `browse=true`, which skipped grounded-product memory recovery and made the agent repeat the product list instead of the real colors. The fix was to centralize variant detection through `isVariantIntentMessage(...)` and add a second `!isVariantQuestion` guard in `prepareContextBag(...)`.

### Suggested Action
When one classifier depends on another domain concept such as variant intent, call the canonical helper directly instead of re-encoding a partial regex copy. Add exact phrase regression tests for real production wording whenever classification logic changes.

### Metadata
- Source: user_feedback
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: ai, catalog, variants, intent, regression

---

## [LRN-20260416-002] best_practice

**Logged**: 2026-04-16T17:45:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Product-type questions in Arabic storefront chats must search a semantic catalog surface, not only literal product names.

### Details
Real customer wording like `عندكوا بوتات` and `بوت` often refers to a category/type family, not the exact saved product name. Exact-name matching alone is too brittle because the actual product may be named something like `هاڤ فرو 96/11` while the discoverable signals live in `category`, `tags`, `metadata`, or alias families such as `بوت/boot/boots/هاف`. The durable fix was to normalize type aliases, treat plural type-only phrases as browse, and search/score products across richer catalog fields.

### Suggested Action
When hardening catalog understanding, prefer a shared alias-based semantic corpus built from `name + slug + sku + description + tags + metadata + category` over duplicating narrow exact-name heuristics.

### Metadata
- Source: user_feedback
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: ai, catalog, semantic-search, aliases, product-types

---

## [LRN-20260416-003] best_practice

**Logged**: 2026-04-16T18:10:00+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Catalog search pipelines should separate product matching from category fallback instead of querying both surfaces together.

### Details
When product fields and category fields are mixed into one initial query, it becomes harder to control ranking quality and typo tolerance. A cleaner architecture is: search product fields first, score them with similarity, then only if the product result is weak or empty, run a separate category fallback. This makes logs, thresholds, and regressions much easier to reason about.

### Suggested Action
For future catalog/search changes, keep staged retrieval explicit: `product-first -> similarity gating -> category fallback`, with separate tests covering each stage.

### Metadata
- Source: user_feedback
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js
- Tags: ai, catalog, search-pipeline, similarity, categories

---

## [LRN-20260408-001] best_practice

**Logged**: 2026-04-08T01:36:30+02:00
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary
Storefront UI tests in `frontend/src/storefront/__tests__` are Vitest-based and should be run with the storefront Vitest script, not the default Jest script.

### Details
The default `frontend/package.json` `test` script points to Jest, but storefront browser/theme tests import `vitest` directly and expose a dedicated `test:storefront-themes` script. Running those files through Jest fails before test execution.

### Suggested Action
Use `npx vitest run ...` or `npm run test:storefront-themes` for storefront tests, and keep Jest for the legacy suites that still depend on `jest.config.cjs`.

### Metadata
- Source: error
- Related Files: H:\max_p_new\frontend\package.json, H:\max_p_new\frontend\src\storefront\__tests__\storefrontFlow.test.tsx
- Tags: tests, vitest, jest, storefront

---

## [LRN-20260330-001] correction

**Logged**: 2026-03-30T13:21:30.0213617+02:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Public shipping calculation needs its own canonical-governorate fallback even when admin shipping routes are already hardened.

### Details
The earlier shipping-zone fix covered admin create/list/update flows, but the public storefront endpoint `/api/v1/shipping-zones/public/:companyId/calculate` still called canonical governorate lookups directly. In this database, Prisma models exist in the generated client while the underlying tables `governorates`, `governorate_aliases`, and `shipping_zone_governorates` do not. That means a simple model-existence check is not enough; public matching logic must catch `P2021` missing-table errors and fall back to seed/free-text governorate matching instead of returning 500.

### Suggested Action
Harden all canonical-governorate reads with missing-table fallback and reuse the shipping retry/fallback helpers in public storefront routes.

### Metadata
- Source: user_feedback
- Related Files: backend/controller/shippingZoneController.js
- Tags: shipping, storefront, prisma, fallback

---

## [LRN-20260330-002] best_practice

**Logged**: 2026-03-30T14:47:52.8375112+02:00
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
For Windows-to-Linux SSH work, stdin-driven scripts are the safest way to run complex Bash or Node commands remotely.

### Details
During server recovery, inline PowerShell strings repeatedly broke remote commands that embedded JavaScript, shell substitutions, or quoted arguments. Piping a script body to `ssh <host> bash -s` or `ssh <host> node -` avoided local PowerShell parsing and made remote diagnostics much more reliable.

### Suggested Action
Default to stdin-based SSH execution for multi-step remote fixes, especially when commands contain quotes, commas, `$()`, or JavaScript snippets.

### Metadata
- Source: error
- Related Files: H:\max_p_new\.learnings\LEARNINGS.md
- Tags: ssh, powershell, remote-debugging, reliability

---

## [LRN-20260330-003] best_practice

**Logged**: 2026-03-30T14:49:15+02:00
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Prisma deployments that generate into a custom output path must also preserve compatibility for any runtime code that still imports `@prisma/client`.

### Details
This backend generates Prisma into `backend/prisma/generated/postgresql_v2`, but parts of the runtime still load `@prisma/client` directly or indirectly. After the latest deploy, `prisma/generated/postgresql_v2` existed while `node_modules/.prisma/client` was missing, so `require('@prisma/client')` crashed the server at startup with `Cannot find module '.prisma/client/default'`. Restoring compatibility by syncing the generated client into `node_modules/.prisma/client` immediately fixed production.

### Suggested Action
After every `prisma generate --schema=prisma/schema`, copy `prisma/generated/postgresql_v2` into `node_modules/.prisma/client`, verify `node_modules/.prisma/client/default.js` exists, and remove unused top-level `@prisma/client` imports from startup-critical modules.

### Metadata
- Source: error
- Related Files: H:\max_p_new\.github\workflows\deploy.yml
- Tags: prisma, deploy, node_modules, compatibility, production

---

## [LRN-20260404-001] correction

**Logged**: 2026-04-04T22:14:00+02:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Variant thumbnail debugging needs two checks first: the current public slug and whether `variantSettings.attributeImages` or variant images actually exist.

### Details
The reported storefront URL used `/product/Half`, but the edit screen showed the live slug had already changed to `Half2`, so the old route returned a misleading 404. On the correct product route, the saved metadata still contained `variantSettings.styles` without any `attributeImages`, and every variant image field was null. That means the remaining issue was not the selector renderer alone; admin was still allowing an impossible `thumbnails` configuration to be saved.

### Suggested Action
When debugging product-display issues, confirm the active slug and inspect saved metadata before assuming the storefront component is still broken. Prevent saving `thumbnails` without actual images and surface an inline warning in the editor.

### Metadata
- Source: user_feedback
- Related Files: frontend/src/pages/products/components/tabs/DisplayTab.tsx
- Tags: variants, thumbnails, storefront, admin, slug

---

## [LRN-20260504-001] correction

**Logged**: 2026-05-04T11:22:00+03:00
**Priority**: high
**Status**: pending
**Area**: products

### Summary
When the user asks for storefront color circles, include the admin color-mapping workflow, not only storefront rendering.

### Details
The product display option `دوائر ألوان` originally rendered swatches in the storefront, but the user expected an admin-side palette similar to a standard color picker so she can assign each color value to a visual swatch. The complete behavior is: choose `دوائر ألوان` in product edit, see a palette, save `metadata.variantSettings.attributeColors`, and have the storefront use those explicit colors.

### Suggested Action
For variant-display requests, verify both surfaces: product edit configuration and public PDP rendering. Treat missing admin controls as incomplete even if storefront fallback colors render.

### Metadata
- Source: user_feedback
- Related Files: frontend/src/pages/products/components/tabs/DisplayTab.tsx, frontend/src/storefront/components/VariantSelector.tsx
- Tags: products, variants, colors, admin-ui, storefront

---

## [LRN-20260509-001] best_practice

**Logged**: 2026-05-09T00:00:00+03:00
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
Workspace memory files should follow the session date from agent context, not the host machine clock.

### Details
The session context date was `2026-05-09`, but a shell command based on `Get-Date` looked up a different local day, which can silently read or create the wrong `memory/YYYY-MM-DD.md` file. For workspace startup tasks and daily notes, the trusted reference is the injected session date, especially when the agent environment and host system clock differ.

### Suggested Action
When reading or creating daily memory files in this workspace, use the session `current_date` value directly instead of deriving the filename from `Get-Date` inside shell commands.

### Metadata
- Source: error
- Related Files: AGENTS.md, memory/2026-05-09.md
- Tags: memory, session-date, shell, startup

---

## [LRN-20260522-001] correction

**Logged**: 2026-05-22T00:00:00+03:00
**Priority**: critical
**Status**: pending
**Area**: backend

### Summary
Do not propose or implement synthetic fallback replies for AI chat responses.

### Details
The user explicitly rejected fallback text in AI replies. For agent chat, an empty or invalid model response must be treated as a runtime failure or retried through a real model/tool path, never converted into canned text such as "Task processed. No specific reply generated." Generated replies may be normalized, but not invented.

### Suggested Action
When AI reply generation returns empty text, return a structured error outside the conversation UI and keep the assistant message out of chat history. Do not suggest fallback messages as a fix for AI response failures.

### Metadata
- Source: user_feedback
- Related Files: backend/services/aiAgent/aiChatService.js, backend/services/aiAgent/CEOAgent.js
- Tags: ai-chat, agents, fallback, user-correction

---
