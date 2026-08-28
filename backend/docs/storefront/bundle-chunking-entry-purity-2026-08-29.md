# Storefront Bundle Chunking & Entry Purity — 2026-08-29

## المشكلة

كل زائر لمتجر على subdomain (مثل `swan.maxp.online`) كان ينزّل **~3.6MB JS على
45 ملف** بدل ~1.1MB على 12 chunk. الفارق كان كود منصة بالكامل لا علاقة له
بالزائر: `route-hr`، `route-admin`، `route-whatsapp`، `vendor-viz-interactive`
(الرسوم البيانية)، `vendor-export` (Excel)، وغيرها.

### السبب الجذري (متتبَّع في builds غير مضغوطة)

1. Vite يضبط `preserveEntrySignatures: false` لتطبيقات الويب افتراضيًا، وهذا
   يسمح لـ Rollup بدمج facades الخاصة بالـ dynamic imports **داخل الـ entry
   chunk نفسه**.
2. موديولات مشتركة كانت مدمجة في route chunks (مغناطيسات):
   - `src/i18n/index.ts` (مع 1.8MB ترجمات JSON) داخل `route-storefront`
   - `services/apiClient.ts` و `utils/tokenManager.ts` داخل `route-storefront`
   - `hooks/useAuthSimple.tsx` و `utils/urlHelper.ts` داخل `route-dashboard`
     (أي صفحة تستورد useAuth كانت تسحب 414KB!)
   - `components/business/*` (BusinessPageShell…) داخل `route-admin`
   - `__vitePreload` helper داخل `route-storefront` → import ساكن من الـ entry
3. صفحات جذر `src/pages/` (UsersManagement, WalletManagement, CompanyLinks,
   SuperAdminUsersManagement) كانت تصل لهذه المغناطيسات استيرادًا ساكنًا، فأجاب
   Rollup على `React.lazy` الخاص بها بـ facades داخل الـ entry → استيراد ساكن
   من الـ entry إلى route chunks → سحب جراف المنصة كاملًا مع كل زيارة.

## الحل (vite.config.ts)

1. **chunk-ات محايدة للموديولات المشتركة** حتى تتوقف الصفحات عن الاعتماد
   الاستاتيكي على route chunks:
   - `app-i18n` ← `src/i18n/index.ts`
   - `app-shared-core` ← `services/apiClient`, `utils/tokenManager`,
     `utils/urlHelper`, `hooks/useAuthSimple`, `components/settings/DefaultPageSelector`,
     `utils/imageUrl`, `utils/i18n-toast`
   - `app-business-shell` ← `src/components/business/*`
   - `vendor-toast` ← sonner (قائمة `STOREFRONT_DEFERRED_PRELOAD_CHUNKS`
     كانت تتوقع هذا الاسم أصلًا)
   - vite preload helper → `app-bootstrap-core`
2. **صفحات `src/pages/` غير المصنفة** تُترك لتقسيم Rollup الافتراضي (كل
   dynamic entry يأخذ chunk مستقل باستيراد مباشر) بدل pot مشترك يبني facades.
3. **حارس نظافة الـ entry** (`apps/frontend/scripts/check-entry-chunks.cjs`,
   مسجَّل في deploy.yml كخطوة `Check Entry Chunk Purity`):
   - يقرأ الـ entry الحقيقي من `dist/index.html` (أول module script).
   - يفشل البناء لو الـ entry استورد أي `route-*` استيرادًا ساكنًا،
     باستثناء `route-storefront-*` و `route-auth-*` (مقصودة في preload).
   - ميزانية حجم 150KB مينيفايد تلتقط أي امتصاص جديد للصفحات في الـ entry.

## النتائج (محليًا، brotli)

- الـ entry: 7KB، يستورد `app-bootstrap-core` و `vendor-react` فقط.
- `route-storefront`: 540KB ← 159KB (خروج i18n والترجمات).
- التحميل الأول للمتجر: ~3.6MB ← ~0.95MB تقديريًا (‑74%).
- مكسب جانبي للأدمن: الصفحات التي تستورد useAuth لم تعد تسحب `route-dashboard`.

## ملاحظات صيانة

- أي موديول جديد مشترك بين المنصة والمتجر يجب أن يدخل نمط `app-*` في
  manualChunks، وإلا سيعود الجسر تدريجيًا — الحارس سيمسكه في CI.
- لا تضف `preserveEntrySignatures: 'strict'`: أجربناها وتجعل Vite يضخ كل
  الـ chunks كـ script tags في index.html (تجربة 2026-08-29، مرفوضة).
