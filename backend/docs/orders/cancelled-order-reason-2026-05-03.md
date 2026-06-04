# سبب إلغاء الطلب - 2026-05-03

## المطلوب

عند اختيار حالة `ملغي` للطلب، يجب تسجيل سبب الإلغاء قبل تنفيذ تغيير الحالة.

## السلوك

- صفحة تفاصيل الطلب تفتح نافذة سبب الإلغاء عند اختيار `ملغي` من قائمة الحالة.
- العرض السريع للطلب يطلب سبب الإلغاء قبل إرسال التحديث.
- التحديث الجماعي للطلبات يطلب سبب الإلغاء قبل إرسال طلب الإلغاء الجماعي.
- مساحة عمل الموظف `/orders/workspace` تطلب سبب الإلغاء عند ضغط زر `إلغاء`.
- طابور التأكيد داخل مركز التأكيد والمتابعة يملك زر `إلغاء`، ويحوّل الطلب لنفس حالة `CANCELLED` المستخدمة في الطلبات.
- صفحة تفاصيل الطلب تعرض سبب الإلغاء الأخير في بطاقة واضحة عندما تكون حالة الطلب `CANCELLED`.
- سجل النشاط يعرض السبب داخل حدث تغيير الحالة.

## الباك إند

المسارات التالية ترفض الإلغاء بدون سبب:

- `POST /api/v1/orders-new/simple/:orderNumber/status`
- `PATCH /api/v1/orders-new/:orderNumber/status`
- `POST /api/v1/orders-new/bulk/status`
- `POST /api/v1/agent-workspace/orders/:id/quick-action`

يتم استخدام الحقول الموجودة بالفعل:

- `OrderStatusHistory.reason` / `OrderStatusHistory.notes`
- `Order.notes`
- `GuestOrder.notes`

## التحقق

- Backend syntax: `npm run check:syntax`
- Frontend i18n: `npm run i18n:merge`
- Frontend focused test: `npm test -- src/pages/orders/components/OrderActivityLog.test.tsx --runInBand`
- Backend focused test: `npm test -- --testPathPattern=preparationQueueRoutes.test.js -t "requires a reason"`
- Backend workspace focused test: `npm test -- --testPathPattern=agentWorkspaceController.test.js`
