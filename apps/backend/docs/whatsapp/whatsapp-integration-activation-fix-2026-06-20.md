# WhatsApp Integration Activation Fix

**Date:** 2026-06-20

## Problem

`POST /api/v1/whatsapp/sessions` returned 403 `needsActivation` for users on the AI + Inbox Bundle.

## Root Cause

The route checks for a `CompanyApp` record with slug `whatsapp-integration`, but the AI + Inbox Bundle activation flow only created records for `ai-chat-basic` and `unified-inbox`. The `messaging-bundle` checkout flow also created the wrong slug: `whatsapp-business` instead of `whatsapp-integration`.

## Changes

| File | Line | Change |
|------|------|--------|
| `controller/marketplaceController.js` | 1886 | Added `"whatsapp-integration"` to bundle appSlugs |
| `controller/platformSubscriptionController.js` | 736 | Added `"whatsapp-integration"` to checkout slugs |
| `controller/platformSubscriptionController.js` | 926 | Fixed `whatsapp-business` → `whatsapp-integration` in webhook |
| `prisma/seeds/marketplaceSeed_simple.js` | 133 | Fixed `whatsapp-business` → `whatsapp-integration` in bundle seed |
