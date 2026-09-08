# Facebook Inbox Mobile Layout Gap Fix (2026-09-08)

## Problem Description
On mobile view in `https://maxp.online/facebook-inbox`, a large empty gap appeared between the message composer (`MessageInput`) and the bottom of the viewport / navigation bar.
The root causes were:
1. `shouldRemovePadding` in `Layout.tsx` did not include `/facebook-inbox`, causing `<main>` to render with `p-4 md:p-6 overflow-y-auto min-h-0` rather than `p-0 overflow-hidden min-h-0 h-full max-h-full`.
2. Under `<main>` with `overflow-y-auto` and no `h-full`, the child `.business-inbox-shell`'s `height: 100%` computed to `auto` (fitting content height), causing the chat column to shrink around messages and leaving the remainder of the viewport as dead space below the composer.
3. In `FacebookInbox.tsx`, the cleanup `useEffect` only removed `p-6` (ignoring `p-4` applied on mobile), and the inner chat column lacked explicit `h-full min-h-0 flex flex-col`. The composer lacked `flex-shrink-0 mt-auto`.
4. In `helpers.ts`, `/facebook-inbox` was missing from `STRICT_CHAT_PATHS` and `CHAT_PREFIX_PATHS`.
5. In `index.css`, mobile overrides for `.business-inbox-column` and `.business-inbox-stage` did not enforce `height: 100%; min-height: 0; flex: 1`.

## Changes Made
- **Layout.tsx**:
  - Added `/facebook-inbox`, `/instagram-inbox`, `/tiktok-inbox`, `/unified-inbox`, and `/conversations` to `shouldRemovePadding`.
  - Added dynamic viewport height `h-[100dvh]` alongside `h-screen`.
- **helpers.ts**:
  - Added `/facebook-inbox`, `/unified-inbox`, `/conversations` to `STRICT_CHAT_PATHS` and `CHAT_PREFIX_PATHS`.
- **FacebookInbox.tsx**:
  - Removed `p-4` alongside `p-6` in DOM class cleanup.
  - Added `h-full w-full flex flex-col flex-1 min-h-0 overflow-hidden` to `.business-inbox-shell`.
  - Added `flex-1 h-full min-h-0 relative overflow-hidden` to `.business-inbox-stage`.
  - Added `flex-1 h-full min-h-0 flex flex-col relative overflow-hidden` to `.business-inbox-column`.
  - Added `min-h-0` to `.business-chat-stage`.
  - Added `flex-shrink-0 mt-auto` to the bottom composer container.
- **index.css**:
  - Enforced `height: 100%; min-height: 0; flex: 1` on mobile `.business-inbox-stage` and `.business-inbox-column`.
  - Added `padding-bottom: env(safe-area-inset-bottom, 0px)` to `.business-chat-composer`.
  - Fixed `.app-shell-content:has(.business-inbox-shell) .business-inbox-shell` selector to match descendant elements without requiring direct child.
