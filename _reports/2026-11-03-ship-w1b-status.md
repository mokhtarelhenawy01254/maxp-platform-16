# SHIP-W1B: تقرير حالة شاشات تشغيل الشحن الداخلية (Status Report)

- **التاريخ:** 2026-11-03
- **المهمة:** تيكت SHIP-W1B — شاشات تشغيل الشحن الداخلية (إنشاء طرد · قائمة · تفاصيل + Timeline · بطاقات الأسعار)
- **المستودع:** `C:\maxp-platform-13` (main)
- **الوكيل المنفّذ:** `antigravity`
- **الحالة:** مكتمل بنجاح (All Gates Passed)

---

## 1. ملخص الإنجاز
تم بناء وتكامل منظومة تشغيل الشحن الداخلي بالكامل (Frontend + Backend + Testing + i18n + Navigation) وفقًا لمواصفات SHIP-W1B والاعتماد الصارم على قاعدة التنقل الأحادية (Rule 0).

### أ) شاشات واجهة المستخدم (`apps/frontend/src/pages/shipping-ops/`)
1. **`ShippingOpsDashboard.tsx`**:
   - 6 بطاقات مؤشرات أداء وتشغيل حية (شحنات اليوم، قيد التوصيل، مسلّمة، مرتجعة، قيد الانتظار، COD المتوقع مقابل المحصّل).
   - جدول لآخر 10 شحنات مع حالاتها وتفاصيلها السريعة.
2. **`NewParcelPage.tsx`**:
   - نموذج إنشاء طرد مستقل كامل: اختيار العميل/التاجر (اختياري)، بيانات المستلم (اسم/موبايل/بديل)، اختيار المحافظة والمدينة، تفاصيل الشحنة (قطع، وزن، وصف، COD، قيمة معلنة، هش/قابل للكسر، يُسمح بالفتح).
   - **حساب السعر لحظياً (Real-Time Quote)**: يستدعي `POST /api/v1/shipping-portal/quote` ويعرض بطاقة السعر والرسوم وتفاصيل الوزن فورياً قبل الحفظ.
3. **`ShippingParcelsList.tsx`**:
   - جدول شحنات متكامل مع فلاتر متعددة (حالة الشحنة، المحافظة، التاجر، نطاق التاريخ، بحث برقم التتبع أو الاسم أو الهاتف).
   - ترقيم صفحات (Pagination) وأزرار انتقال للتفاصيل، ونافذة تأكيد إلغاء الشحنات المعلقة.
4. **`ShippingParcelDetails.tsx`**:
   - بطاقات عرض تفصيلية: المستلم والوجهة، بيانات الطرد والشحنة، الرسوم والمبالغ المالية (COD، السعر، القيمة المعلنة).
   - **الخط الزمني الرأسي (ShipmentEvent Timeline)**: يعرض كافة أحداث الشحنة وتاريخها وملاحظاتها ومستخدميها المسجلين في قاعدة البيانات.
   - زر إجراء إلغاء الشحنة في حال كانت بحالة `PENDING`.
5. **`RateCardsPage.tsx`**:
   - واجهة CRUD متكاملة لبطاقات أسعار العملاء (`ClientRateCard`): اختيار التاجر، المحافظة/عام، السعر الأساسي، الوزن المشمول، سعر الكيلو الزائد، رسوم COD، ورسوم المرتجع.
   - نافذة إنشاء وتعديل وحذف البطاقات.

---

## 2. فحص التنقل (Strict Navigation Rule 0)
- **قائمة واحدة فقط — جانبية**:
  - تم تركيب كافة الراوتس الجديدة تحت `<Layout>` مع نمط `sidebarLayout = classic`.
  - تم إضافة قسم رئيسي جديد باسم **«الشحن» (`shipping-ops`)** في `apps/frontend/src/config/sidebar.ts` يضم الشاشات الجديدة.
  - الظهور مشروط بتفعيل التطبيقات: `internal-courier-fleet` أو `order-shipping-turbo`.
- **فحص Navbar العلوي**:
  - **النتيجة: صفر (0) Navbar أو شريط تنقل علوي جديد.**
  - لا يوجد أي عنصر `<header><nav>` في الشاشات الجديدة.
  - التنقل الداخلي يتم داخل المحتوى والروابط المباشرة والـ Breadcrumbs النظيفة.

---

## 3. التكامل الخلفي (`apps/backend/`)
- تم التأكد من دعم كافة الإندبوينتس في `shippingPortalController.js` و `shippingPortalRoutes.js`:
  - `POST /api/v1/shipping-portal/quote` (حساب التسعير اللحظي)
  - `POST /api/v1/shipping-portal/shipments` (إنشاء طرد مستقل)
  - `GET /api/v1/shipping-portal/shipments` (قائمة الشحنات مع الفلاتر)
  - `GET /api/v1/shipping-portal/shipments/:id` (تفاصيل الشحنة مع الأحداث)
  - `DELETE /api/v1/shipping-portal/shipments/:id/cancel` (إلغاء الشحنة PENDING فقط مع تسجيل حدث CANCELLED)
  - `GET / POST / PUT / DELETE /api/v1/shipping-portal/rate-cards` (CRUD بطاقات الأسعار)
  - `GET /api/v1/shipping-portal/stats` (مؤشرات الداشبورد)
  - `GET /api/v1/shipping-portal/merchants` (قائمة التجار للاختيار)

---

## 4. نتائج بوابات الجودة والاختبارات (Quality Gates)
1. **Frontend Tests (Vitest + JSDOM)**:
   - مسار الاختبار: `src/pages/shipping-ops/__tests__/shippingOps.test.tsx`
   - الاختبار (أ): نموذج إنشاء الطرد يحسب السعر اللحظي (Quote) ويعرض 80 ج.م -> **PASS**
   - الاختبار (ب): جدول الشحنات يعرض 3 صفوف شحنات من الـ Mock -> **PASS**
   - النتيجة: `2 passed / 2 total`.
2. **Backend Tests (Jest)**:
   - مسار الاختبار: `tests/shipping/shippingPortalW1B.test.js` و `tests/shipping/standaloneShipment.test.js`
   - النتيجة: `13 passed / 13 total`.
3. **Linting (oxlint)**:
   - فحص ملفات النطاق: `Found 0 warnings and 0 errors`.
4. **الترجمة واللغات (i18n)**:
   - تم توفير ملفات `shippingOps.json` بالعربية والإنجليزية ودمج 730 قسماً بنجاح (18,141 مفتاح).

---

## 5. حالة النشر (Deployment)
- النشر عبر GitHub Actions / البوابة المركزية `coord.py guard --push`.
- الالتزام التام ببروتوكول عزل التعديلات وعدم لمس أي مسار قديم (`checkout`/`bosta`/`turbo`/`qpExpress`).
