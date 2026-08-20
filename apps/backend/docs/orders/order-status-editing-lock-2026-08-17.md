# قفل تعديل بيانات الأوردر لكل حالة (Per-Status Order Data Edit Lock)

## ملخص الميزة

في صفحة **الإعدادات ← الطلبات ← حالات الطلب** (`/settings/orders?tab=status`)،
تظهر تحت **كل حالة** زر **"مسموح بالتعديل" / "غير مسموح بالتعديل"**.

- الحالة الجديدة تُضاف تلقائياً والزر يظهر ليها افتراضياً **"مسموح بالتعديل"**.
- عند اختيار **"غير مسموح بالتعديل"** لحالة معيّنة: أي طلب موجود حالياً في هذه
  الحالة **لا يستطيع أحد تعديل بياناته** (السعر، المنتجات، الكميات، بيانات العميل،
  العنوان، الملاحظات، الميتا... إلخ)، ويُرفض أي محاولة تعديل برسالة عربية واضحة
  وكود `403` حتى يتم فك القفل من صفحة الإعدادات.

> ملاحظة: الزر يتحكم في **تعديل بيانات/محتوى الأوردر** وليس في تغيير الحالة نفسها.

## التخزين

- الحقل: `orderStatusConfig.allowStatusEdit` (Boolean، الافتراضي `true`).
- يُضاف بـ `prisma db push` (يتم تلقائياً أثناء الديبلوي).
- المزامنة: عند التحديث/الإنشاء تُزامن الحالة إلى `orderStatusDefinition` بحيث
  يُضبط `lockAfterEntry = true` عندما تكون `allowStatusEdit = false`.

## النطاق (تغطية الحماية)

الحماية على مستوى الباك-إند عبر `apps/backend/utils/orderStatusLock.js`
(البحث بالحالة الحالية للطلب بالكود أو بـ `mapsToSystem` للحالات المخصصة)
على **كل مسارات تعديل بيانات الأوردر**:

| المسار | الوصف |
|---|---|
| `services/orderDetailsUpdateService.updateOrderDetails` | تعديل بيانات الأوردر (اسم/تليفون/عنوان/ملاحظات/ميتا) — يدعم طلبات النظام والضيوف |
| `routes/orders.js` `PUT /simple/:orderNumber/items` | تعديل المنتجات/الكميات/الأسعار/الإجمالي |
| `routes/orders.js` `POST /simple/:orderNumber/notes` | إضافة ملاحظة |
| `routes/orders.js` `PATCH /simple/notes/:noteId` | تعديل ملاحظة |
| `routes/orders.js` `DELETE /simple/notes/:noteId` | حذف ملاحظة |
| `routes/orders.js` `POST /simple/:orderNumber/schedule` | التأجيل (تاريخ التسليم/ملاحظات الجدولة) |
| `routes/enhancedOrders.js` `PATCH /:id/validation` | تحديث التحقق/الملاحظات |
| `services/easyOrdersImportService.js` | مزامنة Easy Orders (يتخطى تحديث الأوردر المقفول) |
| `services/wooCommerceImportService.js` | مزامنة WooCommerce (يتخطى تحديث الأوردر المقفول) |

**تغيير الحالة نفسها غير مقفول** — يبقى شغالاً كما هو.

## الاختبارات

- `tests/utils/orderStatusLock.test.js` — تغطية وحدة القفل لكل حالة (9 حالات).
