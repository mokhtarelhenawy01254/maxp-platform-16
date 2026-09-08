# Facebook Inbox Quoted Image Preview Fix - 2026-09-08

## Summary

تم إصلاح مشكلة عدم ظهور صور المنتجات والمرفقات المقتبسة في صفحة `/facebook-inbox` عندما يقوم العميل على Facebook Messenger بالرد أو الاقتباس على صورة محددة أرسلها موظف أو أرسلها النظام.

## Problem Description

عندما يرسل الموظف مجموعة صور لخيارات أو منتجات، ويقوم العميل بتحديد صورة معينة بالاقتباس (Quote/Reply) وكتابة "دي" أو "دول في عرض 300":
1. كان مكوّن `MessageBubble` في الفرونت إند يعرض نصاً ثابتاً `مرفق/صورة` إذا لم يكن نوع الرسالة المقتبسة `text`، دون عرض أي صورة مصغرة (Thumbnail) للصورة الأصلية.
2. لم يكن الباك إند (`webhookController.js` و `allFunctions.js`) يضمّن رابط الصورة `imageUrl` / `mediaUrl` داخل كائن `replyMeta.replyTo` عند استقبال Webhook الاقتباس.
3. لم يكن مسار جلب الرسائل `GET /conversations/:id/messages` (`messageActionsController.js`) يثري الرسائل القديمة أو الحالية برابط الصورة من الرسالة الأصلية المحفوظة في قاعدة البيانات.

## Changes Made

### 1. Backend
- **`apps/backend/controller/conversation/messageActionsController.js`**:
  - إضافة دوال استخراج روابط الميديا والصور `extractMessageImageUrl` و `extractMessageMediaUrl`.
  - في `getMessages`، تجميع معرّفات الرسائل الأصلية المقتبسة (`replyToResolvedMessageId` أو `replyTo.messageId`) وجلب أي رسائل ناقصة من قاعدة البيانات.
  - إثراء `metadata.replyTo` بروابط الميديا `imageUrl` و `mediaUrl` ومعرف الرسالة `messageId` مع تمريرها عبر `proxyMessageMediaUrl`.
- **`apps/backend/controller/webhookController.js`**:
  - إضافة استخراج روابط الصور والميديا عند حل الرسالة الأصلية `parentMsg`، وتضمين `imageUrl` و `mediaUrl` و `messageId` في `replyMeta.replyTo`.
- **`apps/backend/utils/allFunctions.js`**:
  - تحديث معالجة رسائل ماسنجر في Webhook لاستخراج روابط الميديا وتضمينها في `replyMeta.replyTo`.
- **`apps/backend/controller/unifiedInboxController.js`**:
  - إثراء `quotedMessage` بروابط الميديا `imageUrl` و `mediaUrl` لمطابقة السلوك في Unified Inbox.

### 2. Frontend
- **`apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx`**:
  - توسيع واجهات `ReplyReference` و `MessageMetadata` و `MessageBubbleProps` لتقبل `parentMessage` و `onScrollToMessage`.
  - حساب `replyImageUrl` سواء من `replyTo.imageUrl`، أو `parentMessage`، أو عبر مسار البروكسي البديل عند توفر معرّف الرسالة الأصلية.
  - تصميم صندوق اقتباس جذاب ومريح يعرض اسم المرسل، نص الرسالة المقتبسة أو "📷 صورة"، وصورة مصغرة (Thumbnail) بحجم مناسب بنهايات دائرية.
  - إتاحة النقر على صندوق الاقتباس للانتقال بسلاسة إلى الرسالة الأصلية في سجل المحادثة.
  - تحديث دالة المقارنة في `memo` لتشمل `parentMessage` و `onScrollToMessage`.
- **`apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`**:
  - إنشاء خريطة `messagesById` للوصول السريع للرسائل الأصلية.
  - ربط كل رسالة بـ `id` فريد `inbox-message-${msg.id}`.
  - إضافة دالة `handleScrollToMessage` لتمرير الشات بسلاسة للرسالة الأصلية وإضاءتها بـ Highlight مؤقت.
  - تمرير `parentMessage` و `onScrollToMessage` إلى `MessageBubble`.
- **`apps/frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.test.tsx`**:
  - عمل mock لـ `apiClient`.
  - إضافة اختبارات تحقق لاقتباس الصور مع `imageUrl` ومع `parentMessage`.

## Verification

- `frontend`: اختبارات المكوّن `npx jest --config jest.config.cjs src/components/facebook-inbox/MessageBubble/MessageBubble.test.tsx --runInBand` (جميعها نجحت 5/5).
- `backend`: فحص السنتاكس `node scripts/check_syntax.js` (نجح لجميع 1236 ملف).
