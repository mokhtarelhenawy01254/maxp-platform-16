# خطة إشعارات رصيد وميزانية إعلانات Meta عبر WhatsApp

## حالة التنفيذ

- تم تنفيذ دعم رصيد الحساب الإعلاني وحد الإنفاق، ودعم المتبقي من ميزانية الحملة.
- تم إضافة جداول القواعد واللوجات، API للإدارة، Cron للفحص كل 15 دقيقة، ولوحة إعدادات داخل Facebook Ads Dashboard.
- يتم إرسال WhatsApp عبر خدمة الإشعارات الحالية، مع زر اختبار يدوي لكل قاعدة.

## الحالة الحالية

- تم تشغيل السيرفر المحلي بنجاح على `http://localhost:3007`.
- الواجهة المحلية مفتوحة على `http://localhost:3000`.
- فحص الصحة الحالي ناجح للباك إند، الواجهة، وPostgreSQL.
- Redis غير مفعل محلياً، لكنه لا يمنع هذه الخطة لأن الإرسال يمكن أن يعمل عبر الخدمات الحالية مع fallback للذاكرة.

## الهدف

إضافة نظام يراقب رصيد/ميزانية إعلانات Meta ويرسل إشعار WhatsApp عند وصول الرصيد أو الميزانية المتبقية إلى رقم يحدده المستخدم، مثل:

> تنبيه: رصيد/ميزانية الإعلان المتبقية وصلت إلى 100 جنيه.

ويجب أن يدعم النظام اختيار رقم WhatsApp واحد أو أكثر، واختيار قيمة التنبيه لكل حساب إعلاني أو حملة.

## تعريفات المنتج

1. **تنبيه رصيد الحساب الإعلاني**
   - يراقب بيانات حساب Meta Ad Account مثل `balance`, `spend_cap`, و`amount_spent`.
   - لو `spend_cap` متاح، يتم حساب المتبقي كالتالي:
     - `remainingSpendCap = spendCap - amountSpent`
   - لو الحساب prepaid وMeta ترجع `balance` بشكل موثوق، يتم عرضه كرصيد الحساب.

2. **تنبيه ميزانية الحملة**
   - يراقب `budgetAmount` المخزنة محلياً أو القادمة من Meta.
   - يحسب إنفاق الحملة من insights.
   - المتبقي:
     - `remainingBudget = campaignBudget - campaignSpend`

3. **تنبيه انتهاء الإعلان/الحملة**
   - يعتبر الإعلان/الحملة منتهياً إذا:
     - وصل المتبقي إلى `0` أو أقل.
     - أو تجاوزت الحملة `endDate`.
     - أو رجعت Meta حالة نهائية/غير قابلة للتسليم، حسب `effective_status`.

## تصميم قاعدة البيانات

إضافة موديلين في Prisma:

### `FacebookAdsBudgetAlertRule`

- `id`
- `companyId`
- `adAccountId`
- `campaignId` اختياري
- `scope`: `AD_ACCOUNT` أو `CAMPAIGN`
- `metric`: `ACCOUNT_BALANCE`, `SPEND_CAP_REMAINING`, `CAMPAIGN_BUDGET_REMAINING`, `CAMPAIGN_FINISHED`
- `thresholdAmount`
- `currency`
- `recipientPhones` كـ JSON
- `isEnabled`
- `cooldownMinutes`
- `lastCheckedAt`
- `lastTriggeredAt`
- `lastObservedValue`
- `metadata`
- timestamps

### `FacebookAdsBudgetAlertLog`

- `id`
- `ruleId`
- `companyId`
- `adAccountId`
- `campaignId` اختياري
- `triggeredMetric`
- `thresholdAmount`
- `observedValue`
- `currency`
- `recipientPhone`
- `whatsappNotificationLogId`
- `status`: `SENT`, `FAILED`, `SKIPPED`
- `failureReason`
- timestamps

## خطة الباك إند

1. **Meta metrics layer**
   - إضافة دوال في `facebookAdsService` لجلب billing/account metrics من Meta.
   - إعادة استخدام منطق `billingHealth` الحالي لحساب `balance`, `spendCap`, و`amountSpent`.
   - إضافة دالة لجلب campaign insights وتجميع `spend`.

2. **Alert evaluator service**
   - إنشاء `facebookAdsBudgetAlertService`.
   - يقرأ القواعد المفعلة.
   - يحسب القيمة الحالية لكل rule.
   - يقرر هل يجب إرسال إشعار بناءً على:
     - وصول القيمة للـ threshold.
     - عدم إرسال نفس التنبيه سابقاً داخل فترة cooldown.
     - عدم تكرار التنبيه إلا إذا ارتفعت القيمة فوق threshold ثم نزلت مرة أخرى.

3. **WhatsApp delivery**
   - استخدام `WhatsAppNotificationService.sendNotification`.
   - تمرير `contentOverride` برسالة واضحة.
   - استخدام category `MARKETING`.
   - إضافة event type مخصص مثل `ADS_BUDGET_ALERT` و`ADS_CAMPAIGN_FINISHED` لو هنوسع enums، أو استخدام `PROMOTIONAL` مؤقتاً لتقليل حجم التغيير.

4. **Scheduler**
   - تشغيل cron كل 10 أو 15 دقيقة.
   - البدء فقط إذا كان هناك rules مفعلة.
   - تسجيل آخر فحص وآخر نتيجة حتى لو لم يتم الإرسال.

5. **API**
   - `GET /api/v1/facebook-ads/budget-alert-rules`
   - `POST /api/v1/facebook-ads/budget-alert-rules`
   - `PUT /api/v1/facebook-ads/budget-alert-rules/:id`
   - `DELETE /api/v1/facebook-ads/budget-alert-rules/:id`
   - `POST /api/v1/facebook-ads/budget-alert-rules/:id/test`
   - `GET /api/v1/facebook-ads/budget-alert-logs`

## خطة الواجهة

1. إضافة كارت أو تبويب داخل Facebook Ads Dashboard باسم **تنبيهات الميزانية**.
2. عرض الحساب الإعلاني المختار وحالته المالية الحالية.
3. نموذج إنشاء تنبيه:
   - نوع التنبيه: حساب إعلاني أو حملة.
   - الحساب أو الحملة.
   - قيمة التنبيه، مثل `100`.
   - العملة.
   - أرقام WhatsApp المستقبلة.
   - فترة منع التكرار.
4. زر **إرسال اختبار** قبل تفعيل القاعدة.
5. جدول آخر التنبيهات:
   - وقت الإرسال.
   - القيمة التي وصلت لها الميزانية.
   - رقم المستلم.
   - حالة WhatsApp.

## نص الرسالة المقترح

```text
⚠️ تنبيه ميزانية الإعلانات

الحساب/الحملة: {targetName}
المتبقي حالياً: {remainingAmount} {currency}
حد التنبيه: {thresholdAmount} {currency}
آخر تحديث: {checkedAt}

يفضل مراجعة Meta Ads Manager أو شحن الرصيد/تعديل الميزانية.
```

## الحماية من الإزعاج والتكرار

- لا يتم إرسال نفس التنبيه أكثر من مرة داخل `cooldownMinutes`.
- إذا ظل الرصيد تحت 100 جنيه، لا نكرر الرسالة كل فحص.
- يعاد تفعيل التنبيه فقط عندما يرتفع الرصيد فوق الحد ثم ينخفض مرة أخرى.
- كل محاولة إرسال يتم تسجيلها في `FacebookAdsBudgetAlertLog`.

## الاختبارات المطلوبة

1. Unit tests لحساب المتبقي من `spendCap - amountSpent`.
2. Unit tests لحساب متبقي الحملة من `budgetAmount - spend`.
3. Unit tests لمنع التكرار داخل فترة cooldown.
4. Controller tests لإنشاء وتعديل القواعد.
5. Mock test لـ WhatsApp delivery بدون إرسال رسالة حقيقية.
6. Frontend lint/build للملفات التي يتم تعديلها.

## متطلبات التشغيل

- Meta Ads access token صالح للشركة.
- Ad Account محفوظ ومفعل.
- WhatsApp session متصلة للشركة أو fallback session مفعلة.
- رقم WhatsApp مكتوب بصيغة قابلة للتنسيق.
- تحديد معنى "الرصيد" قبل التنفيذ النهائي:
  - رصيد الحساب الإعلاني.
  - أم المتبقي من spend cap.
  - أم المتبقي من ميزانية حملة معينة.

## ترتيب التنفيذ المقترح

1. تأكيد معنى الرصيد المطلوب من المستخدم.
2. إضافة Prisma models والهجرة.
3. بناء service لحساب القيم الحالية.
4. بناء rule evaluator + anti-duplicate logic.
5. ربط WhatsApp notification service.
6. إضافة API endpoints.
7. إضافة واجهة إعداد التنبيهات.
8. إضافة tests والتوثيق.
9. تجربة بإرسال test notification فقط قبل التفعيل الحقيقي.
