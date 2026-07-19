# Brief Template لقالب Storefront

## Snapshot

- اسم العمل:
- نوع القالب:
- الجمهور:
- مستوى السعر:
- السوق:

## Direction

- 3 كلمات تصف الطابع:
- ما الذي يجب أن يشعر به العميل خلال أول 5 ثوانٍ:
- ما الذي يجب أن يميز القالب عن القوالب القريبة:

## Design Style

- اسم `style model`:
- هل القالب يضيف model جديدة إلى `Design Style Library` أم يشتق من model موجودة:
- الـ `art direction / mood`:
- ما الذي لا يجب أن يصبح عليه القالب:
- `commerce style`:
- `image direction`:
- `page composition rules`:
- أقرب قالبين لا يجب أن يبدوا قريبين منه:

## External Design Skill Reference

- هل سنستخدم `external design skill`:
  - `No / Yes`
- إذا نعم: ما اسمها أو مصدرها:
- لماذا هذه الـ skill مناسبة لهذا القالب:
- ما الذي سنأخذه منها:
- ما الذي سنرفضه منها:
- ما الذي لا يجوز أن تحدده:
  - `page architecture / section order / conversion flow / PDP decision logic`

## Reference Theme / Template Intake

- هل سنستخدم `reference theme/template` خارجي:
  - `No / Yes`
- إذا نعم: ما اسمه أو رابطه:
- إذا كان ضمن `reference-locked expansion pack`: ما المرجع anchor الواحد:
- إذا كان ضمن `reference-locked expansion pack`: ما `DNA` المشتركة التي يجب أن تبقى عبر كل القوالب:
- إذا كان ضمن `reference-locked expansion pack`: ما محاور الاختلاف الإلزامية بين القوالب:
- ما الصفحات التي سنفحصها فيه:
- ما الذي سنستخرجه منه:
  - `patterns / capabilities / section ideas / mobile or RTL cues`
- ما الذي سنرفضه منه:
- ما الذي لا يجوز أن يحدده:
  - `page architecture / section order / conversion flow / PDP decision logic`
- كيف سنحوّله إلى:
  - `sections / variants / capabilities`
  بدل نسخه كصفحة جاهزة

## Objective Strategy

- الهدف الأساسي:
  - `Sales-led / Brand-led / Hybrid`
- الهدف الثانوي:
- ما الذي يجب أن يحدث في أول زيارة:
- ما الذي لا يجب أن يطغى على الهدف:

## Commerce Focus

- هل الأولوية discovery أم speed أم trust أم deals:
- هل القالب موبايل-أول:
- هل وضع الموبايل يجب أن يشعر كأنه:
  - `web-native / app-like / hybrid`
- ما السلوكيات المطلوبة على الموبايل:
  - `bottom nav / sticky CTA / sticky buy bar / chips / drawer / bottom-sheet / compact footer`
- ما أهم sections:

## Theme Foundation

- color strategy:
- typography strategy:
- shape language:
- component language:
- interaction model:
- page chrome rules:
- token coverage priorities:
  - header / footer / mobile dock / marketplace card / hero / shop chrome / PDP decision surfaces / trust surfaces
- ما الذي يجب أن يختلف بوضوح عن القوالب القريبة:

## Section vs Variant Decision

- ما الذي سيحل بـ `Token-only`:
- ما الذي يحتاج `Variant`:
- ما الذي يحتاج `Section` جديدة:
- أين قد يتغير ownership of CTA:
- أين قد يتغير decision flow:

## Conversion Stack & Upsell

- ما الـ `primary CTA` الأساسية:
- هل أدوات التحويل ستكون `sections` مستقلة أم `conversion-stack` orchestrated:
- إذا كانت هناك عروض كمية: هل `quantity-offers` ستكون `section/variant` مستقلة أم غير مطلوبة أصلًا:
- إذا كانت `quantity-offers` موجودة على `PDP`: هل ستكون `supporting` أم `primary decision block`:
- هل نحتاج `quick order` أو `buy now` أو `sticky add-to-cart`:
- إذا كانت هناك form داخل `PDP`: هل ستكون `standalone` أم `merged-buybox`:
- إذا كانت `bought-together / bundle add-ons` مهمة: هل ستكون `teaser links` أم `true configurable bundle`:
- إذا كانت bundle configurable: أين سيتم اختيار لون/مقاس الإضافات:
- من يملك CTA النهائية داخل مسار الحسم:
  - block الاختيار
  - أم form الطلب
- هل يجب إخفاء `top variant selectors` عندما تكون `quantity-offers` هي الـ primary:
- ما موضع `cart upsell`:
- ما موضع `PDP related / bought together`:
- هل يوجد `post-purchase upsell` أو `reorder hook`:
- ما الأدوات التي سيتم حذفها عمدًا حتى لا تصبح الصفحة noisy:
- ما الذي سيكون annoying لو زاد عن حده:

## Preview Order Behavior

- هل القالب يحتاج preview checkout / thank-you:
- ما الذي يجب أن يظهر في `thank-you`:
- هل order reference في preview يجب أن تكون ديناميكية:
- ما الذي يعتبر preview misleading أو seeded بشكل مضر:

## Variant Strategy

- هل هذا القالب مطلوب فيه:
  - `Mixed strategy`
  - `All-New Variants`
- ما الـ section families الحرجة في هذا القالب:
- ما الذي يمكن `Reuse` من الموجود:
- ما الذي يحتاج `Extend`:
- ما الذي يحتاج `New`:
- إذا كان المطلوب `All-New Variants`:
  - ما الـ engines أو الـ logic التي يمكن reuse داخليًا بدون إعادة استخدام surface نفسها:
- إذا كان ضمن `reference-locked expansion pack`:
  - ما الـ `critical families` التي يجب أن تكون `New to library`:
  - ما الذي سيضيفه هذا القالب للمكتبة تحديدًا:
- لماذا:
- ما الـ section families التي يجب أن تبدو جديدة إدراكيًا بوضوح:
- ما 3 التغييرات الإدراكية الدنيا المطلوبة لكل family حرجة:
  - `layout / hierarchy / card anatomy / interaction / content rhythm / CTA ownership`
- ما أكثر قالبين قريبين يجب ألا يشبههما هذا القالب:
- كيف سيختلف route-by-route داخل نفسه:
  - `home / shop / sale / pdp / cart / checkout / thank-you`
- كيف ستظهر شخصية القالب في marketplace:
  - card shell
  - preview image
  - preview chrome
- ما الإيقاعات أو العائلات البصرية التي يمنع تكرارها متتالية:
- ما الذي سيجعل المراجع يقول إن هذا القالب جديد حتى لو لم يعرف أسماء الـ variants:
- ما الـ variant ids التي لا يجوز أن ترجع إلى fallback عامة:
- ما الـ component families التي لا يجوز أن تشترك في anatomy واحدة رغم اختلاف الأسماء:

## Capability Matrix

- ما الأدوات/القدرات التي يجب أن يحملها القالب:
- أين تظهر هذه القدرات داخل القالب:
- ما الذي لا يمكن التضحية به:
- ما الذي يمكن تأجيله:

## Product Data Depth

- هل الفئة تحتاج variants فعلًا:
- ما محاور المتغيرات الأساسية:
  - `size / color / fit / pack / other`
- ما الحد الأدنى لعدد الصور لكل منتج أساسي:
- ما المنتجات التي يمكن أن تبقى بلا variants:
- ما الذي يعتبر data depth فاشلًا في هذه الفئة:

## Image Strategy

- مصدر الصور الأساسي:
  - `Real photos / Approved photo pack / Stylized imagery`
- أين الواقعية إلزامية:
- أين يسمح بأسلوب غير فوتوغرافي:
- ما غير المسموح:
- ما الذي يضر الثقة فورًا:

## No-Go

- patterns ممنوعة:
- `box-in-box / card-inside-card / المربعات اللي جوه بعض` في surfaces البيع والحسم
- `silent fallback` في variants أو sections user-facing
- الاعتماد على preview image فقط لتمييز القالب في marketplace
- نجاح القالب في session headless بينما يفشل أو يختلف داخل authenticated preview الحقيقية
- اختلاف palette شكلي مع بقاء anatomy نفسها
- hardcoded colors داخل theme-specific components بدون سبب موثق
- نبرة ممنوعة:
- أمثلة لا نريد الاقتراب منها:
