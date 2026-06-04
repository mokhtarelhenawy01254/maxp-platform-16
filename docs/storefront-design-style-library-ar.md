# مكتبة Design Styles للقوالب

هذه المكتبة هي المرجع الحي لنماذج `Design Style` المعتمدة داخل نظام القوالب.

الهدف منها:
- منع أن تضيع هوية القوالب بعد انتهاء التنفيذ
- توثيق style models القابلة للاشتقاق
- توضيح أين تصلح كل model وأين لا تصلح
- تسهيل `Theme Distance` و`Similarity Audit`

## القاعدة

- كل قالب مرجعي معتمد يجب أن:
  - يضيف `Design Style model` جديدة
  - أو يعلن صراحة أنه `derived branch` من model موجودة
- لا يجوز استخدام اسم style فضفاض مثل `modern` أو `premium` بلا تعريف واضح

## النموذج الإلزامي لكل Style

- الاسم:
- النوع:
  - `new model / derived branch`
- يصلح لـ:
- لا يصلح لـ:
- art direction / mood:
- commerce style:
- image direction:
- palette logic:
- typography logic:
- shape language:
- chrome rules:
- CTA tone:
- page composition rules:
- nearest styles it must stay away from:

---

## 1. Editorial Soft Commerce

- الاسم: `editorial-soft-commerce`
- النوع: `new model`
- يصلح لـ:
  - أزياء حريمي
  - beauty retail
  - lifestyle commerce الخفيفة
- لا يصلح لـ:
  - متاجر الأدوات الصلبة
  - الإلكترونيات
  - قوالب discount-heavy الصريحة
- art direction / mood:
  - ناعم، محرري، أنثوي، لكن سريع البيع
- commerce style:
  - discovery + conversion بدون صرامة utility
- image direction:
  - صور منتجات حقيقية، crops أنيقة، surfaces هوائية
- palette logic:
  - blush / rose neutrals + ink plum accents
- typography logic:
  - headings تحسها editorial لكن body واضحة وعملية
- shape language:
  - rounded لكن غير مبالغ فيها
- chrome rules:
  - header/footer/dock أنعم من utility themes
- CTA tone:
  - مباشرة لكن غير عدائية
- page composition rules:
  - hero أنظف، merchandising هادئة، decision flow واضحة
- nearest styles it must stay away from:
  - utility-retail-direct
  - scent-signature-commerce
- القالب المرجعي الحالي:
  - `women-fashion-eg / إطلالة`

## 2. Utility Retail Direct

- الاسم: `utility-retail-direct`
- النوع: `new model`
- يصلح لـ:
  - أحذية رجالي
  - أدوات
  - متاجر general-store التي هدفها speed + clarity
- لا يصلح لـ:
  - قوالب editorial
  - perfume / gifting premium
- art direction / mood:
  - واضح، حاسم، utility-first
- commerce style:
  - decision-first, quick selection, low-noise
- image direction:
  - صور حقيقية مباشرة، clarity أعلى من atmosphere
- palette logic:
  - sand / charcoal / restrained accent
- typography logic:
  - كثافة أعلى، hierarchy عملية
- shape language:
  - أقل نعومة، card edges أوضح
- chrome rules:
  - header/footer/dock utility واضحة
- CTA tone:
  - مباشرة وصريحة
- page composition rules:
  - route-first, buybox-first, less editorial detours
- nearest styles it must stay away from:
  - editorial-soft-commerce
  - scent-signature-commerce
- القالب المرجعي الحالي:
  - `men-shoes-eg / خطوة`

## 3. Scent Signature Commerce

- الاسم: `scent-signature-commerce`
- النوع: `new model`
- يصلح لـ:
  - برفنات
  - هدايا
  - luxury-light commerce
- لا يصلح لـ:
  - discount stores
  - utility-first catalogs
- art direction / mood:
  - حسي، دافئ، راقٍ، لكن غير بطيء
- commerce style:
  - hybrid بين sensory branding وfast buying
- image direction:
  - perfume photography / still life / bottle detail
- palette logic:
  - plum / ivory / warm metallic accents
- typography logic:
  - heading أكثر signature، body واضحة
- shape language:
  - softer frames مع premium restraint
- chrome rules:
  - preview/page chrome يجب أن تحمل warmth واضحة
- CTA tone:
  - confident, refined, not aggressive
- page composition rules:
  - sensory top fold + clear size/price/authenticity path
- nearest styles it must stay away from:
  - utility-retail-direct
  - editorial-soft-commerce
- القالب المرجعي الحالي:
  - `perfume-eg / أثر`

## 4. Mass Retail Direct

- الاسم: `mass-retail-direct`
- النوع: `new model`
- يصلح لـ:
  - متاجر الملابس والإكسسوارات اليومية
  - الساعات والكوتشيات والشنط والسكارفات
  - المتاجر العربية التي تريد بيعًا مباشرًا من صفحة المنتج
- لا يصلح لـ:
  - القوالب الفاخرة البطيئة
  - المتاجر التقنية المعقدة
  - القوالب التحريرية الناعمة
- art direction / mood:
  - بسيط، retail مباشر، مفهوم من أول نظرة، وأقرب للبيع الشعبي الواضح من الـ polished lifestyle commerce
- commerce style:
  - category-first browsing
  - PDP-first direct order
  - cart drawer مساندة وليست المرحلة الرئيسية
- image direction:
  - صور منتجات حقيقية وخلفيات نظيفة
  - بطاقات تعرض المنتج بوضوح أكثر من الجو العام
- palette logic:
  - warm ivory background
  - ink/charcoal primary
  - orange retail accent
- typography logic:
  - headings واضحة وثقيلة
  - body مباشرة وقليلة الرغي
- shape language:
  - framed retail cards
  - حدود أوضح
  - pills قليلة لكن حاضرة في أزرار الحسم
- chrome rules:
  - announcement bar خفيفة
  - header بسيطة
  - footer مباشرة
  - لا decorative chrome ثقيلة
- CTA tone:
  - `تسوق الآن`
  - `اختر الخيارات`
  - `إتمام الطلب`
- page composition rules:
  - home = hero بسيط + category tiles + product rails
  - shop = sort/search واضحان بدون تعقيد
  - PDP = gallery + title/price + direct-order form + trust خفيفة
  - thank-you = headline واضح + رقم الطلب + رجوع سريع
- nearest styles it must stay away from:
  - `editorial-soft-commerce`
  - `utility-retail-direct`
  - `scent-signature-commerce`
- القالب المرجعي الحالي:
  - `style-store-eg / ستايل ستور`

## 5. Pastel Fashion Direct

- الاسم: `pastel-fashion-direct`
- النوع: `new model`
- يصلح لـ:
  - متاجر أزياء حريمي / لايف ستايل خفيفة
  - fashion accessories
  - direct-order fashion stores
- لا يصلح لـ:
  - الأدوات
  - الإلكترونيات
  - القوالب الفاخرة البطيئة
  - القوالب الutility الحادة
- art direction / mood:
  - ناعم، pastel، fashionable، لكنه تجاري ومباشر
- commerce style:
  - quick-view-first browsing
  - sort-first collection
  - direct PDP order
- image direction:
  - صور أزياء حقيقية
  - backgrounds نظيفة وناعمة
  - colorways واضحة
- palette logic:
  - cream / white base
  - dusty pink support surfaces
  - coral sale accents
  - charcoal text
- typography logic:
  - modern sans نظيفة
  - أسماء منتجات ثقيلة لكن غير فاخرة
- shape language:
  - large rounded cards
  - soft pills
  - pastel footer slab
- chrome rules:
  - header خفيفة
  - footer وردية / soft support slab
  - no dark heavy shell
- CTA tone:
  - `Buy Now`
  - `Add to cart`
  - `View Full Details`
  - `كملي الطلب`
- page composition rules:
  - hero billboard
  - category lanes
  - dense product grids
  - quick-view modal from cards
  - PDP direct order with tabs / offers / form
  - thank-you بسيطة وواضحة
- nearest styles it must stay away from:
  - `mass-retail-direct`
  - `editorial-soft-commerce`
  - `utility-retail-direct`
- القالب المرجعي المقترح:
  - `vela-fashion-eg / فيلا فاشن`
