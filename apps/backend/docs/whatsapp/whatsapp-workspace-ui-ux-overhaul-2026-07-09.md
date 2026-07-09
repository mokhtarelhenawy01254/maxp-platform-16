# WhatsApp Workspace UI/UX Overhaul (2026-07-09)

## Overview
This document outlines the design and usability improvements made to the WhatsApp Workspace interface on desktop and laptop screens. The goal of these updates was to reduce visual noise, optimize space utilization, and align the interface ergonomics with native chat application behaviors (like WhatsApp Web).

## Key Improvements

### 1. Compact Conversation List (ChatSidebar)
* **Reduced Density:** Decreased the minimum height of conversation cards from `4rem` to `3.25rem` on desktop screens, saving vertical space to show more concurrent chats.
* **Borderless List Layout:** Removed individual card borders and rounded corners, creating a continuous list separated by very subtle `color-mix` divider lines.
* **Low-Contrast Session Time Limit Badge:** Replaced the high-contrast solid green pill for the customer window remaining time limit with a soft, semi-transparent background (`bg-emerald-500/10` and `bg-rose-500/10`), reserving high-intensity green badges exclusively for actual unread message counts.
* **Gradient Fallback Avatars:** Upgraded default text avatars with a soft linear color-mix gradient to give the sidebar a modern, premium appearance.
* **Layout Stability:** Aligned the skeletal loading state (`renderLoadingRows`) with the new compact dimensions to prevent vertical layout shifts during loading transitions.

### 2. Chat Window Background
* **Warm Chat Wallpaper:** Replaced the boring, cold solid grey background in the messages area with a warm, comfortable grey-beige color (`#efeae2` in light mode and `#0b141a` in dark mode) paired with a subtle, transparent radial dot pattern simulating a classic chat backdrop.

### 3. Restructured Bottom Input Bar
* **Ghost Accessory Buttons:** Removed boundaries and borders around input attachments (Smile, Paperclip, Plus) to present them as clean ghost icons that highlight smoothly on hover.
* **Integrated Mic & Send Actions:** Designed the voice recording button as a transparent ghost icon. When the user starts typing, it seamlessly replaces the mic icon with the emerald circular Send button, mimicking the original WhatsApp Web user experience.
* **Centered Input Textarea:** Shifted the textarea container's visual background to a clean white box (`bg-background`) in light mode and updated borders to fit cleanly over the new wallpaper background.

## Modified Files
* `apps/frontend/src/pages/whatsapp/components/ChatSidebar.tsx`
* `apps/frontend/src/pages/whatsapp/components/ChatWindow.tsx`
* `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx`
* `apps/frontend/src/styles/whatsapp-responsive.css`
* `apps/frontend/src/styles/whatsapp-dark.css`
