# Facebook Ads Tools Launcher - 2026-05-08

## What changed

- Exposed the already-routed Meta Ads tools through a compact launcher in the module navigation.
- Kept the primary module tabs focused on dashboard, campaigns, AI builder, Ad Library, audiences, and creative formats.
- Grouped advanced tools by operator workflow:
  - optimization and decisions: automation rules, decision reports, DCO, Advantage+
  - data and conversions: lead forms, Conversions API, attribution, saved audiences
  - assets and testing: ad preview, catalogs, A/B tests, full-ad wizard
- Preserved the selected `adAccountId` query parameter for launcher destinations so operators stay in the same Meta ad-account context.

## Verification

- Focused component coverage was added for launcher visibility and account-query preservation.

## Scope

- Frontend navigation only.
- No backend routes, services, or Meta API behavior changed.
