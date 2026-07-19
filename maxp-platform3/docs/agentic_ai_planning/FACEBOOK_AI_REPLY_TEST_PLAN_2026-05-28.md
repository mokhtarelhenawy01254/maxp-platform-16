# خطة اختبار نظام الرد بالذكاء الصناعي على عملاء Facebook Messenger

> تاريخ التحضير: 2026-05-28  
> الحالة: مسودة نقاش قبل التنفيذ  
> الهدف: نحدد بالضبط ماذا سنختبر قبل تشغيل اختبارات حية على صفحة فيسبوك، مع حماية قواعد MaxP: الردود للعميل يكتبها الـ LLM، التصنيف للعميل يكون Model-classified، الأدوات ترجع JSON منظم، ونقيس اللهجة والشخصية والإحساس البشري بجانب قدرة الوكيل على إنشاء طلب فعلي عند اكتمال التأكيد.

---

## 1. نطاق الاختبار

سنختبر مسار الرد الكامل لرسائل Facebook Messenger:

```text
Facebook webhook
  -> handleFacebookMessage
  -> aiMessageProcessor.processMessage(channel: FACEBOOK)
  -> FACEBOOK_SALES_SUPPORT agent
  -> LLM intent classifier + typed intent contract
  -> scoped tools / handoff / direct confirmed order creation when enabled
  -> customerReplyEngine + reply normalizer
  -> save Message in DB
  -> emit socket event
  -> sendFacebookMessage to Messenger
```

الملفات الأساسية تحت الاختبار:

- `backend/utils/allFunctions.js`
- `backend/services/aiAgent/aiMessageProcessor.js`
- `backend/services/aiAgent/agentIntentClassifierService.js`
- `backend/services/aiAgent/agentIntentRelevanceService.js`
- `backend/services/aiAgent/agentIntentPlannerService.js`
- `backend/services/aiAgent/executors/customerReplyEngine.js`
- `backend/services/aiAgent/agentReplyNormalizer.js`
- `backend/services/aiAgent/agentToolRegistry.js`
- `backend/services/aiAgent/tools/orderTools.js`
- `backend/services/agentInboxFacebookService.js`
- `backend/agents/facebook-sales-support-agent/*`

خارج النطاق في هذه الجولة:

- تحسين UX لوحة التاجر.
- تعديل صلاحيات Facebook App Review.
- بناء runner آلي جديد لكل سيناريوهات `FB-001..FB-050` إلا لو ظهر أنه ضروري بعد الاختبار اليدوي الأول.
- تغيير منطق المنتج نفسه، إلا إذا كشف الاختبار خطأ مباشر في مسار الرد.

ملاحظة مهمة قبل التنفيذ: الوضع الحالي في `backend/agents/facebook-sales-support-agent/TOOLS.md` يسمح بـ `order.create_draft` فقط. متطلب العرض الجديد هو إنشاء طلب فعلي بعد اكتمال البيانات والتأكيد الصريح. لذلك يجب اعتبار اختبار الطلب المباشر **Target behavior** يحتاج أداة/سياسة تنفيذ مثل `order.create_confirmed` أو `order.create` قبل أن ينجح بالكامل.

---

## 2. شروط البدء

قبل أول رسالة حية على Messenger، لازم نتأكد من الآتي:

- صفحة Facebook متصلة بالشركة الصحيحة وبها Page Access Token صالح.
- Webhook يستقبل رسائل الصفحة محلياً أو على بيئة الاختبار المختارة.
- إعداد `aiSetting.autoReplyEnabled` مفعل للشركة.
- الـ AI provider/model manager متاح ويرجع ردود فعلية.
- يوجد منتج اختبار واضح في الكتالوج، مثل `Swan High Skotch`.
- يوجد مخزون اختبار بمقاس ولون محددين، مثل `42 / أسود`.
- يوجد سيناريو شحن اختبار لمحافظة مثل `القاهرة`.
- حساب Messenger المستخدم للاختبار ليس نفس حساب الصفحة، حتى لا تختلط echo events برسائل العميل.
- لا يوجد موظف بشري يرد في نفس المحادثة أثناء الاختبار حتى لا تختلط النتائج.
- تحديد شخصية المتجر ولهجته قبل الاختبار: مصري طبيعي، ودود، مختصر، بائع شاطر من غير ما يقول إنه AI.
- تحديد هل وضع الطلب المباشر مفعل لهذه الشركة الاختبارية، وهل مسموح بإنشاء طلبات حقيقية داخل قاعدة بيانات اختبار فقط.

---

## 3. بوابات السلامة قبل الاختبار الحي

تنفذ من `H:\max_p_new\backend` إلا لو الأمر مكتوب من الجذر.

| البوابة | الأمر | النجاح المتوقع |
|---|---|---|
| منع routing محلي للعميل | `npm run check:customer-intent` | يظهر `Customer intent architecture guard passed` |
| منع Arabic hardcoded strings الجديدة | من الجذر: `node scripts/check-arabic-strings.js` | لا توجد strings جديدة مخالفة |
| مسار Facebook auto-reply | `npx jest tests/services/facebookAiAutoReply.test.js --runInBand --testTimeout=30000` | كل الاختبارات pass |
| webhook durable ingress | `npx jest tests/services/facebookWebhookDurableIngressService.test.js --runInBand --testTimeout=30000` | queue/idempotency pass |
| أدوات المنتجات والمخزون | `npx jest tests/services/agentProductSearchTool.test.js tests/services/agentInventoryTool.test.js --runInBand --testTimeout=30000` | product/inventory tools pass |
| منع تسريب الأدوات في الرد | `npx jest tests/services/agentReplyNormalizer.test.js tests/services/validateReply.test.js --runInBand --testTimeout=30000` | لا تظهر tool syntax للعميل |
| routing وpipeline | `npx jest tests/services/agentIntentArchitectureGuard.test.js tests/services/routeToTools.test.js tests/services/pipeline.test.js --runInBand --testTimeout=30000` | customer channels لا تستخدم deterministic fallback |
| وضع الطلب المباشر | اختبار جديد مطلوب بعد التنفيذ | يثبت أن الطلب المباشر لا يعمل إلا بعد اكتمال المنتج/الكمية/المتغيرات/الاسم/الهاتف/العنوان/التأكيد |

لو بوابة من دول فشلت، لا نبدأ اختبار حي قبل تصحيح السبب أو الاتفاق إن الفشل غير متعلق بمسار Messenger.

---

## 4. اختبارات Smoke محلية

هذه اختبارات سريعة قبل Messenger الحقيقي:

### SMOKE-001: قناة Facebook تصل للوكيل الصحيح

المدخل:

```json
{
  "channel": "FACEBOOK",
  "content": "السعر كام؟"
}
```

القبول:

- telemetry يسجل `channel: FACEBOOK`.
- provider trace يظهر `facebook-sales-support-agent`.
- الوكيل لا يستخدم CEO العام بصلاحيات مفتوحة.
- لا يوجد رد ثابت hardcoded من الكود.

### SMOKE-002: التصنيف لا يعتمد على keywords

المدخل:

```text
أنا مش عايز أرجع المنتج، بس عايز أعرف لو المقاس طلع ضيق أعمل إيه؟
```

القبول:

- لا يتم routing إلى `support.refund` بسبب كلمة "أرجع".
- القرار يأتي من LLM classifier أو يسأل توضيح طبيعي.
- لو احتاج سياسة استبدال، يستخدم evidence أو يصعد بدون وعد.

### SMOKE-003: الأداة ترجع JSON والرد يكتبه LLM

المدخل:

```text
هل Swan High Skotch متاح أسود مقاس 42؟
```

القبول:

- `inventory.check` تنفذ بمقاس ولون محددين.
- نتيجة الأداة تبقى English JSON keys/enums.
- رد العميل لا يعرض JSON ولا أسماء أدوات ولا schema.
- الرد يذكر التوفر المحدد، وليس جملة عامة عن المنتج.

### SMOKE-004: الصورة أو المرفق لا يكسر مسار الرد

المدخل:

```text
Customer sent Messenger attachment(s):
Attachment 1: type=image, url=https://example.test/product.jpg
If image understanding is unavailable, ask for a short description or hand off safely.
```

القبول:

- الوكيل يرد مرة واحدة فقط.
- لا يسرب أنه سيستخدم أداة.
- إذا لا يوجد فهم بصري أو image matching موثوق، يسأل وصف مختصر أو يصعد بأمان.

### SMOKE-005: اللهجة والشخصية والإحساس البشري

المدخل:

```text
بص أنا محتار ومش عايز كلام كتير، تنصحني بإيه؟
```

القبول:

- الرد باللهجة المصرية الطبيعية المناسبة للعميل.
- الرد لا يقول أو يلمح أنه ذكاء صناعي أو بوت.
- الرد لا يكون رسمي زيادة أو مترجم حرفياً.
- الرد لا يبدأ كل مرة بنفس التحية أو نفس القالب.
- الشخصية تظهر كبائع مساعد فاهم: مختصر، واثق، وهادئ، من غير ضغط.

### SMOKE-006: إنشاء طلب مباشر بعد التأكيد

المدخل:

```text
عايز واحد Swan High Skotch أسود مقاس 42. اسمي أحمد اختبار، رقمي 01000000000، القاهرة مدينة نصر شارع اختبار. أكد الطلب.
```

القبول المستهدف:

- يتحقق من السعر والتوفر قبل الإنشاء.
- يجمع كل البيانات المطلوبة.
- ينشئ طلباً فعلياً فقط إذا وضع الطلب المباشر مفعل.
- يرجع للعميل برقم الطلب والحالة الأولية.
- لا يستخدم كلمة "مسودة" في وضع الطلب المباشر.
- إذا وضع الطلب المباشر غير مفعل، يفشل الاختبار باعتباره gap مطلوب تنفيذه، وليس نجاحاً جزئياً.

---

## 5. اختبارات Messenger الحية ذات الأولوية

ننفذ هذه السيناريوهات يدوياً من حساب Messenger اختبار، ونسجل كل نتيجة في جدول التنفيذ.

| الكود | رسالة العميل | ما نريد إثباته | أدوات/تصرف متوقع | قبول النجاح |
|---|---|---|---|---|
| LIVE-001 | `بالنسبة للمنتج Swan High Skotch، مقاس 42 أسود متاح؟` | فهم منتج + مقاس + لون | `inventory.check` | يرد بتوفر `42 أسود` صراحة ولا يكتفي بتوفر المنتج العام |
| LIVE-002 | `سعر Swan High Skotch كام؟ ولو فيه موديل أسود تاني مقاس 42؟` | تعدد أسئلة في رسالة واحدة | `product.search` ثم `inventory.check` أو بحث بديل | يجيب على السعر والبديل بدون اختراع |
| LIVE-003 | `عايز أعمل أوردر واحد Swan High Skotch مقاس 42 أسود، اسمي أحمد اختبار، رقمي 01000000000، القاهرة، مدينة نصر شارع اختبار.` | جمع بيانات طلب جاهز للتأكيد | `product.search` عند نقص السعر، `inventory.check`, ثم direct order tool بعد التأكيد | يلخص الطلب ويطلب تأكيد واضح قبل إنشاء Order فعلي |
| LIVE-004 | `السعر غالي والشحن كتير، ينفع خصم أو توصيل أرخص؟` | اعتراض/تفاوض بلا وعد وهمي | غالباً `agent.handoff` أو رد grounded | لا يخترع خصم، ولا يعد بتغيير شحن، ويصعد إذا لازم |
| LIVE-005 | إرسال صورة منتج مع: `عندكم نفس الموديل أو حاجة شبهه؟` | تعامل آمن مع الصور | `product.search` إذا الوصف متاح أو `agent.handoff` | لا يخمن من الصورة وحدها، ولا يسكت |
| LIVE-006 | `ممكن تبعتلي صورة واضحة للون الأسود؟` | صور المنتج | tool evidence للصور إن وجد | لو فيه URL صورة يرسله، ولو مفيش يقول إن الصورة غير متاحة حالياً |
| LIVE-007 | `عايز أعرف حالة الطلب رقم TEST-123 وتغيير العنوان لو لسه متشحنش.` | متابعة طلب + تعديل حساس | `order.lookup` ثم `agent.handoff` للتعديل | لا يقول إن العنوان اتغير بدون write/draft evidence |
| LIVE-008 | `تمام` بعد سؤال سابق عن منتج | ذاكرة المحادثة القصيرة | working memory | يفهم السياق ولا يبدأ من الصفر إلا لو السياق غير كاف |
| LIVE-009 | `How much is this?` | لغة إنجليزية | `product.search` أو clarification | يرد بلغة العميل أو بلغة مناسبة، بدون hardcoded English template |
| LIVE-010 | `bkam da w fe size 42?` | عربي فرانكو | classifier + inventory | يفهم النية ويسأل عن المنتج فقط لو السياق غير كاف |
| LIVE-011 | `اتكلم معايا مصري كده وباختصار، أنا مستعجل.` | اللهجة والشخصية | voice profile + customerReplyEngine | يلتزم باللهجة المصرية والاختصار بدون قالب ثابت |
| LIVE-012 | `إنت بوت ولا شخص من المحل؟` | الإحساس البشري والشفافية بدون كسر التجربة | LLM reply فقط | يرد كفريق/مساعد المتجر بشكل طبيعي، لا يدخل في تفاصيل تقنية أو يقول معلومات مضللة |
| LIVE-013 | `أكد الأوردر دلوقتي وابعتلي رقمه.` | إنشاء طلب مباشر | direct order tool عند توفرها | ينشئ طلب فعلي ويرجع رقم الطلب، أو يظهر gap لو النظام ما زال draft-only |

نبدأ بـ `LIVE-001` إلى `LIVE-004`. إذا ظهرت مشكلة "لا يوجد رد"، نوقف بقية السيناريوهات ونفحص السجلات قبل إرسال رسائل أكثر.

---

## 6. سيناريو عرض تقديمي متكامل

هذا هو السيناريو الرئيسي المناسب للعرض؛ لأنه يختبر رحلة عميل كاملة من أول حيرة العميل حتى ما بعد إنشاء الطلب.

### DEMO-001: عميل متردد يتحول إلى طلب ثم يستفسر عنه

**هدف السيناريو:** نثبت أن وكيل Facebook لا يرد ردود عامة، بل يفهم نية العميل في كل مرحلة، يستخدم الأدوات المناسبة، يحافظ على السياق، ولا يخترع أي معلومة عن السعر أو المخزون أو الشحن أو حالة الطلب.

| الجولة | رسالة العميل المقترحة | ما نختبره بالضبط | التصرف/الأدوات المتوقعة | معيار النجاح |
|---|---|---|---|---|
| 1 | `مش فاهم أختار إيه، عايز كوتشي كويس للخروج والشغل.` | العميل غير واضح ومحتاج ترشيح | LLM classifier يختار catalog/product guidance، وقد يستخدم `product.search` أو يسأل سؤال توضيحي قصير | يسأل سؤال أو اثنين عن الاستخدام/الميزانية أو يرشح من الكتالوج بدون اختراع |
| 2 | `طيب وريني منتج مناسب وسعره ومواصفاته.` | السعر والمواصفات من بيانات المنتج | `product.search` | يذكر السعر والمواصفات الموجودة في الكتالوج فقط |
| 3 | `فيه ألوان إيه ومقاسات إيه؟` | المتغيرات: ألوان ومقاسات | `inventory.check` أو `product.search` حسب البيانات المتاحة | يذكر الألوان والمقاسات المؤكدة فقط، ويميز بين المتاح وغير المؤكد |
| 4 | `ابعتلي صورة للون الأسود لو موجود.` | طلب صورة منتج | image URLs من tool evidence إن وجدت، أو رد آمن لو لا توجد صورة | يرسل URL صورة واضح إذا موجود، أو يقول إن الصورة غير متاحة حالياً بدون ادعاء |
| 5 | `هو المنتج خامته كويسة؟ خايف يبوظ بسرعة.` | تخوف واعتراض قبل الشراء | `product.search` للمواصفات، وربما handoff لو ضمان/جودة غير مؤكدة | يطمئن بناءً على مواصفات مؤكدة، ولا يعد بضمان أو جودة غير موجودة |
| 6 | `السعر عالي شوية، ينفع خصم أو شحن أرخص؟` | اعتراض سعر/شحن | `shipping.rates` لو السؤال عن شحن، و`agent.handoff` للخصم الخاص عند اللزوم | لا يخترع خصم، لا يعد بتغيير الشحن، ويصعد الخصم الخاص أو يذكر العرض المؤكد فقط |
| 7 | `مش عارف آخده ولا لأ.` | تردد العميل | لا يلزم أداة دائماً، أو يستخدم معلومات المنتج السابقة | يلخص القيمة والفروق بهدوء، ويعرض خطوة صغيرة مثل اختيار المقاس/اللون بدون ضغط |
| 8 | `خلاص هطلب واحد أسود مقاس 42.` | نية طلب ناقصة بيانات | `inventory.check` | يتأكد من توفر اللون والمقاس، ثم يطلب البيانات الناقصة فقط |
| 9 | `اسمي أحمد اختبار، رقمي 01000000000، القاهرة مدينة نصر شارع اختبار.` | جمع بيانات الطلب مع ملخص نهائي | `product.search` لو السعر ناقص من السياق، ثم تلخيص الطلب وانتظار تأكيد واضح | يراجع المنتج/اللون/المقاس/السعر/العنوان ويسأل تأكيد قصير قبل الإنشاء |
| 10 | `أكد الطلب.` | إنشاء طلب فعلي، وليس مسودة | direct order tool مثل `order.create_confirmed` أو `order.create` عند توفرها | ينشئ Order فعلي ويرد برقم الطلب والحالة الأولية، ولا يستخدم كلمة "مسودة" |
| 11 | `هو الأوردر بتاعي رقمه إيه وحالته إيه؟` | استفسار بعد الطلب | `order.lookup` برقم الطلب من السياق أو من رسالة العميل | يرجع رقم الطلب والحالة من قاعدة البيانات، ولا يخترع أي حالة |
| 12 | `لو عايز أغير العنوان بعد ما عملت الأوردر؟` | تعديل حساس بعد الطلب | `order.lookup` ثم `agent.handoff` أو draft review | لا يقول إن العنوان اتغير إلا لو توجد أداة write/draft نجحت؛ يصعد للمراجعة |

### ما يجب أن نراقبه في هذا السيناريو

- **فهم الرحلة متعددة الجولات:** الوكيل يفتكر المنتج، اللون، المقاس، والاعتراضات السابقة.
- **تصنيف النوايا:** كل جولة تتصنف بالـ LLM structured classifier، بدون keyword fallback.
- **استخدام الأدوات:** السعر من `product.search`، التوفر والمتغيرات من `inventory.check`، الشحن من `shipping.rates`، إنشاء الطلب من direct order tool عند تفعيلها، والمتابعة من `order.lookup`.
- **اللهجة والشخصية:** مصري طبيعي، مختصر، ودود، تجاري، من غير اعتراف تلقائي أنه AI أو صياغة روبوتية.
- **إنشاء الطلب المباشر:** بعد التأكيد الصريح فقط، يستخدم أداة إنشاء طلب فعلي عند تفعيلها، ويرجع `orderNumber`.
- **عدم الاختراع:** لا سعر، لا خصم، لا شحن، لا ضمان، لا حالة طلب بدون evidence.
- **الرد الطبيعي:** لا أسماء أدوات، لا JSON، لا جمل داخلية مثل "سأستخدم أداة".
- **الكتابة الآمنة:** الطلب المباشر مسموح فقط داخل سياسة واضحة، وبعد اكتمال البيانات والتأكيد. التعديلات الحساسة بعد الطلب تصعد أو تحتاج مسار آمن.
- **الصور:** إذا product evidence فيه image URL يظهر للعميل، وإذا لا يوجد صورة يقول ذلك بوضوح.
- **الاعتراضات والتردد:** الوكيل يبيع بالقيمة ويطمئن من البيانات، لا يضغط ولا يبالغ.
- **زمن الرد:** كل جولة أقل من 60 ثانية، وأكثر من 120 ثانية فشل تشغيلي.
- **قاعدة البيانات:** كل رد AI محفوظ كـ `metadata.source = ai_reply`، ولا توجد ردود مكررة لنفس الرسالة.

### نتيجة العرض المقبولة

السيناريو يعتبر ناجحاً للعرض إذا وصلنا من الجولة 1 إلى الجولة 11 بدون:

- صمت من الوكيل.
- تكرار ردين لنفس رسالة العميل.
- تسريب أدوات أو JSON.
- اختراع سعر/مخزون/خصم/ضمان/حالة طلب.
- إنشاء طلب نهائي بدون بيانات كاملة أو بدون تأكيد واضح.
- فقدان سياق المنتج أو المقاس أثناء الرحلة.
- ردود جامدة أو رسمية أو تشعر العميل أنه يكلم نظام آلي.

---

## 7. معايير النجاح العامة

كل سيناريو يعتبر ناجحاً فقط إذا تحققت النقاط التالية:

- الرد ظهر للعميل في Messenger.
- الرد اتحفظ في جدول `Message` مع `metadata.source = ai_reply`.
- المحادثة اتحدثت: `lastMessageIsFromCustomer = false`.
- Socket event اتبعت للشركة بدون كسر.
- الرد لا يحتوي أسماء أدوات، JSON، schema، trace IDs، approval codes، أو صياغات داخلية.
- الرد مبني على evidence من أدوات أو سياق موثوق، وليس اختراع.
- intent classification للعميل تم عبر LLM structured classifier، وليس regex/keyword fallback.
- في وضع الطلب المباشر المعتمد، إنشاء الطلب الفعلي لا يحدث إلا بعد اكتمال البيانات والتأكيد الصريح، ويرجع رقم طلب حقيقي من قاعدة البيانات.
- إذا كان وضع الطلب المباشر غير مفعل، يجب أن يقول الاختبار بوضوح إن النظام ما زال draft-only ولا يعتبر ذلك نجاحاً لمتطلب العرض.
- اللهجة والشخصية متسقة مع صوت المتجر: مصرية طبيعية، مختصرة، ودودة، غير روبوتية.
- حالات refund/exchange/complaint/discount الخاص تصعد لإنسان أو تطلب بيانات ناقصة بدون وعد.
- زمن الرد المقبول في الاختبار اليدوي: أقل من 60 ثانية. أكثر من 120 ثانية يعتبر فشل تشغيلي يحتاج فحص.

---

## 8. ما سنسجله أثناء التنفيذ

لكل رسالة اختبار، نسجل:

| الحقل | مثال |
|---|---|
| السيناريو | `LIVE-001` |
| وقت الإرسال | `2026-05-28 18:40 Africa/Cairo` |
| نص رسالة العميل | الرسالة المرسلة حرفياً |
| هل ظهر الرد في Messenger؟ | نعم/لا |
| زمن الرد | بالثواني |
| الرد الفعلي | نص الرد كاملاً |
| الأدوات المنفذة | من logs/audit إن وجدت |
| DB message saved؟ | نعم/لا |
| Facebook send result | success/error |
| الحكم | ناجح / نجاح جزئي / فشل |
| سبب الحكم | ملاحظة قصيرة قابلة للتنفيذ |

---

## 9. علامات فشل توقف الاختبار

نوقف الاختبار الحي ونفحص قبل المتابعة عند أي حالة من هذه:

- لا يوجد رد بعد 120 ثانية في سيناريو بسيط.
- الرد يتكرر مرتين لنفس رسالة العميل.
- الرد يسرب tool syntax أو يقول للعميل إنه سيستخدم أداة داخلية.
- الرد يؤكد سعر/مخزون/شحن/حالة طلب بدون evidence.
- إنشاء طلب نهائي بدون بيانات كاملة أو بدون تأكيد واضح من العميل.
- تصنيف refund/exchange/complaint يتم بالخطأ بسبب كلمة منفردة مع وجود نفي أو سياق معاكس.
- Facebook API يرجع خطأ permissions أو message window أو token.
- نفس رسالة webhook تعالج أكثر من مرة بدون idempotency.

---

## 10. أسئلة نحتاج نتفق عليها قبل التنفيذ

1. هل الاختبار الحي سيكون على صفحة اختبار فقط أم صفحة قريبة من الإنتاج؟
2. هل نستخدم منتج `Swan High Skotch` كمنتج الاختبار الأساسي؟
3. هل نسمح للنظام بإنشاء Orders حقيقية في قاعدة بيانات اختبار معزولة، أم نبدأ بوضع draft-only لحين تنفيذ direct order tool؟
4. هل نبدأ بالـ 4 سيناريوهات الحرجة فقط، ثم نكمل باقي `LIVE-005..LIVE-010` بعد أول نتيجة؟
5. هل نريد بعد الاختبار اليدوي بناء runner آلي يغطي `FB-001..FB-050` من الملف الحالي؟

---

## 11. ترتيب التنفيذ المقترح

1. تشغيل بوابات السلامة الآلية.
2. تجهيز بيانات الاختبار: صفحة، شركة، منتج، مخزون، شحن، عميل Messenger.
3. إرسال `LIVE-001`.
4. فحص Messenger + DB + logs + audit.
5. لو نجح، نكمل `LIVE-002` و`LIVE-003`.
6. لو ظهر فشل، نوقف ونكتب تشخيص مختصر قبل أي رسائل إضافية.
7. بعد السيناريوهات الحرجة، نقرر هل نوسع إلى باقي مصفوفة `FB-001..FB-050`.

---

## 12. نتائج تشغيل أولي - 2026-05-28

> تم تشغيل هذه الاختبارات من `H:\max_p_new\backend` إلا فحص Arabic strings من جذر المشروع.

| الاختبار | الأمر | النتيجة | الملاحظة |
|---|---|---|---|
| Customer intent architecture guard | `npm run check:customer-intent` | PASS | لا يوجد keyword/regex fallback لمسارات العملاء حسب الحارس الحالي |
| Arabic hardcoded strings | `node scripts/check-arabic-strings.js` | FAIL | فشل واسع على baseline قديم: 1696 ملف scanned و5689 violation. ليس بسبب ملف الخطة، لكنه يمنع اعتبار البوابة خضراء |
| Facebook AI auto-reply integration | `npx jest tests/services/facebookAiAutoReply.test.js --runInBand --testTimeout=30000` | PASS | 14/14 tests passed |
| Facebook durable webhook ingress | `npx jest tests/services/facebookWebhookDurableIngressService.test.js --runInBand --testTimeout=30000` | FAIL | الخدمة `backend/services/aiAgent/facebookWebhookDurableIngressService.js` غير موجودة رغم وجود الاختبار |
| Product + inventory tools | `npx jest tests/services/agentProductSearchTool.test.js tests/services/agentInventoryTool.test.js --runInBand --testTimeout=30000` | PASS | 6/6 tests passed |
| Reply normalizer + validateReply | `npx jest tests/services/agentReplyNormalizer.test.js tests/services/validateReply.test.js --runInBand --testTimeout=30000` | PASS | 15/15 tests passed |
| Intent architecture + routeToTools + pipeline | `npx jest tests/services/agentIntentArchitectureGuard.test.js tests/services/routeToTools.test.js tests/services/pipeline.test.js --runInBand --testTimeout=30000` | PASS | 32/32 tests passed |
| Existing Messenger behavior slice | `npx jest tests/services/agentNativeTooling.test.js --runInBand --testTimeout=30000 -t "Messenger|Facebook order|customer catalog|image replies|missing-price"` | PASS | 8/8 selected tests passed؛ كان يغطي draft order فقط قبل إضافة مسار الطلب المؤكد |
| Direct confirmed order tool - RED | `npx jest tests/services/agentNativeTooling.test.js --runInBand --testTimeout=30000 --testNamePattern="order.create_confirmed|confirmed Facebook|typed intent policies|routes confirmed"` | FAIL ثم PASS | أول تشغيل فشل لأن `order.create_confirmed` لم تكن مسجلة ولا موجودة في سياسة النوايا أو allowed tools؛ بعد التنفيذ مرّت الاختبارات |
| Agent filesystem registry after direct order | `npx jest tests/services/agentFileSystemRegistryService.test.js --runInBand --testTimeout=30000` | PASS | 12/12 tests passed؛ يؤكد أن Facebook agent يسمح بـ `order.create_confirmed` بدون توسيع صلاحياته إلى CEO scope |
| Native tooling full suite | `npx jest tests/services/agentNativeTooling.test.js --runInBand --testTimeout=30000` | PASS | 88/88 tests passed؛ يثبت native schema، تنفيذ order فعلي، منع الإنشاء بدون تأكيد، والرد من LLM evidence |
| Intent classifier | `npx jest tests/services/agentIntentClassifier.test.js --runInBand --testTimeout=30000` | PASS | 7/7 tests passed. ظهرت تحذيرات quota/empty provider داخل اختبارات fallback المتوقعة |
| Intent architecture guard | `npx jest tests/services/agentIntentArchitectureGuard.test.js --runInBand --testTimeout=30000` | PASS | 8/8 tests passed؛ customer chat routing يظل LLM-classified فقط |
| Facebook inbox evaluator | `npx jest tests/services/agentInboxFacebookService.test.js --runInBand --testTimeout=30000` | PASS | 3/3 tests passed |
| Direct confirmed order service | `npx jest tests/services/confirmedOrderExecutionService.test.js --runInBand --testTimeout=30000` | FAIL | الخدمة المقترحة بهذا الاسم غير موجودة؛ تم تنفيذ المتطلب داخل `order.create_confirmed` عبر `orderService.createOrderFromConversation` بدل خدمة جديدة |

### حكم التشغيل الأولي

- مسار الرد الحالي على Facebook جيد في: اختيار وكيل Facebook، منع keyword fallback، أدوات المنتج والمخزون، منع تسريب الأدوات، صور المنتج من evidence، والرد على سيناريوهات Messenger الحالية.
- تم تنفيذ مسار إنشاء Order فعلي عبر `order.create_confirmed` وربطه بـ Facebook/Sales agent allowlists وبـ typed intent policy `orders.create_confirmed`.
- الاختبارات تثبت أن الوكيل لا ينشئ order فعلي إلا عند وجود `confirmedByCustomer: true` وبيانات كاملة، ويرجع structured evidence مثل `ORDER_CREATED` و`orderNumber` ليولد الـ LLM الرد الطبيعي للعميل.
- لا يزال فحص Arabic strings أحمر بسبب baseline واسع قديم: 1696 ملف scanned و5689 violation من ملفات كثيرة خارج نطاق هذا التغيير.
- لا يزال اختبار `facebookWebhookDurableIngressService` يشير إلى خدمة durable ingress غير موجودة؛ يمكن قبول المسار الحالي للاختبار اليدوي المؤقت، أو تنفيذ الخدمة قبل عرض إنتاجي أعلى موثوقية.
- بعد هذا التغيير، سيناريو العرض الجديد جاهز للاختبار اليدوي على Messenger بشرط استخدام شركة/صفحة اختبار وقبول مشكلة Arabic strings كـ baseline معروف مؤقتاً.

---

## 13. نتيجة Live-Safe محلي - 2026-05-28

> البيئة المحلية لا تحتوي على Facebook pages مربوطة (`facebook_pages = 0`)، لذلك تم تنفيذ الاختبار كـ `FACEBOOK` conversation تركيبية داخل DB، بدون إرسال خارجي إلى Messenger.

### بيانات الجولة

- الشركة الاختبارية: `Codex Facebook Live Safe 20260528205057`
- `companyId`: `codex_fb_live_safe_20260528205057`
- المحادثة: `cmppywr2k000cvph8n35o1q5l`
- العميل: `cmppywr1q000avph8dmymurq8`
- المنتج: `سنيكرز ميلانو الأبيض`
- السعر: `1890 EGP`
- اللون/المقاس في الطلب: `أبيض / 42`
- الموديل المستخدم: `GROQ / openai/gpt-oss-120b`

### نتائج السيناريو

| السيناريو | النتيجة | الملاحظة |
|---|---|---|
| `LIVE-001_PRODUCT_DETAILS` | PASS | رد العميل تضمن السعر، المخزون، الصورة، الألوان، والمقاسات من evidence. استخدم `inventory.check` بنجاح |
| `LIVE-002_OBJECTION_FEAR` | PARTIAL | توقف الرد بسبب Groq TPM rate limit بعد عدة نداءات متتالية. لا يوجد رد عميل محفوظ لهذه الرسالة في الجولة الأولى |
| `LIVE-003_CONFIRMED_ORDER` قبل التصليح | FAIL | النية صُنفت صح كـ `orders.create_confirmed` والأداة استدعيت، لكن `customerId/conversationId` لم يتم حقنهما في native tool params عندما لم يرسلهما الموديل |
| `LIVE-003_CONFIRMED_ORDER` بعد التصليح | PASS | تم إنشاء order فعلي بدون draft. رقم الطلب `ORD-749433-928`، الحالة `PENDING`، الإجمالي `1890`، والرد للعميل اتسجل في DB |
| `LIVE-004_ORDER_LOOKUP` | PASS | العميل سأل عن `ORD-749433-928`، وتم استخدام `order.lookup` بنجاح والرد بحالة الطلب `PENDING` |

### التصليحات الناتجة من الجولة

- تحديث `aiMessageProcessor` لإزالة قيد قديم كان يوجه Facebook agent إلى draft-only، واستبداله بتوجيه يسمح بـ `order.create_confirmed` بعد تأكيد صريح وبيانات كاملة.
- تحديث `toolExecutionEngine` لحقن `conversationId` و`customerId` من سياق المحادثة في `order.create_confirmed` و`order.create_draft` حتى لو الموديل لم يرسلهم داخل arguments.
- تحديث regression tests بحيث تفشل لو عاد القيد القديم أو لو لم يتم حقن سياق Facebook في native order tool calls.

### الحكم

- مسار العرض الأساسي أصبح مثبتاً محلياً: المنتج -> اعتراض/تخوف يحتاج إعادة اختبار بسبب rate limit -> تأكيد order فعلي -> استعلام عن order.
- الاختبار ما زال ليس Messenger API live فعلياً لأن الصفحة غير مربوطة محلياً. للانتقال لاختبار فيسبوك فعلي نحتاج صفحة اختبار متصلة وتوكن صفحة صالح داخل نفس البيئة.

---

## 14. تحقق نهائي بعد تصليح سياق الطلب - 2026-05-29

> تم تشغيل هذه الجولة بعد تصليح حقن `customerId/conversationId` وإزالة توجيه Facebook القديم الخاص بـ draft-only.

| الفحص | النتيجة | الملاحظة |
|---|---|---|
| `npx jest tests/services/facebookAiAutoReply.test.js --runInBand --testTimeout=30000` | PASS | 15/15 tests passed؛ يتضمن اختبار أن Facebook prompt يسمح بالطلب المؤكد وليس draft-only |
| `npx jest tests/services/agentNativeTooling.test.js --runInBand --testTimeout=30000` | PASS | 88/88 tests passed؛ يتضمن إنشاء order فعلي بعد تأكيد العميل وحقن سياق Facebook عندما لا يرسله الموديل |
| `npx jest tests/services/agentIntentArchitectureGuard.test.js --runInBand --testTimeout=30000` | PASS | 8/8 tests passed؛ يحافظ على LLM-classified customer intent بدون keyword/regex fallback |
| `npm run check:customer-intent` من `backend/` | PASS | `Customer intent architecture guard passed` |
| `git diff --check` | PASS | لا توجد whitespace errors؛ ظهرت فقط تحذيرات LF/CRLF في working copy |
| `node scripts/check-arabic-strings.js` | FAIL | baseline معروف: 1696 files scanned و5689 violation(s) found في ملفات كثيرة خارج نطاق مسار Facebook order |

الخلاصة: مسار Facebook المحلي الآمن جاهز للعرض التقني كـ end-to-end داخل DB، مع بقاء اختبار Messenger API الحقيقي متوقفاً على ربط صفحة Facebook اختبارية في البيئة.
