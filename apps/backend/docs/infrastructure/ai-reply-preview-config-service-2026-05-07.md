# AI Reply Preview Config Service - 2026-05-07

## Purpose

Add a pure config-builder seam for the non-delivery Core AI preview paths
without touching `CoreAIAgent.js` yet.

## Owns

- the shared reply-preview input payload shape used by:
  - `processMessageForReplyOnly(...)`
  - `processMessageForTest(...)`
- reply-only preview config defaults:
  - adapter source / log labels
  - human-override policy
  - configured-provider fallback mapping
- test preview config defaults:
  - test-chat source / log labels
  - test-mode flag
  - test fallback metadata mapping

## Notes

`backend/services/aiAgent/replyPreviewConfigService.js` is intentionally pure
and un-wired in this slice. It gives the next CoreAIAgent extraction step a
stable builder API without forcing changes into the hot runtime file during the
same patch.

## Verification

Run:

```bash
npx jest tests/services/replyPreviewConfigService.test.js --runInBand --testTimeout=30000
```
