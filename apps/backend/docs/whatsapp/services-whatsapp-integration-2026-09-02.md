# تكامل الواتساب مع قسم وطلبات الخدمات (/admin/services)

**تاريخ التوثيق**: 2026-09-02  
**الحالة**: معتمد ومنفذ  

---

## 1. نظرة عامة
تمت إضافة منظومة تكامل واتساب متكاملة لقسم الخدمات (`/admin/services` و `/admin/service-orders`) وفورم التقديم العام (`/request-service`) لتمكين التواصل المباشر السريع وإرسال الإشعارات التلقائية للعملاء والإدارة عند كل مرحلة من مراحل الخدمة.

---

## 2. المكونات المنفذة

### 2.1 التواصل المباشر السريع من لوحة التحكم
- **الملف**: `apps/frontend/src/pages/admin/ServiceOrdersPage.tsx`
- زر واتساب تفاعلي بجانب كل طلب لفتح محادثة مباشرة (`wa.me`) مع رقم العميل.
- معالجة وتنسيق أرقام الهواتف (تحويل `01...` إلى `201...` الدولية).
- رسالة افتتاحية مجهزة تلقائياً باسم العميل ونوع الخدمة ورقم الطلب.
- تصميم متجاوب للموبايل وفق متطلبات `MOB-015`.

### 2.2 شاشة تأكيد الطلب للعميل
- **الملف**: `apps/frontend/src/pages/ServiceRequestForm.tsx`
- زر "متابعة الطلب عبر واتساب" يظهر للعميل فور تقديم طلبه بنجاح.
- يوجه المحادثة إلى رقم هاتف الشركة أو جلسة الواتساب المتصلة برقم الطلب.

### 2.3 خدمة إشعارات طلبات الخدمات
- **الملف**: `apps/backend/services/whatsapp/serviceOrderNotificationService.js`
- دوال الإرسال:
  1. `notifyOrderCreated`:
     - إشعار تأكيد الطلب للعميل (`SERVICE_ORDER_CREATED`).
     - تنبيه فوري لواتساب الإدارة ببيانات الطلب والمرفقات (`SERVICE_ORDER_ADMIN_ALERT`).
  2. `notifyStatusChanged`:
     - إشعار ببدء التنفيذ (`SERVICE_ORDER_IN_PROGRESS`).
     - إشعار باكتمال الخدمة وجاهزيتها للتسليم (`SERVICE_ORDER_COMPLETED`).
     - إشعار بإلغاء الطلب (`SERVICE_ORDER_CANCELLED`).

### 2.4 القوالب الافتراضية
- **الملف**: `apps/backend/services/whatsapp/templates/defaultTemplates.js`
- إضافة قوالب:
  - `SERVICE_ORDER_CREATED`
  - `SERVICE_ORDER_IN_PROGRESS`
  - `SERVICE_ORDER_COMPLETED`
  - `SERVICE_ORDER_CANCELLED`
  - `SERVICE_ORDER_ADMIN_ALERT`

### 2.5 ربط وحدات التحكم (Controller)
- **الملف**: `apps/backend/controller/serviceOrdersController.js`
- استدعاء غير متزامن (fire-and-forget) للإشعارات في `createPublic` و `updateStatus`.
- إرجاع `companyContactPhone` في استجابة إنشاء الطلب للواجهة.

---

## 3. التحقق والاختبارات
- **اختبارات الوحدة**: `apps/backend/tests/services/serviceOrderNotificationService.test.js` (5/5 اختبارات ناجحة).
- **فحص البنية اللغوية**: `node --check` على كافة الملفات المعدلة بنجاح.
