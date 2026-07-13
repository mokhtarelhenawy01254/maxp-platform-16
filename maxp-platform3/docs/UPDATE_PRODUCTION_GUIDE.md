# 🚀 دليل تحديث Production Server

## تحديث 2026-04-11 (متابعة سابعة): مراجعة جاهزية الرفع على GitHub والبيلد والـ SSH

### ما الذي تم التحقق منه
- `git fetch origin` ثم `git rev-list --left-right --count origin/main...HEAD` أعاد `0 0` قبل دفعة التوثيق، ما يعني أن الفرع المحلي كان متزامنًا مع `origin/main`.
- `frontend` production build نجح محليًا عبر:

```bash
cd frontend
npm run build
```

- زمن البيلد كان حوالي 5 دقائق.
- التحذيرات الحالية غير مانعة وما تزال محصورة في:
  - ملفات `Geist` `woff2` التي تُحل وقت التشغيل
  - circular chunk warning بين `vendor-ui-framework` و`vendor-mui`
- تمت مراجعة:
  - `scripts/verify-docs.js`
  - `backend/deploy.sh`

### حالة الرفع الحالية
- `origin` ما يزال مهيأً عبر HTTPS، وهو المسار العملي الحالي للرفع إلى GitHub من هذه البيئة.
- `ssh -T git@github.com` يفشل حاليًا بـ:

```text
Permission denied (publickey)
```

- alias `max-p-vps` موجود داخل `%USERPROFILE%\.ssh\config` ويستخدم المفتاح `id_ed25519`، لكن الاتصال من هذه البيئة ينتهي timeout، لذلك لا يعتمد عليه حاليًا في النشر اليدوي.

### المطلوب إذا أردت الاعتماد على SSH بدل HTTPS
- التأكد من رفع الـ public key الصحيحة إلى GitHub.
- التأكد أن السيرفر `153.92.223.119` يسمح بالاتصال من هذه البيئة وأن منفذ `22` غير محجوب.
- تجربة:

```bash
ssh -T git@github.com
ssh max-p-vps "echo ok"
```

### ملاحظة تشغيلية
- الرفع الحالي إلى GitHub في هذا المستودع يتم بنجاح عبر remote HTTPS، لذلك مشكلة SSH لا تمنع `git push origin main` لكنها ما تزال تمنع الاعتماد على SSH كمسار تشغيلي أساسي من هذه المحطة.

## تحديث 2026-04-11 (متابعة سادسة): منع 500 في إرسال Company Connection Request

### الأعراض المتوقعة قبل التحديث
```text
POST /api/v1/company-connections/requests -> 500 Internal Server Error
```

### السبب
- الباك إند كان يحاول إنشاء `company_connection_requests` مباشرة.
- إذا كان `receiverId` غير صحيح أو يشير إلى شركة غير موجودة، كانت قاعدة البيانات ترمي foreign key error وينتهي الطلب بـ `500`.
- كما لم يكن هناك guardrails كافية لحالات الطلب المكرر أو الطلب العكسي المعلق.

### ما الذي تغير
- تم تقوية `sendConnectionRequest` ليتحقق قبل الإنشاء من:
  - وجود الشركة الحالية للمستخدم
  - وجود الشركة المستلمة
  - كون الشركة المستلمة نشطة
  - عدم وجود طلب معلق بنفس الاتجاه
  - عدم وجود طلب معلق عكسي
  - عدم وجود اتصال قائم بالفعل
- وتمت إضافة رسائل واضحة لأخطاء Prisma المعروفة بدل `500` العام.

### المطلوب على السيرفر
يكفي سحب آخر تحديثات `main` ثم إعادة تشغيل الباك إند:

```bash
cd /var/www/backend2
git pull origin main
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### التحقق بعد التحديث
إذا كان `Company ID` غير صحيح، يجب أن ترى رسالة أعمال واضحة بدل `500`.
إذا كان صحيحًا، يجب أن يعود الطلب بنجاح `201`.

## تحديث 2026-04-11 (متابعة خامسة): إصلاح 404 لمسارات Facebook Integrations الحديثة

### الأعراض المتوقعة قبل التحديث
```text
GET /api/v1/integrations/facebook/connected    -> 404
GET /api/v1/integrations/facebook/diagnostics  -> 404
POST /api/v1/integrations/facebook/publish     -> 404
```

### السبب
- الواجهة الحالية تستخدم prefix:
  - `/api/v1/integrations/facebook/*`
- لكن `backend/server.js` كان يربط `facebookIntegrationRoutes` فقط على:
  - `/api/v1/facebook/integration`
- وبما أن ملف الراوت نفسه يعرّف endpoints على شكل `/facebook/...`، فالواجهة الحديثة لم تكن تصل لأي route فعلي.

### ما الذي تغير
- تم إضافة alias متوافق:

```js
app.use("/api/v1/integrations", facebookIntegrationRoutes);
```

- مع الإبقاء على mount القديم:

```js
app.use("/api/v1/facebook/integration", facebookIntegrationRoutes);
```

### المطلوب على السيرفر
يكفي سحب آخر تحديثات `main` ثم إعادة تشغيل الباك إند:

```bash
cd /var/www/backend2
git pull origin main
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### التحقق بعد التحديث
```bash
curl -i "http://127.0.0.1:3007/api/v1/integrations/facebook/connected?companyId=YOUR_COMPANY_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

النتيجة المتوقعة بعد التحديث:
- صفحة إعدادات Facebook والصفحات المرتبطة والتشخيص والنشر لا تعود تسقط في `404` على مسارات `integrations/facebook/*`.

## تحديث 2026-04-11 (متابعة رابعة): إصلاح 404 لمسارات Company Connections

### الأعراض المتوقعة قبل التحديث
```text
GET /api/v1/company-connections/active              -> 404
GET /api/v1/company-connections/requests/received   -> 404
GET /api/v1/company-connections/consumers           -> 404
POST /api/v1/company-connections/requests           -> 404
```

### السبب
- ملف `backend/routes/companyConnectionRoutes.js` كان موجودًا.
- متحكم `backend/controller/companyConnectionController.js` كان موجودًا.
- لكن `backend/server.js` لم يكن يربط المسار `/api/v1/company-connections` داخل Express.

### ما الذي تغير
- تم إضافة:

```js
app.use("/api/v1/company-connections", companyConnectionRoutes);
```

### المطلوب على السيرفر
يكفي سحب آخر تحديثات `main` ثم إعادة تشغيل الباك إند:

```bash
cd /var/www/backend2
git pull origin main
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### التحقق بعد التحديث
```bash
curl -i "http://127.0.0.1:3007/api/v1/company-connections/active" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -i "http://127.0.0.1:3007/api/v1/company-connections/requests/received" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -i "http://127.0.0.1:3007/api/v1/company-connections/consumers" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

النتيجة المتوقعة بعد التحديث:
- صفحة الربط الداخلي لا تعود تسقط في `404` لهذه المسارات.
- الواجهة تبدأ في جلب الاتصالات النشطة والطلبات الواردة والمستهلكين بشكل طبيعي.

## تحديث 2026-04-11 (متابعة ثالثة): إصلاح تنبيه Facebook OAuth الخاطئ + مراجعة QA / السكربت / SSH

### الأعراض المتوقعة قبل التحديث
```text
واجهة settings/facebook-oauth تعرض:
"الصفحات التالية مربوطة بشركة أخرى"
رغم أن الربط القديم كان مفصولًا بالفعل
```

### السبب
- منطق Facebook OAuth كان يعتبر أي سجل قديم لنفس `pageId` في شركة أخرى تعارضًا، حتى إذا كانت حالته `disconnected`.
- endpoint `GET /api/v1/facebook-oauth/skipped-pages` كان يعرض سجلات skipped قديمة بدون إعادة التحقق من أن الصفحة ما زالت `connected` فعليًا في شركة أخرى.

### ما الذي تغير
- أصبح منع إعادة الربط يحدث فقط إذا كانت الصفحة نفسها ما تزال `connected` عند شركة أخرى.
- أي skipped rows قديمة أصبحت stale يتم حلّها تلقائيًا (`isResolved = true`) قبل إرجاع النتيجة للواجهة.

### المطلوب على السيرفر
يكفي سحب آخر تحديثات `main` ثم إعادة تشغيل الباك إند:

```bash
cd /var/www/backend2
git pull origin main
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### التحقق بعد التحديث
```bash
curl -i "http://127.0.0.1:3007/api/v1/facebook-oauth/skipped-pages?companyId=YOUR_COMPANY_ID"
curl -i "http://127.0.0.1:3007/api/v1/facebook-oauth/status?companyId=YOUR_COMPANY_ID"
```

النتيجة المتوقعة بعد التحديث:
- الصفحات المفصولة قديمًا لا تظهر بعد الآن كأنها "مربوطة بشركة أخرى".
- التنبيه يعرض فقط التعارضات الحقيقية للصفحات المرتبطة فعليًا الآن.

### ملاحظة مهمة عن WebSocket
إذا كان ما يزال يظهر في المتصفح:

```text
wss://mokhtarelhenawy.online/socket.io
```

فهذا موضوع منفصل عن Facebook OAuth نفسه، وغالبًا يرتبط بواحد من الآتي:
- قيمة `VITE_WS_URL` المستخدمة وقت build أو deploy
- الدومين الذي تعمل عليه النسخة الحالية
- إعدادات nginx / reverse proxy الخاصة بترقية WebSocket

### مراجعة QA والسكربتات والـ SSH
- `frontend npm run build` نجح محليًا.
- التحذيرات الحالية غير مانعة وتقتصر على:
  - `Geist` font asset warnings
  - circular chunk warning بين `vendor-ui-framework` و`vendor-mui`
- تمت مراجعة:
  - `scripts/verify-docs.js`
  - `backend/deploy.sh`
- مراجعة SSH الحالية:
  - GitHub SSH غير مفعّل على بيئة العمل الحالية (`Permission denied (publickey)`)
  - الاتصال عبر alias `max-p-vps` يفشل أيضًا
  - الرفع إلى GitHub يتم حاليًا عبر remote من نوع HTTPS

## تحديث 2026-04-11 (مراجعة نهائية): مزامنة الإصدار + مراجعة QA والسكربتات

### ما الذي تمت مزامنته في التوثيق
- تم توحيد التوثيق النهائي للإصلاحات التي رُفعت بالفعل على `main`:
  - استعادة مسارات التكامل `/api/v1/easy-orders` و`/api/v1/import-jobs` و`/api/v1/woocommerce`
  - دعم WooCommerce متعدد المتاجر مع استهداف المتجر المحدد عبر `settingsId`
  - دعم alias لمسارات Facebook OAuth على `/api/v1/facebook-oauth/*`

### مراجعة الـ QA المحلية
- تمت مراجعة `frontend` production build محليًا بنجاح عبر:

```bash
cd frontend
npm run build
```

- تمت مراجعة السكربتات التشغيلية التالية:
  - `scripts/verify-docs.js`: ما يزال يفرض تحديث ملفات التوثيق عند وجود تغييرات كود، ويعتمد أولًا على diff آخر commit ثم fallback إلى staged diff.
  - `backend/deploy.sh`: ما يزال متوافقًا مع التدفق الحالي للنشر عبر قراءة `PORT=` بطريقة Bash-safe، ثم `schema:generate`، ثم إعادة تشغيل PM2، ثم health check ديناميكي.

### المطلوب عند تحديث السيرفر الإنتاجي
- إذا لم تكن migration الخاصة بـ WooCommerce multi-store مطبقة بعد، فيجب تنفيذها قبل اختبار حفظ إعدادات أكثر من متجر.
- إذا كانت مشكلة Facebook OAuth أو WooCommerce 404/500 ما تزال ظاهرة على `maxp.online`، فمعنى ذلك غالبًا أن السيرفر لم يسحب آخر تحديثات `main` أو لم يُعد تشغيل الباك إند بعد.

## تحديث 2026-04-11: إصلاح 404 لمسارات التكامل + تحديثات HR Recruitment

### الأعراض المتوقعة قبل التحديث
```text
GET /api/v1/easy-orders/settings        -> 404
GET /api/v1/easy-orders/sync-logs       -> 404
GET /api/v1/import-jobs/list            -> 404
GET /api/v1/woocommerce/settings        -> 404
GET /api/v1/woocommerce/sync-logs       -> 404
```

### السبب
- ملفات المسارات كانت موجودة داخل `backend/routes/`
- لكن `backend/server.js` لم يكن يربط:
  - `easyOrdersRoutes`
  - `importJobRoutes`
  - `wooCommerceRoutes`
- لذلك الواجهة كانت تطلب endpoints صحيحة، بينما السيرفر الإنتاجي لا يعرّفها فعليًا

### المطلوب على السيرفر بعد سحب آخر التحديثات
```bash
cd /var/www/backend2
git pull origin main
npm install
npm run schema:generate
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### مهم: تحديث قاعدة البيانات لـ HR Recruitment
هذه الدفعة تضيف أيضًا:
- `RecruitmentFormResponse.isContacted`
- `RecruitmentFormResponse.contactedAt`
- الربط `Applicant.formResponseId`

إذا كانت بيئة الإنتاج لا تطبق migrations تلقائيًا، يجب تنفيذ التحديث الموافق لقاعدة البيانات قبل اختبار خاصية التوظيف:

```bash
cd /var/www/backend2/backend
npx prisma validate --schema=prisma/schema
npx prisma db execute --schema=prisma/schema --file=prisma/schema/migrations/20260409150000_recruitment_response_contact_status/migration.sql
npx prisma generate --schema=prisma/schema
```

### التحقق بعد التحديث
```bash
curl -i http://127.0.0.1:3007/api/v1/health
curl -i http://127.0.0.1:3007/api/v1/woocommerce/settings
curl -i http://127.0.0.1:3007/api/v1/easy-orders/settings
curl -i http://127.0.0.1:3007/api/v1/import-jobs/list
```

### ملاحظات الإصدار
- نجاح `frontend build` لا يعني بالضرورة أن `frontend type-check` نظيف بالكامل؛ توجد أخطاء TypeScript قديمة في أجزاء أخرى من المشروع لكنها لا تمنع بيلد الإنتاج الحالي.
- إصلاح 404 هنا Backend-only، لذلك لن يظهر أثره على `maxp.online` إلا بعد restart/redeploy للباك إند.

## تحديث 2026-04-11 (متابعة): إصلاح 500 في حفظ إعدادات WooCommerce عند تعدد المتاجر

### الأعراض المتوقعة قبل التحديث
```text
POST /api/v1/woocommerce/settings -> 500 Internal Server Error
```

### السبب
- جدول `woocommerce_settings` كان يفرض `companyId` كقيمة فريدة، وهذا يمنع حفظ أكثر من متجر WooCommerce للشركة نفسها.
- بعض العمليات كانت ما تزال لا تمرر `settingsId`، فكانت قد تعمل على أول متجر محفوظ بدل المتجر المحدد.
- إعداد Webhooks كان يحاول حفظ `webhookUrl` داخل Prisma رغم أن الحقل غير موجود في schema.

### المطلوب على السيرفر
إذا تم سحب الكود فقط بدون migration التالية، سيستمر الخطأ `500` في الإنتاج:

```bash
cd /var/www/backend2/backend
npx prisma validate --schema=prisma/schema
npx prisma db execute --schema=prisma/schema --file=prisma/schema/migrations/20260411143000_allow_multiple_woocommerce_settings_per_company/migration.sql
npx prisma generate --schema=prisma/schema
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

### التحقق بعد التحديث
```bash
curl -i -X POST http://127.0.0.1:3007/api/v1/woocommerce/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --data '{"storeUrl":"https://example.com","consumerKey":"ck_xxx","consumerSecret":"cs_xxx"}'
```

النتيجة المتوقعة بعد التحديث:
- لا يعود الحفظ يرجع `500` بسبب قيد قاعدة البيانات القديم.
- الإجراءات الأساسية في صفحة WooCommerce تصبح أوضح في استهداف المتجر المحدد.

## تحديث 2026-04-11 (متابعة ثانية): إصلاح 404 لمسارات Facebook OAuth

### الأعراض المتوقعة قبل التحديث
```text
GET /api/v1/facebook-oauth/status         -> 404
GET /api/v1/facebook-oauth/skipped-pages  -> 404
GET /api/v1/facebook-oauth/authorize      -> 404
```

### السبب
- راوت `facebookOAuthRoutes` كان مركبًا فقط على `/api/v1/facebook/oauth`
- لكن الواجهة الحالية تستدعي `/api/v1/facebook-oauth/*`

### المطلوب على السيرفر
يكفي سحب آخر تحديث وإعادة تشغيل الباك إند:

```bash
cd /var/www/backend2
git pull origin main
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
```

## المشكلة الحالية
```
POST /api/v1/super-admin/dev/tasks/:taskId/timer/stop 404 (Not Found)
```

السبب: الكود الجديد موجود على GitHub لكن لم يتم تحديثه على السيرفر.

---

## ✅ الحل: تحديث السيرفر

### الطريقة 1: SSH يدوياً

```bash
# 1. اتصل بالسيرفر
ssh root@153.92.223.119

# 2. انتقل لمجلد المشروع
cd /var/www/backend2

# 3. اسحب آخر التحديثات من GitHub
git pull origin main

# 4. ثبت الـ dependencies الجديدة (إذا تغيرت)
npm install

# 5. أعد توليد Prisma Client
npx prisma generate

# 6. أعد تشغيل الـ backend
pm2 restart backend2

# 7. تحقق من الحالة
pm2 status
pm2 logs backend2 --lines 50
```

---

### الطريقة 2: استخدام deploy.sh

إذا كنت تريد deploy كامل (frontend + backend):

```bash
./deploy.sh root@153.92.223.119
```

---

## 🔍 التحقق من نجاح التحديث

بعد التحديث، تحقق من:

1. **PM2 Status:**
```bash
ssh root@153.92.223.119 "pm2 status"
```

2. **Backend Logs:**
```bash
ssh root@153.92.223.119 "pm2 logs backend2 --lines 50"
```

3. **اختبار الـ API:**
```bash
curl -X GET https://mokhtarelhenawy.online/api/v1/super-admin/dev/timer/all-active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 الـ Routes الجديدة المضافة

```javascript
// Timer Routes
POST /api/v1/super-admin/dev/tasks/:taskId/timer/start
POST /api/v1/super-admin/dev/tasks/:taskId/timer/stop
POST /api/v1/super-admin/dev/tasks/:taskId/timer/pause
POST /api/v1/super-admin/dev/tasks/:taskId/timer/resume
GET  /api/v1/super-admin/dev/timer/active
GET  /api/v1/super-admin/dev/timer/all-active  // ⭐ جديد
```

---

## ⚠️ ملاحظات مهمة

1. **تأكد من وجود SSH Key** أو استخدم password للاتصال
2. **تحقق من أن Git configured** على السيرفر
3. **راجع الـ logs** بعد إعادة التشغيل للتأكد من عدم وجود أخطاء
4. **اختبر الـ API** من المتصفح أو Postman

---

## 🔧 Troubleshooting

### إذا فشل git pull:
```bash
# تحقق من الـ branch الحالي
git branch

# تحقق من وجود تعارضات
git status

# إذا كان هناك تغييرات محلية
git stash
git pull origin main
git stash pop
```

### إذا فشل PM2 restart:
```bash
# أوقف ثم ابدأ من جديد
pm2 stop backend2
pm2 start backend2

# أو استخدم ecosystem file
pm2 startOrReload ecosystem.config.js --env production
```

### إذا استمرت المشكلة:
```bash
# أعد بناء Prisma Client بالقوة
npx prisma generate --force

# امسح node_modules وأعد التثبيت
rm -rf node_modules
npm install
```

---

## 📞 الدعم

إذا استمرت المشكلة، تحقق من:
- ✅ الـ routes موجودة في `backend/routes/superAdminRoutes.js`
- ✅ الـ controller functions موجودة في `backend/controllers/superAdminController.js`
- ✅ الـ exports صحيحة في module.exports
- ✅ PM2 يعمل بدون أخطاء

---

**آخر تحديث:** 11 أبريل 2026
**المرجع الحالي:** راجع آخر تحديثات `main` بتاريخ 11 أبريل 2026 قبل تنفيذ أي deploy إنتاجي.
