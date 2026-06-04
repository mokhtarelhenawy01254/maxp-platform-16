# WhatsApp Contact Display Processor (2026-06-01)

## Overview
Created a unified display processor layer to replace all internal IDs (JID, remoteJid, chatId, conversationId, participantId, etc.) with real WhatsApp phone numbers across all chat UI components.

## Problem
Internal IDs like `chatId`, `remoteJid`, `sessionId`, `participantId` were being displayed to end users in:
- Chat list (contact names showed raw JID fallbacks)
- Chat header (`jid.split("@")[0]` shown for groups)
- Contact info panels
- Forward dialog
- Blocklist
- Group participant lists
- Status display
- Notifications

## Changes

### 1. Unified Display Processor (`frontend/src/pages/whatsapp/whatsappContactDisplay.ts`)
Complete rewrite as a centralized display layer:

- **`extractCleanDigits()`** — Extracts real phone digits from any source (phoneNumber field, JID), skips groups and non-phone fallbacks (`group:`, `lid:`, `jid:`)
- **`getContactPhoneNumber()`** — Returns clean digit string only
- **`formatContactPhoneNumber()`** — Formats numbers for display (Egyptian: `+20 XXX XXX XXXX`, International: `+XXXXXX`)
- **`getContactDisplayPhone()`** — Returns formatted phone, empty for groups
- **`getBestContactDisplayName()`** — Returns name (if available) or formatted phone (never raw JID)

### 2. ChatWindow Header (`ChatWindow.tsx`)
- **Before**: `selectedContact.jid.split("@")[0]` for groups, raw `selectedContact.phoneNumber` for individuals
- **After**: `getContactDisplayPhone(selectedContact)` — always formatted, never internal ID

### 3. ChatSidebar (`ChatSidebar.tsx`)
- Status display: `status.remoteJid.split("@")[0]` → `getContactDisplayPhone({ jid })`
- Contact list phone: unformatted → `getContactDisplayPhone(contact)` with `dir="ltr"`

### 4. WhatsAppChat (`WhatsAppChat.tsx`)
- `getParticipantName()`: Raw JID fallback → `getContactDisplayPhone({ jid })`
- Notification sender: `message.remoteJid.split('@')[0]` → `getContactDisplayPhone({ jid })`
- Forward dialog: `getContactPhoneNumber()` → `getContactDisplayPhone()` with `dir="ltr"`
- Temp contact creation: `jid.split('@')[0]` → JID digits extraction

### 5. Shared Dialogs (4 files)
- **GroupInfoDrawer.tsx**: `participant.id.split("@")[0]` → `getContactDisplayPhone()`; `getContactName` fallback to raw JID → display processor
- **PrivacySettingsDialog.tsx**: Blocklist JID display → formatted phone; `getBlockedContactLabel` JID fallback → display processor
- **CreateGroupDialog.tsx**: Local `getContactName` → `getBestContactDisplayName()`; raw `contact.phoneNumber` → `getContactDisplayPhone()`
- **BroadcastDialog.tsx**: Same pattern as CreateGroupDialog

### 6. WhatsAppSettings Blocklist (`WhatsAppSettings.tsx`)
- `jid.split("@")[0]` as primary label → `getContactDisplayPhone({ jid })`
- Full JID removed from secondary text
