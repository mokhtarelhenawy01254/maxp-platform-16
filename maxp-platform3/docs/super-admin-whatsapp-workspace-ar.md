# قسم واتساب في السوبر أدمن

تم إضافة مساحة إدارة جديدة لواتساب داخل السوبر أدمن بهدف متابعة الشركات والتحكم في الإشعارات من مستوى المنصة.

## الصفحات الجديدة

- `/super-admin/whatsapp`
  نظرة عامة على حالة واتساب عبر المنصة.

- `/super-admin/whatsapp/companies`
  قائمة الشركات مع حالة الجلسات، الإشعارات، والقوالب.

- `/super-admin/whatsapp/companies/:companyId`
  مساحة مختصرة للشركة قبل الدخول للتفاصيل.

- `/super-admin/whatsapp/companies/:companyId/settings`
  إعادة استخدام شاشة إعدادات واتساب الحالية لكن في سياق شركة يحدده السوبر أدمن.

- `/super-admin/whatsapp/companies/:companyId/notifications`
  إدارة رسائل تسجيل الشركات والاشتراك الخاصة بالسوبر أدمن فقط داخل سياق الشركة.

- `/super-admin/whatsapp/companies/:companyId/analytics`
  تحليلات الإرسال والسجل الخاص بالشركة.

- `/super-admin/whatsapp/logs`
  سجل onboarding مركزي عبر جميع الشركات لأحداث تسجيل الشركات والاشتراك فقط.

- `/super-admin/whatsapp/automations`
  كتالوج أحداث المنصة فقط من منظور السوبر أدمن، ويعرض الآن أحداث التسجيل والاشتراكات الخاصة برحلة الشركة:
  - `NEW_SIGNUP_WELCOME`
  - `NEW_SIGNUP_ADMIN_ALERT`
  - `SUBSCRIPTION_CREATED`
  - `SUBSCRIPTION_RENEWED`
  - `SUBSCRIPTION_CANCELLED`

## مسار ربط السيشن

- المسار المباشر لربط Session شركة من السوبر أدمن:
  - `/super-admin/whatsapp/companies/:companyId/settings?tab=sessions`
- وتمت إضافة زر `ربط السيشن` بشكل صريح في:
  - صفحة الشركات
  - مساحة الشركة
  - شاشة الأتمتة عند اختيار شركة

## حدود شاشة الأتمتة

- شاشة `/super-admin/whatsapp/automations` لم تعد تعرض أتمتة عملاء الموقع أو حملات الشركات.
- إشعارات العملاء، الطلبات، النشرات، البرودكاست، والجورني التسويقي تبقى داخل مساحة الشركة أو الأدوات المخصصة لها.
- هذا يجعل شاشة السوبر أدمن منصةً لمراجعة:
  - جاهزية الربط
  - ملكية أتمتة الانضمام والاشتراك
  - القفز إلى مساحة الشركة عند الحاجة

## حدود شاشة الإشعارات والسجل

- شاشة `/super-admin/whatsapp/companies/:companyId/notifications` في وضع السوبر أدمن لم تعد تعرض:
  - تبويبات الطلبات
  - المنتجات
  - العربة المتروكة
  - التسويق
  - الموارد البشرية
- وهي الآن محصورة في:
  - `تسجيل الشركات`
  - `قوالب التسجيل`
- نافذة `اختبار الإرسال` داخل هذا المسار تعرض فقط أحداث السوبر أدمن:
  - `NEW_SIGNUP_WELCOME`
  - `NEW_SIGNUP_ADMIN_ALERT`
  - `SUBSCRIPTION_CREATED`
  - `SUBSCRIPTION_RENEWED`
  - `SUBSCRIPTION_CANCELLED`
- شاشة `/super-admin/whatsapp/logs` أصبحت تُفلتر backend + frontend على نفس النطاق، لذلك لا تظهر فيها أحداث مثل `ORDER_CREATED` أو بقية إشعارات تشغيل المتجر.

## الباك إند

تم إضافة endpoints خاصة بالسوبر أدمن تحت:

- `/api/v1/admin/whatsapp/overview`
- `/api/v1/admin/whatsapp/companies`
- `/api/v1/admin/whatsapp/companies/:companyId/summary`
- `/api/v1/admin/whatsapp/logs`
- `/api/v1/admin/whatsapp/automation-catalog`

## ملاحظة مهمة

إعدادات واتساب الحالية للشركات لم يُعاد بناؤها من الصفر، بل تم إعادة استخدامها داخل السوبر أدمن عن طريق تمرير `companyId` على مستوى الطلبات، مما يسمح للسوبر أدمن بإدارة شركة محددة من نفس الواجهات الحالية.

## التوسعة التنفيذية الجديدة

تم الآن ربط المحرك الحالي فعليًا مع هذه التدفقات:

- تسجيل شركة/حساب جديد من `authController.register`
- إنشاء الاشتراك أو ترقيته من `billingService` و`platformSubscriptionController`
- إنشاء/تجديد/إلغاء الاشتراكات الإدارية من `subscriptionRoutes`
- تسجيل عميل عام أو Lead من `publicCustomerRoutes`
  - `POST /api/v1/public/customers/lead-capture`
- تسجيل عضو جديد من `membershipController` مع دعم الهاتف/الإيميل عند توفرهما
- الاشتراك في النشرة من endpoint عام جديد:
  - `POST /api/v1/store-pages/:companyId/newsletter-subscribe`

## تحسينات owner-facing

تم تعديل طبقة الإرسال بحيث تصبح مناسبة للتعامل مع أصحاب الشركات بشكل أوضح:

- أحداث التسجيل والاشتراكات والمزايا والنشرة أصبحت خاضعة لتحكمات مستقلة داخل شاشة الشركة نفسها تحت تبويب:
  - `رحلة الشركة`
- تم تضييق الاستهداف الإداري ليعتمد على قيادة الشركة (`OWNER / COMPANY_ADMIN`) ثم فرق التشغيل فقط عند الحاجة، بدل الإرسال الواسع إلى أي رقم عام للشركة.
- أحداث الاشتراكات owner-facing (`SUBSCRIPTION_*`) تستخدم مرسل المنصة عند الحاجة بدل الاعتماد على Session الشركة نفسها.
- أحداث التنبيهات الإدارية مثل `NEW_SIGNUP_ADMIN_ALERT` واشتراكات النشرة أصبحت تدعم fallback إلى مرسل المنصة إذا لم تتوفر Session متصلة للشركة.
- شاشة الشركة نفسها أصبحت تعرض هذه الأحداث في:
  - اختبار الإرسال
  - إنشاء/تعديل القوالب

## مستلمو تنبيه الإدارة يدويًا

- داخل شاشة:
  - `/super-admin/whatsapp/companies/:companyId/notifications?tab=company`
  - أو شاشة الشركة نفسها على نفس تبويب `رحلة الشركة`
- تمت إضافة حقل مباشر باسم:
  - `أرقام واتساب مستلمي تنبيه الإدارة`
- ويمكن الآن كتابة رقم واحد أو عدة أرقام، كل رقم في سطر أو مفصول بفاصلة.
- تمت إضافة وضع توجيه واضح لتنبيهات الإدارة:
  - `AUTO`
    يستخدم الأرقام المكتوبة أولًا، وإذا كانت فارغة يرجع إلى مستخدمي النظام المناسبين.
  - `MANUAL_ONLY`
    يرسل فقط إلى الأرقام المكتوبة.
  - `MANUAL_PLUS_AUTO`
    يدمج الأرقام المكتوبة مع المستخدمين المناسبين مع حذف التكرار.
- تنبيهات المنصة مثل:
  - تسجيل شركة جديدة
  - Lead مهتم بالشحن
  - تنبيه الإدارة الخاص بالاشتراك
  أصبحت تقرأ هذه الأرقام من إعدادات المنصة نفسها عند استخدام نطاق السوبر أدمن.

## مراجعة الواجهة

- تم عمل pass بصري على:
  - `/super-admin/whatsapp/automations`
  - `/super-admin/whatsapp/companies`
  - `/super-admin/whatsapp/companies/:companyId/settings?tab=sessions`
  - `/super-admin/whatsapp/companies/:companyId/notifications?tab=company`
- تم تحسين الوضع الليلي عبر توحيد السطوح theme-aware داخل شاشات:
  - `WhatsAppSettings`
  - `WhatsAppNotifications`
  - `WhatsAppAnalytics`
- كما تم التأكد من أن صفحات السوبر أدمن الرئيسية لواتساب تتحول إلى بطاقات أو تدفق مناسب على viewport موبايل.

ملحوظة تشغيلية:

- الإرسال يظل معتمدًا على وجود Session فعّالة للشركة المرسلة أو لمرسل المنصة في الأحداث owner-facing التي تستخدم fallback.
- أحداث العملاء العادية ما زالت تعتمد على Session الشركة نفسها، بينما أحداث أصحاب الشركات والاشتراكات يمكنها الاستفادة من مرسل المنصة.
