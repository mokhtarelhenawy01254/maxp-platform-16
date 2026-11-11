# Meta App Switching — «التطبيق الافتراضي للعملاء الجدد»

## الفكرة

المنصة تقدر تشغّل **أكتر من تطبيق Meta في نفس الوقت**. كل اتصال (صفحة / حساب إعلاني / بيكسل / شركة / جلسة واتساب) بيتخزن معاه مفتاح تطبيقه في عمود `facebookAppKey`، والـ resolver بيقرأ المفتاح **من الكيان نفسه** — مش من إعداد عام.

النتيجة: تغيير «الافتراضي» بيأثر على **الاتصالات الجديدة فقط**، ولا يلمس أي عميل حالي.

## المكوّنات

### 1) عمود جديد
```sql
ALTER TABLE "facebook_apps" ADD COLUMN IF NOT EXISTS "isDefaultForSignup" BOOLEAN NOT NULL DEFAULT false;
```
يتضاف تلقائيًا عبر `ensureSchema()` في `metaAppRegistryService.js` — لا حاجة لتشغيله يدويًا.

### 2) خدمة السجل — `metaAppRegistryService.js`
| الدالة | الوظيفة |
|---|---|
| `getDefaultSignupAppKey()` | ترجع مفتاح التطبيق الافتراضي، أو `'primary'` عند الفشل (fallback آمن) |
| `setDefaultSignupAppKey(key)` | تعيّن تطبيقًا واحدًا كافتراضي (تلغي تعليم الباقي)، وترفض التطبيقات المعطّلة |

`getSafeAppsList()` بقت ترجّع `isDefaultForSignup` لكل تطبيق (بـ SQL خام حتى لا نعتمد على إعادة توليد Prisma Client).

### 3) مسار OAuth — `facebookOAuthRoutes.js`
`GET /api/v1/facebook-oauth/authorize` و `GET /api/v1/facebook-oauth/ads-authorize`:

```
1. ?app= أو ?appKey= (صريح — أعلى أولوية)
2. مفتاح الشركة المخزّن (company.facebookAppKey)
3. التطبيق الافتراضي للتسجيل (isDefaultForSignup)
4. 'primary' (fallback)
```

> بهذا الترتيب: عميل قديم مربوط على `primary` **يفضل** على `primary` حتى لو غيّرنا الافتراضي.

### 4) واجهة السوبر أدمن
`PATCH /api/v1/super-admin/platform/meta-apps/:key/default`

في صفحة `/super-admin/meta-apps` ظهر زر **«تعيين كافتراضي للتسجيل»** لكل تطبيق، ويتحول إلى **«افتراضي للعملاء الجدد»** للتطبيق المختار.

كما تم توسيع `toggle` ليقبل أي مفتاح مسجّل (كان محصورًا في `primary` و `growth`).

---

## ⚠️ خطوة إلزامية قبل قلب الافتراضي

الشركات القديمة عندها `facebookAppKey = NULL` أو `'primary'`. لو قلبت الافتراضي وهي لسه `NULL`، ممكن تتقرأ على إنها «جديدة» وتاخد التطبيق الجديد بالغلط.

**نفّذ التعبئة قبل القلب:**

```sql
-- 1) ثبّت كل الشركات الحالية على التطبيق القديم
UPDATE "companies"
SET "facebookAppKey" = 'primary', "fbAppKey" = 'primary'
WHERE "facebookAppKey" IS NULL OR "facebookAppKey" = '';

-- 2) نفس الشيء للصفحات والاتصالات وحسابات الإعلانات
UPDATE "facebook_pages"                SET "facebookAppKey"='primary', "fbAppKey"='primary' WHERE "facebookAppKey" IS NULL OR "facebookAppKey"='';
UPDATE "facebook_account_connections"  SET "facebookAppKey"='primary', "fbAppKey"='primary' WHERE "facebookAppKey" IS NULL OR "facebookAppKey"='';
UPDATE "facebook_ad_accounts"          SET "facebookAppKey"='primary', "fbAppKey"='primary' WHERE "facebookAppKey" IS NULL OR "facebookAppKey"='';
UPDATE "facebook_ads_connection_sources" SET "facebookAppKey"='primary', "fbAppKey"='primary' WHERE "facebookAppKey" IS NULL OR "facebookAppKey"='';
UPDATE "facebook_pixel_configs"        SET "facebookAppKey"='primary', "fbAppKey"='primary' WHERE "facebookAppKey" IS NULL OR "facebookAppKey"='';
```

بعد كده أي شركة جديدة هتتولد بـ `NULL` → تاخد الافتراضي الجديد.

---

## 🚨 القاعدة الذهبية

**لا تغيّر اعتماد التطبيق المخزّن تحت المفتاح `primary` أبدًا.**

`primary` = التطبيق القديم (m2). أي إعادة توجيه له لمفتاح آخر تبطل توكنات كل العملاء الحاليين فورًا (توكنات m2 مع سيكرت تطبيق تاني).

التمديد الصحيح: تسجيل تطبيق بمفتاح **جديد** (`maxp`) ثم تعيينه افتراضيًا.

---

## ترتيب التشغيل الموصى به

| # | الخطوة | الأثر |
|---|---|---|
| 1 | نشر الكود | صفر (الافتراضي يفضل `primary`) |
| 2 | تشغيل تعبئة `facebookAppKey` | صفر |
| 3 | تسجيل `maxp` في السجل (App ID + Secret) | صفر |
| 4 | تجربة `?app=maxp` على شركة تجريبية | صفر |
| 5 | تعيين `maxp` افتراضيًا | العملاء الجدد فقط |
| 6 | عند الحاجة للرجوع: تعيين `primary` افتراضيًا | رجوع فوري وآمن |
