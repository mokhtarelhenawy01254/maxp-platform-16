# Closet OS Theme Plan

## 1. Brief Snapshot

- المرجع: تنفيذ ثيم ملابس جديد بالكامل لمتجر capsule wardrobe / basics
- الحالة: done

## 2. Objective Strategy

- primary objective: تحويل منطق المتجر من عرض كوليكشنات إلى `wardrobe system`
- secondary objective: جعل العميل يشتري حسب الروتين والتوافق وتكرار اللبس
- first-visit outcome: العميل يعرف أين تبدأ القطعة داخل الأسبوع خلال ثوانٍ
- what must not dominate: البوتيك الهادئ، اللوك بوك التحريري، أو صخب streetwear
- success lens: فكرة جديدة + رحلة شراء أوضح + اختلاف حقيقي عن كل عائلات الأزياء الحالية

## 3. Benchmark Scan

- المراجع:
  - `docs/storefront-fashion-theme-ranking-2026-04-23.md`
  - `docs/storefront-fashion-mobile-differentiation-review-2026-04-23.md`
  - `docs/storefront-fashion-theme-copy-refresh-2026-04-23.md`
- current signals: معظم القوالب الحالية تدور حول boutique / luxury / editorial / street utility
- no-go patterns: أي Hero أقرب لمجلة أزياء أو أي Product Grid يبيع كصورة فقط

## 4. Theme Foundation

- palette: ورق دافئ + فحم أخضر + sage هادئ
- type: هدوء مقصود مع labeling أقرب لبطاقات الخزانة والمخططات الأسبوعية
- layout logic: weekly planner / wardrobe board / compatibility-first browsing
- differentiation: الثيم لا يبيع كوليكشن؛ يبيع نظام خزانة أسبوعية

## 5. Mobile Experience Strategy

- mode: routine-first browsing
- sticky behavior: الاعتماد على rails الواضحة والكروت الهادئة بدل hero صاخب
- filters / sort behavior on mobile: البحث والفرز يبدآن من اسم القطعة أو الروتين
- PDP behavior on mobile: المقاس والعناية والتوافق قريبون من قرار الشراء

## 6. Variant Strategy

- families in scope: HeroBanner, ProductGrid, StorefrontShell
- decision per family:
  - HeroBanner: New
  - ProductGrid: Extend
  - StorefrontShell: Extend
- new variants needed: `wardrobe-planner`

## 7. Capability Matrix

- must-have capabilities:
  - weekly planning cues
  - repeat-wear messaging
  - care visibility
  - compatibility-first recommendations
- mapped sections / behaviors:
  - `hero-banner` → `wardrobe-planner`
  - `featured-products` / `product-grid` → `minimal-card` with `closet-os` card treatment
  - `product-info` copy tuned around role/care/fit
  - preview dataset كامل لرحلة marketplace

## 8. Conversion Strategy

- primary CTA system: `ابنِ الأسبوع` / `افتح الخزانة`
- shop language: closet / plan / repeat / layer
- PDP recommendations / bought together: مبنية على التوافق داخل نفس الأسبوع
- cart / checkout: واضحة وهادئة بلا ضغط بصري غير ضروري

## 9. Build

- registration: تم تسجيل `closet-os` داخل presets
- metadata: تم إضافة category + description + preview mapping
- preview assets: تمت إضافة `frontend/public/assets/themes/closet-os/preview.svg`
- local product assets: تمت إضافة مجموعة SVGs مخصصة للثيم
- preview data: products + variants + recommendations + reviews + cart seeds + order profile
- shell/card layer: تم تمديد `StorefrontShell` و`ProductCard` بهوية خاصة بالثيم

## 10. Verification & Tests

- validation scripts: `npm.cmd run validate:themes`
- focused tests:
  - `npx vitest run src/storefront/__tests__/themeCatalog.test.ts`
  - `npx vitest run src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `npx vitest run src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts`
- build: `npm.cmd run build`
- status: passed

## 11. QA

- home: planner hero واضح ومختلف عن أي Hero fashion سابق
- shop: كروت `Closet OS` تظهر بمنطق closet card لا card catalog عام
- pdp: copy ومعنى المنتج يخدمان فكرة role / repeat / care
- preview: dataset يعمل من home إلى thank-you
