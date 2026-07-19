# Elessi 10-Theme Pack Review Rubric - 2026-04-26

## Purpose

- هذه الوثيقة هي `acceptance gate` لقوالب `Elessi 10-theme pack`
- لا يكفي أن ينجح القالب بصريًا أو تقنيًا
- يجب أن يثبت:
  - أنه من روح `Elessi`
  - أنه مختلف عن بقية pack
  - أنه يضيف للمكتبة الحالية
  - أنه لا يستهلك المكتبة أكثر مما يضيف

## Review Mode

- mode:
  - `reference-locked expansion pack`
- anchor reference:
  - `Elessi`
- rule:
  - no visible critical family may be accepted if it comes from an old library theme

## Gate 1. Elessi Traceability

- يجب على كل قالب أن يوضح:
  - ما صفحات `Elessi` التي استُلهم منها
  - ما الـ patterns أو capabilities التي استُخرجت
  - ما الذي رُفض من المرجع
- الحد الأدنى:
  - `3` extraction notes واضحة من `Elessi`
- القالب يفشل إذا:
  - ذكر `Elessi` بالاسم فقط
  - أو لم يمكن ربط UI أو capability فعلية بالمرجع

## Gate 2. New-To-Library Requirement

- كل `critical user-facing families` داخل scope يجب أن تكون:
  - `New to library`
- surfaces الحرجة المقصودة:
  - hero
  - shop chrome
  - product-card or product-grid
  - PDP decision surface
  - trust / service / bundle surface
- المسموح بإعادة استخدامه من المكتبة الحالية:
  - engine
  - data plumbing
  - logic
  - registries
  - preview infrastructure
- غير المسموح:
  - أخذ variant مرئية قديمة من Theme آخر ثم إعادة تسميتها
  - branch شكلي فوق anatomy قديمة ثم الادعاء أنها إضافة جديدة

## Gate 3. Library Delta

- كل قالب يجب أن يكون `net-positive to library`
- الحد الأدنى لكل قالب:
  - `5` new visible families across critical surfaces
  - `1` new shared capability addition or `1` new shared capability treatment extracted from `Elessi`
- يجب توثيق:
  - ما الذي أضافه للمكتبة
  - ما الذي أعاد استخدامه داخليًا فقط
  - لماذا هو إضافة حقيقية لا مجرد consumer للـ library

## Gate 4. Pack Divergence

- كل قالب يجب أن يختلف عن بقية القوالب في الأقل عبر `6` محاور:
  - hero entry logic
  - category navigation style
  - product-card anatomy
  - shop chrome
  - PDP decision chrome
  - trust mechanism
  - mobile buying rhythm
  - visual density
  - image framing
  - bundle or upsell logic
- لا يكفي:
  - اختلاف category name
  - اختلاف الصور
  - اختلاف palette فقط

## Gate 5. Elessi Spirit Retention

- رغم الاختلاف، يجب أن يبقى واضحًا أن القالب من عائلة `Elessi`
- الإشارات المطلوبة:
  - rich commerce, not sparse landing
  - merchandising intent
  - fast product discovery
  - quick interactions
  - strong PDP decision behavior
- القالب يفشل إذا:
  - صار minimalist زيادة عن اللزوم
  - أو صار generic storefront بلا utility stack

## Gate 6. No Recycled Anatomy

- يجب تنفيذ `Shared Anatomy Audit`
- القالب يفشل إذا:
  - كانت أسماء الـ variants جديدة لكن card shell أو PDP block أو trust structure قديمة
  - أو تشابه مع `existing library theme` أو theme أخرى من الـ pack تشابهًا يكسر novelty

## Gate 7. No Silent Fallback

- أي variant أو section معلنة داخل الثيم:
  - إما implemented صراحة
  - أو تفشل validation
- القالب يفشل إذا:
  - home أو shop أو PDP أو cart أو checkout رجعت إلى generic surface قديمة

## Gate 8. Route Coverage

- المراجعة الإلزامية تشمل:
  - `home`
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
  - `thank-you` إذا كانت ضمن scope
  - mobile
  - RTL
- لا يعتمد القالب إذا نجح route أو routeان فقط

## Gate 9. Capability Honesty

- إذا كان القالب يدّعي حمل capability من `Elessi` مثل:
  - `quick view`
  - `off-canvas cart`
  - `sticky add-to-cart`
  - `bought together`
  - `swatches`
- فيجب أن تكون:
  - حقيقية
  - wired
  - useful في category المقصودة
- لا يكفي badge أو placeholder copy

## Gate 10. Marketplace Contribution

- بما أن القوالب ستظهر لاحقًا في marketplace/library:
  - يجب أن تكون الشخصية ظاهرة أيضًا في:
    - preview image
    - preview chrome
    - card shell
- القالب يفشل إذا:
  - بدا مميزًا فقط في full page
  - لكنه يختفي داخل سطح المكتبة المصغّر

## Hard Fail

- theme uses old visible library families on critical routes
- theme is only a recolor or refont
- theme cannot show `Elessi` extraction notes
- theme has less than `5` new critical visible families
- theme adds zero meaningful shared capability value
- theme is too close to another theme in the pack
- theme is too close to an existing library theme
- theme falls back silently
- theme keeps old anatomy under a new name
- theme drops the `Elessi` commerce spirit and becomes sparse / generic

## Reviewer Scorecard

- anchor compliance:
  - `pass / fail`
- Elessi traceability:
  - `pass / fail`
- new-to-library requirement:
  - `pass / fail`
- library delta:
  - `pass / fail`
- divergence from pack:
  - `pass / fail`
- divergence from existing library:
  - `pass / fail`
- no recycled anatomy:
  - `pass / fail`
- no silent fallback:
  - `pass / fail`
- capability honesty:
  - `pass / fail`
- route coverage:
  - `pass / fail`
- marketplace contribution:
  - `pass / fail`
- final verdict:
  - `accept / revise / reject`
