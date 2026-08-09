# رسالة "أول ظهور" للأوردر غير المكتمل — 2026-08-05

ميزة: أول ما تتحفظ عربة checkout جديدة (أول ظهور في صفحة `/orders/incomplete`) وعندها رقم تليفون → تُرسل رسالة واتساب فورية للعميل. بدون cron وبدون تأخير.

## EventType جديد
- `INCOMPLETE_CART_FIRST_APPEARANCE` — أُضيف إلى الأنواع:
  - `whatsapp_notification_templates_eventType`
  - `whatsapp_notification_logs_eventType`
  - `whatsapp_notification_queue_eventType`
- غير مربوط بـ `marketingNotificationsEnabled` (لا يمر عبر `getModuleSettingKey`) — التحكم الوحيد هو `incompleteCartImmediateMessage` + `isEnabled` العام.

## إعداد جديد
- `WhatsAppNotificationSettings.incompleteCartImmediateMessage Boolean @default(false)`.
- يُحفظ عبر `PUT /api/v1/whatsapp-notifications/settings` (upsert حالي، لا تغيير في الـ route).

## الخدمة
- `services/orders/incompleteCartMessagingService.js` → `handleCartCreated(cart)`:
  - Gates: `isEnabled` + `incompleteCartImmediateMessage` + وجود رقم تليفون في `checkoutData` + عدم وجود `CartConversionLog` + `isDuplicateNotification` (نافذة 60 ثانية، مفتاح recipientPhone + eventType).
  - يرسل عبر `sendNotification` (category `ABANDONED_CART`, eventType الجديد, `cartId`).
  - Fire-and-forget من نقطة الـ trigger (لا يحجب استجابة الـ checkout).

## Trigger
- `routes/publicOrdersRoutes.js` — في `POST /checkout-draft` فقط بعد `guestCart.create` (وليس على التحديث).

## القالب
- افتراضي في `services/whatsapp/templates/defaultTemplates.js` (متغيرات: `customerName`, `itemCount`, `total`, `currency`).
- `getCategoryForEvent('INCOMPLETE_CART_FIRST_APPEARANCE')` → `ABANDONED_CART`.

## الواجهة
- تبويب "رسائل الأوردر غير المكتمل" في `/orders/status-templates` (`OrderStatusTemplatesPage.tsx` + `IncompleteCartMessagingPanel.tsx`):
  - مفتاح تفعيل الرسالة الفورية.
  - **طريقة الإرسال (قناة)**: `AUTO` / `BAILEYS` / `META_CLOUD` — التاجر يختار، وتُحفظ على `whatsAppNotificationTemplate.channel` (نفس نموذج قوالب الحالات).
  - محرر نص القالب (create/update عبر `/api/v1/whatsapp-notifications/templates`) + معاينة WhatsApp.
  - **الربط بميتا**: نشر قالب لميتا (`/templates/:id/publish`)، ربط بقالب معتمد (`/bind-meta`)، إعادة مراجعة (`/resubmit-meta`)، وعرض حالة القالب (معتمد / قيد المراجعة / محلي).
- أُزيل تبويب "العربة المتروكة" من صفحة الإشعارات العامة (`WhatsAppNotifications.tsx`)، و`getTemplates` يستبعد `CART_ABANDONED_*` + الحدث الجديد من القائمة العامة (يبقى يجيبه عندما يُرسل `eventType` في الـ query).

## الإرسال حسب القناة (في `sendNotification`)
- `BAILEYS` → نص حر دائماً من رقم الواتساب المتصل.
- `META_CLOUD` → فقط عبر قالب ميتا معتمد (`metaTemplateName` + `APPROVED`)؛ غيابه → `{ success:false, reason:'meta_template_not_ready' }`.
- `AUTO` → يحاول قالب ميتا المعتمد إن كان مربوطاً، وإلا نص حر (مع fallback بايليز عند فشل ميتا).

## Migration
- الترحيل يتم تلقائياً عبر `prisma db push` في الـ deploy (العمود + قيم الـ enum).
- نسخة احتياطية يدوية: `scripts/add_incomplete_cart_immediate_message.js` (idempotent) لأي بيئة لا تشغّل db push.

## التحقق
- Backend: `tests/services/orders/incompleteCartMessagingService.test.js` (7).
- `prisma validate` على `prisma/schema` سليم.
- فرونت: build ناجح + orders suite 43/43 + صفحة status-templates 25/25.
