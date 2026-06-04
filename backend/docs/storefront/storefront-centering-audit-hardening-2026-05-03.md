# Storefront Centering Audit Hardening - 2026-05-03

## Context

The PR validation workflow caught a desktop centering regression in the storefront safety audit. The audit measured `.storefront-shell .container` elements as soon as the shell appeared, which allowed the startup fallback (`aria-busy="true"`) to be measured before the final storefront route was ready.

## Change

- The centering audit now waits until `.storefront-shell` is no longer marked busy before measuring layout containers.
- Storefront container CSS explicitly preserves left and right auto margins so later utility classes cannot push desktop containers off-center.

## Verification

- `npm run audit:storefront-centering -- --widths 1440 --themes furniture-demo --base-url http://127.0.0.1:3001`
- `npm run audit:storefront-centering -- --widths 1440 --base-url http://127.0.0.1:3001`
- `npx eslint src/storefront/scripts/audit-storefront-centering.ts`

GitHub `Storefront Validation` passed for `390px`, `1440px`, and `2200px` after the fix.
