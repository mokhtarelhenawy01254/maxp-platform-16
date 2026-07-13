# Facebook Inbox Attachment Rendering Fix - 2026-05-05

## Summary

تم إصلاح عرض مرفقات الصور في صفحة `/facebook-inbox` عندما تصل رسالة Facebook كنص عادي مع `attachments` أو عندما يتم تخزين رابط الصورة داخل محتوى الرسالة بصيغة `|IMAGE_URL|`.

## Root Cause

كان مكوّن `MessageBubble` يعرض الصورة فقط عندما يكون نوع الرسالة نفسه `image` ومعه رابط مباشر في `content` أو `fileUrl`. بعض رسائل Facebook تصل كنص مثل `[attachment] ...` مع رابط الصورة داخل `attachments`، لذلك كانت الصورة لا تظهر وكان النص البديل يظهر داخل الفقاعة.

## Changes

- استخراج روابط الصور من `message.attachments` بجانب `content` و `fileUrl`.
- دعم صيغة `|IMAGE_URL|` بدون تمرير النص الكامل كـ `src` للصورة.
- تنظيف بادئة `[attachment]` من النص المعروض مع إبقاء أي caption حقيقي من العميل.
- تنظيف علامات تجميع الطابور مثل `[1] [attachment] | [2] ...` في النص المعروض حتى لا تظهر كجزء من رسالة العميل.
- تحديث مقارنة `memo` في `MessageBubble` حتى يعاد الرسم عند تغيّر `type` أو `fileUrl` أو `attachments`.
- الحفاظ على كل مرفقات رسائل Facebook عند تجميع رسائل متعددة في `MessageQueueManager` بدلا من الاعتماد على مرفقات أول رسالة فقط.
- إضافة اختبارين مركزين لحالة مرفق Facebook وحالة `|IMAGE_URL|`.

## Verification

- `frontend: npx jest --config jest.config.cjs src/components/facebook-inbox/MessageBubble/MessageBubble.test.tsx --runInBand`
- `frontend: npx eslint src/components/facebook-inbox/MessageBubble/MessageBubble.tsx src/components/facebook-inbox/MessageBubble/MessageBubble.test.tsx --max-warnings=0`
- `backend: node --check services/queueRoutes.js`
