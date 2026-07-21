# WhatsApp Template Broadcast Session Resolution Fix

**Date**: 2026-07-21

## Summary

Fixed WhatsApp template broadcast page (`/whatsapp/template-broadcast`) session filtering and campaign sending failures.

## Changes

### Frontend (`WhatsAppTemplateBroadcast.tsx`)
- Clear templates list and reset selected template immediately on session change to prevent stale options from previously selected sessions.
- Pass `whatsAppSessionId` in the campaign creation payload.

### Database Schema (`marketing.prisma`)
- Added optional `whatsAppSessionId String?` field to `BroadcastCampaign` model.

### Backend Controller (`broadcastController.js`)
- Store `whatsAppSessionId` during campaign creation.
- Resolve `whatsAppSessionId` from the campaign record during immediate send, with fallback to the first active Meta Cloud session. Replaced hardcoded `company:${companyId}` which caused "Session not found" errors.

### Background Scheduler (`broadcastSchedulerService.js`)
- Added WhatsApp channel support: checks `campaign.channel === 'whatsapp'`, resolves the session, and sends template messages via `WhatsAppMessageHandler.sendTemplateMessage`.
- Facebook Messenger campaigns continue to work unchanged.

## Root Cause

1. **Stale templates**: Frontend did not clear template state on session switch.
2. **Immediate send failure**: `waSessionId` was hardcoded to `company:${companyId}` which is not a valid `WhatsAppSession` primary key.
3. **Scheduled send failure**: Scheduler had no WhatsApp support and attempted Facebook Messenger delivery for all campaigns.
