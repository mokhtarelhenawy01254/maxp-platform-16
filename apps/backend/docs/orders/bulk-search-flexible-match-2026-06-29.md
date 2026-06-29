# Bulk Search — Flexible Order Number Matching (2026-06-29)

## Problem

The bulk search controller was using an exact `in: cleanedValues` match for `orderNumber`.
This caused searches to return 0 results when users typed just the numeric part (e.g., `1793047`)
while the database stores the full prefixed format (e.g., `ORD-1793047`).

## Fix

Updated `bulkSearchController.js` to build a flexible OR query per value:
- Exact match
- `endsWith: -<value>` — covers `ORD-<number>` format
- `endsWith: <value>` — generic suffix match
- `contains: <value>` — fallback for any format

Also fixed `notFoundValues` computation to use the same flexible matching logic
so that a searched value like `1793047` is correctly marked as "found"
when `ORD-1793047` is returned from the database.

## Files Changed

- `apps/backend/controller/bulkSearchController.js`
