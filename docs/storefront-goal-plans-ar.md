# خطة أهداف الـ Storefront والقوالب

هذه الوثيقة تقسم البرنامج إلى أهداف مستقلة، بحيث يكون لكل هدف:
- ناتج واضح
- مهام مرتبة
- خطة مراجعة
- خطة اختبار
- تعريف إنجاز

## مراجع النظام

- البروتوكول: `general-storefront-template-protocol-ar.md`
- الـ checklist: `general-storefront-template-checklist-ar.md`
- الـ brief template: `storefront-template-brief-template-ar.md`
- الـ theme plan template: `storefront-theme-plan-template-ar.md`
- مرجع sample data: `storefront-sample-data-packs-ar.md`
- خطة `men-shoes-eg`: `men-shoes-eg-storefront-template-plan.md`
- benchmark `men-shoes-eg`: `men-shoes-eg-current-benchmark-scan-2026-04-24.md`
- خطة `women-fashion-eg`: `women-fashion-eg-storefront-template-plan.md`
- benchmark `women-fashion-eg`: `women-fashion-eg-current-benchmark-scan-2026-04-25.md`
- audit `women-fashion-eg`: `women-fashion-eg-protocol-audit-2026-04-25.md`
- خطة `perfume-eg`: `perfume-eg-storefront-template-plan.md`
- benchmark `perfume-eg`: `perfume-eg-current-benchmark-scan-2026-04-25.md`
- خطة `style-store-eg`: `style-store-eg-storefront-template-plan.md`
- benchmark `style-store-eg`: `nue-theme-reference-gap-analysis-2026-04-26.md`
- audit `style-store-eg`: `style-store-eg-protocol-audit-2026-04-26.md`
- خطة `vela-fashion-eg`: `vela-fashion-eg-storefront-template-plan.md`
- benchmark `vela-fashion-eg`: `vela-fashion-reference-gap-analysis-2026-04-26.md`

الهدف من التقسيم هو أن نقدر ننفذ على مراحل بدون تداخل، ونستلم في النهاية نظامًا قابلًا للصيانة والتوسع ويعمل فعليًا على شركات حقيقية.

## الهدف 1: تثبيت أساس الـ Storefront

### النتيجة المطلوبة
- وجود runtime رسمي واحد للمتجر.
- إزالة الاعتماد على المسارات القديمة المكسورة داخل مسار الثيمات.
- نجاح الفحوصات المركزة الخاصة بالـ storefront foundation.

### المهام
- اعتماد `frontend/src/storefront` كنواة runtime رسمية.
- حصر نقاط الدخول الرسمية للمتجر في `App.tsx` و`StorefrontShell.tsx`.
- إصلاح أدوات التحقق الخاصة بالثيمات.
- نقل أي اعتماد جديد إلى utilities وengine الحالي بدل الأنظمة القديمة المحذوفة.

### خطة المراجعة
- مراجعة حدود المسؤولية بين `App.tsx`, `StorefrontShell.tsx`, `ThemeProvider.tsx`, `PageComposer.tsx`.
- مراجعة أي import جديد للتأكد أنه لا يعتمد على مسارات legacy.
- مراجعة أي script جديد للتأكد أنه يخدم المسار الرسمي فقط.

### خطة الاختبار
- تشغيل validator للثيمات.
- تشغيل اختبارات الوحدة للـ storefront engine.
- اختبار تحميل الـ storefront من `/store/*`.

### تعريف الإنجاز
- يمكن تحميل الـ storefront بدون كسر pipeline الثيمات.
- توجد أداة رسمية للتحقق من صحة الثيمات.

## الهدف 2: دعم أكثر من ثيم رسمي

### النتيجة المطلوبة
- وجود أكثر من preset مع registry رسمي.
- دعم اختيار preset من إعدادات الشركة أو بيانات الـ storefront العامة.
- fallback واضح إذا كان الثيم المطلوب غير معروف.

### المهام
- إنشاء presets رسمية أولية: `modern-minimal`, `bold-fashion`, `elegant-luxe`.
- إنشاء theme registry رسمي.
- إنشاء resolver يقرأ `theme`, `themeId`, و`designTokens` من الإعدادات.
- دمج resolver داخل `ThemeProvider`.

### خطة المراجعة
- مراجعة contract كل preset للتأكد من اتساقه مع `StorefrontTheme`.
- مراجعة fallback behavior.
- مراجعة طريقة الدمج بين preset وcompany overrides.

### خطة الاختبار
- اختبار اختيار preset مباشر.
- اختبار fallback للثيم الافتراضي عند ID غير معروف.
- اختبار دمج design tokens القادمة من الشركة فوق preset أساسي.
- اختبار validation لكل preset.

### تعريف الإنجاز
- نستطيع تعريف أكثر من ثيم رسمي وتحميله بنجاح من runtime واحد.

## الهدف 3: ربط الثيمات بالشركات

### النتيجة المطلوبة
- الشركة A يمكن أن تستخدم ثيمًا مختلفًا عن الشركة B.
- التطبيق العام يقرأ الثيم الصحيح من backend.
- الـ public storefront يعكس الثيم المنشور فعليًا.

### المهام
- تثبيت schema موحد لما يرسله backend للـ storefront.
- اعتماد حقل preset واضح للشركة أو لقالب الصفحة المنشور.
- تجهيز migration بسيطة إن كانت البيانات الحالية غير موحدة.
- إنشاء شركة/شركتين للاختبار إذا كانت البيئة لا تحتوي شركات مناسبة.

### خطة المراجعة
- مراجعة contract بين `publicStorefrontController` و`useStorefrontSettings`.
- مراجعة استقرار الربط مع `company.slug` وsubdomain flow.
- مراجعة عدم تسريب إعدادات شركة إلى أخرى.

### خطة الاختبار
- اختبار شركة A على preset 1.
- اختبار شركة B على preset 2.
- اختبار تغيير الثيم لشركة ثم refresh والتأكد من استمرار التطبيق.
- اختبار فتح الرابط العام لكل شركة والتحقق من اختلاف المظهر.

### تعريف الإنجاز
- تطبيق ثيم مختلف على أكثر من شركة بشكل فعلي ومعزول.

## الهدف 4: اختبار إنشاء أكثر من ثيم

### النتيجة المطلوبة
- وجود مسار واضح لإنشاء preset جديد.
- وجود آلية تمنع حفظ ثيم مكسور.

### المهام
- إنشاء validator رسمي للثيمات.
- كتابة اختبارات وحدة للـ resolver والvalidator.
- إضافة script تشغيل واضح للفحص.

### خطة المراجعة
- مراجعة الرسائل الناتجة من validator.
- مراجعة required fields لكل صفحة ولكل token.

### خطة الاختبار
- إنشاء preset صالح والتأكد من مروره.
- إدخال preset ناقص والتأكد من فشل التحقق.
- اختبار إنشاء أكثر من ثيم داخل registry مرة واحدة.

### تعريف الإنجاز
- أي preset جديد يمر عبر validator قبل اعتماده.

## الهدف 5: تجهيز شركات حقيقية أو شركات اختبار

### النتيجة المطلوبة
- وجود بيانات صالحة للاختبار النهائي.
- عدم بقاء التنفيذ معتمدًا على mocks فقط.

### المهام
- فحص وجود شركات نشطة وصالحة لاختبار المتجر.
- إذا لم توجد، إنشاء شركات اختبار مع slug وproducts وcategories.
- تجهيز بيانات تكفي لإظهار الفروق بين الثيمات.

### خطة المراجعة
- مراجعة أسماء الشركات وslug والبيانات المربوطة بها.
- مراجعة أن البيانات لا تكسر بيئات أخرى.

### خطة الاختبار
- فتح الشركة واختبار صفحات Home وShop وPDP وCart وCheckout.
- اختبار ربط ثيم مختلف لكل شركة.

### تعريف الإنجاز
- لدينا شركات قابلة للاختبار النهائي وليست مجرد بيانات شكلية.

## الهدف 6: التسليم النهائي والجودة

### النتيجة المطلوبة
- النظام يعمل.
- الاختبارات المتفق عليها تعمل.
- توجد صورة واضحة لما تم إنجازه وما تبقى.

### المهام
- تشغيل الاختبارات النهائية المتفق عليها.
- توثيق الحالة النهائية.
- تسليم قائمة واضحة: ما يعمل، ما تم اختباره، وما يحتاج متابعة لاحقة إن وجد.

### خطة المراجعة
- مراجعة الكود النهائي مقابل الأهداف الستة.
- مراجعة أي مخاطرة متبقية قبل التسليم.

### خطة الاختبار
- اختبارات الوحدة.
- اختبارات smoke للـ storefront العام.
- اختبار تعدد الثيمات.
- اختبار الربط على شركات فعلية.

### تعريف الإنجاز
- يمكن القول إن النظام “شغال” بناءً على فحوصات واضحة وليس انطباعًا عامًا.

## ترتيب التنفيذ
1. الهدف 1
2. الهدف 2
3. الهدف 4
4. الهدف 3
5. الهدف 5
6. الهدف 6

السبب في هذا الترتيب:
- لا معنى لاختبار الثيمات قبل وجود foundation.
- لا معنى لربط الشركات قبل وجود preset system واضح.
- لا معنى للتسليم قبل وجود بيانات واختبارات فعلية.
