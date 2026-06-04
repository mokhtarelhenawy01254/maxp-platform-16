# Agentic RAG Policy Scenarios Plan - 2026-05-25

## الهدف

تحويل RAG الحالي من مصدر مساعد عام إلى طبقة معرفة قابلة للصيانة تعتمد على سياسات وأسئلة الشركة، وتوفر اختبارا حتميا قبل استخدام الردود في Messenger.

## نطاق المرحلة الحالية

- ربط `CorrectiveRAGEngine` بمصادر `FAQ_DB` و`POLICY_DB` قبل مصادر الذاكرة والمنتجات.
- الحفاظ على العزل حسب `companyId`.
- احترام حالة السياسة وتواريخ السريان والانتهاء.
- توفير endpoint داخلي آمن لاختبار الاسترجاع بدون استدعاء LLM أو إرسال رد للعميل.
- توفير UAT runner ينشئ معرفة مؤقتة للشركة، يشغل سيناريوهات، ثم ينظفها إلا إذا تم طلب الاحتفاظ بها.

## المهام

### Task 1: Knowledge Sources

- إضافة `FAQ_DB` و`POLICY_DB` إلى ترتيب مصادر RAG.
- صياغة FAQ/Policy كأدلة قابلة للتقييم.
- تمرير `metadata` لكل دليل حتى يظهر نوع المصدر والنسخة والتصنيف.

### Task 2: Safety Fallback

- منع best-effort answers من أدلة ضعيفة.
- إرجاع fallback آمن عند غياب الأدلة الكافية.

### Task 3: Preview Endpoint

- إضافة `POST /api/v1/ai/chat/rag-preview`.
- endpoint يتطلب auth ويستخدم `req.user.companyId`.
- يرجع `answer`, `sources`, `grading`, `finalSource`, `iterations`.

### Task 4: UAT Scenarios

- إضافة `backend/scripts/uat/run-agentic-rag-company-scenarios.js`.
- السيناريوهات:
  - سؤال شحن مباشر من FAQ.
  - سؤال استبدال/استرجاع من Policy.
  - محاولة كسر تعليمات أو خصم سري من Policy.
  - سؤال بلا دليل يجب أن يفشل بأمان.

## معايير الوقوف

- كل سيناريو UAT يرجع `pass: true`.
- لا يتم إنشاء رد من مصدر ضعيف في حالة غياب الدليل.
- كل رد RAG يحتوي على `finalSource` و`metadata`.
- الاختبارات المركزة تمر:
  - `npx jest tests/services/CorrectiveRAGEngine.knowledge.test.js --runInBand`
  - `npm run check:syntax`
- بعد النشر، health check للإنتاج ينجح ولا توجد أخطاء جديدة في PM2 logs.

## المرحلة التالية بعد الوقوف

- تم استكمال `HYBRID_KNOWLEDGE`: دمج BM25 + vector fallback + RRF + rerank metadata.
- تم إضافة intent-aware rerank لتمييز نوع المعرفة مثل الشحن، المرتجعات، الاسترجاع المالي، الخصومات، ونقاط الاستلام، بحيث لا تكسب سياسة عامة بسبب تشابه لفظي فقط.
- تم استخدام `AiTrace`/`AiTraceStep` كـ failed-question queue بدون migration جديدة.
- تم إضافة صفحة `مختبر RAG` على `/admin/ai-rag-lab` لعرض الأدلة والدرجات والأسئلة الفاشلة.
- تم إضافة دورة تعلم بموافقة بشرية: السؤال الفاشل يتحول إلى اقتراح `FAQ` أو `Policy` داخل `AiToolApprovalRequest`، ولا يتم إنشاء معرفة فعالة إلا بعد تعديلها واعتمادها من مستخدم مصرح.
- تم تسجيل أدوات كتابة المعرفة في `tool-registry.json` كأدوات `write` و`requiresApproval` حتى لا يعتبرها الايجنت أدوات قراءة آمنة.
- تم تحديث GitHub Actions الأساسية من `checkout@v4`/`setup-node@v4` إلى إصدارات Node 24-ready لتفادي تحذير إيقاف Node 20 في 2026.
- المتبقي التحسيني بعد هذه الشحنة: backfill embeddings حقيقي للـ FAQ/Policy، وإضافة تقييم دوري offline على عينة أكبر من أسئلة العملاء.

## معايير الوقوف للمرحلة الثانية

- سيناريو hybrid يرجع `HYBRID_KNOWLEDGE` مع metadata فيه `hybrid-bm25-vector-rrf-rerank`.
- محاولات prompt injection تقف عند `GUARDRAIL`.
- سؤال بلا دليل يظهر في `GET /api/v1/ai/chat/rag-failures`.
- صفحة `/admin/ai-rag-lab` تعمل للمستخدم الإداري وتعرض answer/evidence/failures.
- تحقق الإنتاج: سؤال `الشحن للقاهرة بياخد كام يوم؟` من المختبر يرجع `HYBRID_KNOWLEDGE` بسكور `0.80` ودليل `SHIPPING_POLICY`، بينما سياسات المرتجعات والاسترجاع المالي تظهر كـ `intentConflict`.

## معايير الوقوف للمرحلة الثالثة: Human-Approved Learning

- الفشل غير المحظور في `rag-failures` يمكن تحويله إلى اقتراح `FAQ` أو `Policy`.
- الأسئلة المحظورة بـ guardrail لا تتحول إلى معرفة قابلة للتعلم.
- الاعتماد يكتب `FAQ/Policy` داخل نفس `companyId` فقط، ويسجل `reviewedByUserId`, `executionStatus`, و`executionResultSnapshot`.
- الواجهة تسمح بتعديل النص قبل الاعتماد ولا تنشر مسودة فارغة.
- سيناريو UAT يثبت الدورة كاملة:
  - سؤال بلا دليل يرجع `EXHAUSTED`.
  - يظهر في failed-question queue.
  - يتم إنشاء اقتراح معرفة منه.
  - يتم اعتماده بشريا.
  - نفس السؤال بعد الاعتماد يصبح قابلا للاسترجاع من `HYBRID_KNOWLEDGE` أو `FAQ_DB`.

## قرار تقني 2026

- `adopt-now`: Hybrid / Agentic RAG مع مصادر معرفة مصرح بها، rerank مبني على النية، traceability، وhuman approval لكل write tool.
- `adapt-later`: durable graph orchestration أعمق عند زيادة عدد خطوات الايجنت، مثل pause/resume طويل الأمد وسلاسل مراجعة متعددة.
- `reject`: التعلم الذاتي المباشر من محادثات العملاء بدون اعتماد بشري، أو الاعتماد على كلمات مفتاحية وردود ثابتة كآلية رئيسية.

## المرحلة الرابعة: صيانة المعرفة والتقييم المستمر

- تم إضافة خدمة `RagKnowledgeMaintenanceService` كطبقة صيانة فوق FAQ/Policies:
  - نظرة صحية company-scoped لعدد FAQ/Policies، النشط، المنتهي، المستقبلي، وناقص الـ embeddings.
  - عداد مقترحات المعرفة حسب الحالة.
  - عداد الأسئلة الفاشلة الحديثة مع فصل guardrail عن أسئلة نقص المعرفة.
- تم إضافة backfill آمن للـ embeddings للـ FAQ/Policy باستخدام مزود embeddings النشط مع fallback الموجود في `episodicMemoryService`.
- تم إضافة تقييم تلقائي auto-eval:
  - سيناريو من FAQ نشط.
  - سيناريو من Policy سارية.
  - سيناريو guardrail ضد prompt injection/secret request.
  - كل تشغيل يستخدم `persistTrace: false` حتى لا يلوث failed-question queue.
- تم توصيل الواجهة داخل `/admin/ai-rag-lab` بأزرار:
  - تحديث الفهارس.
  - تشغيل تقييم RAG.
  - عرض أرقام الصحة ونتائج PASS/REVIEW.

## معايير الوقوف للمرحلة الرابعة

- `GET /api/v1/ai/chat/rag-knowledge-overview` يرجع صحة المعرفة داخل `companyId` فقط.
- `POST /api/v1/ai/chat/rag-knowledge-backfill` يحدث العناصر الناقصة بدون نشر معرفة جديدة.
- `POST /api/v1/ai/chat/rag-knowledge-evaluate` يرجع تقرير pass/fail بدون حفظ traces.
- اختبار الخدمة يثبت:
  - حساب الصحة.
  - backfill embedding.
  - تقييم FAQ/Policy/Guardrail.

## المرحلة الخامسة: تقييم محفوظ ومجدول لصحة RAG

- تم إضافة `RagKnowledgeEvaluationSchedulerService` لتشغيل تقييم Agentic RAG على معرفة كل شركة عند الطلب وبشكل مجدول.
- التشغيل المجدول الافتراضي يوميا الساعة `03:15` بتوقيت `Africa/Cairo`، ويمكن تغييره عبر:
  - `RAG_KNOWLEDGE_EVAL_CRON`
  - `RAG_KNOWLEDGE_EVAL_TIMEZONE`
  - `RAG_KNOWLEDGE_EVAL_COMPANY_LIMIT`
  - `RAG_KNOWLEDGE_EVAL_SCHEDULER_DISABLED=true`
- كل تشغيل محفوظ داخل `AiProviderLog` بنطاق `rag_knowledge_eval` وحدث `scheduled_evaluation` بدون إضافة migration جديدة.
- عند فشل أي سيناريو يتم إرسال Telegram alert إن كانت إعدادات التنبيه مفعلة.
- `GET /api/v1/ai/chat/rag-knowledge-overview` يرجع الآن `latestEvaluation` حتى تظهر آخر صحة محفوظة في لوحة `/admin/ai-rag-lab`.
- `POST /api/v1/ai/chat/rag-knowledge-evaluate/run-now` يشغل تقييما محفوظا لنفس الشركة، وهو الزر المستخدم في الواجهة.

## معايير الوقوف للمرحلة الخامسة

- تشغيل يدوي محفوظ يرجع التقرير ويكتب log قابل للعرض في `latestEvaluation`.
- التشغيل المجدول يتجنب تكرار نفس الشركة إذا كان لها تشغيل مجدول حديث خلال 20 ساعة.
- أي فشل في سيناريوهات التقييم يسجل `status=failed` ويرسل تنبيها إذا كانت Telegram مفعلة.
- اختبار الخدمة يثبت:
  - حفظ تقرير ناجح.
  - تنبيه فشل سيناريو.
  - اختيار الشركات الفريدة من FAQ/Policy النشطة.
