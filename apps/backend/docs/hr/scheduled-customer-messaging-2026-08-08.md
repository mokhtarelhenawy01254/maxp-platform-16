# Scheduled Customer Messaging Automation (رسائل بمواعيد ثابتة)

**Date**: 2026-08-08
**Domain**: WhatsApp / Customer Engagement
**Type**: Feature

## Overview

Three "send at a fixed time" (non-action) messaging systems:

1. **Post-delivery follow-up sequences** (سلاسل ما بعد الاستلام): after an order is
   DELIVERED, the customer is enrolled in a WhatsApp follow-up flow whose steps send
   at fixed delays (e.g. +1 week, +2 weeks, +3 weeks).
2. **Customer birthday automation**: every day at 10:00, customers whose birthday
   (from `Customer.metadata`) is today get a `BIRTHDAY_WISH` message.
3. **Scheduled occasion campaigns**: admins schedule a WhatsApp campaign for a
   future date; an hourly cron sends it automatically.

## 1. Post-delivery journeys — wired to the actual delivery

`WhatsAppJourneyService` (flows = `whatsAppFollowUpFlow` with ordered `steps`
that have `content` + `delayDays`/`delayHours`) is processed every 30 minutes by
`cron/whatsappJourneyCron.js`.

Previously `enrollCustomer` ran ONLY inside `orderWorkflowService.sendWorkflowNotification`
(execute=true paths), so standard deliveries (orderService) never enrolled
customers. Now `services/orderService.js` DELIVERED branch also calls
`WhatsAppJourneyService.enrollCustomer(companyId, order.customerId, order.id)`.

Configure the flow + steps in the admin at `/whatsapp/customer-journey`.

## 2. Customer birthday cron

`cron/customerBirthdayCron.js` (daily 10:00): for every active company, finds
customers with a birthday in `Customer.metadata` matching today (day/month), and
sends `eventType: BIRTHDAY_WISH` (default template in
`services/whatsapp/templates/defaultTemplates.js`) via `sendNotification`
(so it respects WhatsApp settings, `marketingNotificationsEnabled`/`birthdayWishEnabled`,
quiet hours, dedup, session).

## 3. Scheduled occasion campaigns

- `cron/occasionCampaignCron.js` (hourly): processes `BroadcastCampaign` rows where
  `channel='whatsapp'`, `status='scheduled'`, `scheduledAt <= now`. Resolves the
  audience (`targetAudience === 'all'` → all ACTIVE customers with phone, otherwise
  a JSON array of phone numbers), sends `contentOverride: campaign.message` with
  `eventType: OCCASION_CAMPAIGN`, then marks the campaign `completed`.
- API:
  - `POST /api/v1/customers/whatsapp-notify/occasions/schedule`
    `{ name, message, scheduledAt, targetAudience }`
  - `GET  /api/v1/customers/whatsapp-notify/occasions/scheduled`
- The existing occasions page still supports manual sends; the scheduled endpoint
  adds future-dated automation.

## Settings / gating

All sends go through `WhatsAppNotificationService.sendNotification`, which requires
the company WhatsApp settings `isEnabled` + the relevant module/event flags and a
connected session; quiet hours apply.
