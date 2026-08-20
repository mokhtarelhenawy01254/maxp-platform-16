

---
## [2026-03-09] WhatsApp Workspace Scroll & RTL Layout Resolved

Fixed WhatsApp workspace scrolling and design layout bugs on `/whatsapp#chat`:

- Fixed viewport height propagation (`h-full`, `min-h-0 overflow-hidden`) across `whatsapp-workspace-root`, `WhatsAppChat`, `ChatWindow`, and `ChatRightPanel`.
- Prevented outer browser window scrolling so header and message input bars stay pinned.
- Fixed RTL mode border divider for `.wa-panel-sidebar` and `ChatRightPanel`.
- Refactored sidebar search input and filter strip into two stacked, full-width responsive rows.

---
## [2026-07-24] Turbo Sub-Service Test Coverage Added

Added 6 Jest test files covering all turbo sub-services (96 tests, all passing):

- 	ests/services/turbo/apiClient.test.js (35 tests)
- 	ests/services/turbo/shipmentService.test.js (17 tests)  
- 	ests/services/turbo/trackingService.test.js (16 tests)
- 	ests/services/turbo/locationService.test.js (15 tests)
- 	ests/services/turbo/labelService.test.js (10 tests)
- 	ests/services/turbo/ticketService.test.js (17 tests)

Phase 2 refactoring (turboService.js ΓåÆ thin 114-line facade) was confirmed complete.
One bug discovered during testing: phone normalization lse if logic in shipmentService (see Bugs.md).
