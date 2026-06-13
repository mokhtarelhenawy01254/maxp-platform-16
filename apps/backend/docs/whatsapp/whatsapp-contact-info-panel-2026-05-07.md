# WhatsApp Contact Info Panel Polish - 2026-05-07

## Context

The production WhatsApp contact info drawer could look inconsistent for contacts whose WhatsApp push names used decorative Unicode letters or emoji. The phone number was technically present in the API response, but it rendered as muted description text and could be easy to miss in the right-side drawer.

## Change

- Centralized WhatsApp contact display helpers in `frontend/src/pages/whatsapp/whatsappContactDisplay.ts`.
- Normalized decorative display names with Unicode NFKC before rendering, while preserving emoji.
- Added phone-number fallback from the JID local part when `phoneNumber` is missing.
- Rendered the contact number in a visible LTR phone pill with a `tel:` href.
- Made the drawer action rows use consistent heights, spacing, and muted danger styling.
- Added focused Jest coverage for display-name normalization, phone fallback, phone formatting, and avatar initials.

## Verification

- Targeted Jest: `npm test -- --runInBand src/pages/whatsapp/__tests__/whatsappContactDisplay.test.ts`
- Production build: `npm run build`
- Full frontend type-check remains blocked by broad pre-existing TypeScript debt outside this WhatsApp panel change.
- Production deployment should rebuild `frontend/dist` and swap `/var/www/frontend2/dist`.
