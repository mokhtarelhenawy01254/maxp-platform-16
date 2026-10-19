# وثيقة معمارية: توحيد رابط الكورس على سب دومين الشركة (302 من المركزي والأرشفة)

**التاريخ:** 2026-10-18 / 2026-10-19  
**القرار المرجعي:** قرار مختار (18-10 · manager)  
**الحالة:** معتمد ومنفذ  

---

## 1. المشكلة وجذورها
1. النطاق المركزي `maxp.online` (apex domain) غير مربوط بشركة تجارية معينة (`storefront/settings` تعيد `null`).
2. صفحة الكورس على المركزي كانت تعمل عبر fallback داخلي، مما ينشئ تشتتاً في روابط الكورس بين `maxp.online` وسب دومين الشركة المنشئة للكورس `max-p.maxp.online`.
3. الروابط الترويجية وحملات الميديا باير تحتاج رابطاً موحداً مع تمرير معاملات التتبع (`UTMs`, `ref`, etc.) بدون فقدان.
4. صفحة الكورس الخاصة بـ `max-p` على سب دومينها يجب أن تكون قابلة للأرشفة (`robots: index, follow`) في محركات البحث مع ميتا تاج وسكيما متكاملة، بينما تظل بوابات المستأجرين الآخرين (مثل `swan.maxp.online`) والصفحات الخاصة بالطلبة (لوحة الطالب، المشغل، تسجيل الدخول) محجوبة عن الأرشفة (`noindex, follow`).

---

## 2. الحل المعماري المنفذ

### أ. إعادة التوجيه المؤقت 302 على مستوى Nginx وNode.js (Defense-in-Depth)
1. **Nginx Edge Redirect (`nginx_configs/maxp.online.conf`):**
   - في بلوك الخادم المركزي `maxp.online` / `www.maxp.online`:
     - توجيه فوري صريح لكورس MaxP الأول:
       `location = /portal/course/cmuzmwaxs07r2juml2v04xon5 { return 302 https://max-p.maxp.online/portal/course/cmuzmwaxs07r2juml2v04xon5$is_args$args; }`
     - تمرير أي مسارات كورسات أخرى لـ Node backend عبر `location ^~ /portal/course/` و`location ^~ /academy/course/` لضمان عدم تقديم صفحات HTML استاتيكية من `try_files`.
2. **Backend Middleware (`apps/backend/middleware/courseSubdomainRedirectMiddleware.js`):**
   - فحص طلبات `GET` و`HEAD` لمسارات الكورسات العامة (`/portal/course/:id`, `/academy/course/:id`).
   - التحقق من النطاق: إذا كان نطاقاً مركزياً (apex)، يتم جلب اسم الشركة من قاعدة البيانات (`companySlug`) والتوجيه بـ HTTP 302 مع الاحتفاظ بكافة معاملات الـ query string.
   - إذا كان الطلب بالفعل على سب دومين الشركة، يتم استدعاء `next()` فوراً لمنع أي حلقة توجيه (redirect loop).
   - استثناء مسارات الكتالوج `/portal` و`/portal/catalog` واستثناء مسارات `/api/*` بالكامل من أي تحويل.
3. **Frontend Client-Side Fallback (`AcademyCoursePublicPage.tsx` & `AcademyCatalogPublicPage.tsx`):**
   - في حال تم فتح الصفحة بالمركزي عبر التنقل من جهة العميل (SPA routing)، يتم تحديث الرابط فورياً إلى `https://max-p.maxp.online/portal/course/:id`.
   - روابط الكروت في الكتالوج على المركزي تشير مباشرة إلى سب دومين `max-p`.

### ب. سياسة الأرشفة وSEO (`storefrontSeoService.js` & `storefrontHtmlController.js`)
1. دعم مسار الكورس العام كمسار قابل للأرشفة فقط وحصرياً لشركة `max-p` الأم:
   - `noIndex: false` و`robots: "index, follow"`.
   - حقن وسوم الميتا: العنوان (`كورس MaxP — من أول إعلان لأول نظام`)، الوصف، صورة OpenGraph المعتمدة، والرابط القانوني `canonicalUrl` المشير لـ `https://max-p.maxp.online/portal/course/:id`.
   - حقن سكيما Course من Schema.org.
2. عزل تام لباقي الشركات المستأجرة (Multi-Tenant Isolation):
   - أي مستأجر آخر (مثل `swan.maxp.online`) يظل وسم الأرشفة له `noindex, follow` التزاماً بالمعايير الصارمة لمنع تداخل المحتوى.

---

## 3. التحقق والاختبارات
- تم إضافة 4 اختبارات جديدة في Jest (`courseSubdomainRedirectMiddleware.test.js`) وتغطية سيناريوهات 302 وحفظ الـ query وعدم حدوث حلقات توجيه.
- تم تحديث وتمرير 21 اختباراً في `storefrontSeoService.test.js` للتأكد من سلوك `robots` tag.
- تم التحقق من سلامة مسارات الشراء والاستدعاء من الـ subdomain إلى بوابات الدفع (Kashier).
