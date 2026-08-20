# Scheduled Customer Messaging Automation (╪▒╪│╪º╪ª┘ä ╪¿┘à┘ê╪º╪╣┘è╪» ╪½╪º╪¿╪¬╪⌐)

**Date**: 2026-08-08
**Domain**: WhatsApp / Customer Engagement
**Type**: Feature

## Overview

Three "send at a fixed time" (non-action) messaging systems:

1. **Post-delivery follow-up sequences** (╪│┘ä╪º╪│┘ä ┘à╪º ╪¿╪╣╪» ╪º┘ä╪º╪│╪¬┘ä╪º┘à): after an order is
   DELIVERED, the customer is enrolled in a WhatsApp follow-up flow whose steps send
   at fixed delays (e.g. +1 week, +2 weeks, +3 weeks).
2. **Customer birthday automation**: every day at 10:00, customers whose birthday
   (from `Customer.metadata`) is today get a `BIRTHDAY_WISH` message.
3. **Scheduled occasion campaigns**: admins schedule a WhatsApp campaign for a
   future date; an hourly cron sends it automatically.

## 1. Post-delivery journeys ΓÇö wired to the actual delivery

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
  audience (`targetAudience === 'all'` ΓåÆ all ACTIVE customers with phone, otherwise
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

## Live verification (2026-08-08, AMA test company)

- Created a general follow-up flow `cmskdk2ak001pjutk5ef3vsw5` with one step
  (delayDays: 1, content "┘à╪¬╪º╪¿╪╣╪⌐ ╪¿╪╣╪» ╪º┘ä╪º╪│╪¬┘ä╪º┘à").
- Delivered 5 orders for test customer `cmshk7nim00jzjuvqcqe7kygv`
  (ORD-629952-811, ORD-855660-492, ORD-212047-085, ORD-639843-633, ORD-686423-696).
- `GET /api/v1/whatsapp/automation/journeys?customerId=...` now returns 5 ACTIVE
  `customerJourney` rows, each `nextSendAt = delivery time + 1 day` and
  `flowId = cmskdk2ak001pjutk5ef3vsw5`. Enrollment on DELIVERED works end-to-end.
- **Bug fixed while verifying**: `WhatsAppContact` has no `companyId` column, but
  `whatsappAutomationController.getJourneys` and `WhatsAppJourneyService._resolvePhoneForJourney`
  filtered on `companyId` ΓÇö that made the journeys monitoring API 500 as soon as any
  journey existed (the empty array we saw earlier was misleading). Removed the invalid
  filter (resolve by `customerId` only).
- **Diagnostics added**: `enrollCustomer` now logs `[JOURNEY]` lines (flow found,
  steps count, journey created id) and `[JOURNEY-ERROR]` with a short stack ΓÇö useful
  in `pm2 logs maxp-backend` when debugging on the live server.
- Occasion campaign scheduled on AMA (`cmskdnz75008sjutkbc4k03vv`, scheduledAt
  2026-08-10) is picked up by the hourly `occasionCampaignCron`; it remains
  `status: scheduled` until due.
- All three schedulers are registered in `server.js`:
  `startWhatsAppJourneyScheduler`, `startCustomerBirthdayScheduler`,
  `startOccasionCampaignScheduler`.
- Note: AMA has no connected WhatsApp session, so actual message sends will fail
  with `no_session` (expected); the automation pipeline is proven by the
  `customerJourney` rows and campaign scheduling.
