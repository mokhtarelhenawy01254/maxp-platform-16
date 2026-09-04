# إصلاح تسريب الطلبات المعلّقة (Billing Hold) في جدول الطلبات البسيطة والإحصائيات

**التاريخ:** 2026-09-04  
**المسارات والملفات المعدلة:**  
- `apps/backend/routes/orders.js`
- `apps/backend/services/simpleOrderService.js`

## المشكلة
عند تعليق الطلبات بسبب انخفاض رصيد المحفظة أو انتهاء الاشتراك، كان البانر العلوي ومودال "مزيد المعلومات" يعرضان الطلبات المعلقة بصورة مقنّعة (`D***`, `012***66`).
لكن في جدول الطلبات السفلي بمسار `GET /orders-new/simple`:
1. كانت الطلبات تظهر كاملة ببيانات العميل (الاسم ورقم الهاتف) كصفوف طلبات زوار (`GuestOrder`).
2. عداد الباجينيشن كان يحسب الإجمالي بدونها، فيظهر مثلاً `عرض 1 إلى 1 من أصل 1 طلب` بينما يعرض الجدول 4 صفوف (الطلبات المعلقة المسربة + السلة).
3. إحصائيات `simpleOrderService.getSimpleStats` كانت تحتسب الطلبات المعلقة في إجمالي الإيرادات والطلبات ومعدلات القيم.
4. كان من الممكن جلب بيانات الطلب المعلق كاملاً عبر `GET /simple/:orderNumber`.

## السبب الجذري
1. في مسار `GET /orders-new/simple`:
   - مصفوفة `shadowedGuestOrderNumberSet` كانت تحتفظ بأرقام الطلبات بالأحرف الكبيرة الأصلية (`ORD-854162-050`).
   - عند دمجها في `regularOrderNumberSet` وفلترة `filteredGuestOrders`، كانت المقارنة تتم باستخدام `normalizeOrderKey` الذي يحول الرقم لأحرف صغيرة (`ord-854162-050`).
   - اختلاف حالة الأحرف جعل `regularOrderNumberSet.has(key)` ترجع `false` دائماً، فنجت طلبات الزوار التوأم وتسرّبت إلى الجدول.
2. غياب شرط `billingHoldAt: null` في استعلام `getSimpleStats`.
3. عدم فحص `billingHoldAt` في مسار `GET /simple/:orderNumber`.

## الحل المطبق
1. **توحيد حالة الأحرف**:
   - تحويل عناصر `shadowedGuestOrderNumberSet` إلى أحرف صغيرة موحدة عبر `normalizeOrderKey`.
   - توحيد الأحرف عند دمج `shadowedGuestOrderNumberSet` في `regularOrderNumberSet`.
2. **حماية إضافية للطلبات المعلّقة**:
   - استعلام `twinRows` يجلب الآن حقل `billingHoldAt`.
   - استبعاد أي طلب زائر لديه توأم على `billingHoldAt != null` أو يحتوي في الـ metadata على `billingHold`.
3. **حظر تفاصيل الطلب المعلّق**:
   - مسار `GET /simple/:orderNumber` يرجع الآن `402 Payment Required` مع كود `BILLING_HOLD` عند محاولة طلب تفاصيل طلب معلّق قبل شحن الرصيد.
4. **تنقية الإحصائيات**:
   - إضافة `billingHoldAt: null` في `simpleOrderService.getSimpleStats` لضمان عدم احتساب الطلبات المعلّقة قبل تحصيلها.
