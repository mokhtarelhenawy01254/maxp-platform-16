# عزل الـ Service Worker للمتاجر والتعافي الذاتي من أخطاء الـ Chunks — 2026-09-04

## المشكلة
1. ظهور خطأ `Failed to fetch dynamically imported module` وكود `522` من Cloudflare مصحوباً بشاشة "تعذر تشغيل التطبيق" عند دخول بعض المستخدمين القدامى بعد عمليات النشر (Deploy).
2. الـ Service Worker القديم (`sw.js`) كان مخزناً بكاش طويل في Nginx وكلاودفلير، وظل يعترض طلبات استدعاء الملفات (`destination === 'script'`) بـ hashes قديمة غير متوفرة على السيرفر.
3. زوار المتاجر الإلكترونية (Storefront) كانوا معرّضين لتسجيل الـ Worker القديم على دومينات المتاجر مما يهدد حركة الشراء.
4. دالة `chunkLoadRecovery` كانت تستدعي `clearAllSWCaches` دون انتظار الـ Promise وتعمل reload فوري، مما أدى لسباق وقت (race condition) واستنفاذ ميزانية المحاولة الواحدة.
5. زر "إعادة المحاولة" في شاشة الخطأ كان يكتفي بعمل `window.location.reload()` بنفس الكاش والـ Worker المعطوبين.

## الإصلاح الجذري (2026 Architecture)
1. **عزل المتاجر كلياً (Storefront Isolation):**
   - منع تسجيل أي Service Worker لزوار الـ Storefront نهائياً في `main.tsx`.
   - إلغاء تسجيل أي workers قديمة بصمت لزوار المتاجر لضمان تجربة سريعة ونظيفة 100%.
2. **التعافي الذاتي الذكي وزر الطوارئ (Self-Healing & Emergency Purge):**
   - تطوير `emergencyPurgeAndHardReload` في `src/utils/chunkLoadRecovery.ts` التي تقوم بإلغاء تسجيل كل الـ Workers ومسح الـ CacheStorage وتصفير مفاتيح الكاش قبل إعادة التوجيه بـ Cache-Busting Query Param (`_v=Date.now()`).
   - ربط زر "إعادة المحاولة" في `renderBootstrapError` بهذه الدالة ليتمكن المستخدم من إصلاح أي خطأ بضغطة واحدة.
   - تنظيف بارامتر `_v` بصمت عبر `history.replaceState` بعد نجاح الإقلاع.
3. **ملفات إبادة ذاتية (Killer Service Workers):**
   - إنشاء `public/sw.js` و `public/push-sw.js` بسكريبتات إلغاء ذاتي ومسح كاش فورية.
4. **تحديث Nginx على السيرفر الإنتاجي:**
   - تطبيق `location ~* ^/(sw|sw-v4|push-sw)\.js$` مع `Cache-Control: no-cache, no-store, must-revalidate, max-age=0` و `brotli_static off`.