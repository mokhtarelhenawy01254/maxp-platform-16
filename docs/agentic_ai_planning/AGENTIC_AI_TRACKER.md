# 🎯 Agentic AI Implementation Tracker

> آخر تحديث: 2026-05-21 — آخر فحص tests: ✅ 2026-05-21 (تم)
> هذا الملف هو المصدر الوحيد للحقيقة — راقب الملفات الفعلية، لا النوايا.
> 
> **🟢 ملفات مراحل runtime من 1 إلى 20 مكتوبة ومختبرة.**
>
> **🟢 Agent File System Layer — Phase A تم تنفيذه:** قوالب `AGENTS.md` / `SOUL.md` / `TOOLS.md` / `agent.json`، سجل أدوات مركزي، مهارات مشتركة، loaders، وربط provisioning بالقوالب.
>
> **🟢 Agent Manager Runtime Layer — تم تنفيذه:** `toolOrchestratorService`, `agentManagerService`, `agentInboxService`, و `/api/v1/agent-manager/*`.
>
> **⚠️ المتبقي الآن:** persistence دائمة مخصصة للـ agent profiles/artifacts/tasks/runs، UI لإدارة المدير/الملفات/المهارات، وربط كل tool handlers بتنفيذ تجاري حقيقي.

---

## 🏁 المرحلة 1: البنية التحتية والميزانية والمراقبة (الخطط 1-4)

### الخطة 1: مخطط قاعدة البيانات

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/prisma/schema/agentic_memory_telemetry.prisma` | ✅ **موجود** | ✅ `databaseMemoryTelemetry.test.js` — PASS | AgenticMemoryFact, TelemetryTrace, TelemetrySpan |
| `backend/prisma/schema/ai_analytics.prisma` | ✅ **موجود** | - | AiTrace, AiToolApprovalRequest, AiRuntimeLedger... |
| `backend/prisma/schema/company_assistant.prisma` | ✅ **موجود** | - | CompanyAssistantMemory, PendingAction, CommandLog |

### الخطة 2: طبقة المراقبة (Telemetry Tracer)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/telemetryTracerService.js` | ✅ **موجود** | ✅ `telemetryTracerService.test.js` — PASS | startTrace/endTrace, startSpan/endSpan |
| `backend/services/aiAgent/providerLogService.js` | ✅ **موجود** | - | تسجيل أحداث المزود مع redaction |

### الخطة 3: حوكمة ميزانية التوكنز

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/providerBudgetLedgerService.js` | ✅ **موجود** | ✅ `providerBudgetLedgerService.test.js` — 5/5 PASS | ميزانية التوكنز والتحكم بالحد اليومي للمؤسسة |

### الخطة 4: موجه الموديلات الذكي (Model Router)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/modelRouterService.js` | ⏭️ **مش مطلوب** | - | modelManager.js يغطي كل routing + fallback + key rotation |
| `backend/services/aiAgent/modelManager.js` | ✅ **موجود** | ✅ 4 files — 24/24 PASS | 3529 سطر — التوجيه المركزي الكامل |
| `backend/services/aiAgent/SimpleKeyRotator.js` | ✅ **موجود** | - | تدوير المفاتيح مع cooldown + Redis |
| `backend/services/aiAgent/stateManager.js` | ✅ **موجود** | - | Redis circuit breakers, rate limits |
| `backend/services/aiAgent/geminiModelPolicy.js` | ✅ **موجود** | ✅ 4/4 PASS | تصفية النماذج المتقاعدة |

#### المزودون (كلها موجودة)

| الملف | اختبارات |
|-------|----------|
| `providers/BaseProvider.js` | - |
| `providers/AIProviderFactory.js` | - |
| `providers/GoogleProvider.js` | ✅ 3/3 PASS |
| `providers/GroqProvider.js` | - |
| `providers/OpenRouterProvider.js` | ✅ 3/3 PASS |
| `providers/DeepSeekProvider.js` | - |
| `providers/NvidiaProvider.js` | ✅ 3/3 PASS |
| `providers/OllamaProvider.js` | - |
| `providers/HuggingFaceProvider.js` | - |

---

## 🧠 المرحلة 2: معمارية الذاكرة وفض التعارض (الخطط 5-9)

### الخطة 5: ذاكرة العمل اللحظية (Session Working Memory)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/workingMemoryService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | Sliding window + ongoing summary |

### الخطة 6: الذاكرة العرضية (Episodic Vector DB)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/episodicMemoryService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | Vector DB + embeddings + companyId isolation |

### الخطة 7: محرك التحكيم وفض التعارض (Truth Arbitration)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/truthArbitratorService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | معادلة التحكيم: Recency 0.3, Freq 0.3, Conf 0.1, Source 0.3 |

### الخطة 8: الذاكرة الزمنية (Temporal Memory)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/temporalReasoningService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | validFrom/validTo, seasonal patterns |

### الخطة 9: Dreamer Worker

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/workers/dreamerWorker.js` | ✅ **موجود** | ✅ Covered in `allPhases` | استخلاص الحقائق + ترقية الذاكرة |
| `backend/tests/workers/dreamerWorker.test.js` | ❌ **مفقود** | ❌ | - |

---

## 🤝 المرحلة 3: التحكم البشري والأدوات الحساسة (الخطط 10-13)

### الخطة 10: سجل التدقيق الموحد (Audit Trail)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/agentAuditTrailService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | Append-only + traceId + thought block |

### الخطة 11: مسودات التعديل (Draft Proposals)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/draftProposalService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | Read-only vs Write tools + confirmation code |

### الخطة 12: قناة الموافقة البشرية (Human-in-the-Loop)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/humanApprovalService.js` | ✅ **جديد** 3189 B | ✅ Covered in `allPhasesIntegration.test.js` | Webhook + notification + confirmation |
| `backend/routes/agentApprovalRoutes.js` | ✅ **جديد** 2726 B | ❌ | API endpoints: GET list, POST approve/reject |
| `AiToolApprovalRequest` schema | ✅ موجود | - | موجود ب ai_analytics.prisma |

### الخطة 13: محرك سياسات الأمان (Policy Engine Guardrails)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/policyEnforcementEngine.js` | ✅ **موجود** | ✅ Covered in `allPhases` | خارج الـ LLM — حدود الخصومات + فحص الأسعار |

---

## 👥 المرحلة 4: فرق الوكلاء والتنسيق (الخطط 14-16)

### الخطة 14: BaseAgent والتخليق الديناميكي

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/BaseAgent.js` | ✅ **موجود** | ✅ Covered in `allPhases` | كلاس أساسي موحد للوكلاء |
| `backend/services/aiAgent/agentProvisioningService.js` | ✅ **موجود** | ✅ Covered in `allPhases` + `agentFileSystemRegistryService.test.js` | agent.spawn + least privilege + template loader |
| `backend/agents/*/agent.json + AGENTS.md + SOUL.md + TOOLS.md` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | قوالب manager/sales/support/inventory/marketing |
| `backend/agents/_shared/tool-registry.json` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | JSON Schema + read/write + approval metadata |
| `backend/agents/_shared/skills/*` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | مهارات مشتركة محدودة الأدوات |
| `backend/services/aiAgent/agentFileSystemService.js` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | قراءة ملفات القوالب والمهارات |
| `backend/services/aiAgent/toolRegistryService.js` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | تحميل الأدوات والتحقق من schemas |
| `backend/services/aiAgent/skillRegistryService.js` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | تحميل المهارات والتحقق من tool scopes |
| `backend/services/aiAgent/agentProfileLoaderService.js` | ✅ **جديد** | ✅ `agentFileSystemRegistryService.test.js` | بناء runtime config من template files |
| `backend/services/aiAgent/toolOrchestratorService.js` | ✅ **جديد** | ✅ `agentManagerRuntimeService.test.js` | بوابة واحدة للـ tool calls + approval drafts + audit |
| `backend/services/aiAgent/agentInboxService.js` | ✅ **جديد** | ✅ `agentManagerRuntimeService.test.js` | inbox + checkout + complete/fail + heartbeat |
| `backend/services/aiAgent/agentManagerService.js` | ✅ **جديد** | ✅ `agentManagerRuntimeService.test.js` | manager context + hire/delegate/chat/tool handlers |
| `backend/routes/agentManagerRoutes.js` | ✅ **جديد** | ✅ syntax + service coverage | `/api/v1/agent-manager/*` |

### الخطة 15: CEO Agent

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/CEOAgent.js` | ✅ **موجود** | ✅ Covered in `allPhases` | Task decomposition + sub-agent delegation |

### الخطة 16: تسليم المهام (Agent Handoff)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/agentHandoffService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | agent.handoff() + context transfer |

---

## 📅 المرحلة 5: التخطيط والجدولة والذكاء (الخطط 17-20)

### الخطة 17: جدولة المهام باللغة الطبيعية (NL Cron)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/naturalLanguageCronService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | نص طبيعي → Cron expression |

### الخطة 18: منفذ الروتين المجدول (Routine Executor)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/routineExecutorService.js` | ✅ **موجود** | ✅ Covered in `allPhases` | BullMQ + إيقاظ الوكلاء المحدولين |

### الخطة 19: الـ Corrective RAG

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/rag/CorrectiveRAGEngine.js` | ✅ **جديد** 5882 B | ✅ Covered in `allPhasesIntegration.test.js` | State machine + query reformulation + source fallback |

### الخطة 20: DAG Planner & Executor

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/DAGPlannerExecutor.js` | ✅ **جديد** 6226 B | ✅ Covered in `allPhasesIntegration.test.js` | DAG + topological sort + dynamic replanning |

### خدمات إضافية (خارج الخطة الرسمية)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `backend/services/aiAgent/modelRouterService.js` | ✅ **جديد** 4220 B | ✅ Covered in `allPhasesIntegration.test.js` | الخطة 4 — classifies tasks, routes to Flash/Pro/fallback |

---

## 🧪 الموجز — Test Status

| Test File | الحالة | النتيجة |
|-----------|--------|---------|
| `agentFileSystemRegistryService.test.js` | ✅ PASS | 6/6 — templates/tools/skills/provisioning |
| `agentManagerRuntimeService.test.js` | ✅ PASS | 8/8 — manager/inbox/orchestrator/conflicts |
| `databaseMemoryTelemetry.test.js` | ✅ PASS | CRUD + tenant isolation |
| `telemetryTracerService.test.js` | ✅ PASS | Trace/span lifecycle |
| `providerBudgetLedgerService.test.js` | ✅ PASS | 5/5 tests PASS 🟢 |
| `geminiModelPolicy.test.js` | ✅ 4/4 PASS | Model filtering |
| `modelManager.centralProviderRouting.test.js` | ✅ 3/3 PASS | Provider routing |
| `modelManagerKeySource.test.js` | ✅ 7/7 PASS | Key source logic |
| `modelManager.groqProviderDefaults.test.js` | ✅ 7/7 PASS | Provider defaults |
| `GoogleProvider.test.js` | ✅ 3/3 PASS | Google implementation |
| `openRouterProvider.test.js` | ✅ 3/3 PASS | OpenRouter implementation |
| `nvidiaProvider.test.js` | ✅ 3/3 PASS | NVIDIA implementation |
| `memoryPressureMonitorService.test.js` | ✅ 2/2 PASS | V8 heap monitoring |

**🟢 كل ملفات الخدمة مكتوبة — لأول مرة من أول Phase 1 لآخر Phase 20**

| المرحلة | ✅ Services | ✅ Tests (unit) | ✅ Tests (integration) |
|----------|-----------|----------------|----------------------|
| **المرحلة 1** (البنية التحتية) | 16/16 | 11 files, **57/57 PASS** 🟢 | - |
| **المرحلة 2** (الذاكرة) | 6/6 | - | ✅ Covered in `allPhasesIntegration.test.js` |
| **المرحلة 3** (التحكم البشري) | 5/5 | - | ✅ Covered in `allPhasesIntegration.test.js` |
| **المرحلة 4** (فرق الوكلاء) | 4/4 | - | ✅ Covered in `allPhasesIntegration.test.js` |
| **المرحلة 5** (التخطيط) | 5/5 | - | ✅ Covered in `allPhasesIntegration.test.js` |
| **المجموع** | **36/36** ✅ | **57 PASS** | **1 integration file (680 lines)** |

### ✅ إنجازات المراجعة الأخيرة
1. **`CorrectiveRAGEngine.js`** اتنفذ في `backend/services/rag/` (5882 B) ✅
2. **`agentApprovalRoutes.js`** اتنفذ في `backend/routes/` (2726 B) ✅
3. **`allPhasesIntegration.test.js`** اتنفذ (680 lines, يغطي Phases 4-20) ✅
4. **Bugs الـ budget ledger اتصلحوا** — 5/5 tests PASS 🟢

### ❌ لسه ناقص
- Prisma persistence مخصص للـ agent profiles/artifacts/tasks/runs بدل الاعتماد على `AiProviderLog` فقط.
- ربط tool handlers الحقيقية لكل أدوات التجارة والتسويق والدعم؛ الأدوات غير المسجلة حالياً ترجع `VALIDATED_NO_HANDLER`.

### ✅ تحديث 2026-05-22
- اتضافت واجهة `/admin/agent-manager` لإدارة المدير، محادثته، تعيين وكلاء من القوالب، تفويض الأهداف، مراجعة الـ inbox، وتجربة الأدوات.
- اتضاف قفل تعارضات resource-level لمسودات الكتابة ومهام الـ inbox النشطة.
- ما زال ناقص persistence مخصص للـ agent artifacts وربط handlers التجارة الحقيقية بالكامل.

### ✅ تحديث 2026-05-23
- تم منع تبديل موديل الوكيل بشكل خفي عند فشل الموديل المختار، مع تمرير بيانات المزود/الموديل للواجهة ورسائل الخطأ.
- اتضافت أداة `skill.create` لإنشاء مهارات runtime كملفات `skill.json` و`SKILL.md` مع تحقق من الأدوات، منع path traversal، وربط اختياري بالوكيل.
- تم السماح للمهارات الديناميكية بالانضمام لقوالب الوكلاء فقط إذا كانت أدواتها ضمن صلاحيات الوكيل، وتدخل تعليماتها في prompt الوكيل بعد التحقق.

#### ✅ تحديث 2026-05-26 — 15 سيناريو اختبار إضافية + 21 سيناريو محادثة كاملة لفيس بوك
- تم إنشاء 21 سيناريو محادثة كاملة (SC-01 إلى SC-21) في `FACEBOOK_MESSENGER_CUSTOMER_SCENARIOS.md`
- تم إضافة 15 سيناريو اختبار شاملة (SC-T01 إلى SC-T15) تغطي: شراء مباشر، استفسار، مقارنة، اعتراض سعر، شحن، توفر، صورة، تغيير نية، عميل غاضب، سؤال غامض، Upsell، طلب سريع، تضليل، رجوع بعد وقت، ضغط قرار
- 7 فئات: استفسار منتجات (6)، شراء وطلبات (4)، سعر وخصومات (3)، شحن (2)، متابعة طلبات (2)، حالات خاصة (2)، شكاوى وإرجاع (2)
- كل سيناريو يشمل: السياق، الأدوات الداخلية `[داخلي]`، الرد الفعلي للوكيل، جولات محادثة متعددة (3–6 جولات لكل سيناريو)
- تغطي 41 من 52 حالة في مصفوفة FB-001 إلى FB-050
- تصحيح 2026-05-26: semantic cache يستخدم سياق RAG فقط ولا يرجع رد عميل مباشر، وملف `eval_scenarios.json` بقى seed صريح للاختبارات بدل default إنتاجي لكل شركة.

## 🌐 المرحلة 21: بوابة القدرات (MCP Gateway)

| الملف | الحالة | اختبارات | ملاحظات |
|-------|--------|----------|---------|
| `apps/mcp-servers/catalog-mcp/` | ✅ **موجود** | ✅ 6/6 PASS | أول MCP server للإنتاج (product/inventory) |
| `apps/mcp-servers/skills-mcp/` | ✅ **موجود** | ✅ 4/4 PASS | تحويل المهارات لـ MCP resources + hot-reload |
| `legacy-ai-agent/aiAgent/agentToolGatewayService.js` | ✅ **محدث** | ✅ 5/5 PASS | إغلاق ثغرة الـ bypass لـ MCP tools |
| `ai-service/src/mcp/registry.py` | ✅ **محدث** | ✅ `test_registry.py` PASS | دعم `skills_mcp_url` و `get_skill_clients` |
| `ai-service/src/agents/base.py` | ✅ **محدث** | ✅ Wiring | ربط `MCPSkillsSource` بـ `AggregatingSkillsSource` |
| `scripts/test_mcp_e2e.sh` | ✅ **موجود** | ✅ E2E PASS | اختبار المسار الكامل من العميل للـ MCP tool |

**🟢 الحالة: تم تنفيذ الـ MCP Gateway architecture بالكامل كـ Baseline.**

عندما يكتب الـ Codex Agent أي ملف جديد:
1. 🔍 **اقرأ الملف** — هل يطابق الـ spec في `roadmap_20_phases.md`؟
2. 🧪 **هل له test file؟** — لو لا، علمني
3. ✅ **حدث الـ tracker** — غير الحالة في الجدول
4. 🏃 **شغّل tests** — `npx jest tests/path/to/file.test.js --verbose`
5. ⚠️ **نبهني** لو فيه gaps أو bugs

## ✅ تحديث 2026-08-08 — وكيل تأكيد الطلبات على الواتساب (order-confirmation-agent)

وكيل جديد `order-confirmation-agent` (دور `ORDER_CONFIRMATION`) لتأكيد الطلبات على الواتساب مع وعي كامل بخريطة شركة الشحن:

- **القالب**: `backend/agents/order-confirmation-agent/` (agent.json + SOUL/AGENTS/TOOLS/PERSONA بالعربي، شخصية بشرية "منى — منسقة تأكيد الطلبات"، ردود قصيرة وسؤال واحد في المرة). channels: `whatsapp`. يُسند من صفحة الوكلاء (يستبدل وكيل الواتساب الحالي).
- **أدوات جديدة** في `ai-service/src/tools/definitions/order.py`:
  - `order_confirm` — تأكيد طلب موجود → `CONFIRMED` (يضبط confirmedAt + يبعت `ORDER_CONFIRMED` + يفعّل Turbo auto-shipment = التمرير لشركة الشحن).
  - `order_update_details` — تعديل عنوان/بيانات توصيل عبر `orderDetailsUpdateService`.
- **أدوات خريطة شركة الشحن** في `shipping.py`:
  - `shipping_company_governorates` / `shipping_company_areas` — تجيب خريطة المحافظات/المناطق الفعلية لشركة الشحن (Turbo) عشان الوكيل يصلّح العنوان بأسماء صحيحة بدل خريطة الموقع.
- **Skill إجرائية** جديدة `ai-service/skills/order-confirmation/` (skill.json + SKILL.md) بتعلّم دورة العمل: lookup ← مطابقة العنوان مع خريطة الشركة ← سؤال العميل لو العنوان مش واضح ← update_details ← confirm ← pass to shipping.
- **تم التنفيذ مباشر بدون موافقة**: `order_confirm` و `order_update_details` في `DIRECT_WRITE_TOOL_NAMES` في `ai-service/src/tools/registry.py`.
- `role_tools.yaml` أضيف لها دور `ORDER_CONFIRMATION`؛ `superAdminRoutes.js` أضيف أيقونة/صناعات القالب.
- `backend_client.py` أضيفت: `confirm_order`, `update_order_details`, `get_shipping_company_governorates`, `get_shipping_company_areas`.
- **ملاحظة**: بذرة القالب/المهارة بتتحمل في DB عند إعادة تشغيل ai-service (أو `POST /admin/agents/templates/seed` + `/admin/agents/skills/seed`).

## ✅ تحديث 2026-08-11 — تحليلات حركة حالات الطلبات (order movement analytics)

ميزة تحليلات (غير agentic) في قسم تحليلات الطلبات:

- **Backend**: `services/orderMovementCore.js` + 8 كونترولرز في `controller/orderMovement/` (مصفوفة انتقالات، سانكي، مسارات، زمن مكوث، نتائج نهائية، أداء فريق، طلبات معلّقة، موافقات) معلّقة على `/api/v1/analytics/order-movement/*` مع تمييز يدوي/تلقائي. اختبارات 44/44.
- **Frontend**: صفحة `/analytics/orders/status-movement` (OrderMovementPage) بـ 8 تابات + فلتر تاريخ + فلتر يدوي/تلقائي + تنبيه truncation. اختبارات frontend 24/24.


## 2026-08-13 - TikTok integrations (5 parallel agents + orchestrator)

- Publish (Content Posting API): services/tiktok/tiktokPublishService.js + controller/routes, frontend /tiktok/publish.
- Shop: services/tiktok/tiktokShopService.js (HMAC-signed TikTok Shop Partner API) + controller/routes, frontend /tiktok/shop.
- Login Kit: controller/tiktokAuthController.js (storefront OAuth customer login) + storefront/components/TikTokLoginButton.tsx.
- Display/Embed: services/tiktok/tiktokDisplayService.js + components/TikTokEmbed.tsx + storefront/sections/TikTokFeedSection.tsx.
- Events: services/tiktok/tiktokEventsManager.js + controller/routes + components/tiktok/TikTokEventsSettingsCard.tsx, frontend /tiktok/settings.
- Shared foundation: prisma/schema/tiktok.prisma (TikTokAccount/TikTokSettings/TikTokPost/TikTokShopAccount/TikTokPixelConfig) + services/tiktok/tiktokOAuthService.js + Customer.tiktokId.
- Mounted in server.js at /api/v1/tiktok/{publish,shop,auth,display,events}. Backend 1156 files syntax OK, prisma validate OK, vite build OK, check-icon-imports OK.
