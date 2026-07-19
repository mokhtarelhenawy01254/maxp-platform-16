# Cutline Club Theme Plan

## 1. Brief Snapshot

- المرجع: تنفيذ ثيم ملابس جديد بالكامل لمتجر ready-to-wear
- الحالة: done

## 2. Objective Strategy

- primary objective: Sales-led مع هوية تمزج street utility مع youth club بدل أي فخامة أو بوتيك هادئ
- secondary objective: رفع وضوح الأطقم والدروب مع طاقة بوستر وستكرز لا مجرد ريل عملي صامت
- first-visit outcome: العميل يعرف من أين يبدأ خلال ثوانٍ
- what must not dominate: هدوء البوتيك، فخامة المجوهرات، أو صخب الخصومات العامة
- success lens: شكل مختلف بصريًا + رحلة شراء أسرع على الموبايل

## 3. Benchmark Scan

- المراجع:
  - `docs/storefront-fashion-theme-ranking-2026-04-23.md`
  - `docs/storefront-fashion-mobile-differentiation-review-2026-04-23.md`
  - `docs/storefront-fashion-theme-copy-refresh-2026-04-23.md`
- current signals: معظم ثيمات الأزياء الحالية تميل للبوتيك الهادئ، الفخامة، أو كتالوجات نظيفة
- stale signals: hero واسع تقليدي، 3 بطاقات مكررة، لوك بوك تجميلي فقط
- no-go patterns: أي تقارب واضح مع `atelier-nova` أو `elegant-luxe` أو `bold-fashion`

## 4. Theme Foundation

- palette: فحم داكن + لايم كهربائي + ورق دافئ
- type: عنوان حاد ومضغوط مع إيقاع أقرب للملصقات والبوسترات والـ merch notes
- layout logic: drop-board / release rail / list-first browsing / sticker noise
- differentiation: الثيم يتعامل مع الملابس كـ release board + street poster wall + merch desk لا كبوتيك هادئ

## 5. Mobile Experience Strategy

- mode: hybrid يميل للشراء السريع لكن بنبرة شبابية أوضح
- bottom nav / dock: غير مضاف داخل الثيم نفسه
- sticky CTA / buy bar: الاعتماد هنا على CTA hero + sections الحالية داخل PDP/cart
- filters / sort behavior on mobile: shop hero يقود مباشرة إلى toolbar + chips + list-card grid
- PDP behavior on mobile: معلومات القصّة والشحن والاستبدال تبقى قريبة من القرار
- footer / lower chrome behavior: خفيف وواضح بدون تزاحم
- risks: لو كانت صور المنتجات ضعيفة فلن يحمل الثيم وحده كل الإقناع

## 6. Variant Strategy

- families in scope: HeroBanner, ProductGrid, FeaturesBar, ShoppingIntents
- decision per family:
  - HeroBanner: New
  - ProductGrid: Reuse
  - FeaturesBar: Reuse
  - ShoppingIntents: Reuse
- why: نقطة التميز الأساسية كانت تحتاج كسرًا في شكل الافتتاحية وترتيب الصفحة نفسها، لا مجرد تبديل صورة أو copy
- reuse risks: لو عادت أقسام editorial أو lookbook سيضعف الفرق سريعًا
- extend notes: تم pivot من `runway-grid` إلى `drop-board` ثم تم صقل الـ hero نفسه ليجمع utility + club energy
- new variants needed: `runway-grid` ثم `drop-board`

## 7. Capability Matrix

- must-have capabilities:
  - إبراز الدروب
  - بناء أطقم جاهزة
  - إبقاء fit notes قريبة
  - رحلة shop أوضح
- mapped sections / behaviors:
  - hero drop-board
  - features-bar service-clarity
  - product-grid list-card
  - shop-promo-rail
  - shopping-intents
- missing capabilities: لا يوجد bottom dock خاص بالملابس
- tradeoffs: فضّلنا وضوح الرحلة على الهدوء الفاخر، مع قبول مقدار محسوب من الضوضاء البصرية المقصودة

## 8. Conversion Stack & Upsell Strategy

- primary CTA system: ابدأ من الجديد / شاهد الأطقم / شاهد الدروب
- standalone tools vs orchestrator: الاعتماد على sections الحالية المركبة بدل أدوات جديدة كثيرة
- quantity-offers strategy (if relevant): not needed
- quick order / sticky add-to-cart / buy-now: مغطاة عبر بنية PDP الحالية
- cart upsell: من خلال bought-together / related / post-purchase
- PDP recommendations / bought together: موجّهة لبناء طقم كامل
- post-purchase / reorder: موجودة في thank-you
- intentionally omitted tools: لم نضف عناصر FOMO زائدة أو countdown مسرحي في الهوم
- abuse risks: لو زادت لغة العروض سيتحول الثيم إلى sale template عام

## 9. Image Realism Gate

- photo source policy: Stylized imagery + approved placeholders + real catalog images
- where realism is mandatory: صور المنتجات الفعلية وPDP
- where stylization is allowed: preview asset وhero treatment وcollection illustrations
- realism risks: الاعتماد الكامل على placeholder art سيقلل أثر الثيم في المتجر الحقيقي
- final image verdict: مقبول لأن التمييز الأساسي هنا layout + merchandising rhythm

## 10. Build

- registration: تم تسجيل `cutline-club` داخل presets
- metadata: تم إضافة category + description + preview mapping
- preview assets: تمت إضافة `frontend/public/assets/themes/cutline-club/preview.svg`
- sections: تم ضبط محتوى home/shop/lookbook/sale وغيرها
- variants: تمت إضافة `runway-grid` ثم إعادة توجيه الثيم نهائيًا نحو `drop-board` الهجين
- refinement pass: تمت إضافة header rail خاص بالثيم، ومعالجة PDP أوضح، وربط `related-products` ببطاقة `list-card` المخصصة للثيم مع تحويل `bought-together` إلى `compact`

## 11. Verification & Tests

- validation scripts: `npm.cmd run validate:themes`
- focused tests: `npx vitest run src/storefront/__tests__/themeCatalog.test.ts`
- preview data tests:
  - `npx vitest run src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `npx vitest run src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts`
- variant / behavior tests: تم تغطية hero variant عبر theme catalog test
- build: `npm.cmd run build`
- status: passed

## 12. QA

- home: hero drop-board هجين مع stickers / poster chips + ريل واضح + بدون editorial blocks مكررة
- shop: start utility-first بدون hero تقليدي + list-card + filters flow + copy أقرب لبوستر شارع
- pdp: رسائل القصّة والمقاس أوضح
- pdp refinement: buybox accordions + conversion stack + related rail صار لهم treatment خاص بـ `cutline-club` بدل الاعتماد على surfaces عامة
- cart: ملخص واضح مع تذكير الاستبدال
- checkout: رحلة مختصرة وواضحة
- mobile: الثيم مناسب للمقارنة السريعة
- RTL: مضبوط عربيًا
- marketplace preview dataset: تمت إضافته محليًا لـ `cutline-club` حتى تظهر المنتجات والتوصيات والطلب التجريبي بدون أخطاء تحميل
- visual QA: تمت مراجعة home + shop على preview route بعد الربط الفعلي للبيانات

## 13. Final Gate

- objective fit: strong
- capability coverage: good
- conversion stack fit: good
- upsell coverage: good
- variant coverage: good
- image realism: acceptable
- anti-stale: strong
- distinction: stronger after the utility + youth-club merge
- final verdict: صالح كثيم ملابس جديد ومختلف فعليًا عن قوالب الأزياء السابقة في المستودع لأن التغيير صار في الفكرة والهيكل والإيقاع البصري معًا
