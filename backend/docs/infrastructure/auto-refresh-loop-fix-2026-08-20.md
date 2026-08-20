# إصلاح حلقة التحديث التلقائي اللانهائية — 2026-08-20

## المشكلة

صفحة `/auth/login` (وأي صفحة أخرى) كانت تعيد تحميل نفسها تلقائياً كل بضع
ثوانٍ في حلقة لا تنتهي، بدون أي أخطاء ظاهرة في الـ console. التشخيص على
الإنتاج بمتصفح نظيف سجّل 3 reloads خلال 45 ثانية من نوع `navigation.type =
"reload"` ثم عاصفة reloads كل 3.5–6 ثوانٍ استمرت دقيقتين ونصف.

## السبب الجذري

مستمعان لحدث `controllerchange` على `navigator.serviceWorker` في
`apps/frontend/src/main.tsx` كانا يستدعيان `window.location.reload()`:

1. مستمع **غير مشروط** يعمل في كل البيئات (كان في رأس الملف).
2. مستمع مقفول بمتغير `refreshing` (في بلوك production).

عند كل تحديث أو تسجيل للـ Service Worker (sw-v4/sw-v5): الترحيل في
`main.tsx` يرسل `SKIP_WAITING` للعامل المنتظر، العامل الجديد يعمل
`clients.claim()`، فينطلق `controllerchange`، فيتم reload. الحلقة تُغلق على
نفسها لأن الـ reload كان يسبق كتابة مفتاح `maxp:sw_migrated` في
`localStorage`، فتُعيد كل صفحة جديدة تشغيل الترحيل مرة أخرى → reload آخر.

ملاحظة تاريخية: الإصلاح نفسه تم سابقاً في commit
`45b640dd` ("stop infinite refresh loop") ثم أعادته عملية استرجاع واسعة في
`b37b498d`.

## الإصلاح

- إزالة مستمعَي `controllerchange → reload` نهائياً. تحديثات الـ Service
  Worker تُفعَّل بصمت الآن، وأول تنقّل حقيقي يلتقط النسخة الجديدة. يبقى
  إشعار "تحديث جديد متاح" (toast) يفعّله المستخدم بزر "تحديث" عند توفر
  نسخة جديدة.
- تحصين `chunkLoadRecovery` (النسخة TS في `src/utils/chunkLoadRecovery.ts`
  والنسخة المبكرة في `public/js/chunk-recovery.js`): سقف **محاولة reload
  واحدة** لكل نوبة فشل (`maxp:chunk-load-recovery:count` في sessionStorage
  + مرآة داخل الذاكرة للمتصفحات التي تمنع التخزين)، مع إعادة تسليح السقف
  بعد كل إقلاع ناجح عبر `resetChunkLoadRecovery()`. عند رفض الاسترجاع يظهر
  الخطأ للمستخدم (شاشة خطأ الإقلاع اخذت زر "إعادة المحاولة") بدلاً من
  حلقة تحديث صامتة.

## الاختبارات

`apps/frontend/src/utils/__tests__/chunkLoadRecovery.test.ts` — اختباران
جديدان: سقف المحاولة الواحدة، وإعادة التسليح بعد reset.
