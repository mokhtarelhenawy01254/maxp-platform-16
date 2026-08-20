# Known Bugs & Resolution Log

## [2026-03-09] WhatsApp Workspace Scrolling & RTL Layout Fixes

- **Symptom**: Outer browser window was scrolling down on `/whatsapp#chat`, pushing the chat header off-screen and hiding the message input bar. RTL mode lacked vertical border division between sidebar and chat panel, and search bar was crammed with filter pills.
- **Root Cause**: Missing `h-full` and `min-h-0 overflow-hidden` on intermediate flex containers (`whatsapp-workspace-root`, `WhatsAppChat`, `ChatWindow`, `ChatRightPanel`), causing message virtualizer content height to expand outer parent containers to `min-height: auto`. Also, `.wa-panel-sidebar` hardcoded `border-right` regardless of document text direction (RTL/LTR).
- **Fix**: Added explicit `h-full min-h-0 overflow-hidden` to flex parents, set `shrink-0` on headers/input bars, added `[dir="rtl"] .wa-panel-sidebar` CSS rules, and reformatted the sidebar search input and filter pills into stacked rows.
