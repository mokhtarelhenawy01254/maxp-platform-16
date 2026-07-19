# Project Break-Even Translations Fix

## Problem Description
The translation keys on the `/tools/break-even` page (e.g. `projectBreakEven.title`, `projectBreakEven.desc`, etc.) were displayed raw on the page because the translation files were overwritten by the `merge-translations.js` script.

## Root Cause
- The `projectBreakEven` nested translation object was previously edited directly in `translation.json`.
- The `merge-translations.js` script, which runs as a `predev` and `prebuild` hook, compiles the files in `src/locales/<lang>/sections/` into `translation.json`.
- Since there was no `projectBreakEven.json` file in `sections/`, the manual edits in `translation.json` were overwritten and lost.

## Resolution
- Created `apps/frontend/src/locales/ar/sections/projectBreakEven.json` for Arabic.
- Created `apps/frontend/src/locales/en/sections/projectBreakEven.json` for English.
- Placed all `projectBreakEven` translations inside these dedicated section files.
- Ran the merge script (`npm run i18n:merge`) to safely regenerate both `translation.json` files.
