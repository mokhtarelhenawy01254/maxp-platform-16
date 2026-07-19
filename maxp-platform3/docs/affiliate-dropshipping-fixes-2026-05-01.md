# Affiliate & Dropshipping Fixes - 2026-05-01

## What changed

- Mounted public signup APIs for:
  - `/api/v1/public/affiliates`
  - `/api/v1/public/merchants`
- Restored missing frontend routes for:
  - `/affiliates/register`
  - `/affiliates/orders`
  - `/affiliates/orders/create`
  - `/affiliates/customers`
  - `/merchants`
  - `/merchants/new`
  - `/merchants/:id`
  - `/merchants/:id/edit`
- Fixed affiliate commission page parsing so recent commissions load from the current backend response shape.
- Persisted affiliate system `platformMarginType` and `platformMarginValue`.
- Public affiliate signup now loads company branding plus affiliate program settings and blocks signup when the program is inactive.
- Public merchant signup now supports root-domain usage by accepting a company slug/id when no subdomain is present.
- Added an admin sidebar entry for merchant management under `Affiliate & Dropshipping`.

## QA focus

1. Open an affiliate invite link such as `/affiliate-register/:slug` and confirm:
   - company name/logo load
   - custom terms appear
   - disabled program shows a blocked state
2. Submit the public merchant form from:
   - a company subdomain
   - the root domain with a company slug entered manually
3. Verify admin navigation to `/merchants`, create a merchant, then open view/edit pages.
4. Verify affiliate navigation:
   - dashboard
   - orders
   - customers
   - create order alias
5. Verify affiliate settings save and reload:
   - platform margin type
   - platform margin value
