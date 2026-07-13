# Wofod AI Message Quality Fix - 2026-05-05

## Context

Production review for Wofod Facebook conversations showed repeated issues in AI replies and message ingestion:

- Price objections such as "مش غالي شوية" and "كتير اوى" could be ignored when shipping context was already present.
- Mixed variant and shipping questions could lose the variant answer and return shipping only.
- Catalog browse replies used awkward singular wording: "1 منتج تاني".
- Facebook message sync could re-ingest duplicate messages when relying only on `facebookMessageId`.
- Some source-post price questions needed better matching when Facebook stores post ids with or without the page prefix.
- Wofod was configured to use central OpenRouter, but text routing could still start from Google if the active global provider was left on Google.
- Image understanding paths in `CoreAIAgent` still had direct Gemini-only catalog analysis/comparison calls.

## Changes

- Hardened deterministic price-objection detection, including common Egyptian phrasing and typo variants, while avoiding false positives like product wording that means "high-top".
- Preserved variant answers when a customer asks for sizes/colors plus shipping in the same message, appending grounded shipping facts instead of replacing the answer.
- Prevented the shipping blueprint fallback from overriding non-shipping replies for greetings, image requests, variant-only messages, and price objections.
- Normalized Facebook post id candidates so source-post product lookup can match both `postId` and `pageId_postId` formats.
- Improved singular/plural wording in deterministic catalog browse replies.
- Added content/time/type/direction signatures to Facebook sync so duplicate messages are skipped even if the stored metadata is incomplete or Graph returns duplicates in one batch.
- Routed catalog image analysis and image-to-image comparison through the configured vision runtime first, so `visionProvider=OPENROUTER` is honored before legacy Gemini fallback.
- Verified production config for Wofod uses central keys and updated the active provider to `OPENROUTER` with the central OpenRouter key as the preferred key.

## Verification

- `node -c backend/services/CoreAIAgent.js`
- `node -c backend/controller/conversation/facebookSyncController.js`
- `npm test -- --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js tests/controller/facebookSyncController.test.js`
- `npm run check:syntax`
- `node scripts/verify-docs.js`

## Learning Loop Note

The existing production evaluator and applied correction system can be used as the "AI learns from mistakes" layer:

- Deterministic fixes like the ones above cost no runtime tokens.
- Approved correction rules that are injected into the prompt consume a small number of tokens per relevant request.
- LLM-based review/evaluation consumes tokens only when enabled, and should be run on flagged or sampled conversations rather than every message.
