# TemplateCenter — توحيد صفحات القوالب: Audit وثائقي

**التاريخ:** 2026-08-12
**النطاق:** `/orders/status-templates` ↔ `/customers/customer-notifications`
**الهدف:** صفحة واحدة config-driven باسم TemplateCenter تُدار من مكان واحد وتظهر في عدة أماكن بجزئها الخاص، مع قابلية إضافة نطاقات مستقبلية بدون لمس المكوّن.

---

## 1. الوضع الحالي — مقارنة عالية المستوى

| البند | `/orders/status-templates` | `/customers/customer-notifications` |
|---|---|---|
| الملف | `apps/frontend/src/pages/orders/OrderStatusTemplatesPage.tsx` | `apps/frontend/src/pages/customers/CustomerNotifications.tsx` |
| الحجم | ~3258 سطر | ~1664 سطر |
| مصدر البيانات الأساسي | `GET /order-status/with-templates` | `GET /hr/customer-loyalty/notifications/schedule` + `GET /whatsapp-notifications/templates` |
| CRUD القوالب | `/whatsapp/notifications/templates/*` | `/whatsapp-notifications/templates/*` |
| عمليات ميتا | `/whatsapp-notifications/templates/...` (publish/bind/resubmit/sync/meta-available) | نفسها (نفس الكونترولر فعلياً) |
| تقارير | `GET /whatsapp/notifications/status-report` (تبويب كامل) | غير موجود |
| إعدادات عامة | `/whatsapp/notifications/settings` (تبويب كامل) | غير موجود |
| جدولة إرسال | لا (تفعيل لكل حالة عبر `notifyCustomer`) | نعم (`schedule` + تأخير + قناة لكل حدث) |
| إرسال تجريبي | لا | نعم (شريط أعلى الصفحة) |
| الاختبارات | **7 ملفات** (report/preview/metaBind/internal/grouping/filters/delivery) | **صفر** |

### خلاصة حاسمة
الصفحتان تضربان **نفس الكونترولر** (`whatsappNotificationController.js`) عبر مسارين مختلفين: `/api/v1/whatsapp/notifications/*` (مونت في `whatsappRoutes.js:120`) و `/api/v1/whatsapp-notifications/*` (مونت في `server.js:733`). **لا يوجد توحيد Backend مطلوب** — فقط توحيد مسار أمامي + adapter لكل نطاق.

---

## 2. الفحص مفاهيم مفرد بمفرد (المحور الأساسي للـ audit)

التصنيف: ✅ **مشترك** (يُوحَّد) | 🔶 **خاص بالنطاق** (config) | ⛔ **متعارض** (يحتاج قراراً صريحاً)

### 2.1 صيغة المتغيرات — ⛔ متعارض
| | الأوردرز | العملاء |
|---|---|---|
| الصيغة في المحتوى | `{{customerName}}` (قوسان مزدوجان) | `{customerName}` (قوس واحد) |
| الـ regex | `/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g` | `/\{(\w+)\}/g` |
| المتغيرات | 14 (طلب: customerName, orderNumber, total, tracking...) | 13 (ولاء/كاشباك/جودة: points, cashAmount, tierName, score...) |

**القرار:** المتغيرات نفسها خاصّة بالنطاق (config)، لكن الصيغة يجب أن تُوحَّد على مستوى المحرر عبر **normalizer** يحوّل بين الصيغتين وقت الحفظ/العرض. المعاينة والمتغيرات والإكمال التلقائي من ميتا كلها تعتمد على ده.

### 2.2 مفهوم "التفعيل" — ⛔ متعارض (3 مفاهيم مختلفة)
| المفهوم | الأوردرز | العملاء |
|---|---|---|
| تفعيل الحدث | `notifyCustomer` على الحالة (`PUT /order-status/:id`) | `schedule.enabled` (`PUT /hr/customer-loyalty/notifications/schedule`) |
| تفعيل القالب | `template.isActive` | `template.isActive` ✅ |
| تفعيل عام | `settings.isEnabled` + `settings.orderNotificationsEnabled` | لا يوجد |
| القناة | ضمني (الجلسة الأساسية) | صريح `activeChannel` (AUTO/BAILEYS/META_CLOUD) لكل حدث |

**القرار:** المفتاح الظاهر في الـ row "مفعل/متوقف" يبقى **مربوطاً بوظيفة النطاق** عبر `config.enableToggle` (endpoint + payload)، ولا يُدمج مع `isActive` في الديالوج إطلاقاً.

### 2.3 حقل `category` — ⛔ معنيان مختلفان لنفس الحقل
| | الأوردرز | العملاء |
|---|---|---|
| القيمة | `ORDERS` / `ABANDONED_CART` | `CUSTOMER` / `SYSTEM` / `MARKETING` / `GENERAL` |
| الدلالة | تصنيف صفحة القوالب | تصنيف قالب ميتا عند النشر |
| الفلترة في backend | `category != ORDERS` في `getTemplates` | لا فلترة (يُرجع الكل ويُفلتر client-side) |

**القرار:** `category` في العملاء جزء من **الديالوج** (اختيار المستخدم)، وفي الأوردرز قيمة **مشروطة بالكود**. يُقدَّم كخيار config: `dialogCategoryOptions?` (فارغ للأوردرز، قائمة للعملاء).

### 2.4 الأزرار التفاعلية — 🔶 خاص بالأوردرز
- الأوردرز: حتى 3 أزرار، action يغيّر الحالة (`CONFIRMED/CANCELLED/PROCESSING`) + `hasButtons` + `parseTemplateButtons`.
- العملاء: لا توجد.
- **القرار:** `config.enableButtons`. عند فتح قالب ميتا مربوط، الأزرار تأتي من ميتا (سلوك قائم بالفعل في الأوردرز).

### 2.5 هيدر الصورة — 🔶 خاص (لكن بفرع إضافي)
| | الأوردرز | العملاء |
|---|---|---|
| ثابت (رفع صورة) | نعم | نعم ✅ |
| `headerUsesOrderProduct` (صورة منتج وقت الإرسال) | نعم | لا |

**القرار:** `config.enableHeaderProductImage` + `config.headerExplainers` (النص التوضيحي يختلف حسب النطاق).

### 2.6 ربط ميتا — ⛔ سلوكان متعارضان
| | الأوردرز | العملاء |
|---|---|---|
| الـ multi-bind | مسموح + رسالة "مربوط حالياً بكمان: ..." | لا |
| الـ filter في قائمة ميتا | يعرض الكل مع وسوم الربط | يفلتر `boundToLocalTemplateId` |
| وضع "switch" (تغيير معتمد دون تعديل المحتوى) | موجود | غير موجود |
| auto-fill من ميتا | `META_TO_LOCAL_DEFAULT_ORDER` (متغيرات الطلب) | لا يوجد |

**القرار:** وضع الـ switch و الـ multi-bind يُفعَّلان بـ `config.enableMetaSwitch` + `config.enableMetaMultiBind`. الـ `META_TO_LOCAL_DEFAULT_ORDER` يصبح جزءاً من config (قائمة متغيرات لكل نطاق).

### 2.7 الجدولة — 🔶 خاص بالعملاء
- `GET/PUT /hr/customer-loyalty/notifications/schedule`: لكل حدث `enabled / activeChannel / delayValue / delayUnit`.
- **القرار:** `config.enableSchedule` — يفتح تبويب "جدول الإشعارات" ويجلب الـ schedule في نفس الـ boot.

### 2.8 الإعدادات والتقارير — 🔶 خاصان بالأوردرز
- الإعدادات (`settings.isEnabled, defaultSessionId, quietHours, rateLimit, stickySession`) و التقارير (`status-report` + CSV) موجودان فقط في الأوردرز.
- **القرار:** `config.enableReports` + `config.enableSettings`. التقارير تعتمد على `config.eventLabelResolver` لترجمة eventType → اسم عرض.

### 2.9 الإرسال التجريبي — 🔶 خاص بالعملاء
- شريط `phone + event → POST /whatsapp-notifications/test`.
- **القرار:** `config.enableTestSender` + `config.testEventsSource` (من الـ schedules).

### 2.10 التجميع/الفلترة/البحث/الترتيب — ✅ مشترك
كلها في صفحة الأوردرز ومُطلوبة لأي نطاق. تُستخرج كما هي.

### 2.11 الحقول المخزنة للقالب — 🔶 تتباين في الاتساع
| الحقل | الأوردرز | العملاء |
|---|---|---|
| id, name, content, eventType, isActive, channel, headerFormat, headerMediaHandle, metaTemplateName, metaTemplateStatus | ✅ | ✅ |
| buttons, hasButtons, headerUsesOrderProduct | ✅ | — |
| variables (مخزنة string), isDefault, metaTemplateId | — | ✅ |

**القرار:** النموذج الموحد = **اتحاد** الحقول، مع تجاهل الحقول غير المدعومة في النطاق عند الحفظ.

### 2.12 تسمية/شكل الواجهة — ✅ مشترك تقريباً
- كارتا slot (عادي/ميتا)، ديالوج المحرر، معاينة فقاعة واتساب، جدول تطابق المتغيرات `{{1}}←var`، حامل جلسة ميتا — متطابقان في الجوهر (نسخة الأوردرز أغنى وتُعتمد).

---

## 3. المخاطر الخفية المؤكدة (خريطة)

| # | الخطر | الشدة | التعامل |
|---|---|---|---|
| 1 | صيغة متغيرات مختلفة | عالية | normalizer لكل نطاق |
| 2 | 3 مفاهيم تفعيل | عالية | `config.enableToggle` يعزل النطاق |
| 3 | `category` بدلالتين | متوسطة | `config.dialogCategoryOptions` |
| 4 | خريطة auto-fill من ميتا | متوسطة | `config.metaToLocalDefaultOrder` |
| 5 | فصل implicit في `getTemplates` | متوسطة | قريباً: فلترة server-side بـ `scope/category`؛ حالياً الترشيح client-side باحتراس |
| 6 | RBAC (permissions) | ✅ **تحقّق 2026-08-12** — الـ backend يتحقق فقط من `authenticateToken` (لا gate على مستوى الـ route). الـ gate في الـ sidebar فقط: `/orders/status-templates` عليه `requiredPermissions: ['orders.whatsapp-notifications.view']`، و `/customers/customer-notifications` **بدون أي permission** (مرئي لكل المستخدمين). | إبقاء كل بند sidebar مستقل بـ `requiredPermissions` خاص به (التحكم في الرؤية لا يتغير مع مشاركة المكوّن). النطاقات المستقبلية تقرر permission لها لحظة إضافتها |
| 7 | حقول مخزنة تتباين | منخفضة | تجاهل الحقول غير المدعومة |
| 8 | العملاء بلا tests | عالية | إضافة tests قبل التحويل |
| 9 | منطق ديالوج خفي (create/edit/switch، originalMetaTemplateName، dialogDirtyRef) | متوسطة | الحفاظ عليه حرفياً عند النقل |
| 10 | وضع switch المفقود في العملاء | منخفضة | يُغلق بالكونفيج |
| 11 | حجم chunk | متوسطة | React.lazy على مستوى الديالوج/التبويبات |
| 12 | الـ RBAC بين النطاقات | ✅ **مغلقة** — انظر #6: توحيد المكوّن لا يغيّر رؤية الـ sidebar لأن البنود منفصلة | — |

---

## 4. مسودة عقد الكونفيج `TemplateScopeConfig`

```ts
interface TemplateScopeConfig {
  scope: "orders" | "customers";               // id فريد
  titleKey: string;
  descriptionKey: string;
  eventGroups: Record<string, string[]>;        // تبويب → قائمة eventType
  variables: { var: string; desc: string }[];   // للمحرر والمعاينة
  metaToLocalDefaultOrder: string[];            // {{1}} → var
  eventLabelResolver: (eventType: string) => string;
  endpoints: {
    list: () => Promise<ScopeEventRow[]>;
    toggle: (row) => Promise<void>;             // تفعيل الحدث
    templateCrudBase: string;                   // /whatsapp-notifications/templates
    testSend?: (phone, eventType) => Promise<void>;
    schedule?: { get, put };
    settings?: { get, put };
    report?: { get };
  };
  tabs: { key; labelKey; component?: "list" | "schedule" | "reports" | "settings" }[];
  features: {
    enableButtons: boolean;
    enableHeaderProductImage: boolean;
    enableMetaSwitch: boolean;
    enableMetaMultiBind: boolean;
    enableTestSender: boolean;
    enableSchedule: boolean;
    enableReports: boolean;
    enableSettings: boolean;
    dialogCategoryOptions?: { value; label }[];
  };
}
```

---

## 5. بوابات القبول (Acceptance Gates)

1. **السلوكي:** الـ 7 tests الخاصة بـ `OrderStatusTemplatesPage` تبقى خضراء بدون تعديل يغيّر ناتجها (يُسمح فقط بتعديل الاستيراد/البنية).
2. **المرئي:** مقارنة يدوية screenshot قبل/بعد لكل تبويب من تبويبات الأوردرز.
3. **الوظيفي:** سيناريو إنشاء/تعديل/ربط/إعادة نشر قالب ميتا على كلا النطاقين يعمل بنفس سلوك اليوم.
4. **العزل:** لا قالب أوردرز يظهر في نطاق العملاء والعكس.
5. **الأداء:** chunk الصفحة الموحدة يظل split لازي للتسجيل.
6. **الأمان:** RBAC gates تُفحص لكل route بعد التحويل.

---

## 6. ترتيب التنفيذ الموصى به

1. **(تم)** الـ audit الحالي.
2. **Phase 0:** توحيد مسار الـ API الأمامي + الحفاظ على alias.
3. **Phase 1:** استخراج `TemplateCenter` + مكوناته في `src/pages/templates/` بدون لمس الصفحتين.
4. **Phase 2:** تحويل نطاق الأوردرز (أعلى مخاطرة) مع الـ tests حكماً.
5. **Phase 3:** إضافة tests لنطاق العملاء ثم تحويله (يكسب grouping/filters/sort فوراً).
6. **Phase 4:** نطاقات جديدة = ملف config + سطر route.
