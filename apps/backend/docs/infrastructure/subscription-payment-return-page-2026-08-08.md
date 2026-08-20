# Subscription Payment Return Page (`/subscription`)

## Problem

After completing a Kashier payment for a platform bundle, the customer is redirected back to:

```
http://<host>/subscription?status=success&billingId=<billingRecord.id>
```

This redirect URL is produced by the platform subscription checkout endpoints
(`messaging-checkout`, `messaging-upgrade`, `lp-checkout`) in
`apps/backend/controller/platformSubscriptionController.js`.

The frontend had **no `/subscription` route** for authenticated users. Only the
unauthenticated branch contained `path="/subscription"` (which redirected to
`/auth/login`). As a result, an authenticated user landing on
`/subscription?status=success...` matched the authenticated catch-all route
(`<Route path="*" element={<Navigate to="/apps" replace />}>`) and was thrown
onto the apps dashboard ("المتجر") instead of seeing a payment-success
confirmation. This made it look like paying for a bundle dumped the customer
back onto the store.

## Fix

- New page: `apps/frontend/src/pages/payment/SubscriptionSuccess.tsx`
  - Reads `status`, `paymentStatus`/`statusCode`, and `billingId` from the URL.
  - **Success** state (default): "باقة AI + Inbox مفعّلة!" + primary CTA
    "ابدأ الآن — صندوق الوارد" → `/unified-inbox`, secondary link back to
    `/marketplace/bundles`.
  - **Failure** state: retry checkout or return to the bundles page.
  - **Pending** fallback (no status): continue to inbox or browse bundles.
- New route in `apps/frontend/src/App.tsx` next to the public payment routes
  (`/checkout/messaging`), so the return URL now renders a proper page.

## Files Changed

- `apps/frontend/src/pages/payment/SubscriptionSuccess.tsx` (new)
- `apps/frontend/src/pages/payment/__tests__/SubscriptionSuccess.test.tsx` (new)
- `apps/frontend/src/App.tsx` (lazy import + `/subscription` route)

## Tests

`npx jest --config jest.config.cjs src/pages/payment/__tests__/SubscriptionSuccess.test.tsx --runInBand`
covers success, Kashier `CAPTURED`, failure, and no-status fallback states.

## Note

The `/subscription` route lives in the public payment section so it renders for
authenticated users returning from the payment gateway. Unauthenticated visitors
who reach it will still see the page, but any in-app CTA lands on a protected
route that redirects to login.
