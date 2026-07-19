# Text Locale Support Service

- Date: 2026-05-07
- Service: `backend/services/aiAgent/textLocaleSupportService.js`

## Purpose

Extract the remaining small Arabic/text-locale helpers from `CoreAIAgent`:

- loose Arabic text normalization
- lightweight customer-name gender detection
- Arabic list formatting
- governorate extraction from customer text

## Why this seam

These helpers had become dependency leafs used by extracted services through
bootstrap binds. Moving them behind a dedicated service reduces small-but-sticky
Core fan-out and centralizes the locale-specific helpers that reply shaping,
summary extraction, shipping pricing, and context preparation still need.

## Wiring

- Constructed in `backend/services/aiAgent/coreAIAgentBootstrapService.js`
- Exposed on the Core instance as `textLocaleSupportService`
- `CoreAIAgent` keeps compatibility wrappers for the original helper names
- Bootstrap now injects the locale helpers directly into summary, shipping,
  context-preparation, reply-shaping, post-purchase support, and order
  collection services

## Validation

- `backend/tests/services/textLocaleSupportService.test.js`
- `backend/tests/scripts/aiRuntimeInventory.test.js`
