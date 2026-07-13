# تنظيف خصوصية طلبات الأفليت وإخفاء مزايا الشركة

## الهدف

الأفليت لا يجب أن يرى تفاصيل تشغيل داخلية تخص الشركة مثل اسم شركة الشحن، رقم التتبع، أو رسائل تفعيل تطبيقات الشركة مثل "شحن Turbo الذكي".

## ما تم

- إصلاح تفاصيل طلب الأفليت حتى لا تفشل بسبب علاقة تذاكر تعتمد على عمود غير موجود محليًا في جدول `SupportTicket`.
- تنظيف بيانات التنفيذ الراجعة للأفليت:
  - لا يتم إرجاع `trackingNumber`.
  - لا يتم إرجاع `shippingCompany`.
  - لا يتم إرجاع `carrierType` أو اسم التاجر المنفذ.
  - يظهر للأفليت فقط أن التنفيذ تحت متابعة "الشركة" مع حالة الطلب/الشحنة.
- منع صفحات الأفليت من استدعاء واجهات Turbo الخاصة بالشركة في صفحة إنشاء طلب للعميل.
- جعل بوابات التطبيقات المحمية ترجع رسالة صلاحية عامة للأفليت بدل رسالة تفعيل تطبيق محدد.
- إبقاء فتح تيكت من طلب الأفليت متاحًا عن طريق تسجيل ملاحظة على الطلب وإرجاع تيكت خفيف للواجهة بدون الاعتماد على `SupportTicket.orderId`.

## التحقق المحلي

- `node --check backend/services/affiliateService.js`
- `node --check backend/middleware/checkAppAccess.js`
- `npx eslint src/pages/affiliates/AffiliateOrderDetails.tsx src/pages/admin/ManualOrder/components/CheckoutColumn.tsx --max-warnings=0`
- API كأفليت 10:
  - `GET /api/v1/affiliates/orders/cmoqkqx0o00kuvplcpme9q8bo` رجع 200.
  - الاستجابة لا تحتوي على `trackingNumber` أو `shippingCompany` أو `carrierType`.
  - `GET /api/v1/turbo/governments` رجع 403 برسالة عامة: "غير مسموح لك باستخدام هذه الأداة".
  - فتح تيكت على الطلب أنشأ ملاحظة طلب، والطلب رجع يعرض التيكت بعد إعادة التحميل.
- المتصفح:
  - `/affiliates/orders/cmoqkqx0o00kuvplcpme9q8bo` فتح بدون خطأ 500.
  - لا يظهر تحذير "هذه الميزة تتطلب تفعيل: شحن Turbo الذكي".
  - لا تظهر "شركة الشحن" أو "رقم التتبع".
  - `/affiliates/orders/create` يفتح بدون Turbo console errors.
