# Facebook Messenger Order Journey Scenarios - 2026-05-07

الملف ده يضيف مكتبة كبيرة من سيناريوهات اختبار Messenger مركزة على رحلة الأوردر الكاملة، مع هدف واضح:

- تنويع اللغة بعيدًا عن الكلمات التقليدية المتكررة
- اختبار جمع البيانات على كذا شكل
- اختبار الذاكرة والتعديل قبل التأكيد
- التأكد إن الرحلة توصل لإنشاء الأوردر نفسه

## الموجود الآن

- مكتبة قابلة للتشغيل: [backend/scripts/data/orderJourneyScenarioLibrary.js](C:/Users/H2M/Desktop/Project/max_p_new/backend/scripts/data/orderJourneyScenarioLibrary.js)
- Runner مخصص: [backend/scripts/run-order-journey-scenarios.js](C:/Users/H2M/Desktop/Project/max_p_new/backend/scripts/run-order-journey-scenarios.js)

## الحجم

- إجمالي السيناريوهات: `50`
- التوليد الحالي مبني على:
  - `10` أساليب افتتاح مختلفة لطلب المنتج
  - `5` أنماط مختلفة لجمع البيانات والتأكيد

## لماذا هذه المكتبة مهمة

السيناريوهات الجديدة لا تعتمد فقط على عبارات مثل:

- `عايز أطلب`
- `أكد الأوردر`
- `الاسم ورقم الموبايل`

لكن تستخدم تعبيرات بديلة مثل:

- `احجزلي`
- `هامشي على`
- `استقريت على`
- `دوّنلي`
- `ثبّتلي`
- `خلّصلي`
- `توكل وسجله`
- `اعتمد الطلب`
- `ثبّت النسخة الأخيرة`

وده مفيد لزيادة تغطية البيانات التدريبية التشغيلية حول:

- intent detection
- conversation summary persistence
- order confirmation interpretation
- create-order gating

## أنماط الرحلة المغطاة

1. بيانات مجمعة في رسالة واحدة
2. بيانات متقطعة على عدة رسائل
3. العنوان قبل الهوية
4. اسم المستلم في الآخر
5. تعديل اللون/المقاس قبل التأكيد النهائي

## التشغيل

الوضع الافتراضي آمن:

```bash
node backend/scripts/run-order-journey-scenarios.js
```

هذا يشغل `dry-run` فقط ويصدر تقريرًا بالسيناريوهات بدون إنشاء أوردرات.

للتنفيذ الحقيقي:

```bash
set ORDER_JOURNEY_MODE=execute
set ORDER_JOURNEY_ALLOW_ORDER_CREATE=1
node backend/scripts/run-order-journey-scenarios.js
```

ويمكن تقليل العدد أثناء التحقق:

```bash
set ORDER_JOURNEY_MODE=execute
set ORDER_JOURNEY_ALLOW_ORDER_CREATE=1
set ORDER_JOURNEY_LIMIT=5
node backend/scripts/run-order-journey-scenarios.js
```

## ملاحظات

- الـ runner يجلب منتجًا حقيقيًا من الشركة ويحاول أيضًا استخدام `Color` و`Size` حقيقيين من الـ variants.
- لو لم يجد variant data كافية، يستخدم fallback آمن مثل:
  - `أسود / أبيض`
  - `42 / 43`
- كل السيناريوهات في هذه المكتبة مصممة بحيث `expectOrderCreated=true` عند التشغيل الفعلي.
