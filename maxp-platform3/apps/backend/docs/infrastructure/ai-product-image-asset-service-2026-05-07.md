# AI Product Image Asset Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/productImageAssetService.js` extracts the
product/variant image asset seam from `CoreAIAgent`.

The service now owns:

- product image extraction from main image and gallery;
- optional variant image inclusion from product records;
- variant image extraction from gallery and metadata aliases;
- merged image extraction across variant lists;
- preference for variant-specific images over generic product images.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- low-level asset extraction for products and variants;
- variant-vs-product image preference logic;
- image helper plumbing needed by grounding flows.

Moving this cluster into one service keeps image-asset logic cohesive and gives
grounding flows a direct dependency instead of routing through Core helpers.

## Key Dependencies

The service works through injected helpers for:

- JSON parsing;
- low-level image URL extraction;
- final image normalization/deduplication.

## Verification

Focused coverage lives in:

- `backend/tests/services/productImageAssetService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
