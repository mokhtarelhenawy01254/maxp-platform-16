# Task WhatsApp Execution Follow-ups

## Scope

تم ربط إشعارات المهام بواتساب بحيث تصل التحديثات المهمة إلى منفذ المهمة والمراقبين عليها، مع سؤال مباشر عن موقف التنفيذ عند الحاجة.

## Covered Events

- إنشاء مهمة وإسنادها لمستخدم.
- تغيير المسؤول عن التنفيذ.
- تحديث بيانات المهمة المهمة مثل الموعد، الأولوية، القسم، المشروع، أو نسبة الإنجاز.
- تغيير الحالة.
- إضافة تعليق أو Mention.
- إضافة مرفق.
- إضافة مراقب للمهمة.
- حذف المهمة.
- اقتراب موعد التسليم.
- تأخر المهمة عن موعدها.
- سؤال المنفذ عن التنفيذ والرد عبر أزرار واتساب.

## Execution Question Flow

يتم إرسال سؤال للمنفذ عبر قالب `TASK_EXECUTION_CHECK` مع الأزرار التالية:

- `task_done_{taskId}`: يحدّث المهمة إلى `COMPLETED` ونسبة الإنجاز إلى `100`.
- `task_not_done_{taskId}`: يضع المهمة في `IN_PROGRESS` إذا كانت `PENDING`.
- `task_blocked_{taskId}`: يضع المهمة في `ON_HOLD`.

كل رد يتم تسجيله في `TaskActivity` بإجراء `whatsapp_execution_response`، ويتم إرسال إشعار للمراقبين وصاحب المهمة بقالب `TASK_EXECUTION_RESPONSE`.

## Manual API

يمكن سؤال المنفذ يدويًا من خلال:

```http
POST /api/v1/tasks/:id/ask-execution
```

Body اختياري:

```json
{
  "reason": "manual"
}
```

القيم المستخدمة داخليًا للسبب:

- `manual`
- `deadline`
- `overdue`

## Scheduler

تم تشغيل `taskDeadlineCron` من `server.js`.

الكرون يعمل يوميًا 9 صباحًا بتوقيت السيرفر:

- يرسل تذكير للمهام التي يقترب موعدها.
- يرسل سؤال تنفيذ للمهام المتأخرة.
- يبلغ المراقبين بأن المهمة متأخرة وأن المنفذ تم سؤاله.

## Files

- `backend/services/taskNotificationService.js`
- `backend/services/whatsapp/WhatsAppNotificationService.js`
- `backend/services/whatsapp/WhatsAppInteractionService.js`
- `backend/controller/whatsappMetaWebhookController.js`
- `backend/controller/taskController.js`
- `backend/controller/taskExternalController.js`
- `backend/cron/taskDeadlineCron.js`
- `backend/routes/taskRoutes.js`
- `backend/server.js`

## Verification and i18n Compliance (2026-06-01)

تم إجراء مراجعة واختبار شاملين لكامل دورة حياة النظام في 2026-06-01:
- **نظام الترجمة الموحد i18n**: تم التأكد من أن جميع الحالات والأولويات والردود التفاعلية مترجمة ديناميكيًا باستخدام `i18n.t()` لتجنب أي تعارض مع قواعد التطوير الصارمة (Rule 2 & Rule 3).
- **اختبار التشغيل التلقائي**: تم كتابة وتشغيل ملف اختبار متكامل (`scratch/test_task_whatsapp.js`) يحاكي إنشاء وتحديث المهام، وإرسال أسئلة التنفيذ، واستقبال ردود الأزرار التفاعلية لتحديث قاعدة البيانات وسجلات الأنشطة بنجاح كامل.

