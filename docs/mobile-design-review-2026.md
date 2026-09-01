# Mobile Design Review 2026 — مرجع مراجعة التصميم على الموبايل (تحديث 2026)

> **الحالة:** مرجع معرفة فعّال في مساحة العمل (نسخة أولى من مصادر لايف).
> التحويل لمهارة رسمية عبر Skill Workshop متوقف مؤقتًا على إعداد `skills.workshop.autonomous.enabled`.
> **آخر تحديث للمحتوى:** 2026-09-01

## 1. الهدف
مرجع مجمّع يُستخدم عند فحص أي موقع على وضع الموبايل: معايير الأداء، الوصولية، أنماط UX لسنة 2026، وأدوات CSS الحديثة — بدل الاعتماد على الذاكرة أو مهارات متفرقة.

## 2. Core Web Vitals — حدود 2026 (موثقة)

| Metric | حد النجاح (Google) | هدف مريح |
|--------|--------------------|-----------|
| LCP | ≤ 2.5s | < 2.0s |
| INP | ≤ 200ms | < 150ms |
| CLS | ≤ 0.1 | < 0.05 |

- INP هو مقياس التفاعلية الرسمي (استبدل FID نهائيًا).
- القياس على بيانات المستخدمين الحقيقيين (field data) على موبايل 4G، مش Lab فقط.
- المصادر: web.dev/articles/vitals — developers.google.com/search/docs/appearance/core-web-vitals

## 3. الوصولية — WCAG 2.2 على الموبايل (إلزامي في المراجعة)
- **حجم أهداف اللمس:** حد أدنى 24×24 CSS px (WCAG 2.2 Target Size Minimum)؛ المفضل عمليًا 44×44 px.
- **التباين:** نص عادي ≥ 4.5:1، نص كبير ≥ 3:1، وعناصر الواجهة والحدود ≥ 3:1.
- **Focus visible** لكل عنصر تفاعلي + تنقل كامل بالكيبورد.
- **Zoom 400%** بدون فقدان محتوى أو تمرير أفقي.
- **خطأ الإدخال:** نماذج بـ labels دائمة + رسائل خطأ نصية واضحة (مش لون فقط).
- المصادر: w3.org/TR/WCAG22 — w3.org/TR/wcag2mobile-22

## 4. تشيك ليست مراجعة الموبايل 2026
- **الـ Viewport الأساسي للفحص:** 375×812 (iPhone) + 360×800 (Android) + 414 عرض.
- **Thumb zone:** الأزرار الأساسية والـ CTA في الثلث السفلي من الشاشة.
- **حجم الخط:** ≥ 16px للمدخلات (يمنع iOS auto-zoom)، النص الأساسي ≥ 16px.
- **عدم وجود تمرير أفقي** في أي عرض موبايل شائع.
- **Safe areas:** احترام notch/home indicator عبر `env(safe-area-inset-*)`.
- **النوافذ المنبثقة:** لا تحجب المحتوى في أول شاشة، وزر إغلاق ≥ 44px.
- **التنقل:** bottom navigation أو sticky header خفيف؛ قائمة هامبرجر فقط عند الضرورة.
- **الأداء:** صور lazy-loaded + width/height مضبوطة (تمنع CLS)، خطوط بـ `font-display: swap`.
- **Touch feedback:** حالات `:active` بديلة للمس خلال ≤ 100ms.
- **الوضع الليلي:** dark mode يعمل ويحافظ على التباين.

## 5. اتجاهات تصميم 2026 (للتقييم البصري)
- واجهات معززة بالـ AI وتخصيص تجريبي حقيقي (AI-personalized interfaces).
- أنظمة تصميم "accessibility-first" — الوصولية طبقة أساسية مش طبقة إضافية.
- Soft spatial UI: عمق ناعم، طبقات، glassmorphism معتدل بدون إضرار بالتباين.
- Performance-first CSS: أنيميشن CSS-native بدل مكتبات JS ثقيلة.
- تصميم للمقصد (intent-driven): مسارات قصيرة CTA → قيمة خلال أقل عدد خطوات.
- المصادر: figma.com/resource-library/web-design-trends — tubikstudio.com/blog/ui-design-trends-2026 — fireart.studio/blog/the-best-web-design-trends

## 6. صندوق أدوات CSS الحديث (2026)
- **Container Queries:** مكوّنات تتكيف مع حجم الأب مش الـ viewport — أساس الـ responsive الحديث.
- **`:has()`:** أنماط أب/شقيق بدون JS.
- **Scroll-driven animations:** `animation-timeline: scroll()/view()` — بديل CSS-native لسكرول animations بدون JS.
- **View Transitions:** انتقالات سلسة بين الصفحات/الحالات.
- **Scroll-state queries:** تنسيق حسب حالة السكرول (stuck/snapped).
- **Logical properties:** `margin-inline` / `padding-block` — إلزامي لدعم RTL/Arabic.
- المصادر: developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations — modern-css.com/whats-new

## 7. خصوصية الموبايل العربي / RTL
- استخدام logical properties بدل left/right.
- خط عربي بخط سطر 1.6–1.8 ومسافات حروف مضبوطة.
- أرقام وتواريخ بتنسيق عربي متسق، واتجاه مختلط (bidi) سليم في النماذج.
- اختبار القوائم المنسدلة والأيقونات بعد الانعكاس المرآتي.

## 8. سير عمل المراجعة القياسي
1. افتح الموقع على viewport موبايل (375×812) عبر أدوات المتصفح المتاحة.
2. سجل رحلة كاملة: تحميل → سكرول → لمس CTA → فتح قائمة → نموذج.
3. صوّر الشاشات عند كل عيب (screenshot) وسجل: الشاشة، العيب، الشدة (حرج/متوسط/بسيط).
4. صنّف العيوب: أداء / وصولية / UX / بصري.
5. اقترح إصلاحًا عمليًا لكل عيب (كود CSS/HTML جاهز عند الإمكان).
6. أعد الفحص بعد الإصلاح للتأكد قبل التسليم.

## 9. تحديث المرجع
المعايير المتغيرة (Core Web Vitals، اتجاهات UI) تُحدَّث ببحث لايف عند بدء أي مراجعة كبيرة، مع تحديث تاريخ آخر تحديث في أعلى الملف.

## 10. المصادر الأصلية (تم التحقق منها لايف 2026-09-01)
- https://web.dev/articles/vitals
- https://developers.google.com/search/docs/appearance/core-web-vitals
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/TR/wcag2mobile-22/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations
- https://modern-css.com/whats-new/
- https://www.figma.com/resource-library/web-design-trends/
- https://tubikstudio.com/blog/ui-design-trends-2026/
- https://fireart.studio/blog/the-best-web-design-trends/
