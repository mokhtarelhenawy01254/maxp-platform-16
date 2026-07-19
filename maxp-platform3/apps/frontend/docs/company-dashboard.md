# Company Dashboard

## Current layout

- The dashboard intentionally starts with the date filter instead of a large hero block.
- `Quick Actions` and `Asset Overview` were removed to keep the page focused on live metrics, top products, onboarding state, and the quick-start checklist.
- The empty `Growth Activity` and `Order Health` sections were removed from the page entirely instead of showing large no-data placeholders.
- The quick-start checklist still remains available, but it now sits below the compact date controls.
- Incomplete owners now see an onboarding resume card instead of a generic dashboard-first experience.
- Completed owners now see an `الإطلاق الأول` activation card that pushes them toward the next real business action.
- Once all activation signals are complete, the dashboard swaps that card for an explicit success state instead of silently removing onboarding guidance.

## Date filter behavior

- First load defaults to `Today`.
- Preset ranges are now selected from one compact control instead of a full row of chips.
- Manual date inputs stay hidden until the user switches to `Custom range`.
- The visible range summary prefers preset names such as `Today` or `Last 7 days`; exact dates are shown as supporting context instead of the main label.

## Activation behavior

- The dashboard derives a lightweight activation phase from live company data rather than static booleans.
- Current tracked signals are:
  - first product exists
  - storefront link exists
  - channel decision exists
  - first order exists
- The activation CTA routes directly to the next practical destination, such as:
  - `/products/new`
  - `/settings/store` or the public storefront
  - `/whatsapp`
  - `/orders/manual`
- When activation reaches `4/4`, the dashboard now shows an `الإطلاق اكتمل` success card with follow-up actions to:
  - open `/orders`
  - open the public storefront
- This success path now assumes default provisioning includes `ecommerce-basic`, which was verified on a fresh signup after the backend provisioning fix.
