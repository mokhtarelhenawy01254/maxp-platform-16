# Atelier Nova Protocol Audit

تاريخ المراجعة: 2026-04-27

## الهدف

رفع `Atelier Nova` من معاينة عامة قريبة من fallback إلى ثيم بوتيك تحريري واضح الهوية، مع تقليل الضوضاء البيعية، تعميق المسارات الأساسية، وتزويد المعاينة ببيانات حقيقية بدل المنتجات المولدة تلقائيًا.

## الاستراتيجية

- نوع المعالجة: `Hybrid`
- المسار العام: إعادة بناء الثيم + Dataset مخصص + تهدئة shell/preview chrome + تحقق بصري

## ما تم إغلاقه

### 1. هوية الثيم

- إعادة كتابة [frontend/src/storefront/themes/atelier-nova.json](/H:/max_p_new/frontend/src/storefront/themes/atelier-nova.json) بالكامل
- اعتماد palette أهدأ وأقرب إلى parchment / ink / clay بدل الإعدادات العامة
- تغيير الخطوط إلى اتجاه تحريري أوضح
- إضافة `preview.imageUrl` محلي: `/assets/themes/atelier-nova/preview.png`
- تعميق مسارات:
  - `home`
  - `shop`
  - `collections`
  - `pdp`
  - `cart`
  - `checkout`
  - `thank-you`
  - صفحات الخدمة: `shipping`, `returns`, `contact`, `privacy`, `terms`

### 2. بيانات المعاينة

- إنشاء Dataset مخصص في [frontend/src/storefront/preview/atelierNovaMarketplaceData.ts](/H:/max_p_new/frontend/src/storefront/preview/atelierNovaMarketplaceData.ts)
- تغطية 8 منتجات فعلية ببيانات أعمق:
  - 4 صور على الأقل لكل منتج
  - Variants حقيقية
  - `editorialNote`, `fitNote`, `stylingNote`, `careNote`
  - `styleWith`, `boutiqueFacts`, `boutiqueProofs`
  - Recommendations وReviews مخصصة
- ربط dataset داخل [frontend/src/storefront/preview/marketplaceSampleData.ts](/H:/max_p_new/frontend/src/storefront/preview/marketplaceSampleData.ts)

### 3. الضوضاء البيعية والـ preview chrome

- تهدئة `conversion-suite` لـ `atelier-nova` في [frontend/src/storefront/utils/marketplaceApps.ts](/H:/max_p_new/frontend/src/storefront/utils/marketplaceApps.ts)
- تعطيل:
  - countdown
  - exit intent
  - fomo
  - fake popups
  - free shipping bar
  - low stock / sold counters
- الإبقاء على:
  - `crossSell`
  - `boughtTogether`
- تخصيص copy خاص بـ `Atelier Nova`
- نقل shell preview من banner كبير إلى compact dock عبر [frontend/src/storefront/StorefrontShell.tsx](/H:/max_p_new/frontend/src/storefront/StorefrontShell.tsx)

### 4. الصورة المرجعية

- إنشاء لقطة preview فعلية من الصفحة في:
  - [frontend/public/assets/themes/atelier-nova/preview.png](/H:/max_p_new/frontend/public/assets/themes/atelier-nova/preview.png)

## التحقق

- `npm run validate:themes`
- `npx vitest run src/storefront/preview/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/storefrontPreview.test.tsx`
- مراجعة بصرية محلية على:
  - الصفحة الرئيسية
  - المتجر
  - صفحة المنتج
  - صفحة `collections`

## ملاحظات متبقية

- الـ compact preview dock ما زال يظهر في وضع marketplace preview لأنه جزء من بيئة المعاينة نفسها، لكنه لم يعد يكسر الهيرو أو يزاحم القراءة.
- صور المنتجات والفئات الحالية تعتمد على Unsplash، لكنها أصبحت مرتبطة بdataset محدد ومتسق بدل fallback عام.
