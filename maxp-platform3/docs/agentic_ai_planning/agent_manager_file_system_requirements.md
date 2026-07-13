# Agent Manager File System Requirements

> الهدف: تحويل نظام الوكلاء من كود وخدمات متفرقة إلى طبقة واضحة تشبه Paperclip: وكيل مدير يمكن التحدث معه، يعرف حالة الشركة، يوزع العمل، ويوظف وكلاء متخصصين بملفات تعريف وأدوات ومهارات واضحة.

## الخلاصة التنفيذية

الموجود حالياً قوي كـ runtime: `BaseAgent`, `CEOAgent`, `agentProvisioningService`, approvals, audit, scheduler, memory, telemetry, and agent control pages.

بعد تنفيذ Phase A ثم تكملة طبقة التشغيل، أصبح لدينا قوالب ملفات للوكلاء + tool orchestration + manager facade + inbox/checkout API. الناقص الآن أصبح أضيق: persistence صريح للـ agent profiles/artifacts/tasks/runs كجداول مخصصة، وواجهة UI لإدارة هذه الطبقة، وhandlers حقيقية لكل أدوات التجارة بدل validated no-handler للأدوات غير المربوطة.

## حالة التنفيذ 2026-05-21

### تم تنفيذ Phase A

- إنشاء `backend/agents/` وفيه قوالب `manager-ceo`, `sales-agent`, `inventory-pricing-agent`, `marketing-agent`, و`support-agent`.
- إضافة `agent.json`, `AGENTS.md`, `SOUL.md`, و`TOOLS.md` لكل قالب.
- إضافة سجل أدوات مركزي في `backend/agents/_shared/tool-registry.json`.
- إضافة مهارات مشتركة داخل `backend/agents/_shared/skills/*`.
- إضافة loaders/registries:
  - `agentFileSystemService.js`
  - `toolRegistryService.js`
  - `skillRegistryService.js`
  - `agentProfileLoaderService.js`
- ربط `agentProvisioningService.spawn()` و`CEOAgent` بالقوالب بدل الاعتماد فقط على map يدوي للأدوات.
- توسيع `BaseAgent` ليحمل `templateSlug`, `version`, و`allowedSkills`.
- توسيع `/api/v1/agent/agents` ليعرض `allowedSkills`, `templateSlug`, و`version`.
- إضافة اختبار `agentFileSystemRegistryService.test.js`.

### تم تنفيذ طبقة التشغيل الأساسية

- إضافة `toolOrchestratorService.js` كبوابة واحدة للـ tool calls:
  - schema validation.
  - agent tool permission check.
  - تحويل write tools التي تحتاج approval إلى draft approval.
  - audit logging لكل deny/draft/execute/failure.
- إضافة `agentInboxService.js`:
  - create/list/get tasks.
  - checkout locking.
  - complete/fail.
  - heartbeat.
  - event logging عبر `AiProviderLog` scope `agent_task`.
- إضافة `agentManagerService.js`:
  - manager context.
  - hire agent.
  - delegate goal إلى inbox tasks.
  - manager chat summary.
  - register manager tool handlers (`agent.spawn`, `agent.assign_task`, `agent.list_agents`, `agent.read_state`, `agent.handoff`).
- إضافة `/api/v1/agent-manager/*`:
  - `GET /me`
  - `POST /chat`
  - `GET /inbox`
  - `POST /tasks/:id/checkout`
  - `POST /tasks/:id/complete`
  - `POST /tasks/:id/fail`
  - `POST /hire`
  - `POST /delegate`
  - `GET /profiles`
  - `GET /tools`
  - `POST /tools/execute`
  - `GET /skills`
- إضافة اختبار `agentManagerRuntimeService.test.js`.

### ما زال مطلوباً بعد Phase A

- Prisma models دائمة للـ agent profiles/artifacts/tasks/runs بدل الاعتماد على `AiProviderLog` فقط.
- UI لإدارة ملفات/مهارات/أدوات كل agent من لوحة التاجر.
- Behavioral evals لكل skill قبل استخدامها في أتمتة production حساسة.
- ربط كل `handler` في `tool-registry.json` بتنفيذ تجاري حقيقي؛ حالياً الأدوات غير المسجلة كـ handlers تمر كـ `VALIDATED_NO_HANDLER`.

الطبقة التي كانت ناقصة قبل التنفيذ كانت:

- ملفات هوية وتعليمات لكل وكيل.
- سجل أدوات مركزي قابل للتنفيذ والتحقق.
- مستودع مهارات معزولة.
- جدول وكلاء دائم بدلاً من الاعتماد على `AiProviderLog` كذاكرة provisioning.
- وكيل مدير محادثي له inbox، budget، chain of command، hire/delegate workflow.
- loader يقرأ الملفات ويحولها إلى prompt/tool/skill context.

## مقارنة الخطة بالموجود حالياً

| المكون | مطلوب في الخطة | الموجود الآن | الحالة |
|---|---|---|---|
| Agent identity files | `AGENTS.md`, `SOUL.md`, `TOOLS.md` لكل وكيل | موجودة كقوالب versioned تحت `backend/agents/` | تم Phase A |
| Manager/CEO agent | مدير يتلقى أهداف ويخلق وكلاء | `CEOAgent.js` يحمل قالب `manager-ceo` ويستطيع التفكيك/الإسناد | جزئي |
| Hiring workflow | manager يطلب/ينشئ agent جديد بملفات وصلاحيات | `agentProvisioningService.spawn()` يستخدم القوالب والمهارات | جزئي |
| Durable agent profiles | جدول واضح للوكلاء وإصداراتهم | التخزين ما زال عبر `AiProviderLog` scope `agent_provision` | ناقص |
| Tool registry | JSON Schema + read/write + approval policy | موجود في `_shared/tool-registry.json` وخدمة `toolRegistryService` | تم Phase A |
| Tool orchestrator | نقطة تنفيذ واحدة للأدوات مع policy/audit/approval | موجود `toolOrchestratorService` | تم أساسي |
| Skills | مهارات معزولة، كل مهارة تستخدم 2-3 أدوات | موجودة كحزم markdown/json مشتركة | تم Phase A |
| Procedural memory | Skill Store قابل للاسترجاع | موجود كملفات مشتركة؛ لم يتحول بعد لمخزن DB/versioned | جزئي |
| Manager chat | واجهة محادثة مع المدير للسؤال والتوجيه | موجود `/api/v1/agent-manager/chat` كرد إداري deterministic | جزئي |
| Heartbeat/inbox | agent يستيقظ، يقرأ inbox، ينفذ، يحدث الحالة | موجود `agentInboxService` مع checkout/complete/fail/heartbeat | جزئي |
| Versioning | `SalesAgent:v1.2.0` كأصل غير قابل للتعديل | `agent.json` فيه `version` للقوالب؛ لا يوجد artifact history/rollback بعد | جزئي |

## هيكل الملفات المقترح

لا يجب تخزين بيانات الشركات الحساسة داخل Git. الأفضل فصل **قوالب الوكلاء** عن **نسخ التشغيل الخاصة بكل شركة**.

### 1. قوالب versioned داخل repo

```text
backend/agents/
  _shared/
    TOOLS.md
    tool-registry.json
    skills/
      catalog-search/
        SKILL.md
        skill.json
      discount-proposal/
        SKILL.md
        skill.json
      facebook-ad-draft/
        SKILL.md
        skill.json

  manager-ceo/
    agent.json
    AGENTS.md
    SOUL.md
    TOOLS.md
    skills/
      hire-agent/
        SKILL.md
        skill.json
      delegate-goal/
        SKILL.md
        skill.json

  sales-agent/
    agent.json
    AGENTS.md
    SOUL.md
    TOOLS.md

  inventory-pricing-agent/
    agent.json
    AGENTS.md
    SOUL.md
    TOOLS.md

  marketing-agent/
    agent.json
    AGENTS.md
    SOUL.md
    TOOLS.md

  support-agent/
    agent.json
    AGENTS.md
    SOUL.md
    TOOLS.md
```

### 2. نسخ تشغيل private خارج Git

```text
/var/lib/maxp/agents/{companyId}/{agentId}/
  agent.json
  AGENTS.md
  SOUL.md
  TOOLS.md
  MEMORY.md
  memory/YYYY-MM-DD.md
  skills/
```

هذه النسخ تتولد من القوالب، ويمكن تحديثها من لوحة التحكم. لا تدخل secrets في هذه الملفات.

## معنى كل ملف

### `agent.json`

ملف machine-readable، وليس بديلاً عن markdown.

```json
{
  "slug": "manager-ceo",
  "name": "CEO Agent",
  "role": "CEO",
  "version": "1.0.0",
  "modelPolicy": {
    "default": "gemini-2.5-pro",
    "fallback": "gemini-2.5-flash"
  },
  "instructions": {
    "agents": "AGENTS.md",
    "soul": "SOUL.md",
    "tools": "TOOLS.md"
  },
  "allowedTools": ["agent.spawn", "agent.assign_task", "agent.read_state"],
  "allowedSkills": ["hire-agent", "delegate-goal"],
  "channels": ["dashboard"],
  "budget": {
    "dailyUsd": 5,
    "maxToolCallsPerRun": 8
  }
}
```

### `AGENTS.md`

قواعد التشغيل:

- طريقة الاستجابة.
- حدود الأمان.
- متى يسأل الإنسان.
- متى ينشئ draft approval.
- chain of command.
- heartbeat/inbox rules.
- ممنوعات تسريب البيانات.

### `SOUL.md`

الشخصية والهوية:

- المهمة الأساسية.
- النبرة.
- أولويات القرار.
- علاقة الوكيل بالعميل/التاجر.
- حدود الشخصية حتى لا يحدث persona drift.

### `TOOLS.md`

قائمة الأدوات المسموحة للوكيل بشكل مقروء:

- اسم الأداة.
- read/write.
- هل تحتاج approval.
- أمثلة.
- موانع الاستخدام.

التنفيذ الحقيقي لا يعتمد على `TOOLS.md` فقط، بل على `tool-registry.json` و schemas.

### `skills/*/SKILL.md`

وصفة مهارة محدودة:

- متى تستخدم.
- الأدوات المسموحة للمهارة، بحد أقصى 2-3 أدوات.
- المدخلات المطلوبة.
- خطوات التنفيذ.
- معايير النجاح والفشل.
- كيفية تنظيف/تحديث السياق بعد الانتهاء.

## Tool Registry المطلوب

نحتاج ملف/خدمة مركزية تعرف الأدوات بشكل قابل للتحقق:

```text
backend/services/aiAgent/toolRegistryService.js
backend/services/aiAgent/toolOrchestratorService.js
backend/agents/_shared/tool-registry.json
```

شكل الأداة:

```json
{
  "name": "product.search",
  "description": "Search products in the current company catalog.",
  "sideEffects": "read",
  "requiresApproval": false,
  "companyScoped": true,
  "inputSchema": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": { "type": "string" },
      "limit": { "type": "integer", "minimum": 1, "maximum": 20 }
    }
  },
  "handler": "catalogTools.searchProducts"
}
```

قواعد التنفيذ:

1. أي tool call يمر عبر `toolOrchestratorService`.
2. التحقق من schema قبل التنفيذ.
3. التحقق من `agent.allowedTools`.
4. فرض `companyId` برمجياً.
5. لو write action: إنشاء draft approval بدلاً من التنفيذ المباشر.
6. تسجيل audit trail لكل محاولة.

## المهارات الأولية المقترحة

### Manager skills

- `hire-agent`: إنشاء وكيل جديد من template، تحديد role/tools/skills، وطلب approval لو الصلاحيات عالية.
- `delegate-goal`: تحويل هدف التاجر إلى tasks ووكلاء.
- `read-company-state`: تلخيص حالة المتجر، الميزانية، الطلبات، المخزون، وقنوات الاتصال.
- `review-agent-performance`: قراءة audit/telemetry وتقييم أداء الوكلاء.

### Commerce skills

- `catalog-search`: البحث في المنتجات والمخزون.
- `pricing-review`: اقتراح تغيير أسعار أو خصومات كمسودة.
- `discount-proposal`: إنشاء draft لكود خصم.
- `low-stock-watch`: مراقبة المخزون والتنبيه.

### Marketing skills

- `facebook-ad-draft`: صياغة مسودة إعلان.
- `audience-suggestion`: اقتراح جمهور واستهداف.
- `campaign-report`: تلخيص أداء حملة.

### Support skills

- `customer-context-summary`: تلخيص العميل والمحادثة.
- `order-lookup`: قراءة الطلبات والشحن.
- `handoff-to-human`: تسليم المحادثة للبشر عند الغضب/الغموض.

## نموذج Paperclip الذي نحتاج نقله

الفكرة ليست نسخ Paperclip بالكامل، بل أخذ البروتوكول الإداري:

1. **Manager identity**: كل manager يعرف `companyId`, role, budget, chain of command.
2. **Inbox**: قائمة أعمال واضحة للوكيل.
3. **Checkout**: الوكيل لا يشتغل على مهمة إلا بعد ما يحجزها لتجنب تضارب وكلاء آخرين.
4. **Heartbeat**: الوكيل يستيقظ، يقرأ inbox، ينفذ جزءاً صغيراً، يسجل، وينام.
5. **Delegation**: المدير ينشئ subtask/agent ويحدد الأدوات والمهارات.
6. **Budget guard**: فوق 80% تكلفة، يشتغل على critical فقط.
7. **Audit trail**: كل hire/delegate/tool call له trace.

## مكونات backend المطلوبة

### خدمات جديدة

```text
backend/services/aiAgent/agentProfileLoaderService.js
backend/services/aiAgent/agentFileSystemService.js
backend/services/aiAgent/toolRegistryService.js
backend/services/aiAgent/toolOrchestratorService.js
backend/services/aiAgent/skillRegistryService.js
backend/services/aiAgent/agentManagerService.js
backend/services/aiAgent/agentInboxService.js
```

### جداول Prisma مقترحة

- `AiAgentProfile`: وكيل دائم، role/version/status/companyId/templateSlug.
- `AiAgentArtifact`: مسارات/محتوى `AGENTS.md`, `SOUL.md`, `TOOLS.md`, checksums.
- `AiAgentSkillAssignment`: ربط agent بالمهارات.
- `AiToolDefinition`: registry للأدوات، sideEffects، schema، handler.
- `AiAgentTask`: inbox/task/checkout/handoff.
- `AiAgentRun`: heartbeat/run/audit وربطه بالتكلفة.

## API endpoints المقترحة

```text
GET    /api/v1/agent-manager/me
POST   /api/v1/agent-manager/chat
GET    /api/v1/agent-manager/inbox
POST   /api/v1/agent-manager/tasks/:id/checkout
POST   /api/v1/agent-manager/hire
POST   /api/v1/agent-manager/delegate

GET    /api/v1/agent/profiles
POST   /api/v1/agent/profiles
GET    /api/v1/agent/profiles/:id/files
PUT    /api/v1/agent/profiles/:id/files/:fileName

GET    /api/v1/agent/tools
GET    /api/v1/agent/skills
POST   /api/v1/agent/profiles/:id/skills/sync
```

## أولويات التنفيذ

### Phase A: وضوح الملفات بدون تغيير خطير في runtime

1. ✅ إنشاء `backend/agents/` بقوالب المدير والوكلاء الأساسية.
2. ✅ إنشاء `tool-registry.json` أولي من الأدوات الموجودة.
3. ✅ إنشاء skills أولية markdown/json.
4. ✅ إنشاء loader يقرأ `agent.json`, `AGENTS.md`, `SOUL.md`, `TOOLS.md`.
5. ✅ ربط `agentProvisioningService.spawn()` بالـ loader بدلاً من config اليدوي فقط.

### Phase B: تحويل الأدوات لمسار آمن

1. ✅ بناء `toolRegistryService`.
2. ✅ بناء `toolOrchestratorService`.
3. ✅ جعل `draftProposalService` يعتمد على registry مركزي للتصنيف.
4. ✅ write tools التي تحتاج approval تتحول إلى draft + audit.
5. ✅ قفل تعارضات أولي يمنع وجود مسودتين كتابة معلقتين أو مهمتين نشطتين على نفس resource conflict key.
6. ⏳ ربط كل handlers التجارية الحقيقية بدل `VALIDATED_NO_HANDLER`.

### Phase C: مدير Paperclip-style

1. ✅ بناء `agentManagerService`.
2. ✅ إضافة manager chat endpoint.
3. ✅ إضافة hire/delegate APIs.
4. ✅ إضافة inbox/checkout protocol.
5. ✅ UI: `/admin/agent-manager` لمحادثة المدير، تعيين الوكلاء، تفويض الأهداف، إدارة inbox، وتجربة الأدوات.

### Phase D: الاستدامة والإصدارات

1. إضافة Prisma models.
2. إضافة versioning للـ agent artifacts.
3. إضافة rollback.
4. إضافة behavioral evals لكل skill.

## قرارات تصميم مهمة

- لا نضع بيانات شركة حساسة في Git.
- markdown للتعليمات البشرية، JSON للتنفيذ والتحقق.
- الوكيل لا يرى كل الأدوات؛ يرى فقط مهاراته وأدواته المحدودة.
- المدير لا ينفذ write actions مباشرة؛ يخلق draft أو يفوض لوكيل متخصص.
- `AGENTIC_AI_TRACKER.md` يحتاج تحديث لأن عبارة "لا يوجد ناقص" لا تغطي Agent File System Layer.
