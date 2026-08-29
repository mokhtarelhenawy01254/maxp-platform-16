# Known Bugs & Resolution Log

## [2026-03-09] WhatsApp Workspace Scrolling & RTL Layout Fixes

- **Symptom**: Outer browser window was scrolling down on `/whatsapp#chat`, pushing the chat header off-screen and hiding the message input bar. RTL mode lacked vertical border division between sidebar and chat panel, and search bar was crammed with filter pills.
- **Root Cause**: Missing `h-full` and `min-h-0 overflow-hidden` on intermediate flex containers (`whatsapp-workspace-root`, `WhatsAppChat`, `ChatWindow`, `ChatRightPanel`), causing message virtualizer content height to expand outer parent containers to `min-height: auto`. Also, `.wa-panel-sidebar` hardcoded `border-right` regardless of document text direction (RTL/LTR).
- **Fix**: Added explicit `h-full min-h-0 overflow-hidden` to flex parents, set `shrink-0` on headers/input bars, added `[dir="rtl"] .wa-panel-sidebar` CSS rules, and reformatted the sidebar search input and filter pills into stacked rows.

## [2026-08-23] Turbo shipmentService Phone Normalization Rejected International `00` Prefix

- **Symptom**: Orders with an international dialing prefix (e.g. `00201012345678` or `+201012345678`) failed Turbo shipment creation with `رقم هاتف العميل غير صحيح` even though the number is a valid Egyptian mobile.
- **Root Cause**: `services/turbo/shipmentService.js` only stripped a `20` country-code prefix when the digit string was exactly 12 chars, and treated `+` (non-digit) as expected, but never handled the leading `00` international prefix. A `00` prefixed number became 14 digits starting with `00`, so neither the `20` nor the `01` checks matched and it threw.
- **Fix**: Added a `if (validPhone.startsWith('00')) validPhone = validPhone.slice(2);` step before the country-code check, so `00`/`+` prefixed numbers normalize identically (`0020…` → `20…` → national `01…`). Added a regression test in `tests/services/turbo/shipmentService.test.js` (`normalizes phone with double-zero international prefix 0020`). Resolves the open item noted in `TEAM_SYNC.md`.
