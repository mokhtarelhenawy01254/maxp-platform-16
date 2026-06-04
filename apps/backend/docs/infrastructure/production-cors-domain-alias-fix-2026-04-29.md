# Production CORS Domain Alias Fix - 2026-04-29

## Issue

Production inbox traffic was still reaching the backend from Meta, but several company dashboards running on `*.maxp.online` were not consistently receiving or rendering updates on the site.

## Root Cause

- Backend CORS origin validation in `backend/config/environment.js` only trusted a single `MAIN_DOMAIN`.
- Production currently keeps `mokhtarelhenawy.online` as the legacy primary domain for the Facebook app and webhook flow.
- Company dashboards and storefront traffic are already active on `maxp.online` subdomains.
- Because `maxp.online` was not included in the generated allowlist, production logs repeatedly showed `Blocked origin` for:
  - `https://swan.maxp.online`
  - `https://alpha.maxp.online`
  - `https://flora.maxp.online`
  - `https://maxp.online`

## Fix

- Added multi-domain allowlist generation in `backend/config/environment.js`.
- Added a known alias bridge between:
  - `mokhtarelhenawy.online`
  - `maxp.online`
- Added support for extra runtime domains through:
  - `ALLOWED_FRONTEND_DOMAINS`
  - `ADDITIONAL_ALLOWED_DOMAINS`
  - `DOMAIN_ALIASES`
- Kept `MAIN_DOMAIN` unchanged so the legacy Facebook/webhook registration can remain on `mokhtarelhenawy.online` during the current rollout.

## Regression Coverage

- Added `backend/tests/config/environment.corsOrigins.test.js` to verify:
  - both legacy and branded domain families are allowed together
  - explicitly configured additional domains remain supported
