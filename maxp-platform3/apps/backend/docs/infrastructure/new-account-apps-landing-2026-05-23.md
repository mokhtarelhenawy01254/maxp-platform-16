# New Account Apps Landing - 2026-05-23

## Scope
Standard platform registration now sends newly created accounts to the applications marketplace (`/marketplace`) immediately after successful signup. First login through `/auth/login` also lands on `/marketplace` for owner accounts that have no prior `lastLoginAt`.

## Rationale
The generic post-auth helper is still correct for returning users, merchants, affiliates, system users, and onboarding/dashboard decisions. A new account creation moment, including the first login after account creation, needs a product-led first entry so users see the available apps before the regular home dashboard.

## Implementation
- `frontend/src/pages/auth/Register.tsx` now uses a signup-specific destination constant: `/marketplace`.
- `frontend/src/utils/companyOnboarding.ts` routes first-login `OWNER` accounts with `lastLoginAt === null` to `/marketplace`.
- Returning users and role-aware post-auth routing still use the existing merchant, affiliate, system-user, onboarding, and dashboard destinations.
- `auth_register` analytics keeps reporting the destination, now as `/marketplace`.
- `frontend/src/pages/auth/__tests__/Register.test.tsx` covers the behavior for a new owner whose company still needs onboarding.
- `frontend/src/utils/__tests__/companyOnboarding.test.ts` covers first-login owner routing and role-specific exceptions.

## Verification
- `npm test -- --runTestsByPath src/pages/auth/__tests__/Register.test.tsx --runInBand`
- `npm test -- --runInBand src/utils/__tests__/companyOnboarding.test.ts src/pages/auth/__tests__/Register.test.tsx`
- `npm run build`
- Production smoke over SSH:
  - backend health endpoint returned OK on port `3007`
  - `https://maxp.online/auth/register` loaded
  - a temporary signup redirected to `https://maxp.online/marketplace`
  - the temporary user and company were deleted after verification

## Notes
`npm run type-check` is still blocked by unrelated repository-wide TypeScript errors, starting in `src/components/Admin/FAQManagement.tsx` and `src/components/Admin/PolicyManagement.tsx`.
