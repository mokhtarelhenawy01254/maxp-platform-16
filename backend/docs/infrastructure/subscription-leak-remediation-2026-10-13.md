# Subscription Lifecycle & Universal Expiration Guard Fix (2026-10-13)

## Context & Problem Statement
Companies like `Harmoney Dental Lab` and other tenants were discovered operating on production with full access to paid vertical features (e.g., `dental-lab-app`, `conversion-suite`, `analytics-basic`) without active subscription payments even after their trial periods expired (`trialEndsAt < now`).

### Root Causes Identified:
1. **Onboarding Auto-Install Flaw (`initializeCompanyDefaults.js`):** Specialty apps for new signups were inserted with `status: 'ACTIVE'`, `trialEndsAt: null`, `validUntil: null`, `nextBillingAt: null`, and `installedInTrial: false`, permanently exempting them from trial freezing.
2. **Platform Subscription $0 Loophole (`billingService.js`):** `platformSubscription` was provisioned with `monthlyFee: 0` and `status: 'ACTIVE'`, continuously refreshing next billing dates without charges.
3. **Whitelist Exclusion in `checkAppAccess.js`:** Non-WhatsApp and non-Dental apps were bypassed unconditionally if status was `ACTIVE` via `!STRICT_EXPIRY_ENFORCED_SLUGS.has(appSlug)`.
4. **Dental Lab Nested Condition Bypass:** In `checkAppAccess.js`, `trialEnded` was nested inside `now > nextBillingDate`. When `monthlyFee` was 0 and `nextBillingDate` was in the future, expired trials were bypassed.
5. **Overdue Query Window in `billingCronService.js`:** The daily recurring billing query used `gte: today, lt: tomorrow`. Overdue subscriptions (< today) dropped out of the query window permanently.

## Fixes Implemented:
1. **`apps/backend/middleware/checkAppAccess.js`:**
   - Universal guard for all paid apps: If an app is a paid tool (`monthlyPrice > 0` or `pricingModel === 'SUBSCRIPTION'`) and the company's trial ended without a valid future expiry date (`validUntil`) or active paid monthly fee (`isFeeActive`), access is blocked.
   - For `DENTAL_LAB_SLUGS`: If `trialEnded && !isFeeActive`, access is blocked immediately.
2. **`apps/backend/controller/dentalLabController.js`:**
   - In `/api/v1/dental-lab/my-info`: If `monthlyFee === 0`, `effectiveEndDate` prioritizes `company.trialEndsAt` over `pSub.nextBillingDate`, correctly signaling `isExpired: true` and rendering the renewal warning banner.
3. **`apps/backend/services/billingCronService.js`:**
   - Changed query filter from `gte: today, lt: tomorrow` to `lte: tomorrow` for both platform subscriptions and app subscriptions so all overdue records are caught.
4. **`apps/backend/utils/initializeCompanyDefaults.js`:**
   - Set `status: 'TRIAL'`, `trialEndsAt`, and `installedInTrial: true` for all auto-installed paid specialty apps when `trialDays > 0`.
5. **`apps/backend/controller/authController.js`:**
   - Persists `trialModeEnabled: true`, `trialStartedAt`, and `trialEndsAt` to the company record upon signup.

## Verification:
- Validated via automated unit test `test_subscription_guard.js` covering 5 distinct scenarios: Harmoney Dental Lab, expired generic paid app, active trial company, paid subscription company, and free app.
- Zero blast radius confirmed across other modules.
