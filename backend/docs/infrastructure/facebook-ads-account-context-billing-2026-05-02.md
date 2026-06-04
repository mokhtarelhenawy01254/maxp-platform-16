# Facebook Ads Account Context and Billing Health

Date: 2026-05-02

## Summary

Facebook Ads management now treats the selected ad account as an explicit runtime context for reporting and synchronization work. This prevents dashboards, advanced reports, and Ads Manager syncs from silently falling back to another active ad account when a company can access more than one account.

## Backend Changes

- `GET /api/v1/facebook-ads/ad-accounts` requests richer Meta ad account fields including account status, business, funding source summary, amount spent, balance, and spend cap when Meta permissions allow it.
- The controller returns a sanitized `billingHealth` object instead of exposing raw `funding_source` or `funding_source_details`.
- If Meta returns no ad accounts but the company has saved `FacebookAdAccount` rows, the endpoint returns those saved accounts as local fallback options with a warning so local reporting can still be scoped explicitly.
- Async report creation, status checks, and results now accept an explicit `adAccountId` and resolve the matching local/remote ad account before calling Meta.
- Existing campaign list, performance summary, and sync behavior continue to scope reads to the active or requested `FacebookAdAccount`.
- Ad listing under an Ad Set uses the generated Prisma `facebookAdInsights` relation so creative review and preview workflows can load stored ads without a 500.

## Frontend Changes

- Added a shared Facebook Ads account context hook and panel.
- The Ads dashboard and advanced reports page now use the same selected account from the URL/local storage/active account.
- Sync, report creation, and campaign loading pass `adAccountId` to the backend.
- Campaign/report data is cleared and create/sync/report actions stay blocked until a concrete ad account is selected.
- The context panel displays business identity, account status, payment-source availability, total amount spent, spend cap, pixel count, and ready page count when available.

## Safety Notes

- MaxP does not collect, store, or display raw card data.
- Meta billing actions such as adding a payment method or adding funds remain inside Meta Billing & Payments.
- Avoid requesting unsupported Meta account fields such as `adtrust_dsl`; unsupported fields can make the whole ad-account list fail and force the UI into local fallback mode.
- The payment display is diagnostic only. `balance` from Meta may represent account balance/outstanding state depending on account billing mode; operators should treat it as a Meta-provided billing signal, not guaranteed prepaid available funds.
- Page/Messenger tokens are not modified by this work.

## Verification Target

Focused checks should cover:

- `FacebookAdsService.getAdAccounts` rich fields and fallback fields.
- `facebookAdsController.getAdAccounts` billing-health sanitization.
- `facebookAdsController.createAsyncReport` using a requested ad account.
- Frontend type-check/build around the shared account context panel and dashboard/report wiring.
