# تقرير المرحلة الأولى: اكتشاف أخطاء AI Agent بعمق

**التاريخ:** 2026-05-06  
**المسار:** `H:\max_p_new`  
**النطاق:** تشخيص فقط، بدون تعديل كود الإنتاج أو حل conflicts.

---

## 1. ملخص تنفيذي

المرحلة الأولى كشفت أن مشاكل الـ AI الحالية ليست مشكلة واحدة داخل `CoreAIAgent` فقط. الصورة الأكبر كالتالي:

1. بيئة العمل نفسها غير مستقرة بسبب worktree dirty وفيه merge conflicts.
2. قاعدة البيانات المحلية لا تحتوي على مفاتيح أو إعدادات AI فعالة، ومع ذلك يوجد 850 سجل فشل كلها `NO_MODEL_AVAILABLE`.
3. مسارات الإنتاج الرئيسية متجهة فعلا إلى `CoreAIAgent`، لكن يوجد تباين بين الواجهة والباك إند في اختيار `legacy/core`.
4. اختبارات Core الكبيرة كشفت 5 regressions واضحة في provider routing، image context، price comparison، وتجهيز صور Messenger.
5. telemetry/evaluation/trace موجودة كسكيما وخدمات جزئية، لكن البيانات المحلية الحالية لا تسجل runs أو interactions مفيدة.

---

## 2. Baseline الحالي

### Git state

- الفرع الحالي: `HEAD` detached.
- commit الحالي: `26713d4d`.
- يوجد تغييرات كثيرة غير مدموجة، ولم يتم لمسها في هذه المرحلة.

### ملفات merge conflict

عدد الملفات المتعارضة: 9

- `backend/Structure.md`
- `backend/TEAM_SYNC.md`
- `backend/docs/hr/tasks-compact-header-2026-05-05.md`
- `frontend/src/pages/tasks/Tasks.tsx`
- `frontend/src/pages/tasks/components/TaskFilters.tsx`
- `frontend/src/pages/tasks/components/TaskTable.tsx`
- `frontend/src/pages/tasks/components/TaskWorkspaceHeader.tsx`
- `frontend/src/pages/tasks/components/TaskWorkspaceTabs.tsx`
- `memory/2026-05-05.md`

**الأثر:** لا يمكن اعتبار أي نتيجة CI/build نهائية قبل حل الـ conflicts، خصوصا لأن بعض التعارضات في frontend tasks وليست في AI مباشرة، لكنها تكسر ثقة baseline كله.

---

## 3. خريطة مسارات AI الحالية

### Facebook Messenger

- `backend/utils/allFunctions.js:2165`
- `backend/utils/allFunctions.js:2167`
- المسار الحالي يستدعي `CoreAIAgent.processMessage(...)` بشكل async بعد حفظ الرسالة/المحادثة.

### Facebook Comments

- `backend/utils/allFunctions.js:975`
- `backend/services/facebookCoreAdapter.js:138`
- `backend/services/facebookCoreAdapter.js:161`
- المسار الحالي: `generateFacebookCommentCoreReply(...)` ثم `CoreAIAgent.processMessageForReplyOnly(...)`.

### WhatsApp

- `backend/services/whatsapp/WhatsAppAIIntegration.js:160`
- `backend/services/whatsapp/WhatsAppAIIntegration.js:163`
- المسار الحالي يستدعي `CoreAIAgent.processMessageForReplyOnly(...)`.

### Test Chat

- `backend/controller/testChatController.js:566`
- `backend/controller/testChatController.js:930`
- المسار الحالي يستخدم `CoreAIAgent.processMessageForTest(...)`.
- الواجهة ما زالت تعرض/ترسل `agentMode` كـ `legacy/core`، بينما الباك إند عمليا يثبت المسار على Core.

### ModernAgent القديم

- `backend/services/aiAgent/AgentFactory.js:10`
- `backend/services/aiAgent/modern/ModernAgent.js:403`
- `backend/services/aiAgent/modern/ModernAgent.js:424`
- `backend/services/aiAgent/modern/ModernAgent.js:428`

يوجد ToolRegistry وReAct-like loop، لكن اختيار الأدوات يتم بكلمات مفتاحية Regex مثل السعر/الشحن، وليس model-driven tool calling حقيقي. لذلك هو ليس معمارية agent 2026 المطلوبة، بل طبقة قديمة أو تجريبية.

---

## 4. أدلة اللوجات

### إشارات مهمة

- `.tmp-backend-dev.err.log` يحتوي على تكرار:
  - `Redis config is missing, worker will not start`
  - `PrismaClientInitializationError`
  - `query_engine-windows.dll.node`
  - `database system is in recovery mode`
- `.tmp-backend-dev.out.log` يحتوي أيضا على رسائل تشغيل Redis disabled/local memory، وفي بعض التشغيلات `BullMQ Webhook Worker started`.
- `backend/logs/app.log` أظهر RAG retrieval فعلي لاستعلام shipping policy، ما يعني أن RAG service متصل جزئيا.
- `backend/logs/error.log` يحتوي EPIPE من cron unrelated to AI، لكنه يثبت وجود ضوضاء في اللوجات تحتاج filtering.

### قراءة مبدئية

Redis/BullMQ ليست baseline موحدة: أحيانا disabled، أحيانا worker started. هذا خطر على webhooks والـ async processing، خصوصا أن Messenger path يعتمد على عمليات لاحقة بعد حفظ الرسالة.

---

## 5. أدلة قاعدة البيانات

تمت قراءة DB قراءة فقط عبر `getSharedPrismaClient`.

### Counts

- `AiFailureLog`: 850
- `AiInteraction`: 0
- `AiResponseEvaluation`: 0
- `AiCorrectionQueueItem`: 0
- `AiTrace`: 0
- `AiTraceStep`: 0
- `ConversationMemory`: 0
- `AiKey`: 0
- `AiModelConfig`: 0
- `AiSetting`: 0
- `Company`: 102

### نوع الفشل الوحيد

كل سجلات `AiFailureLog` الحالية:

- `errorType = NO_MODEL_AVAILABLE`
- آخر العينات من 2026-05-02.
- السياقات تحتوي WhatsApp/group conversations ورسائل عربية فعلية.

### دلالة مهمة

المشكلة المحلية الأساسية حاليا ليست فقط جودة الرد، بل أن runtime لا يجد model/provider متاح. لذلك أي اختبار end-to-end واقعي سيفشل أو يصمت ما لم يتم تجهيز مفاتيح/إعدادات AI بطريقة آمنة.

### غياب durable run model

السكيما تحتوي:

- `AiTrace`
- `AiTraceStep`
- `AiInteraction`
- `AiFailureLog`

لكن لم يظهر model واضح باسم `AgentRun`/`AgentStep` في schema الحالية. هذا يعني أن تتبع agent runs كدورة كاملة لا يزال ناقصا معماريا أو لم يتم توصيله.

---

## 6. نتائج الفحوصات

### Syntax checks

كل الملفات التالية اجتازت `node --check`:

- `backend/services/CoreAIAgent.js`
- `backend/services/aiRuntimeService.js`
- `backend/services/aiAgent/modern/ModernAgent.js`
- `backend/services/whatsapp/WhatsAppAIIntegration.js`
- `backend/services/facebookCoreAdapter.js`
- `backend/controller/testChatController.js`
- `backend/utils/allFunctions.js`
- `backend/services/aiAgent/providers/NvidiaProvider.js`

**النتيجة:** لا توجد syntax errors مباشرة في مسارات AI الحرجة.

### Jest: telemetry + messenger core path

الأمر:

```powershell
npm test -- --runTestsByPath tests/services/aiTelemetryService.test.js tests/services/facebookMessengerCorePath.test.js
```

النتيجة:

- 2 test suites passed.
- 5 tests passed.

### Jest: provider routing small suites

الأمر:

```powershell
npm test -- --runTestsByPath tests/services/CoreAIAgent.googleHostedModels.test.js tests/services/nvidiaProvider.test.js tests/services/modelManager.groqProviderDefaults.test.js
```

النتيجة:

- 3 test suites passed.
- 10 tests passed.

ملاحظة: ظهرت warnings عن عدم وجود model limits في DB mock، لكنها لم تفشل الاختبار.

### Jest: CoreAIAgent catalog variant context

الأمر:

```powershell
npm test -- --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js
```

النتيجة:

- 1 test suite failed.
- 141 tests passed.
- 5 tests failed.
- إجمالي الاختبارات: 146.

#### Failures المكتشفة

1. `resolves product from image message using source post context`
   - المتوقع: `isAskingForImages = true`
   - الفعلي: `false`
   - التصنيف: image/source-post context regression.

2. `resolveGeminiVisionAttempts prefers company model configs and uses only stable fallback models for unconfigured keys`
   - المتوقع: company key/model config.
   - الفعلي: central key fallback.
   - التصنيف: provider/key-source priority regression.

3. `keeps price comparison questions out of shipping fallback`
   - المتوقع: رد يحتوي `Alpha Shoe`, `Beta Shoe`, وفرق السعر.
   - الفعلي: clarification عام يطلب تحديد المنتج.
   - التصنيف: price comparison/memory grounding regression.

4. `uses the configured central provider before legacy Gemini text generation`
   - المتوقع: `رد من المزود المركزي`
   - الفعلي: deterministic clarification.
   - التصنيف: provider path bypassed by deterministic guard.

5. `caps prepared customer reply images to avoid Messenger image bursts`
   - المتوقع: أول 3 صور upload paths.
   - الفعلي: `[]`
   - التصنيف: image preparation/local path filtering regression.

### Smoke scenario

تمت محاولة تشغيل scenario واحد:

```powershell
AI_CAPABILITY_IDS=AG-A01 node scripts/run-core-agent-capability-scenarios.js
```

لكن PowerShell نفسه فشل قبل بدء Node:

```text
System.IO.FileLoadException: Could not load ... System.Management.Automation.dll
The paging file is too small for this operation to complete.
```

**النتيجة:** scenario not executed بسبب عائق بيئة/ذاكرة، وليس نتيجة من التطبيق.

---

## 7. تصنيف الأخطاء حسب الأولوية

### P0 - توقف/يمنع الثقة في النظام

1. **Merge conflicts مفتوحة**
   - تمنع baseline ثابت وتؤثر على أي CI/build لاحق.

2. **لا توجد AI keys/settings في DB المحلية**
   - 850 فشل `NO_MODEL_AVAILABLE`.
   - `AiKey = 0`, `AiModelConfig = 0`, `AiSetting = 0`.
   - هذا يفسر فشل/صمت أي end-to-end runtime.

3. **Telemetry التشغيل الفعلي غير ممتلئ**
   - `AiInteraction = 0`, `AiTrace = 0`, evaluations = 0.
   - عند وجود 850 failures، المفروض يكون فيه traces/evaluations أو على الأقل interaction records تربط السبب بالقناة والموديل.

### P1 - regressions مباشرة في Core AI

1. **Provider routing priority regression**
   - company model configs لا تتصدر في vision attempts كما هو متوقع في الاختبار.

2. **central provider bypass**
   - deterministic clarification قد يسبق provider path في حالات يجب أن تمر على المزود المركزي.

3. **Image/source-post context regression**
   - صورة من source post لا ترفع `isAskingForImages` كما يتوقع السياق.

4. **Price comparison grounding regression**
   - سؤال مقارنة أسعار فقد المنتجين والفرق ورجع clarification عام.

5. **Messenger image cap regression**
   - تجهيز الصور يرجع `[]` بدل cap إلى 3 صور.

6. **Redis/BullMQ baseline غير موحد**
   - الرسائل متضاربة بين disabled وworker started.
   - خطر على webhooks/async processing.

7. **Frontend/backend agentMode mismatch**
   - الواجهة تعرض legacy/core، والباك إند يميل إلى Core فقط.
   - يسبب توقعات خاطئة أثناء الاختبار والدعم.

### P2 - فجوات معمارية/اختبارية

1. **لا يوجد durable AgentRun/AgentStep واضح**
   - الموجود AiTrace/AiTraceStep، لكنه لا يكفي كـ lifecycle كامل للـ agent.

2. **ModernAgent tool selection ليس model-driven**
   - يعتمد Regex لا tool calling حقيقي.

3. **CoreAIAgent ما زال monolith ضخم**
   - صعوبة عالية في isolate/verify/fix.

4. **بعض warnings الاختبارية تشير إلى mocks ناقصة**
   - `safeQuery is not a function`
   - `aiModelLimit undefined`
   - `failed to load applied corrections`
   - تحتاج فصل ما هو bug إنتاجي عن mock contract gap.

5. **وجود unsupported model في fallback path**
   - `gemini-3-flash` يعطي 404 ثم fallback يعمل.
   - ليس outage مباشر، لكنه يهدر وقت/ضوضاء ويحتاج تنظيف قائمة الموديلات.

---

## 8. توصية المرحلة الثانية

قبل أي refactor كبير، لازم أهداف المرحلة الثانية تكون بالترتيب:

1. تثبيت baseline: حل conflicts وتحديد branch واضح.
2. تجهيز AI provider seed محلي آمن أو mock runtime رسمي لا يحتاج secrets.
3. إصلاح 5 failing tests في `CoreAIAgent.catalogVariantContext.test.js`.
4. توحيد telemetry بحيث أي فشل `NO_MODEL_AVAILABLE` ينتج trace/evaluation مفهومة.
5. فصل هدف التنفيذ القادم إلى patches صغيرة:
   - provider routing
   - image context/prepared images
   - price comparison grounding
   - DB/provider readiness
   - UI agentMode consistency

---

## 9. مخرجات المرحلة الأولى

- تم تثبيت baseline الحالي.
- تم توثيق مسارات AI حسب القنوات.
- تم جمع أدلة logs وDB.
- تم تشغيل syntax checks وJest targeted tests.
- تم استخراج 5 failures قابلة للتنفيذ.
- لم يتم تعديل كود الإنتاج أو حل conflicts.

