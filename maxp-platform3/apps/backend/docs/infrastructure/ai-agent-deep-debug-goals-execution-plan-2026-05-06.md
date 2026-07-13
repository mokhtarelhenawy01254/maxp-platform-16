# خطة: اكتشاف أخطاء الـ AI Agent بعمق، تحديد الأهداف، ثم التنفيذ والمراجعة

**تاريخ الإنشاء**: 2026-05-06  
**درجة التعقيد المتوقعة**: عالية  
**النطاق**: منظومة الـ AI Agent داخل مشروع Max P في `H:\max_p_new`

## نظرة عامة

الخطة مقسومة إلى ثلاث مراحل مترابطة:

1. اكتشاف عميق للأخطاء الحالية والأسباب الجذرية التي تسبب المشاكل.
2. تحديد أهداف واضحة وقابلة للقياس.
3. خطة تنفيذ تتم مراجعتها باستمرار مقابل الأهداف المحددة.

المشروع حاليًا لا يبدأ من الصفر. عندنا `CoreAIAgent` كمسار إنتاج أساسي، وبقايا مسارات `Legacy` و`ModernAgent`، ونظام RAG، وتوجيه مزودين، وtelemetry، وتقييم إنتاج، وذاكرة، وRedis state، وqueues، وMCP server للتشخيص. الهدف هو تثبيت الموجود أولًا، ثم تطويره تدريجيًا إلى معمارية agent أنضف من غير كسر Facebook Messenger أو test chat أو الكتالوج أو الشحن أو إنشاء الأوردرات.

## إشارات حالية مؤكدة

- `CoreAIAgent` هو مسار الإنتاج الأساسي لـ Facebook Messenger من خلال `backend/utils/allFunctions.js`.
- صفحة `/test-chat` تستخدم `CoreAIAgent.processMessageForTest`.
- تعليقات Facebook تستخدم adapter في `backend/services/facebookCoreAdapter.js`.
- `ModernAgent` عنده شكل ReAct loop، لكن اختيار الأدوات حاليًا مبني على keywords وليس tool-calling حقيقي من الموديل.
- `mcp-server` موجود، لكنه حاليًا للتشخيص وتشغيل scripts وليس tool gateway داخل مسار الـ agent.
- الـ repo حاليًا فيه merge conflicts وتغييرات كثيرة staged/untracked. لازم التعامل معها قبل أي refactor كبير.

## المرحلة الأولى: اكتشاف الأخطاء بعمق

**الهدف**: بناء خريطة أخطاء مبنية على أدلة من logs وtelemetry وtests وdatabase وسيناريوهات قابلة للتكرار. لا يوجد تغيير معماري في هذه المرحلة.

**التحقق المطلوب**:

- تقرير defects يحتوي على الشدة، المسار المتأثر، هل الخطأ قابل للتكرار، السبب المتوقع، والدليل.
- scenario suite قابلة للتشغيل بعد كل fix.
- baseline report يوضح حالة النظام الحالية قبل الإصلاح.

### مهمة 1.1: تثبيت خط البداية للتحقيق

- **المكان**: repo root وgit status والملفات الحالية.
- **الوصف**: تسجيل حالة git الحالية وتحديد كل ملفات الـ conflicts قبل لمس الكود.
- **الاعتماديات**: لا يوجد.
- **معايير القبول**:
  - حصر كل ملفات `UU` و`AA` و`MM` والملفات غير المتتبعة.
  - تحديد أي conflicts تخص الـ AI agent وأيها خارج النطاق.
  - اتخاذ قرار: هل نحل conflicts أولًا أم نعمل branch/worktree نظيف للتحقيق.
- **التحقق**:
  - `git status --short`
  - `git diff --name-only --diff-filter=U`

### مهمة 1.2: بناء خريطة مسارات الـ AI

- **الملفات الأساسية**:
  - `backend/services/CoreAIAgent.js`
  - `backend/services/aiRuntimeService.js`
  - `backend/services/aiAgentService.js`
  - `backend/services/aiAgent/messageProcessor.js`
  - `backend/services/aiAgent/modern/ModernAgent.js`
  - `backend/utils/allFunctions.js`
  - `backend/services/facebookCoreAdapter.js`
  - `backend/controller/testChatController.js`
- **الوصف**: تتبع كل entrypoint للـ AI وتحديد أي مسار يعالج Facebook Messenger، comments، test chat، WhatsApp، manual replies، وأي background automations.
- **الاعتماديات**: مهمة 1.1.
- **معايير القبول**:
  - جدول أو رسم يوضح كل channel والمسار الحالي.
  - وضع علامة على كل مسار: `CORE` أو `LEGACY` أو `MODERN` أو غير معروف.
  - تحديد المسارات المكررة أو الميتة.
- **التحقق**:
  - البحث عن `CoreAIAgent`, `processMessage`, `processMessageForReplyOnly`, `processCustomerMessage`, و`agentMode`.

### مهمة 1.3: استخراج أدلة الفشل من الواقع

- **المصادر**:
  - logs محلية: `backend-dev.log`, `.tmp-backend-dev.err.log`, `.tmp-backend-dev.out.log`
  - جداول قاعدة البيانات: `AiInteraction`, `AiFailureLog`, `AiResponseEvaluation`, `AiCorrectionQueueItem`, `AiTrace`, `AiTraceStep`, `ConversationMemory`
  - ملفات التوثيق داخل `backend/docs/infrastructure`
- **الوصف**: استخراج أنماط الفشل الفعلية بدل التخمين.
- **الاعتماديات**: مهمة 1.1.
- **معايير القبول**:
  - أعلى 20 خطأ متكرر، مجمعة حسب النوع.
  - أمثلة low-quality حديثة، مجمعة حسب issue type.
  - فشل المزودين مجمع حسب provider/model/key.
  - أمثلة على ردود unsafe أو silent.
- **التحقق**:
  - SQL/query scripts للصفوف الحديثة.
  - أوامر log sampling محفوظة في تقرير التحقيق.

### مهمة 1.4: بناء مصفوفة سيناريوهات Core

- **المصادر**:
  - `backend/scripts/run-core-agent-capability-scenarios*.js`
  - `backend/scripts/run-core-agent-channel-scenarios.js`
  - `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`
  - `backend/tests/services/facebookMessengerCorePath.test.js`
- **الوصف**: تحديد سيناريوهات العملاء التي تمثل الخطر الحقيقي على المنتج.
- **الاعتماديات**: مهمة 1.2.
- **معايير القبول**:
  - السيناريوهات تغطي: التحية، عرض الكتالوج، سعر منتج محدد، اللون/المقاس، الشحن، جمع بيانات الأوردر، تأكيد الأوردر، الشكاوى، prompt injection، طلب الصور، follow-up على صورة، ورسائل مرتبطة ببوست.
  - كل سيناريو له expected outcome وallowed fallback وforbidden output.
- **التحقق**:
  - تشغيل السيناريوهات والاختبارات الحالية.
  - إضافة smoke fixtures ناقصة بعد تسجيل baseline.

### مهمة 1.5: تصنيف الأخطاء حسب مجال الفشل

- **المكان**: تقرير التحقيق.
- **الوصف**: وضع كل bug داخل bucket واضح للسبب الجذري.
- **الاعتماديات**: مهام 1.2 و1.3 و1.4.
- **معايير القبول**:
  - التصنيفات تشمل: routing drift، provider routing، timeout/quota، RAG/catalog grounding، price/shipping mismatch، order state، memory/summary pollution، prompt leak، human override، duplicate delivery، media/image handling، telemetry/evaluation، Redis/queue durability، وfrontend/test-chat mismatch.
  - كل bug له شدة: P0 ضرر مباشر للعميل، P1 خطر على الإيراد أو الأوردرات، P2 reliability/ops، P3 cleanup.
- **التحقق**:
  - كل P0/P1 له reproduction أو log example على الأقل.

### مهمة 1.6: تحليل السبب الجذري لأخطاء P0/P1

- **المكان**: الملفات المتأثرة حسب كل bug.
- **الوصف**: تتبع كل خطأ شديد من input إلى contextBag إلى grounding إلى provider/model إلى sanitizer إلى delivery إلى telemetry.
- **الاعتماديات**: مهمة 1.5.
- **معايير القبول**:
  - كل P0/P1 له root-cause note، وليس مجرد وصف عرض.
  - تحديد الملف والدالة التي يحدث فيها القرار الخاطئ.
  - تحديد نوع الإصلاح: config أو data أو prompt أو code أو architecture.
- **التحقق**:
  - replay يدوي أو test reproduction لكل خطأ شديد.

## المرحلة الثانية: تحديد الأهداف وقفلها

**الهدف**: تحويل التحقيق إلى مجموعة أهداف قليلة وواضحة وقابلة للقياس، حتى لا يتحول التنفيذ إلى تنظيف عشوائي.

**التحقق المطلوب**:

- وثيقة أهداف بمقاييس نجاح.
- ترتيب أولويات واضح.
- non-goals صريحة لأول دورة تثبيت.

### مهمة 2.1: تحديد أهداف المنتج

**الأهداف المقترحة**:

- الرد بشكل صحيح على Facebook Messenger و`/test-chat`.
- ربط السعر والشحن والمنتج والمتغيرات والصور ببيانات الكتالوج المؤكدة.
- جمع بيانات الأوردر بدون تكرار طلب بيانات معروفة بالفعل.
- إنشاء الأوردر فقط بعد تأكيد صريح واكتمال بيانات متحققة.
- الصمت أو التحويل بدل تسريب تعليمات داخلية.
- احترام تدخل الموظف البشري وعدم الرد فوقه.

**معايير القبول**:

- كل هدف له مثال نجاح ومثال فشل.
- كل هدف مرتبط بسيناريوهات مهمة 1.4.

### مهمة 2.2: تحديد أهداف الاعتمادية

**المقاييس المقترحة**:

- تسريب prompt أو reasoning داخلي: صفر reproductions معروفة.
- سعر أو شحن غلط في رد grounded: صفر reproductions معروفة.
- duplicate order creation: صفر reproductions معروفة.
- Facebook Messenger Core routing: 100% من مسار إنتاج واحد.
- provider fallback timeout: محدود وواضح في telemetry.
- Core critical tests: كلها green قبل أي release.

**معايير القبول**:

- كل metric قابل للقياس من test أو script أو telemetry.

### مهمة 2.3: تحديد أهداف المعمارية

**الأهداف المقترحة**:

- تثبيت `CoreAIAgent` كالعقل الإنتاجي الأساسي حاليًا.
- عدم توسيع `ModernAgent` قبل استقرار Core.
- استخراج domain tools تدريجيًا من `CoreAIAgent`: catalog، shipping، order، memory، media.
- إضافة تتبع من نوع `AgentRun` / `AgentStep` قبل refactor كبير للـ tool-calling.
- إبقاء MCP diagnostic server منفصلًا إلى أن يتم تحديد permissions وschemas.

**معايير القبول**:

- لا يوجد rewrite واسع قبل إصلاح الأخطاء الشديدة.
- كل refactor يحافظ على سلوك scenario matrix.

### مهمة 2.4: تحديد ما لن نعمله في أول دورة

**خارج النطاق مؤقتًا**:

- لا يوجد full multi-agent rewrite.
- لا نستبدل Core بـ OpenAI Agents SDK أو LangGraph في أول دورة.
- لا نحذف legacy code قبل إثبات مسارات الإنتاج.
- لا يوجد redesign شامل للواجهة.
- لا نبدأ migration لـ tool-calling قبل تصنيف baseline bugs.

**معايير القبول**:

- أي تغيير خارج هذه الحدود يتم تأجيله إلا لو كان يحل P0/P1.

## المرحلة الثالثة: خطة التنفيذ والمراجعة مقابل الأهداف

**الهدف**: إصلاح أعلى الأخطار أولًا، ثم تقوية المعمارية على خطوات صغيرة يمكن اختبارها.

**التحقق المطلوب**:

- كل sprint ينتهي باختبارات قابلة للتشغيل ومراجعة مقابل أهداف المرحلة الثانية.
- لا يتم قبول أي sprint بدون تحديث أو تشغيل regression scenarios.

## Sprint 0: تثبيت الـ Worktree

**الهدف**: الوصول إلى baseline آمن للتحقيق والإصلاح.

**المهام**:

1. حل أو عزل merge conflicts.
2. حفظ ملاحظة توضح قرارات حل conflicts.
3. تشغيل syntax checks بعد تنظيف ملفات conflicts.
4. تحديد هل شغل الـ AI agent سيكون على نفس الفرع أو branch/worktree نظيف.

**التحقق**:

- `git diff --name-only --diff-filter=U` يرجع فارغ.
- `node --check backend/services/CoreAIAgent.js`
- `node --check backend/services/aiRuntimeService.js`

**الأهداف المغطاة**:

- منع كسر غير مقصود قبل التشخيص.

## Sprint 1: الأدلة وإعادة إنتاج الأخطاء

**الهدف**: تحويل المشاكل المشكوك فيها إلى bugs قابلة للتكرار.

**المهام**:

1. إنشاء تقرير تحقيق داخل `backend/docs/infrastructure`.
2. بناء routing map.
3. قراءة telemetry/evaluation/failure rows الحديثة.
4. تشغيل اختبارات Core الحالية.
5. إضافة أو تحديث scenario fixtures للسيناريوهات الحرجة الناقصة.

**التحقق**:

- تشغيل Core catalog tests الحالية.
- تشغيل telemetry tests الحالية.
- scenario matrix بها نتائج pass/fail.

**الأهداف المغطاة**:

- اكتشاف قائم على دليل.
- تقليل التخمين.

## Sprint 2: إصلاح أخطاء P0/P1

**الهدف**: إزالة الأخطاء التي تسبب ضررًا للعميل أو خطرًا على الإيراد.

**ترتيب الأولوية**:

1. تسريب prompt أو reasoning داخلي.
2. سعر أو شحن أو إجمالي غلط.
3. إنشاء أوردر مكرر أو مبكر.
4. فشل human override.
5. provider routing/fallback يسبب صمت أو مزود خاطئ.
6. مشاكل image/media في الردود.

**التحقق**:

- Jest tests مركزة لكل bug.
- إعادة تشغيل السيناريو لكل flow تم إصلاحه.
- telemetry توضح provider/model/grounding المتوقع.

**الأهداف المغطاة**:

- الأمان.
- صحة الردود.
- حماية الإيراد والأوردرات.

## Sprint 3: تقوية Core Runtime

**الهدف**: جعل Core واضحًا وقابلًا للتتبع والتشغيل الإنتاجي.

**المهام**:

1. إضافة أو توحيد run-level tracking لمعالجة Core.
2. تسجيل الخطوات الأساسية: context preparation، grounding، generation، sanitizer، delivery، evaluation.
3. جعل provider fallback attempts واضحة ومحدودة.
4. إضافة idempotency checks للأوردرات والإرسال.
5. توضيح سلوك النظام عند ضعف Redis أو queues.

**التحقق**:

- يمكن تتبع رسالة واحدة من أولها لآخرها.
- نقاط الفشل ظاهرة في database أو logs.
- retry/fallback لا يكرر الإرسال للعميل.

**الأهداف المغطاة**:

- الاعتمادية.
- سهولة التشغيل والمراقبة.
- أساس durable execution.

## Sprint 4: تقسيم Core إلى أدوات Domain واضحة

**الهدف**: تقليل خطورة ملف `CoreAIAgent.js` الضخم بدون تغيير سلوك المنتج.

**ترتيب الاستخراج**:

1. `CatalogContextTool`
2. `ShippingQuoteTool`
3. `OrderSummaryTool`
4. `OrderCreationTool`
5. `MediaImageTool`
6. `ReplyGuardTool`

**القواعد**:

- استخراج أداة واحدة كل مرة.
- لا يوجد behavior change بدون تحديث scenario.
- الاختبارات القديمة تظل green قبل استخراج الأداة التالية.

**التحقق**:

- scenario matrix الخاصة بـ Core تظل ناجحة.
- إضافة tests للأدوات المستخرجة.
- ملف `CoreAIAgent.js` يصغر تدريجيًا وبشكل محسوب.

**الأهداف المغطاة**:

- قابلية الصيانة.
- الاستعداد لـ tool-calling حقيقي لاحقًا.

## Sprint 5: توحيد القنوات

**الهدف**: جعل كل القنوات المواجهة للعميل تستخدم نفس عقل Core أو adapters موثقة بوضوح.

**المهام**:

1. تأكيد مسار Facebook Messenger.
2. تأكيد adapter تعليقات Facebook.
3. تأكيد أن `/test-chat` قريب من سلوك الإنتاج.
4. تدقيق WhatsApp وأي قنوات أخرى.
5. نقل القنوات إلى `processMessageForReplyOnly` adapters عند الحاجة.

**التحقق**:

- channel scenario script يوضح `agentMode` المتوقع.
- لا توجد قناة تستخدم legacy path بدون قصد.

**الأهداف المغطاة**:

- توحيد السلوك.
- تقليل مساحة الأخطاء.

## Sprint 6: الاستعداد لـ Tool-Calling وMCP

**الهدف**: تجهيز معمارية 2026 typed tools بدون زعزعة Core.

**المهام**:

1. تعريف typed tool schemas للكتالوج، الشحن، الأوردرات، الذاكرة، والميديا.
2. تحديد مستويات الصلاحية: read-only، إرسال للعميل، write/order creation، admin/system.
3. تحديد هل الأدوات تبدأ كـ internal JS modules أو MCP tools لاحقًا.
4. إبقاء MCP system-control tools خارج customer-facing agent إلى أن توجد approval policies.
5. تجربة model-driven tool selection فقط بعد نجاح scenario matrix.

**التحقق**:

- tool schemas عليها tests.
- الأدوات الحساسة تحتاج policy checks.
- لا يوجد customer-facing path يستطيع تشغيل system scripts.

**الأهداف المغطاة**:

- تحديث المعمارية.
- الأمان.

## استراتيجية الاختبار

- **Static checks**: تشغيل `node --check` للملفات المتغيرة.
- **Focused tests**: تشغيل Jest tests المتأثرة بكل bug.
- **Scenario tests**: تشغيل Core capability وchannel scripts.
- **Telemetry checks**: التأكد أن `AiInteraction` يسجل provider وmodel وagentMode وgrounding وusage وstatus.
- **Manual smoke**: استخدام `/test-chat` للسيناريوهات الأعلى خطورة بعد تغييرات backend.
- **Regression gate**: لا يوجد release إذا كانت سيناريوهات P0/P1 غير green.

## طريقة المراجعة

بعد كل sprint نراجع مقابل أهداف المرحلة الثانية:

- هل قل عدد P0/P1؟
- هل حافظنا أو حسنا توحيد Core routing؟
- هل أضفنا دليل أو test أو telemetry لكل fix؟
- هل تجنبنا تحويل العمل إلى rewrite واسع؟
- هل بقي سلوك العميل مستقرًا؟

## مخاطر وملاحظات مهمة

- merge conflicts الحالية ممكن تخفي أو تفسد نتائج الاختبارات.
- `CoreAIAgent.js` كبير جدًا، وأي refactor فيه ممكن يغير السلوك بدون قصد.
- مشاكل provider fallback ممكن تظهر كأنها prompt bugs لو لم نراجع telemetry.
- اختلاف نسخة Redis/BullMQ محليًا ممكن يسبب ضوضاء غير مرتبطة بالـ AI نفسه.
- مشاكل RAG/catalog قد تكون data quality وليست code.
- إصلاح sanitizer ممكن يسكت ردود عربية سليمة لو توسع زيادة.
- إصلاح إنشاء الأوردر يحتاج idempotency حتى لا تعود مشكلة duplicate orders.

## خطة الرجوع

- كل fix يكون صغير وقابل للـ commit وحده.
- كل sprint يحتوي tests مع الإصلاحات.
- لو refactor كسر السلوك، نرجع refactor فقط ونحتفظ باختبارات bug.
- نحتفظ بمسار Core الإنتاجي إلى أن ينجح أي بديل في scenario matrix كاملة.

## أسئلة مفتوحة قبل التنفيذ

1. ما أكثر مشكلة مؤذية حاليًا: ردود غلط، عدم وجود رد، أسعار غلط، شحن غلط، أوردرات، أم routing؟
2. هل نحل merge conflicts في نفس الفرع، أم نعمل branch/worktree نظيف للتحقيق؟
3. هل أول نطاق تثبيت يكون Facebook Messenger فقط، أم Messenger مع `/test-chat` وتعليقات Facebook؟
