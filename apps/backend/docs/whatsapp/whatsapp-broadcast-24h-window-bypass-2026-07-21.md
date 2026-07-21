# WhatsApp Template Broadcast 24-Hour Recipient Window Bypass Fix

**Date**: 2026-07-21

## Overview

Resolved the issue where WhatsApp template broadcast campaigns failed with `"No active recipients found"` (0 matched recipients) when targeted customers did not send a message to the business within the last 24 hours.

## Root Cause

The campaign processing logic in `broadcastController.js` (`sendCampaign`) and `broadcastSchedulerService.js` (`sendScheduledCampaign`) filtered targeted conversations using the condition:
```javascript
messages: {
  some: {
    isFromCustomer: true,
    createdAt: { gte: twentyFourHoursAgo }
  }
}
```

This 24-hour activity condition is required for Facebook Messenger standard messaging API policy. However, WhatsApp Business Templates are specifically intended for messaging customers outside the 24-hour window. Applying this filter to WhatsApp campaigns resulted in empty recipient lists and immediate campaign failure for any audience without recent inbound messages.

## Resolution

1. **Separated Channel Logic**:
   - For `channel === 'whatsapp'`: Removed the `twentyFourHoursAgo` and `isFromCustomer` message filter.
   - For `channel === 'facebook'`: Retained the 24-hour messaging window filter.

2. **Auto-Enrollment of Target Customers**:
   - Added logic to find `Customer` entries belonging to the company that have a valid `phone` number but no existing `Conversation` record.
   - Automatically provisions active `Conversation` records for these customers during campaign execution so they are included in the `BroadcastRecipient` list and sent the template.

3. **Lead Category Filtering**:
   - Preserved and harmonized `leadCategoryId` filtering across both immediate and scheduled campaign execution paths for WhatsApp.
