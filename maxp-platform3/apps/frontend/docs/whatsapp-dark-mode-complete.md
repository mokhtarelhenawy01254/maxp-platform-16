# WhatsApp Pages Dark Mode Fixes

## Summary
Added full dark mode (`dark:` variants / CSS variable tokens) across all WhatsApp pages.

## Files Changed
- **whatsapp/WhatsAppCustomerJourney.tsx** — replaced all `bg-white/X` with `bg-[color:var(--color-card)]/X` (26 occurrences)
- **whatsapp/WhatsAppMetaTemplates.tsx** — added `dark:` variants to `statusBadge` (5 badges) and delete button
- **whatsapp/WhatsAppTemplateBroadcast.tsx** — added `dark:` variants to success/failure result cards
- **whatsapp/WhatsAppTemplates.tsx** — added `dark:` variants to badges, preview, metrics
- **whatsapp/WhatsAppNotifications.tsx** — added `dark:` variants to alert banners and journey cards
- **whatsapp/WhatsAppChat.tsx** — added `dark:` variants to destructive buttons and star icon
- **whatsapp-inbox/WhatsAppChat.tsx** — spinner, transfer button, timestamp
- **whatsapp-inbox/WhatsAppInbox.tsx** — spinner
- **whatsapp-inbox/WhatsAppNumberSettings.tsx** — radio button `bg-white` → `bg-[color:var(--color-card)]`
- **BookingManagementPage.tsx** — 122 lines of `dark:` classes across all sections

## Scope
- 11 WhatsApp-related files
- 1 Booking (medical system) page
- All pages now at 95–100% dark mode coverage
