# تحسين مطابقة صور المنتجات في CoreAIAgent

## الهدف

هذه الوثيقة تشرح منطق مطابقة صورة العميل مع كتالوج المنتجات بعد إصلاح مشكلة الـ false positives في المنتجات المتشابهة شكليًا.

الهدف العملي:
- تحليل صورة العميل وصور المنتجات بنفس المسار
- تقليل الاعتماد على وصف عام مثل `shoe + black + white`
- اختيار المنتج الأعلى تشابهًا على مستوى المنتج نفسه، وليس أول صورة مرشحة تعطي ثقة عالية

## المشكلة الأصلية

كان المسار القديم يمر تقريبًا بهذا الشكل:

1. تحليل صورة العميل
2. تكوين shortlist من الكتالوج
3. مقارنة تحليل صورة العميل بتحليل صور المرشحين
4. إذا ظهر مرشح بثقة عالية يتم عمل grounding مباشرة

المشكلة أن هذه الخطوة كانت قد تُرجع منتجًا مشابهًا جدًا في الفئة واللون، لكنه ليس نفس المنتج الحقيقي. في حالة Swan ظهر false positive على `Platform Sneakers` لأن التحليل العام كان كافيًا لإعطاء ثقة عالية، قبل أن يُستكمل ترتيب بصري أدق.

## ما الذي تغير

### 1. تحليل بصري أدق للصورة

`analyzeCustomerProductImage` لم يعد يكتفي بالنوع العام والألوان فقط. الآن يحاول استخراج:

- `closure_type`
- `sole_type`
- `shaft_height`
- `material_keywords`
- `pattern_keywords`
- `distinctive_features`
- `design_details`

وهذا يجعل المقارنة تستطيع التفريق بين منتجات متشابهة مثل:
- لِزق vs رباط
- low top vs mid/high top
- نعل عادي vs platform/chunky
- شريطين / خطوط / heel counter / panels

### 2. مقارنة تحليلية لا تظلم الحقول الناقصة

`compareImageAnalyses` أصبح يحسب الثقة على أساس weighted average ديناميكي:

- الحقول الغائبة عند الطرفين لا تخصم من النتيجة
- الحقول الدقيقة المتوفرة عند الطرفين تعطي وزنًا أعلى
- يوجد penalty عند وجود تعارض صريح في سمات مهمة مثل:
  - نوع القفل
  - شكل النعل
  - ارتفاع الحذاء

هذا يمنع أن تتساوى منتجات كثيرة لمجرد أنها كلها `sneaker` وبنفس الألوان تقريبًا.

### 3. الـ analysis لم يعد يحسم وحده إلا لو النتيجة واضحة جدًا

بدل `analysis-first early return` القديم:

- يتم الآن جمع ranked analysis matches
- لا يتم الحسم من التحليل وحده إلا لو الفائز واضح جدًا والمرشح الثاني بعيد بفارق مريح

هذا يحمي من false positives عندما يكون أكثر من منتج قريب بصريًا.

### 4. shortlist أوسع مع exploration

`selectCatalogProductsForImageAnalysis` لم يعد يعتمد فقط على المنتجات التي حصلت على score نصي من اسم/وصف المنتج.

الآن:
- يحتفظ بالمنتجات ذات الصلة الأعلى
- ويضيف جزء exploration من المنتجات غير المتطابقة نصيًا

هذا مهم لأن بعض المنتجات قد تكون أسماؤها التجارية لا تعبّر عن شكلها، مثل موديلات shoes بأسماء brand-style لا تحتوي كلمات مثل `velcro` أو `platform`.

### 5. القرار النهائي أصبح ترتيبًا كاملًا لا أول تطابق

`compareCustomerImageWithPostImages` و`resolveCatalogMatchFromImageAnalyses` يدعمان الآن `returnAllMatches`.

وفي `resolveProductFromCatalogReferenceImages`:

1. يتم ترتيب المرشحين تحليليًا
2. يتم تكوين shortlist بصري مباشر
3. يتم طلب ranked direct image matches
4. يتم دمج الإشارتين على مستوى المنتج
5. يتم اختيار أعلى منتج تشابهًا

هذا يمنع أن تفوز صورة مرشحة فقط لأنها ظهرت مبكرًا أو لأنها أخذت confidence مرتفعًا مبكرًا.

## النتيجة العملية

المسار الجديد مناسب أكثر لسيناريو:

- العميل لا يعرف اسم المنتج
- يرسل صورة مختلفة عن صورة الكتالوج
- المنتج موجود فعلًا داخل الكتالوج لكن من زاوية/إضاءة مختلفة

بدل السؤال الإجباري للتوضيح، النظام يحاول الوصول تلقائيًا إلى:
- أعلى تشابه تحليلي
- ثم أعلى تشابه بصري مباشر
- ثم grounding للمنتج الأفضل

## الاختبارات المضافة

أضيفت اختبارات regression في:

- `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`

وتغطي:
- نفس المنتج لكن بصورتين مختلفتين
- حالة كان التحليل العام فيها قريبًا من منتج غلط، بينما المقارنة البصرية المباشرة رجّحت المنتج الصحيح

## Resilience Additions (2026-04-22)

- Catalog product image analyses are now persisted in `product.metadata.coreAi.catalogImageAnalyses`.
- `buildCatalogImageCandidates` reads those persisted analyses back into the candidate pool, so a product image that was analyzed once can be compared again later without spending a fresh Gemini vision call.
- `resolveCatalogMatchFromImageAnalyses` now prefers persisted catalog analyses first, then falls back to live product-image analysis only when the product image has no saved analysis yet.
- `analyzeCustomerProductImage` now has a low-cost chat fallback that still returns structured JSON search hints when the heavier primary vision-analysis path is overloaded.
- This specifically protects the production failure mode where:
  - the customer image arrives successfully
  - the product catalog exists
  - but repeated Gemini vision failures would previously drop the flow to a generic descriptive reply before any product grounding happened
