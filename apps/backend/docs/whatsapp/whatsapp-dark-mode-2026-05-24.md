# WhatsApp Dark Mode Implementation

## Overview
Comprehensive dark mode overhaul for the WhatsApp chat page (`/whatsapp` route) with a premium, eye-comfortable design inspired by modern WhatsApp Web, Telegram, and Slack.

## Changes Summary

### New Files
- `frontend/src/styles/whatsapp-dark.css` — Dedicated CSS module for WhatsApp dark mode

### Modified Files
- `frontend/src/pages/whatsapp/WhatsAppChat.tsx` — 102 changes: dialogs, sheets, context menus, modals
- `frontend/src/pages/whatsapp/components/ChatSidebar.tsx` — 58 changes: sidebar surfaces, search, filters
- `frontend/src/pages/whatsapp/components/ChatWindow.tsx` — 31 changes: chat background, input, typing indicator
- `frontend/src/pages/whatsapp/components/MessageBubble.tsx` — 22 changes: message bubbles, media, timestamps
- `frontend/src/styles/index.css` — Added WhatsApp CSS variables for light and dark modes

## Architecture

### CSS Variables System
Added 20+ WhatsApp-specific CSS custom properties in `:root` (light) and `.dark` (dark):

| Variable | Light | Dark |
|---|---|---|
| `--whatsapp-message-outgoing` | `#d9fdd3` | `#005c4b` |
| `--whatsapp-message-incoming` | `#ffffff` | `#1f2c33` |
| `--whatsapp-surface` | white 78% mix | background 72% + white 28% |
| `--whatsapp-surface-hover` | white 90% | background 62% + white 38% |
| `--whatsapp-input-bg` | white 85% | background 55% + white 45% |
| `--whatsapp-typing-bg` | white 0.92 | background 0.92 |
| `--whatsapp-bubble-shadow` | rgba dark 0.08 | rgba black 0.35 |

### Key Design Decisions
1. **WhatsApp-native colors**: Outgoing bubbles use WhatsApp green `#005c4b`, incoming use dark gray `#1f2c33`
2. **No hardcoded white backgrounds**: All `bg-white/*` Tailwind classes replaced with CSS variable references
3. **Smooth transitions**: `0.25s ease` on all themed properties via `whatsapp-theme-transition` class
4. **Emoji picker**: Fully themed via CSS variables for `EmojiPickerReact`
5. **Scrollbar**: Custom dark scrollbar matching the theme

### Dark Mode Variants
The dark mode works across all 6 dark variants in the system:
- Classic, Midnight, Aurora, Amethyst, Royal, OLED

Each variant's `--color-background` and `--color-border` cascade into the WhatsApp variables.

### Components Covered
- Chat sidebar (conversation list, search, filter pills)
- Chat window (header, messages area, input bar)
- Message bubbles (outgoing, incoming, replies, media)
- Context menus (message actions, contact actions)
- Dialogs (forward, poll, buttons, list, catalog, location, order)
- Sheets (contact info, group info)
- Emoji picker, reaction picker
- Empty states, loading skeletons
- Status indicators (typing, read/delivered/sent)
- Connection badges, unread badges

### 2026-06-01 Update: QuickOrderModal Dark Mode
- Fixed all white-mixed backgrounds in `QuickOrderModal.tsx` (used for create order from WhatsApp/Facebook chat)
- Replaced hardcoded `color-mix(in srgb, white X%, ...)` with dark-mode-aware CSS variables (`var(--business-surface-subtle)`, `var(--shell-control-bg)`, `var(--business-surface-panel)`, `var(--business-surface-strong)`)
- Added scoped dark mode CSS overrides in `whatsapp-dark.css` under `.dark .quick-order-modal` and `.dark .variant-selection-modal`
- Classes covered: `business-page-panel`, `business-control-input`, `business-chip-button`, `business-product-card`, `business-cart-card`, `business-workflow-tabs`, `business-workflow-tab`, `business-status-banner`, `business-icon-button`
- All overrides are scoped exclusively to the modal — no other pages affected

## Verification
- All files pass esbuild syntax check
- No JavaScript heap issues during build
- All `bg-white/*` patterns replaced with theme-aware variables
- Smooth transitions verified between light/dark toggles
