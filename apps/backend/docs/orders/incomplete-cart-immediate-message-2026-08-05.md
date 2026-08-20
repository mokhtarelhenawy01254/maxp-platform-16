# ╪▒╪│╪º┘ä╪⌐ "╪ú┘ê┘ä ╪╕┘ç┘ê╪▒" ┘ä┘ä╪ú┘ê╪▒╪»╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä ΓÇö 2026-08-05

┘à┘è╪▓╪⌐: ╪ú┘ê┘ä ┘à╪º ╪¬╪¬╪¡┘ü╪╕ ╪╣╪▒╪¿╪⌐ checkout ╪¼╪»┘è╪»╪⌐ (╪ú┘ê┘ä ╪╕┘ç┘ê╪▒ ┘ü┘è ╪╡┘ü╪¡╪⌐ `/orders/incomplete`) ┘ê╪╣┘å╪»┘ç╪º ╪▒┘é┘à ╪¬┘ä┘è┘ü┘ê┘å ΓåÆ ╪¬┘Å╪▒╪│┘ä ╪▒╪│╪º┘ä╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘ü┘ê╪▒┘è╪⌐ ┘ä┘ä╪╣┘à┘è┘ä. ╪¿╪»┘ê┘å cron ┘ê╪¿╪»┘ê┘å ╪¬╪ú╪«┘è╪▒.

## EventType ╪¼╪»┘è╪»
- `INCOMPLETE_CART_FIRST_APPEARANCE` ΓÇö ╪ú┘Å╪╢┘è┘ü ╪Ñ┘ä┘ë ╪º┘ä╪ú┘å┘ê╪º╪╣:
  - `whatsapp_notification_templates_eventType`
  - `whatsapp_notification_logs_eventType`
  - `whatsapp_notification_queue_eventType`
- ╪║┘è╪▒ ┘à╪▒╪¿┘ê╪╖ ╪¿┘Ç `marketingNotificationsEnabled` (┘ä╪º ┘è┘à╪▒ ╪╣╪¿╪▒ `getModuleSettingKey`) ΓÇö ╪º┘ä╪¬╪¡┘â┘à ╪º┘ä┘ê╪¡┘è╪» ┘ç┘ê `incompleteCartImmediateMessage` + `isEnabled` ╪º┘ä╪╣╪º┘à.

## ╪Ñ╪╣╪»╪º╪» ╪¼╪»┘è╪»
- `WhatsAppNotificationSettings.incompleteCartImmediateMessage Boolean @default(false)`.
- ┘è┘Å╪¡┘ü╪╕ ╪╣╪¿╪▒ `PUT /api/v1/whatsapp-notifications/settings` (upsert ╪¡╪º┘ä┘è╪î ┘ä╪º ╪¬╪║┘è┘è╪▒ ┘ü┘è ╪º┘ä┘Ç route).

## ╪º┘ä╪«╪»┘à╪⌐
- `services/orders/incompleteCartMessagingService.js` ΓåÆ `handleCartCreated(cart)`:
  - Gates: `isEnabled` + `incompleteCartImmediateMessage` + ┘ê╪¼┘ê╪» ╪▒┘é┘à ╪¬┘ä┘è┘ü┘ê┘å ┘ü┘è `checkoutData` + ╪╣╪»┘à ┘ê╪¼┘ê╪» `CartConversionLog` + `isDuplicateNotification` (┘å╪º┘ü╪░╪⌐ 60 ╪½╪º┘å┘è╪⌐╪î ┘à┘ü╪¬╪º╪¡ recipientPhone + eventType).
  - ┘è╪▒╪│┘ä ╪╣╪¿╪▒ `sendNotification` (category `ABANDONED_CART`, eventType ╪º┘ä╪¼╪»┘è╪», `cartId`).
  - Fire-and-forget ┘à┘å ┘å┘é╪╖╪⌐ ╪º┘ä┘Ç trigger (┘ä╪º ┘è╪¡╪¼╪¿ ╪º╪│╪¬╪¼╪º╪¿╪⌐ ╪º┘ä┘Ç checkout).

## Trigger
- `routes/publicOrdersRoutes.js` ΓÇö ┘ü┘è `POST /checkout-draft` ┘ü┘é╪╖ ╪¿╪╣╪» `guestCart.create` (┘ê┘ä┘è╪│ ╪╣┘ä┘ë ╪º┘ä╪¬╪¡╪»┘è╪½).

## ╪º┘ä┘é╪º┘ä╪¿
- ╪º┘ü╪¬╪▒╪º╪╢┘è ┘ü┘è `services/whatsapp/templates/defaultTemplates.js` (┘à╪¬╪║┘è╪▒╪º╪¬: `customerName`, `itemCount`, `total`, `currency`).
- `getCategoryForEvent('INCOMPLETE_CART_FIRST_APPEARANCE')` ΓåÆ `ABANDONED_CART`.

## ╪º┘ä┘ê╪º╪¼┘ç╪⌐
- ╪¬╪¿┘ê┘è╪¿ "╪▒╪│╪º╪ª┘ä ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä" ┘ü┘è `/orders/status-templates` (`OrderStatusTemplatesPage.tsx` + `IncompleteCartMessagingPanel.tsx`):
  - ┘à┘ü╪¬╪º╪¡ ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ü┘ê╪▒┘è╪⌐.
  - **╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä (┘é┘å╪º╪⌐)**: `AUTO` / `BAILEYS` / `META_CLOUD` ΓÇö ╪º┘ä╪¬╪º╪¼╪▒ ┘è╪«╪¬╪º╪▒╪î ┘ê╪¬┘Å╪¡┘ü╪╕ ╪╣┘ä┘ë `whatsAppNotificationTemplate.channel` (┘å┘ü╪│ ┘å┘à┘ê╪░╪¼ ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬).
  - ┘à╪¡╪▒╪▒ ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿ (create/update ╪╣╪¿╪▒ `/api/v1/whatsapp-notifications/templates`) + ┘à╪╣╪º┘è┘å╪⌐ WhatsApp.
  - **╪º┘ä╪▒╪¿╪╖ ╪¿┘à┘è╪¬╪º**: ┘å╪┤╪▒ ┘é╪º┘ä╪¿ ┘ä┘à┘è╪¬╪º (`/templates/:id/publish`)╪î ╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪» (`/bind-meta`)╪î ╪Ñ╪╣╪º╪»╪⌐ ┘à╪▒╪º╪¼╪╣╪⌐ (`/resubmit-meta`)╪î ┘ê╪╣╪▒╪╢ ╪¡╪º┘ä╪⌐ ╪º┘ä┘é╪º┘ä╪¿ (┘à╪╣╪¬┘à╪» / ┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐ / ┘à╪¡┘ä┘è).
- ╪ú┘Å╪▓┘è┘ä ╪¬╪¿┘ê┘è╪¿ "╪º┘ä╪╣╪▒╪¿╪⌐ ╪º┘ä┘à╪¬╪▒┘ê┘â╪⌐" ┘à┘å ╪╡┘ü╪¡╪⌐ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣╪º┘à╪⌐ (`WhatsAppNotifications.tsx`)╪î ┘ê`getTemplates` ┘è╪│╪¬╪¿╪╣╪» `CART_ABANDONED_*` + ╪º┘ä╪¡╪»╪½ ╪º┘ä╪¼╪»┘è╪» ┘à┘å ╪º┘ä┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╣╪º┘à╪⌐ (┘è╪¿┘é┘ë ┘è╪¼┘è╪¿┘ç ╪╣┘å╪»┘à╪º ┘è┘Å╪▒╪│┘ä `eventType` ┘ü┘è ╪º┘ä┘Ç query).

## ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪¡╪│╪¿ ╪º┘ä┘é┘å╪º╪⌐ (┘ü┘è `sendNotification`)
- `BAILEYS` ΓåÆ ┘å╪╡ ╪¡╪▒ ╪»╪º╪ª┘à╪º┘ï ┘à┘å ╪▒┘é┘à ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä┘à╪¬╪╡┘ä.
- `META_CLOUD` ΓåÆ ┘ü┘é╪╖ ╪╣╪¿╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» (`metaTemplateName` + `APPROVED`)╪¢ ╪║┘è╪º╪¿┘ç ΓåÆ `{ success:false, reason:'meta_template_not_ready' }`.
- `AUTO` ΓåÆ ┘è╪¡╪º┘ê┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪» ╪Ñ┘å ┘â╪º┘å ┘à╪▒╪¿┘ê╪╖╪º┘ï╪î ┘ê╪Ñ┘ä╪º ┘å╪╡ ╪¡╪▒ (┘à╪╣ fallback ╪¿╪º┘è┘ä┘è╪▓ ╪╣┘å╪» ┘ü╪┤┘ä ┘à┘è╪¬╪º).

## Migration
- ╪º┘ä╪¬╪▒╪¡┘è┘ä ┘è╪¬┘à ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣╪¿╪▒ `prisma db push` ┘ü┘è ╪º┘ä┘Ç deploy (╪º┘ä╪╣┘à┘ê╪» + ┘é┘è┘à ╪º┘ä┘Ç enum).
- ┘å╪│╪«╪⌐ ╪º╪¡╪¬┘è╪º╪╖┘è╪⌐ ┘è╪»┘ê┘è╪⌐: `scripts/add_incomplete_cart_immediate_message.js` (idempotent) ┘ä╪ú┘è ╪¿┘è╪ª╪⌐ ┘ä╪º ╪¬╪┤╪║┘æ┘ä db push.

## ╪º┘ä╪¬╪¡┘é┘é
- Backend: `tests/services/orders/incompleteCartMessagingService.test.js` (7).
- `prisma validate` ╪╣┘ä┘ë `prisma/schema` ╪│┘ä┘è┘à.
- ┘ü╪▒┘ê┘å╪¬: build ┘å╪º╪¼╪¡ + orders suite 43/43 + ╪╡┘ü╪¡╪⌐ status-templates 25/25.
