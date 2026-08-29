# Web Vitals RUM — قياس أداء المستخدم الحقيقي (2026-08-29)

## الهدف

قياس تأثير الزوار الحقيقيين لإصلاح حجم المتجر
(`bundle-chunking-entry-purity-2026-08-29.md`) ومتابعة أي تراجع مستقبلًا بأرقام
ميدانية لا اختبارات اصطناعية فقط.

## كيف يعمل

### الفرونت (`apps/frontend/src/utils/webVitals.ts`)
- يجمع **LCP / CLS / INP / TTFB** عبر `PerformanceObserver` (بدون أي مكتبة).
- يرسل beacon واحد لكل زيارة صفحة عند مغادرة التبويب
  (`visibilitychange → hidden` أو `pagehide`) عبر `navigator.sendBeacon`
  مع fallback إلى `fetch keepalive`.
- INP هنا تقريبي: أسوأ مدة تفاعل خلال حياة الصفحة (المتري الرسمي مئين 98).
- CLS يُرسل ×1000 لأجل أرقام صحيحة.
- لا يعمل في أي مسار إداري — متصل فقط في `StorefrontBootstrap` (تحميل
  ديناميكي بعد الـ mount حتى لا يمس المسار الحرج).

### الباك إند (`analyticsController.js` + `analyticsRoutes.js`)
- `POST /api/v1/analytics/track/web-vitals` (عام، مثل باقي مسارات التتبع):
  يحدد الشركة من الـ subdomain عبر `resolveAnalyticsCompanyId`، ينظّف
  المقاييس (حد أقصى 8 مقاييس/طلب، أسماء وقيم مقيدة)، يخزنها في buffer
  في الذاكرة (500 عينة/شركة)، ويطبع سطر لوج منظم:
  `📈 [WebVitals] <company> <path> :: LCP=1234(good) CLS=12 ...`
- `GET /api/v1/analytics/web-vitals/summary` (محمي بـ `authenticateToken`):
  ملخص آخر 60 دقيقة — p75 وعدد العينات لكل مقياس.

## القرارات المعمارية

- **بدون جدول DB عمدًا**: النشر لا يشغّل `prisma migrate deploy`، والترقيات
  اليدوية مكلفة. الـ buffer في الميمورية كافٍ للمراقبة اللحظية ويعاد ضبطه مع
  إعادة تشغيل العملية. لو احتجنا تاريخًا طويل المدى: نموذج `WebVital` + SQL
  يدوي على الإنتاج.
- sendBeacon لا يستطيع إرسال headers مخصصة، لذا تحديد الشركة يعتمد على
  الـ subdomain (يعمل تلقائيًا لكل المتاجر).

## الاستخدام

```bash
# آخر ساعة من مقاييس متجر (بـ token أدمن):
curl -H "Authorization: Bearer $TOKEN" \
  https://maxp.online/api/v1/analytics/web-vitals/summary
```
