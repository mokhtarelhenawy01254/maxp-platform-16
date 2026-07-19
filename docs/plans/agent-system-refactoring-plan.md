# خطة إعادة هيكلة نظام الأجنت — Agent System Refactoring

**تاريخ الإنشاء**: 2026-07-17
**التعقيد**: HIGH (6-8 أسابيع تقديرياً)
**الحالة**: مسودة

---

## Overview

إعادة هيكلة `skills_pipeline.py` من God Object إلى pipeline stage خالص مع agent-specific hooks/plugins. كل agent يتحكم في سلوكه الخاص (enforcement, formatting, instructions) بدلاً من pipeline عارف كل حاجة.

### المبادئ

1. **Pipeline ≠ Agent Logic** — الـ pipeline بيهتم بتدفق النداءات بس
2. **كل Agent يملك hooks** — enforcement, formatting, instructions كلها في الـ agent
3. **No hardcoded Arabic** — النصوص الخاصة باللهجة تكون في agent instructions مش في 코드
4. **No filesystem coupling** — tool derivation من DB مش من skill.json في runtime
5. **tool_choice عمود أول** — مش مدفون في JSONB

---

## Sprint 1: فصل Hotel Enforcement من الـ Pipeline

**الهدف**: إزالة 200 سطر من hotel logic من `skills_pipeline.py` وتحويلها إلى HotelAgent hook

**Demo/Validation**: pipeline ما يعودش فيه `hotel_reserve` enforcement. HotelAgent يستقبل hooks وبشتغل.

### Task 1.1: تعريف Hook Interface للـ Agent

- **الموقع**: `apps/ai-service/src/pipeline/hooks.py` (ملف جديد)
- **الوصف**: تعريف protocol/base class لـ agent hooks: `before_llm(ctx)`, `after_tools(ctx, executed)`, `before_reply(ctx, reply)`
- **معايير القبول**:
  - `AgentHook` protocol with async methods
  - كل hook يستقبل `PipelineContext` ويرجع `PipelineContext`
  - `BaseAgent` يبقى عنده `hooks: list[AgentHook] = []`
- **التحقق**: unit test أن hook ينادى ويقدر يعدل context

### Task 1.2: نقل Hotel Enforcement إلى Hotel Hook

- **الموقع**:
  - `apps/ai-service/src/agents/hooks/hotel_hook.py` (ملف جديد)
  - يحذف من `skills_pipeline.py` كل hotel logic (lines 51-82, 199-215, 816-1011)
- **الوصف**: نقل `_execute_hotel_reserve_enforcement`, `_message_indicates_hotel_confirmation`, `_scan_messages_for_hotel_data`, `_build_hotel_reserve_tool_call` إلى `HotelEnforcementHook`
- **معايير القبول**:
  - `HotelEnforcementHook.after_tools()` ينفذ نفس logic
  - يحقن synthetic tool_call في `ctx.executed_tools`
  - كل الـ Arabic keywords/parsing في الهوك مش في الـ pipeline
- **التحقق**: نفس سيناريوهات hotel booking تشتغل من غير pipeline logic

### Task 1.3: تسجيل الـ Hook في Hotel Agent

- **الموقع**: `apps/ai-service/src/agents/hotel_agent.py` أو مكان ما hotel agent يتعرف
- **الوصف**: `HotelAgent` يرث `BaseAgent` ويضيف `HotelEnforcementHook` لـ `self.hooks`
- **معايير القبول**:
  - Agent templates مع `slug == "hotel-agent"` تحمل الـ hook تلقائياً
  - Pipeline ينادي hooks قبل/بعد كل مرحلة
- **التحقق**: رسالة تأكيد حجز لفندق تشتغل عن طريق hook مش pipeline

### Task 1.4: إزالة hotel logic من الـ Pipeline

- **الموقع**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
- **الوصف**: حذف `_execute_hotel_reserve_enforcement`, `_message_indicates_hotel_confirmation`, `_scan_messages_for_hotel_data`, `_build_hotel_reserve_tool_call`, وأي استدعاء لهم
- **معايير القبول**: الـ pipeline ما يعودش فيه أي reference لـ "hotel"
- **التحقق**: `git grep hotel` في `skills_pipeline.py` يرجع صفر

---

## Sprint 2: Agent-Specific Tool Result Formatting

**الهدف**: إزالة `_format_tool_results` God function وتحويله إلى per-agent formatter

**Demo/Validation**: كل agent بي format tool results حسب needs بتاعته. مفيش switch/case طويل.

### Task 2.1: إضافة `format_result` method لكل Tool/Skill

- **الموقع**: `apps/ai-service/src/tools/definitions/*.py`, `apps/ai-service/src/skills/*.py`
- **الوصف**: كل `FunctionTool` أو skill ياخد `format_result(result: dict) -> str` اختياري
  - لو ما فيش format، pipeline يستخدم fallback بسيط (اسم الأداة + نجاح/فشل)
- **معايير القبول**:
  - `booking_info.format_result()` يرجع ملخص الفروع والخدمات
  - `product_search.format_result()` يرجع أسماء المنتجات
  - `coupon_validate.format_result()` يرجع صلاحية الكوبون
  - لو ما فيش format: fallback "تم تنفيذ {name} بنجاح"
- **التحقق**: كل tool في `_format_tool_results` له format_result

### Task 2.2: تعديل `_format_tool_results` لاستخدام `format_result`

- **الموقع**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py:554-676`
- **الوصف**: استبدال الـ switch/case بـ `tool.format_result(result)` أو fallback
- **معايير القبول**: نفس output بالظبط للـ 12 tool
- **التحقق**: مقارنة output قبل وبعد لكل tool result

### Task 2.3: إزالة `_format_tool_results` بالكامل

- **الموقع**: `skills_pipeline.py`
- **الوصف**: حذف الـ function بعد ما كل tools تنقل
- **معايير القبول**: `skills_pipeline.py` ما يعودش فيه formatting خاص بأي tool
- **التحقق**: الـ pipeline stage يبقى أصغر بـ 120 سطر

---

## Sprint 3: Agent-Specific Default Prompt

**الهدف**: إزالة e-commerce default prompt — كل agent يبقى عنده prompt خاص

**Demo/Validation**: لو agent معندوش instructions، pipeline ما يبعتش `create_confirmed_order` prompt.

### Task 3.1: رفع `_default_system_prompt` إلى الـ Agent Template

- **الموقع**: `apps/backend/agents/*/agent.json`, DB `agent_templates`
- **الوصف**: إضافة حقل `default_prompt` في `agent.json` لكل template بدلاً من fallback واحد
  - الـ pipeline ما يعودش عنده `_default_system_prompt()` — كل agent يحدد default بتاعه
- **معايير القبول**:
  - كل agent template عنده `default_prompt` في `agent.json`
  - الـ seeder ينقلها لـ `agent_templates.default_prompt` (عمود جديد)
  - Pipeline يستخدم `agent.default_prompt` بدلاً من `_default_system_prompt()`
- **التحقق**: agent من غير instructions ياخد default prompt بتاعه مش prompt بتاع sale

### Task 3.2: إزالة `_default_system_prompt` من الـ Pipeline

- **الموقع**: `skills_pipeline.py:1038-1051`
- **الوصف**: حذف الـ function وكل استدعاءاتها
- **معايير القبول**: الـ pipeline ما يعودش عنده prompt خاص بأي domain
- **التحقق**: `git grep create_confirmed_order` في pipeline يرجع صفر

### Task 3.3: فصل Follow-up Prompt عن الـ Pipeline

- **الموقع**: `skills_pipeline.py:686`
- **الوصف**: نقل `"اكتب رداً طبيعياً ومباشراً للعميل بالعامية المصرية"` إلى agent instructions بدلاً من hardcode في الـ pipeline
  - كل agent يحدد follow-up prompt بتاعه (لغة، لهجة، tone)
  - الفيلم يستخدم `agent.followup_prompt` بدلاً من النص الثابت
- **معايير القبول**:
  - `agent.followup_prompt` في `agent.json` و DB
  - Pipeline يستخدم `agent.followup_prompt` أو fallback "اكتب رداً بناءً على النتائج"
  - Hotel agent يقدر يبقى عنده follow-up مختلف عن sales agent
- **التحقق**: تغيير follow-up prompt لـ hotel agent ما يأثرش على sales agent

---

## Sprint 4: Agent Hooks System (Pipeline Plugin Architecture)

**الهدف**: تحويل pipeline stage إلى plugin system حقيقي

**Demo/Validation**: pipeline stage يصير 3 hooks بس (before_llm, after_tools, before_reply) وكل agent logic في hooks.

### Task 4.1: تصميم Hook Pipeline Stage

- **الموقع**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py`
- **الوصف**: إعادة هيكلة `process_with_skills` لتنادي hooks في 3 نقاط:
  1. `before_llm(ctx)` — guardrails, context injection
  2. `after_tools(ctx, executed)` — enforcement, validation
  3. `before_reply(ctx, reply)` — formatting, attachments
- **معايير القبول**: `process_with_skills` يستدعي hooks بس — لا logic خاص بأي agent
- **التحقق**: كل agent logic موجود في hooks مش في pipeline

### Task 4.2: نقل Guardrails إلى Hook

- **الموقع**: `skills_pipeline.py:91-103`
- **الوصف**: نقل `INPUT_GUARDRAILS` loop إلى `GuardrailHook.before_llm()`
- **معايير القبول**: pipeline يستدعي hook بدلاً من guardrail loop مباشر
- **التحقق**: guardrails تشتغل زى ما هي

### Task 4.3: نقل Attachment Auto-Populate إلى Hook

- **الموقع**: `skills_pipeline.py:269-328`
- **الوصف**: نقل landmarkImage و product images auto-populate إلى `AttachmentHook.before_reply()`
- **معايير القبول**: `ctx.response_attachments` يتعبا زى ما هو
- **التحقق**: نفس output للصور

### Task 4.4: نقل Image Injection لـ product_search إلى Hook

- **الموقع**: `skills_pipeline.py:778-814`
- **الوصف**: نقل `_inject_image_to_product_search` إلى hook مخصص
- **معايير القبول**: `product_search` يستقبل image_bytes من hook مش من pipeline
- **التحقق**: vector search بالصورة يشتغل

---

## Sprint 5: إصلاح tool_choice

**الهدف**: tool_choice يبقى first-class column مش مدفون في JSONB

**Demo/Validation**: `SELECT slug FROM agent_templates WHERE tool_choice = 'required'` يشتغل.

### Task 5.1: إضافة tool_choice عمود في agent_templates

- **الموقع**: `apps/ai-service/src/db/models/agent.py`, migration
- **الوصف**: إضافة عمود `tool_choice: Optional[str]` في `agent_templates` table
  - قيم: `"auto"`, `"required"`, `"none"`
  - Default: `"auto"`
- **معايير القبول**: المايقريشن يضيف العمود والبيانات الموجودة تتحول من `config.toolChoice`

### Task 5.2: تعديل Seeder لقراءة tool_choice من agent.json

- **الموقع**: `apps/ai-service/src/db/seed/loader.py`
- **الوصف**: الـ seeder يقرأ `config.toolChoice` من `agent.json` ويكتبها في عمود `tool_choice`
- **معايير القبول**: بعد الـ seed، كل template عنده tool_choice صحيح

### Task 5.3: تعديل Pipeline لقراءة tool_choice من العمود

- **الموقع**: `skills_pipeline.py:446-454, 519-523`
- **الوصف**: بدلاً من `agent.config.config.get("toolChoice")`، استخدم `agent.tool_choice` مباشرة
- **معايير القبول**: نفس السلوك بدون JSONB access

### Task 5.4: إزالة DeepSeek Hack

- **الموقع**: `skills_pipeline.py:452-454`
- **الوصف**: بدلاً من silent drop لـ `tool_choice: required` مع DeepSeek:
  - إما Add provider capability flag (`supports_tool_choice_required`)
  - أو pipeline يحاول first-class tool_choice مع provider mapping
- **معايير القبول**: DeepSeek يعرف `tool_choice: required` (لو الـ API يدعمها) أو pipeline يعرف الـ limitation بشكل صريح
- **التحقق**: agent مع `toolChoice: required` و provider DeepSeek يشتغل بدون silent behavior change

---

## Sprint 6: إزالة Filesystem Coupling من Tool Derivation

**الهدف**: tool derivation من DB مش من `skill.json` في runtime

**Demo/Validation**: `_resolve_tools()` ما يقرأش من الديسك.

### Task 6.1: تخزين skill tools في DB

- **الموقع**: `apps/ai-service/src/db/models/skill.py` أو جدول جديد `agent_skill_tools`
- **الوصف**: إضافة جدول يربط agent template بالـ tools المستمدة من skills
  - الـ seeder يقرأ `skill.json` مرة واحدة عند الـ seed ويكتب في DB
  - `_resolve_tools()` يقرأ من DB بدلاً من filesystem
- **معايير القبول**:
  - بعد الـ seed، كل skill tools موجودة في DB
  - `_resolve_tools()` ما يستخدمش `Path(__file__).resolve()` لقراءة skill.json
- **التحقق**: نفس tool list بالظبط من DB ومن filesystem

### Task 6.2: تعديل BaseAgent._resolve_tools()

- **الموقع**: `apps/ai-service/src/agents/base.py:483-514`
- **الوصف**: استبدال filesystem read بـ DB query
- **معايير القبول**: لا `open()` أو `Path.iterdir()` على skill directory
- **التحقق**: test بدون filesystem access يشتغل

---

## Sprint 7: إصلاح Two Sources of Truth للـ Instructions

**الهدف**: مصدر واحد للحقيقة للـ instructions

**Demo/Validation**: template instructions و agent instructions لكل منهما مصدر واضح.

### Task 7.1: توحيد تخزين الـ Instructions

- **الموقع**: `apps/ai-service/src/agents/agents.py:240-276`, `agent_registry.py:241-311`
- **الوصف**: اختيار مصدر واحد — إما `agent_templates.instructions_*` أو `agents.persona`
  - قرر: `persona` هو الـ source of truth للـ runtime agent
  - `instructions_*` هو الـ source of truth للـ template
  - عند spawn: نسخ من template إلى persona
  - بعد spawn: persona هو المصدر الوحيد
  - إزالة merge logic اللي تخلط `soul` + `rules` مع `persona.soulInstructions`
- **معايير القبول**: لا merge, لا fallback chains. كل agent عنده instructions واضحة في persona
- **التحقق**: `git grep "soul or"` و `git grep "or db_agent.soul"` يرجع صفر

### Task 7.2: إزالة Legacy Columns

- **الموقع**: DB migration
- **الوصف**: إزالة `soul` و `rules` columns من `agents` table (أو تعليمها deprecated)
- **معايير القبول**: DB schema ما يعودش فيه عمودين لنفس المعلومة
- **التحقق**: الـ code ما يستخدمش `agent.soul` أو `agent.rules` في أي مكان

---

## Sprint 8: إزالة Hardcoded Arabic من Infrastructure

**الهدف**: pipeline stage ما يحتويش على نصوص عربية أو keywords

**Demo/Validation**: `skills_pipeline.py` ما فيهوش أي string عربي.

### Task 8.1: نقل Arabic Keywords إلى Config/Agent Level

- **الموقع**: كل agent template يحدد `confirmation_keywords`, `date_formats`, `phone_patterns` في agent.json
- **الوصف**: كل ما كان هاردكود عربي في الـ pipeline يتحول إلى config per agent
  - Hotel agent: `confirmation_keywords: ["أكد", "وافق", "تمام"]`
  - Medical agent: `confirmation_keywords: ["تأكيد", "حجز", "موعد"]`
  - Sales agent: `confirmation_keywords: ["أطلب", "اشتري"]`
- **معايير القبول**: الـ pipeline يستخدم `agent.confirmation_keywords` بدلاً من array ثابت
- **التحقق**: تغيير keywords لـ hotel agent ما يأثرش على agents تانية

### Task 8.2: فصل Follow-up Language عن الـ Pipeline

- **الموقع**: `skills_pipeline.py:686`
- **الوصف**: نقل `"اكتب رداً طبيعياً ومباشراً للعميل بالعامية المصرية"` إلى agent instructions
- **معايير القبول**: كل agent يحدد لغة ولهجة الـ follow-up
- **التحقق**: pipeline ما يعودش فيه نصوص عربية

---

## Sprint 9: إصلاح Gateway-Specific Tool Logic

**الهدف**: Gateway ما يعرفش أدوات معينة بالاسم

**Demo/Validation**: `gateway.py` ما يحتويش على `order_create_confirmed` logic.

### Task 9.1: نقل `fill_order_fields` إلى الـ Tool نفسه

- **الموقع**: `apps/ai-service/src/tools/gateway.py:196-198`
- **الوصف**: بدلاً من gateway يفحص `if requested_tool_name == "order_create_confirmed"`:
  - `order_create_confirmed` tool نفسه يستدعي `fill_order_fields` في `execute()` method
  - Gateway ينادي `tool.fill_order_fields_if_needed(args)` (optional interface)
- **معايير القبول**: gateway ما يعرفش أي tool name
- **التحقق**: `git grep "order_create_confirmed"` في gateway يرجع صفر

---

## Sprint 10: إضافة Admin Query لقائمة Agents مع toolChoice

**الهدف**: SQL query بسيط يجيب agents حسب tool_choice

**Demo/Validation**: `await AgentTemplate.filter(tool_choice="required").all()`

### Task 10.1: إضافة filter queries في Admin API

- **الموقع**: `apps/ai-service/src/api/admin/agents.py`
- **الوصف**: إضافة query parameters: `?tool_choice=required&role=HOTEL`
- **معايير القبول**: `GET /api/v1/ai/admin/agent-templates?tool_choice=required` يرجع الـ 9 templates
- **التحقق**: response count = 9

---

## هيكل الملفات بعد التعديل

```
apps/ai-service/src/
├── pipeline/
│   ├── stages/
│   │   └── skills_pipeline.py    # ~300 سطر (بدون agent logic)
│   ├── hooks.py                   # AgentHook protocol
│   └── plugins/
│       ├── guardrail_hook.py
│       ├── attachment_hook.py
│       └── image_injection_hook.py
├── agents/
│   ├── base.py                    # BaseAgent مع hooks array
│   ├── hooks/
│   │   ├── hotel_hook.py          # Hotel enforcement hook
│   │   └── __init__.py
│   └── (agent files)
├── tools/
│   ├── definitions/
│   │   ├── booking.py             # format_result method
│   │   ├── product_search.py      # format_result method
│   │   └── (all tools with format_result)
│   └── gateway.py                 # بدون tool-specific logic
└── db/
    └── models/
        └── agent.py               # tool_choice عمود أول
```

---

## الـ Sprint Dependency Graph

```
Sprint 1 (Hotel Hooks) ──→ Sprint 3 (Default Prompt)
       │                          │
       v                          v
Sprint 2 (Tool Formatting)    Sprint 4 (Hook System)
       │                          │
       └──────────┬───────────────┘
                  v
         Sprint 5 (tool_choice)
                  │
         Sprint 6 (Filesystem → DB)
                  │
         Sprint 7 (Instructions SOYT)
                  │
         Sprint 8 (Arabic Extraction)
                  │
         Sprint 9 (Gateway cleanup)
                  │
         Sprint 10 (Admin queries)
```

- **Sprints 1-4** متوازية (يمكن تنفيذها concurrent)
- **Sprint 5** يعتمد على Sprint 4 (hook system)
- **Sprints 6-9** متوازية بعد Sprints 1-4
- **Sprint 10** بعد Sprint 5

---

## Testing Strategy

| Sprint | Test Approach |
|--------|---------------|
| 1 | Unit test لكل hook. Integration test لـ hotel booking flow |
| 2 | Compare output per tool قبل/بعد |
| 3 | Integration test لكل agent type مع/من غير instructions |
| 4 | Mock hooks. Test أن pipeline ينادي hooks بالترتيب |
| 5 | DB test. Integration test مع DeepSeek mock |
| 6 | Unit test مع/من غير filesystem access |
| 7 | Data integrity test بعد migration |
| 8 | Internationalization test (تغيير لغة ما يوقفش حاجة) |
| 9 | Unit test للـ tool execution من غير gateway |
| 10 | API integration test |

### لكل Sprint

- **لا break existing behavior** — نفس input → نفس output
- **Record/Replay** — تسجيل responses قبل التعديل ومقارنتها بعده
- **كل Task لازم يكون regression test**

---

## Potential Risks & Gotchas

| Risk | تأثير | Mitigation |
|------|-------|------------|
| Hotel enforcement معقد وممكن ينكسر أثناء النقل | High | كتابة integration test قبل النقل، record/replay |
| Tool formatting يختلف output باختلاف الـ tool version | Medium | version-tagged format schemas |
| Agents كتير (24 template) وكل واحد عنده customizations | High | Incremental migration — template by template |
| DeepSeek API behavior ممكن يتغير | Medium | Integration test مع mock provider |
| Instructions في مصدرين — لو اختلفوا مين يغلب | High | Sprint 7 يحسمها: persona هو الملك |
| filesystem → DB انتقال ممكن يفقد tool mappings | Medium | Seed migration script يضمن same data |
| Production downtime خلال المايقريشن | Medium | Backward-compatible DB migrations |
| Hooks system overhead (performance) | Low | asyncio.gather للhooks المتوازية |

---

## Rollback Plan

1. **كل Sprint**: commit بعد كل Task — `git revert` للـ commit لو حصل مشكلة
2. **DB migrations**: rollback migration (إزالة العمود أو إضافته تاني)
3. **Fallback flag**: feature flag `USE_HOOK_SYSTEM` — لو طفيت، pipeline يرجع للـ God object القديم
4. **Parallel run**: قبل إزالة الـ God function القديم، شغّل الـ hook system + الـ old logic بالتوازي وقارن outputs

---

## التقدير الزمني

| Sprint | مدة تقريبية |
|--------|-------------|
| 1: Hotel Hooks | 1 أسبوع |
| 2: Tool Formatting | 3-4 أيام |
| 3: Default Prompt | 2-3 أيام |
| 4: Hook System | 1 أسبوع |
| 5: tool_choice | 2-3 أيام |
| 6: Filesystem → DB | 3-4 أيام |
| 7: Instructions SOYT | 2-3 أيام |
| 8: Arabic Extraction | 3-4 أيام |
| 9: Gateway Cleanup | 1-2 يوم |
| 10: Admin Queries | 1 يوم |
| **Total** | **~4-5 أسابيع** |

يمكن تنفيذ Sprints 1-4 بالتوازي (فريقين) → تقليل إلى ~3 أسابيع.
