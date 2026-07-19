# Post AI Tracking Priority Links - 2026-05-05

## Summary

`/posts/ai-tracking` now exposes direct Facebook post URLs and a focused "needs attention" workflow for high-visit posts that still do not have a featured product.

## Backend

- `GET /api/v1/conversations/posts/ai-identification` accepts `status=needs_attention` and optional `priorityThreshold`.
- The endpoint returns `permalinkUrl`, `needsAttention`, `priorityScore`, `alertThreshold`, and summary `needsAttention` / `attentionThreshold` values.
- Needs-attention sorting defaults to `visitCount desc`.
- Company-level warning notifications are deduped for 24 hours per post using `data.kind = post_ai_needs_attention`.

## Frontend

- The dashboard has a compact "محتاج تدخل" metric, alert strip, status filter, row badge, and direct "فتح البوست" link.
- Selecting "محتاج تدخل" automatically switches sorting to highest visits first.

## Verification

- `backend`: `npm test -- --runTestsByPath tests/postAITrackingController.test.js`
- `backend`: `node --check controller/conversation/postDetailsController.js`
- `frontend`: `npm run build`
