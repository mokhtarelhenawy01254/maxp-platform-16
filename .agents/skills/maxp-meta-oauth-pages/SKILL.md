---
name: maxp-meta-oauth-pages
description: المرجع الهندسي الشامل ودليل التشخيص واستكشاف الأخطاء لربط صفحات فيسبوك (Facebook OAuth & Meta Graph API) في منصة MaxP — يغطي أذونات محافظ الأعمال (Business Portfolios)، وتجربة الصفحات الجديدة (New Pages Experience - NPE)، وتضارب ملكية الصفحات بين الشركات، واشتراكات Webhook.
---

# مهارة ربط وإدارة صفحات Meta فيسبوك (MaxP Meta OAuth & Pages Integration)

## 📌 نبذة عامة (Overview)

هذه المهارة هي المرجع الهندسي والتشغيلي المعتمد في منصة MaxP لإدارة دورة حياة ربط صفحات فيسبوك وحسابات Meta عبر OAuth 2.0 و Meta Graph API v21+. توثق هذه المهارة المعمارية الكاملة، وأسباب حجب الصفحات عن الـ API، والفرق الدقيق بين أدوار الصفحات المباشرة ومحافظ الأعمال (Business Portfolios)، بالإضافة إلى سكريبتات الفحص المباشر واستعلامات قاعدة البيانات.

---

## 🏗️ 1. المعمارية التقنية للربط (Architecture & Scopes)

### أ) أذونات الـ OAuth المعتمدة في المنصة (`facebookOAuthRoutes.js`):

| نوع الربط | المتغير البرمجي | الصلاحيات المطلوبة (Scopes) | الغرض الهندسي |
|---|---|---|---|
| **ربط الصفحات والماسنجر** | `FACEBOOK_PAGE_SCOPES` | `public_profile, email, pages_show_list, pages_manage_metadata, pages_messaging, pages_read_user_content, pages_manage_engagement, business_management` | سحب الصفحات، إرسال واستقبال رسائل الشات بوت، قراءة المنشورات والتعليقات، وإظهار صفحات محافظ الأعمال |
| **ربط بيكسل فيسبوك** | `FACEBOOK_PIXEL_SCOPES` | `business_management, ads_management, ads_read` | سحب معرّفات البيكسل (Datasets / Pixels) التابعة للشركات لربط مسارات التحويل |
| **ربط الحسابات الإعلانية** | `FACEBOOK_ADS_SCOPES` | `business_management, ads_management, ads_read, pages_show_list, pages_read_engagement, pages_manage_ads` | قراءة الحملات، إدارة الميزانيات، وإنشاء Ad Creatives مرتبطة بالصفحات |

> ⚠️ **قاعدة ذهبية (The Golden Rule for Scopes):**
> **لا تحذف `business_management` إطلاقاً من `FACEBOOK_PAGE_SCOPES`.**
> حذفها يتسبب في حجب كافة الصفحات المدارة عبر **Meta Business Suite** عن مسار `/me/accounts` لأي مستخدم عادي.

---

## 🔍 2. السبب الجذري لحجب صفحات New Pages Experience (NPE)

### المعضلة التاريخية (The Business Asset Visibility Issue):
عندما تكون صفحة فيسبوك تابعة لمحفظة أعمال (**Meta Business Portfolio**) وليست صفحة شخصية قديمة مستقلة:

1. **القسم الأول — المشرفون المباشرون ("ليس ضمن حافظة الأعمال"):**
   - هؤلاء مضافون كأدوار صفحات مباشرة على فيسبوك من خارج محفظة الأعمال.
   - تظهر لهم الصفحة دائماً في `/me/accounts` بمجرد توفر إذن `pages_show_list`.

2. **القسم الثاني — أعضاء محفظة الأعمال ("الأشخاص لديهم صلاحية الوصول الكامل"):**
   - هؤلاء تمت إضافتهم داخل **Meta Business Suite** كـ People في الحافظة ومُنحوا صلاحية التحكم الكامل على أصل الصفحة (Page Asset).
   - **سلوك خوادم Meta الصارم:** إذا استدعى تطبيق مسار `GET /me/accounts` لمستخدم من هذا القسم دون أن يطلب التطبيق إذن **`business_management`**، فإن Meta **تحجب الصفحة تماماً من المصفوفة المرجعة**، وتظهر المصفوفة فارغة أو تحتوي فقط على الصفحات الفردية غير المرتبطة بالبيزنس!

3. **الاستثناء المضلل لمسؤولي التطبيق (App Administrators):**
   - مطورو ومسؤولو تطبيق Meta (`Meta App Administrators`) يحصلون على استثناءات تلقائية من فيسبوك؛ فتظهر لهم الصفحة في `/me/accounts` حتى مع نقص الصلاحيات.
   - هذا التباين يجعل المطور يظن خطأً أن المشكلة من حساب العميل، بينما السبب الحقيقي هو نقص `business_management` للمستخدمين العاديين.

---

## 🗄️ 3. قفل الملكية والتضارب بين الشركات (Cross-Company Conflicts)

تفرض قاعدة بيانات MaxP قيد تفرد أحادي `@unique` على عمود `pageId` في جدول `facebook_pages`:
لا يمكن لأي صفحة أن ترتبط بأكثر من شركة واحدة في نفس الوقت.

### سيناريو التضارب الشائع:
1. الصفحة تكون مسجلة مسبقاً لدى شركة قديمة (مثل Flora) بحالة `status = 'connected'`.
2. يحاول مستخدم شركة جديدة (مثل Swan) ربط الصفحة عبر الـ OAuth.
3. يقوم الباك إند بالتحقق من صحة التوكن القديم عبر `validateFacebookPageAccessToken`.
4. إذا كان التوكن القديم لا يزال سارياً:
   - يتخطى الباك إند الصفحة لحماية خصوصية الشركة السابقة.
   - يسجل محاولة التخطي في جدول `skipped_facebook_pages` بالسبب `already_connected_to_another_company`.

### حل التضارب البرمجي (Resolution Protocols):
* **عبر نقطة النهاية المدمجة:**
  ```http
  POST /api/v1/facebook-oauth/force-disconnect-page
  Headers: { "Authorization": "Bearer <JWT>" }
  Body: { "pageId": "376103368924946" }
  ```
* **عبر استعلام SQL المباشر على قاعدة البيانات:**
  ```sql
  -- فك احتجاز الصفحة من الشركة القديمة
  UPDATE "facebook_pages"
  SET 
    "status" = 'disconnected',
    "disconnectedAt" = NOW(),
    "facebookAccountId" = NULL,
    "updatedAt" = NOW()
  WHERE "pageId" = '376103368924946';

  -- تعليم سجلات التخطي كمحلولة
  UPDATE "skipped_facebook_pages"
  SET "isResolved" = true, "resolvedAt" = NOW(), "updatedAt" = NOW()
  WHERE "pageId" = '376103368924946';
  ```

---

## 🛠️ 4. أدوات وسكريبتات الفحص الميداني السريع (Diagnostic Tooling)

عند ورود أي شكوى بعدم ظهور صفحة، قم بتشغيل سكريبت الفحص التالي عبر Node.js على السيرفر فوراً:

### سكريبت كشف الصلاحيات وردود Meta لصفحة معينة:
```javascript
const axios = require('axios');

async function diagnoseToken(userAccessToken, pageId) {
  // 1. فحص التوكن والأذونات الممنوحة
  const debugRes = await axios.get(`https://graph.facebook.com/v21.0/debug_token`, {
    params: {
      input_token: userAccessToken,
      access_token: `${APP_ID}|${APP_SECRET}`
    }
  });
  console.log('Scopes Granted:', debugRes.data.data.scopes);
  console.log('Granular Scopes:', JSON.stringify(debugRes.data.data.granular_scopes, null, 2));

  // 2. فحص رد /me/accounts
  const accountsRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
    params: { access_token: userAccessToken, limit: 100 }
  });
  const found = accountsRes.data.data.find(p => p.id === pageId);
  console.log('Returned in /me/accounts?:', Boolean(found));

  if (!found) {
    console.error('❌ Page missing! Check if page is in Business Portfolio and business_management scope is requested.');
  }
}
```

### سكريبت تفعيل اشتراك الويب هوك للصفحة (Webhook Subscriptions):
```javascript
async function subscribePageWebhooks(pageId, pageAccessToken) {
  const fields = 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,message_reactions,feed';
  const res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`, null, {
    params: {
      subscribed_fields: fields,
      access_token: pageAccessToken
    }
  });
  console.log('✅ Webhook Subscription Result:', res.data);
}
```

---

## 📋 5. قائمة التحقق السريعة لاستكشاف الأعطال (Troubleshooting Checklist)

- [ ] **فحص الصلاحيات في الكود:** هل يحتوي `FACEBOOK_PAGE_SCOPES` على `business_management`؟
- [ ] **فحص حالة التطبيق في Meta:** هل تطبيق Meta في وضع Live والصلاحيات الأساسية مفعلة؟
- [ ] **فحص التحديد في الـ Dialog:** هل قام المستخدم بالضغط على "تحديد الكل" (Select All) في نافذة فيسبوك؟
- [ ] **فحص دور المستخدم على الصفحة:** هل المستخدم مضاف داخل Business Suite بصلاحية "التحكم الكامل"؟
- [ ] **فحص تضارب قاعدة البيانات:** هل الـ `pageId` موجود في `facebook_pages` لشركة أخرى؟
- [ ] **فحص اشتراك الويب هوك:** هل تم استدعاء `/{pageId}/subscribed_apps` بعد حفظ التوكن؟
- [ ] **فحص كاش التوكنات:** هل تم تفريغ الكاش الداخلي عبر `pageTokenCache.delete(pageId)`؟
