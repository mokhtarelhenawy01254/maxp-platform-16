# AI Customer Image Handling Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/customerImageHandlingService.js` extracts the
customer-image handling seam from `CoreAIAgent`.

The service now owns:

- customer-safe deterministic image replies;
- deterministic image-identification replies after grounded matches;
- unmatched-image clarification replies;
- image URL extraction and normalization;
- comparable URL / fingerprint deduplication;
- attachment/media candidate extraction from stored messages;
- recent customer-image recovery for follow-up text questions.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- product/image reply shaping,
- low-level image URL parsing,
- stored-message attachment traversal,
- recent-image recovery heuristics.

Moving these concerns into one service keeps image/media behavior cohesive and
reduces the number of extracted services that still depend on Core for shared
image helpers.

## Key Dependencies

The service stays mostly pure and works through injected helpers for:

- text normalization;
- attribute-key normalization;
- grounded price formatting;
- variant attribute access;
- price/variant intent predicates.

## Changelog

### 2026-05-14 — WhatsApp Image Filename Leak & URL Resolution Fix
- **`extractImageUrls()`**: Removed fallback regex `/\.(png|jpe?g|webp|gif)$/i` that matched bare filenames (e.g. `photo_2026-05-13_12-47-36.jpg`) as valid image URLs. WhatsApp/Telegram auto-fills `caption` with the filename, which was being treated as a real URL and pushed to AI models.
- **`extractImageUrlsFromStoredMessage()`**: Reinstated `extractImageUrls(proxiedContent)` for `IMAGE` messages (safe now because the regex no longer matches bare filenames).
- **`normalizeImageCandidates()`**: Changed `normalized.push(candidate)` → `normalized.push(comparableUrl)` so relative paths like `/uploads/whatsapp/images/file.jpg` are resolved to full URLs via `resolveComparableImageUrl` before reaching AI providers.
- **`extractIncomingImageUrls()`**: Removed unused `messageType` and `content` parameters. Updated all callers.

## Verification

Focused coverage lives in:

- `backend/tests/services/customerImageHandlingService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
