# سيناريوهات شحن وتسوية التاجر - 2026-05-03

## الهدف

التاجر لا يحتاج أداة طلبات منفصلة. نفس طلبات النظام تتحول إلى تكليف تنفيذ عبر `MerchantOrder`، ونفس حركة الشحن محفوظة في `Shipment`، ونفس مستحقات التاجر محفوظة أو يمكن مقارنتها عبر `Commission`.

## ما تم تنفيذه

- إضافة ملخص تشغيل للتاجر من `GET /api/v1/merchant-portal/operations-summary`.
- الملخص يحسب من نفس بيانات النظام:
  - الطلبات المخصصة للتاجر.
  - القطع تحت التجهيز.
  - القطع في الشحن.
  - القطع التي تم تسليمها.
  - القطع غير المكتملة مثل فشل التسليم أو الإلغاء أو المرتجع.
  - القطع المستحقة للدفع، وهي القطع المسلمة.
  - المبلغ المتوقع للتاجر على الطلبات النشطة.
  - المبلغ المستحق بعد التسليم.
  - قيمة الطلبات الموجودة في الشحن.
  - تكلفة الشحن المسجلة على الشحنات.
  - العمولات/المستحقات المؤكدة أو المعلقة أو المدفوعة عند وجود سجلات `Commission`.
- إظهار التقرير داخل صفحة تجهيز الطلبات الحالية `/orders/preparation` للتاجر فقط.
- إصلاح عرض مخزون التاجر: المنتج بدون كمية حالية يظهر على مخزن التاجر الحقيقي بدل مخزن افتراضي باسم `لم يتم التخصيص`.
- إصلاح نافذة تحديث المخزون في صفحة `/inventory` لتستخدم المخازن الحقيقية القادمة من API بدل خيارات ثابتة.

## قاعدة الحساب الحالية

- `DELIVERED` أو ما يعادلها: القطع تدخل في `قطع مستحقة` و`مستحق بعد التسليم`.
- `FULFILLED` أو `SHIPPED` أو `IN_TRANSIT` أو ما يعادلها: القطع تدخل في `في الشحن` و`قيمة في الشحن`.
- `FAILED` أو `DELIVERY_FAILED` أو `RETURNED` أو `CANCELLED`: القطع تدخل في `لم تكتمل` ولا تدخل في المستحق.
- أي حالة أخرى تعتبر `تحت التجهيز`.

## ملفات التنفيذ

- Backend:
  - `backend/services/merchantService.js`
  - `backend/routes/merchantPortalRoutes.js`
  - `backend/controller/inventoryController.js`
  - `backend/tests/services/merchantService.test.js`
- Frontend:
  - `frontend/src/pages/orders/PreparationQueue.tsx`
  - `frontend/src/pages/orders/preparation/components/MerchantOperationsSummary.tsx`
  - `frontend/src/pages/inventory/Inventory.tsx`

