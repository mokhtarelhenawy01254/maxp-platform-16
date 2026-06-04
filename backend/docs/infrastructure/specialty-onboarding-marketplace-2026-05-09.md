# Specialty Onboarding And Marketplace Scoping

Date: 2026-05-09

## Summary

Registration now assigns each company to an active business specialty. The platform onboarding settings hold the default trial period, currently defaulting to seven days, and super admins can manage both the trial length and the specialty-to-app mapping from the platform onboarding page.

## Backend Changes

- Added `BusinessSpecialty` to the Prisma schema and linked it to `Company`.
- Added public specialty discovery at `GET /api/v1/auth/business-specialties`.
- Added the pre-registration specialty and signup coupon endpoints to the global public route allowlist.
- Registration accepts a selected specialty and installs only the mapped starter marketplace apps for the new company.
- Default app initialization supports specialty-scoped starter app installs with trial status and trial end dates.
- Marketplace listing, categories, app details, app install, bundles, and bundle subscription now remain global so new companies can discover and activate the full app catalog. The selected specialty is returned as context only, not as a visibility gate.
- Super admin platform routes now expose onboarding settings and specialty CRUD endpoints.

## Frontend Changes

- Registration loads the active specialties, supports Arabic and English copy, and requires the user to choose a specialty before account creation.
- Marketplace displays the active specialty context while showing the full app catalog.
- Super admin sidebar includes the new onboarding settings page for managing trial days and specialty app mappings.

## Verification

- `backend`: Prisma client generation, syntax checks, and marketplace catalog validation.
- `frontend`: Vite production build.
- Touched frontend files have no new TypeScript errors; the repository-wide type check still contains unrelated legacy errors.
