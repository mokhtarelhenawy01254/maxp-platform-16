# مراجعة نظام الذكاء الاصطناعي - 2026-05-02

هذا الملف مرجع تشغيلي سريع لنظام الذكاء الاصطناعي الحالي: كيف يستقبل الرسائل، ما المسار المستخدم فعليا، ما القدرات الموجودة، وما الفجوات التي ظهرت أثناء الاختبار. لا يحتوي هذا الملف على مفاتيح API أو أسرار.

## الخلاصة التنفيذية

النظام عنده طبقتان أساسيتان:

1. `CoreAIAgent`: المسار الأهم حاليا لرسائل Facebook Messenger الفعلية، وهو أيضا متاح في `/test-chat` بعد التعديل الأخير.
2. `aiAgentService`: المسار العام القديم/الحديث المستخدم في `/test-chat` legacy، تعليقات Facebook، WhatsApp، وبعض أدوات الاختبار. هذا المسار هو الذي يستخدم مزودي الخدمة مثل OpenRouter عبر `AIProviderFactory`.

أهم نقطة: إعداد OpenRouter الحالي شغال كمزود مركزي مع تدوير مفاتيح ونماذج، لكن مسار `CoreAIAgent` في الإنتاج لا يستخدم OpenRouter في مرحلة التفكير الحر. `CoreAIAgent` يحاول Gemini/Google مباشرة، ولو لا يوجد مفتاح Google صالح يرجع إلى رد حتمي من بيانات المنتج/الشحن/الأوردر إن كان يستطيع. fallback OpenRouter الذي أضفناه موجود في `/test-chat` فقط حتى نستطيع اختبار Core محليا.

## الحالة الحالية لشركة maxp

Snapshot من قاعدة البيانات بتاريخ 2026-05-02:

- الشركة: `maxp`
- `autoReplyEnabled`: مفعل
- `useModernAgent`: غير مفعل، لذلك مسار `aiAgentService` يستخدم `LegacyAgent` افتراضيا
- `ragEnabled`: مفعل
- `multimodalEnabled`: مفعل
- `includeImages`: مفعل
- `autoCreateOrders`: غير مفعل في إعدادات `AiSetting`، لكن `CoreAIAgent` لديه منطق إنشاء أوردر مستقل عند التأكيد الصريح
- `replyMode`: `all`
- `workingHoursEnabled`: غير مفعل
- `defaultProvider`: `OPENROUTER`
- `enableFailover`: مفعل
- مفاتيح OpenRouter المركزية النشطة: 6 مفاتيح
- النماذج النشطة على المفاتيح تشمل: `openai/gpt-oss-20b:free`, `minimax/minimax-m2.5:free`, `openrouter/free`, `openrouter/auto`, وبعض النماذج الأخرى
- `SystemPrompt` نشط للشركة: 0
- `PromptTemplate` نشط للشركة: 0، وهو معلّم في السكيما كـ legacy/unused
- `PromptLibrary`: 0، وهو معلّم في السكيما كـ planned/unused
- المنتجات: 10 منتجات، كلها نشطة
- مناطق الشحن النشطة: 0

## مسارات دخول الرسائل

### Facebook Messenger الفعلي

الملف: `backend/utils/allFunctions.js`

بعد حفظ رسالة العميل والمحادثة، يتم استدعاء:

- `CoreAIAgent.processMessage(...)`

الاستدعاء غير متزامن حتى لا يعطل webhook. هذا هو المسار الإنتاجي المهم حاليا للرسائل الخاصة.

### صفحة الاختبار `/test-chat`

الملف: `backend/controller/testChatController.js`

الصفحة تقدر تختار بين:

- `agentMode: "core"` -> `CoreAIAgent.processMessageForTest(...)`
- غير ذلك -> `aiAgentService.processCustomerMessage(...)`

وضع Core في الاختبار يشغل نفس عقل Core تقريبا، لكنه لا يرسل إلى Facebook، ويرجع الرد للواجهة. أضفنا له fallback محدود إلى المزود النشط حتى لا تصمت صفحة الاختبار عندما لا يوجد Gemini صالح.

### تعليقات Facebook

الملف: `backend/controller/commentController.js`

التعليقات تستخدم:

- `aiAgentService.processCustomerMessage(...)`

أي أنها ليست على `CoreAIAgent` حاليا.

### WhatsApp

الملف: `backend/services/whatsapp/WhatsAppAIIntegration.js`

WhatsApp يستخدم:

- `aiAgentService.processCustomerMessage(...)`

ثم يرسل النص والصور عبر `WhatsAppMessageHandler`. هو أيضا ليس على `CoreAIAgent` حاليا.

## كيف يعمل CoreAIAgent

الملف: `backend/services/CoreAIAgent.js`

التدفق الرئيسي في `processMessage`:

1. يتأكد أن `AiSetting.autoReplyEnabled = true`.
2. يشغل typing indicator في Messenger والواجهة.
3. يبني `contextBag` من الذاكرة والمنتجات والنية والسياق والشحن والصور.
4. يحدث ملخص المحادثة حتى لا يطلب بيانات موجودة بالفعل.
5. يحاول إنشاء أوردر لو رسالة العميل تأكيد صريح والبيانات كافية.
6. لو الرسالة شكر/إغلاق يرد برد قصير.
7. غير ذلك يدخل مرحلة التفكير `thinkAndGenerateResponse`.
8. يفحص تدخل الموظف البشري قبل الإرسال.
9. يراجع الرد: تحسين صياغة، تصحيح أسعار، فرض حقائق الشحن، تنظيف placeholders.
10. يجهز صور المنتجات لو مطلوبة.
11. ينظف الرد للعميل ويضمن وجود سؤال مناسب.
12. يحفظ رسالة AI في قاعدة البيانات.
13. يرسل الرد إلى Facebook Messenger.
14. يرسل socket event للواجهة، ويرسل الصور إن وجدت.
15. يوقف typing indicator.

## ما الذي يفعله contextBag

`prepareContextBag` هو قلب Core. هو يجمع:

- آخر رسائل المحادثة كذاكرة قصيرة.
- ملخص محادثة من metadata إذا كان موجودا.
- نية الرسالة: تحية، سعر، صورة، شحن، أوردر، دعم، استفسار منتج، متغيرات.
- persona مناسبة حسب النية.
- مطابقة منتج من الكتالوج بالاسم والكلمات والبحث السياقي.
- متغيرات المنتج: لون، مقاس، صور المتغير.
- طلبات الصور.
- browsing عام للكتالوج.
- سياق الشحن، لو النظام قدر يستخرج محافظة.
- سياق السياسات والدعم.
- بيانات تساعد إنشاء الأوردر.

## مرحلة التفكير داخل Core

`thinkAndGenerateResponse` تعمل كالتالي:

- تحاول أولا ردودا حتمية آمنة لبعض حالات الكتالوج والتوافر.
- تبني `authoritativeReplyBlueprint` من بيانات المنتج/الشحن/الدعم/الأوردر.
- تبحث عن مفتاح Google/Gemini خاص بالشركة أو مركزي.
- لو لا يوجد Gemini، ترجع الـ blueprint إن وجد.
- لو يوجد Gemini، ترسل له system instruction مبني من persona وRAG والمنتج والـ blueprint.
- لو النموذج أخرج رد غير ملتزم بالـ blueprint، يتم تجاهله واستخدام الرد الحتمي.
- لو فشل Gemini، يحاول fallback منخفض المخاطر.

هذا يعني أن جودة Core في الإنتاج تعتمد على أحد أمرين:

- وجود رد حتمي كاف من بيانات النظام.
- أو وجود مفتاح Google/Gemini صالح.

OpenRouter لا يدخل هنا في الإنتاج حاليا.

## قدرات النظام الموجودة

### محادثات مبيعات بالعربي المصري

النظام مصمم يرد باللهجة المصرية، يختصر، ويحاول يتكلم كبائع لا كروبوت. Core يمنع ذكر اسم العميل داخل الرد ويستخدم "يا فندم" و"حضرتك".

### بحث كتالوج ومنتجات

يدعم:

- البحث باسم المنتج.
- البحث بكلمات متفرقة.
- متابعة سياقية مثل "بكام؟" بعد ذكر منتج.
- عرض قائمة منتجات عند طلب الكتالوج.
- منع اختراع منتج غير موجود.
- تثبيت المنتج المطابق في الرد والـ metadata.

### أسعار ومخزون

يدعم:

- إرجاع سعر المنتج.
- التفرقة بين سعر المنتج والشحن والإجمالي.
- تصحيح السعر في الرد لو النموذج ذكر رقم غير صحيح.
- دعم أسعار المتغيرات جزئيا حسب بيانات `ProductVariant`.

### صور المنتجات والمتغيرات

يدعم:

- إرسال صور المنتج مع الرد.
- استخراج صور المتغيرات عند طلب لون/صورة.
- إزالة روابط الصور من النص قبل الإرسال كرسائل صور منفصلة.
- تحليل صورة واردة للعميل في Core/Gemini عندما يتوفر مفتاح صالح.

### المتغيرات: لون ومقاس

يدعم منطق استخراج لون/مقاس من الرسالة ومطابقته مع `ProductVariant`. لكن اختبارات السيناريوهات أظهرت أن هذا الجزء يحتاج إصلاحا، خصوصا عندما يسأل العميل عن المقاسات أو يعدل مقاسا داخل أوردر.

### الشحن

يوجد `shippingService` لاستخراج المحافظة والبحث عن تكلفة الشحن من `ShippingZone` أو flat shipping.

لكن في الحالة الحالية لشركة `maxp` عدد مناطق الشحن النشطة = 0، لذلك لا يوجد سعر شحن مؤكد في البيانات. هذا يفسر فشل بعض سيناريوهات الشحن أو طلب المحافظة مرة أخرى.

### الأوردرات

Core يقدر:

- يجمع المنتج/اللون/المقاس/الاسم/الهاتف/المحافظة/العنوان.
- يستخدم ملخص المحادثة حتى لا يطلب نفس البيانات مرة أخرى.
- يعرض ملخصا ويطلب تأكيد.
- ينشئ أوردر عبر `EnhancedOrderService` عند التأكيد الصريح.

المسار القديم لديه `OrderProcessor` بقدرات إضافية:

- `processOrderSinglePass`
- `extractOrderDetailsFromMemory`
- `detectConfirmationWithAI`
- `attemptOrderCreationWithNewData`

لكن هذا تابع لمسار `aiAgentService` وليس قلب Core إلا حيث يستدعي Core بعض الوظائف المساعدة.

### الدعم والسياسات

Core يحاول كشف نوايا:

- مشكلة في أوردر
- استبدال/استرجاع
- طلب موظف
- غضب أو شكوى

لكن السيناريوهات الأخيرة أوضحت أن هذه النوايا أحيانا تختلط بالبيع أو الأوردر. لذلك الدعم والتصعيد يحتاجان أولوية إصلاح.

### Human override

Core يفحص إن كان موظف بشري رد بعد رسالة العميل. لو حدث ذلك، يلغي رد AI حتى لا يحصل تداخل.

### الذاكرة

يوجد:

- ذاكرة قصيرة من آخر الرسائل.
- `ConversationMemory` في المسار القديم/الحديث.
- ملخص محادثة داخل metadata في Core.

### RAG

`ragService` يدعم:

- تحميل المنتجات إلى `productIndex`.
- تحميل FAQ/policies إلى `knowledgeBase`.
- embeddings للمنتجات.
- بحث semantic ونصي.

لكن البيئة الحالية فيها تحذيرات:

- مفتاح Google embedding غير صالح أو غير موجود.
- دالة/vector setup مثل `cosine_similarity` غير مكتملة في قاعدة البيانات.

لذلك RAG النصي/الفهرسي يعمل بدرجات، أما semantic/vector يحتاج تثبيت.

### مزودو الخدمة وOpenRouter

`AIProviderFactory` يدعم:

- `GOOGLE`
- `DEEPSEEK`
- `HUGGINGFACE`
- `OLLAMA`
- `GROQ`
- `OPENROUTER`

`OpenRouterProvider` يستخدم OpenAI-compatible endpoint:

- `/chat/completions`
- يدعم model وtemperature وmax_tokens
- يضيف `HTTP-Referer` و`X-Title`
- يعيد usage/cost/provider metadata

`responseGenerator` لديه:

- semantic cache
- اختيار مفتاح عبر `modelManager.getNextKeySimple`
- retry حسب عدد المفاتيح المتاحة
- تدوير سريع عند 429/503
- تعطيل نموذج عند 404
- تعطيل مفتاح عند 403/invalid/leaked
- cooldown 24 ساعة عند خطأ OpenRouter `free-models-per-day`
- `maxProviderAttempts` لتقليل محاولات الاختبار

## ModernAgent

يوجد مسار `ModernAgent` تحت:

- `backend/services/aiAgent/modern/ModernAgent.js`

وهو مصمم كـ ReAct/function-calling مبسط، ومعه أدوات:

- `get_product_price`
- `get_shipping_info`

لكن `maxp` حاليا `useModernAgent = false`، لذلك هذا المسار غير مستخدم افتراضيا. كما أن بعض regex العربية في `ModernAgent` ظاهرة بترميز غير سليم داخل الملف، وهذا قد يضعف كشف السعر والشحن بالعربي إذا تم تفعيله.

## نظام البرومبت

مصدر البرومبت في `aiAgentService/settingsManager.js`:

1. `customPrompt` القادم مع الرسالة.
2. `aiSettings.responseRules.customRules`.
3. `SystemPrompt` نشط للشركة.
4. fallback default.

الحالة الحالية:

- لا يوجد `SystemPrompt` نشط لشركة maxp.
- لا يوجد `responseRules`.
- `PromptTemplate` معلّم legacy/unused.
- `PromptLibrary` معلّم planned/unused وليس مرتبطا بشركة.

لذلك أي "نظام توليد برومبت" عملي حاليا محدود في `settingsManager`، وليس منظومة prompt library كاملة مفعلة.

## نتائج الاختبار الأخيرة

تم تشغيل 14 سيناريو على Core في `/test-chat`.

النتيجة الآلية:

- Pass: 10
- Needs review: 4
- Fail: 0

لكن المراجعة البشرية أوضحت أن بعض الـ pass كانت مضللة. أهم المشاكل:

- سؤال المقاسات رجع كأنه سؤال ألوان ثم خرج للشحن.
- طلب شبه كامل ذكر `Running Sneakers`، لكن Core طلب اسم المنتج مرة أخرى.
- تعديل المقاس من 42 إلى 43 لم يتعامل معه كتعديل واضح.
- الشحن للقاهرة لم يلتقط المحافظة بشكل كاف، ومع عدم وجود ShippingZone لا يوجد سعر مؤكد.
- سؤال الاستبدال وطلب موظف اختلطا بمنطق البيع/الأوردر.
- fallback OpenRouter قال مرة إن `Running Sneakers` غير موجود رغم وجوده.

تفاصيل التشغيل محفوظة في:

- `backend/docs/ai-core-scenario-rerun-2026-05-02.md`
- `artifacts/ai-chat-scenario-run-2026-05-01T22-10-50-055Z.md`
- `artifacts/ai-chat-scenario-run-2026-05-01T22-10-50-055Z.jsonl`

## أهم الفجوات

1. Core لا يستخدم المزود النشط OpenRouter في الإنتاج، رغم أن OpenRouter هو defaultProvider.
2. لا يوجد مفتاح Gemini صالح محليا، لذلك Core يعتمد غالبا على ردود حتمية أو يصمت في الإنتاج لو لا يوجد blueprint.
3. لا توجد مناطق شحن نشطة لشركة maxp، فالشحن لا يمكن اختباره بسعر حقيقي.
4. لا يوجد SystemPrompt/responseRules للشركة، لذلك شخصية الشركة غير مخصصة.
5. PromptLibrary/PromptTemplate ليست منظومة فعالة حاليا.
6. RAG semantic يحتاج إصلاح embeddings/vector setup.
7. دعم العملاء/التصعيد يحتاج أولوية أعلى من منطق البيع.
8. منطق المتغيرات يحتاج فصل واضح بين لون ومقاس وتعديل اختيار سابق.
9. ModernAgent غير مفعل، وعنده مؤشرات ترميز عربي تحتاج مراجعة قبل الاعتماد عليه.
10. OpenRouter fallback في `/test-chat` قد يعطي ردود غير grounded إذا دخل دون سياق منتج قوي.

## توصية التنفيذ التالية

الأولوية المقترحة:

1. جعل Core يستخدم `AIProviderFactory` أو provider fallback في الإنتاج بطريقة آمنة، بحيث يحترم `defaultProvider=OPENROUTER` مع نفس قواعد الـ blueprint. بدأت هذه الخطوة في `backend/docs/ai-core-provider-fallback-2026-05-02.md`.
2. إضافة `SystemPrompt` عملي لشركة maxp أو توليد responseRules واضحة من إعدادات الشركة.
3. إدخال مناطق شحن حقيقية لشركة maxp أو تعطيل ردود سعر الشحن لحين وجود بيانات.
4. إصلاح نوايا الدعم/طلب الموظف/الاستبدال قبل البيع والأوردر.
5. إصلاح grounding للمنتج عندما يذكر العميل اسم المنتج صراحة.
6. إصلاح المتغيرات: سؤال المقاس، سؤال اللون، تعديل لون/مقاس سابق.
7. تثبيت RAG vector أو الاعتماد صراحة على البحث النصي إلى أن تجهز embeddings.
8. إعادة تشغيل ملف السيناريوهات بعد كل إصلاح ومقارنة الردود يدويا لا آليا فقط.
