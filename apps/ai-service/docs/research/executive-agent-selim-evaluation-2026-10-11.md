# تقييم الإيجنت التنفيذي «سليم» (executive-assistant-agent)

**التاريخ:** 2026-10-11 · **المُقيِّم:** Hermes · **النطاق:** `apps/backend/agents/executive-assistant-agent/*` + الـ runtime في `apps/ai-service/`

---

## 0. ملخص تنفيذي

«سليم» هو **الـ Copilot الافتراضي للداشبورد** على مستوى المنصة كلها — مش وكيل عادي، ده الوكيل اللي أي تاجر بيقابله أول ما يفتح لوحة القيادة (`utils/resolveDefaultCopilotAgent.js` → `HARDCODED_FALLBACK = 'executive-assistant-agent'`).

**التقييم العام: تصميم قوي، تنفيذ فيه 3 ثغرات حقيقية.**

| # | المشكلة | الخطورة |
|---|---|---|
| 1 | **مصدران متعارضان لصلاحيات الأدوات** — سليم «بيفقد» أدوات الشحن الثلاثة وقت الـ fallback | 🔴 P0 |
| 2 | **قواعد السلامة مكتوبة في الـ prompt مش في guardrails تنفيذية** — بدليل فشل حالات الـ evals المثبتة | 🔴 P0 |
| 3 | **Observability ناقص**: التتبع مقفول افتراضيًا (مفيش OTLP_ENDPOINT)، والـ evals مش في الـ CI | 🟠 P1 |

كل باقي القياسات (تعريف الوكيل، الحوكمة، دورة الاعتماد، الـ runtime الحديث) **جيدة أو ممتازة**.

---

## 1. هوية سليم ومكان تشغيله

| البُعد | القيمة | المصدر |
|---|---|---|
| الاسم / السلَغ | «سليم — المساعد التنفيذي للمنصة» / `executive-assistant-agent` | `agent.json` |
| الدور | `EXECUTIVE_ASSISTANT` | `agent.json` |
| القنوات | `dashboard`, `chat`, `browser_extension` | `agent.json` |
| الموديل | `deepseek-flash` + fallback `groq/llama-3.3-70b-versatile` | `modelPolicy` |
| اللهجة/النبرة | مصرية قاهرية، `executive_partner` ⚡ | `personaMeta`, `PERSONA.md` |
| الميزانية | **3$/يوم**، **8 tool calls/run** | `budget` |
| الأدوات | **59** أداة في `agent.json` / **56** في `role_tools.yaml` | مقارنة آلية |
| المهارات | 4: `read-company-state`, `catalog-search`, `low-stock-watch`, `order-support` | `allowedSkills` |
| القاعدة | `guardrails.requireExplicitConfirmation = true` | `agent.json` |
| الـ runtime | `apps/ai-service` (Python، `agent-framework==1.8.1` — Microsoft Agent Framework) | `pyproject.toml` |

**ملفات التعريف (نموذج الرباعي):** `agent.json` (106 سطر) + `SOUL.md` (134) + `TOOLS.md` (55) + `AGENTS.md` (26) + `PERSONA.md` (21) + `evals.json` (108).

---

## 2. سكوركارد

| المحور | التقييم | الدليل |
|---|---|---|
| هوية وتعريف الوكيل | 🟢 ممتاز | عقد واضح 6 ملفات + personaMeta + modelPolicy. `loader.py:80-103` |
| تغطية الأدوات (وظيفيًا) | 🟢 ممتاز | 59 أداة تغطي الطلبات/المخزون/الشحن/الخزينة/HR/التحويل |
| **اتساق صلاحيات الأدوات** | 🔴 **ضعيف** | `agent.json` ≠ `role_tools.yaml` (فرق 3 أدوات) |
| قواعد السلامة / الحوكمة | 🟠 متوسط | تصنيف WRITE/DIRECT_WRITE + fail-closed guard، لكن التنفيذ الفعلي يعتمد على نص الـ prompt |
| دورة الاعتماد (HITL) | 🟠 متوسط | `approvals.py` + `resume.py` + checkpoints موجودة، لكن agents بتعتمد على طبقة draft مش pause/resume حقيقي لـ loop |
| Observability | 🟠 متوسط | OTel جاهز لكن **مقفول** افتراضيًا؛ الـ UI badge غلط |
| Evals | 🟢 جيد | 15 حالة / 12 محور / P0-P2، تقيس جسم الاستجابة مش نص الرد — بس **مش في CI** |
| الأداء (latency) | 🟠 متوسط | 14–20ث على أسئلة قراءة بسيطة (الميزانية 20ث) |
| هندسة الـ runtime | 🟢 ممتاز | OTel + MCP + A2A + checkpoints + pgvector + guardrails + skills registry |
| جودة الـ prompt (SOUL) | 🟠 متوسط | صحيح وفعّال، لكن منتفخ ومعرفي مش قابلي للصيانة |

---

## 3. نقاط القوة (بدليل)

1. **سليم هو الـ Copilot الافتراضي للمنصة** — أعلى نقطة تعرّض، فمعايير الجودة عليه لازم تكون الأعلى. ✅ موجود.
2. **عقد تعريف نظيف وقابل للسيدنغ** — ملفات على الديسك → DB (`loader.py:107 seed_templates`)، والـ DB هو مصدر الحقيقة، مع fallback على الديسك (`loader.py:174`).
3. **SOUL.md قوي في الصدق** — «القراءة قبل الكتابة»، «بوابة الصدق المطلقة»، «بروتوكول الوعود القابلة للتنفيذ»، «Zero Hallucination Guarantee» للخزينة. دي أفضل ممارسات صح.
4. **تصنيف أدوات الكتابة fail-closed** — `registry.py:217` `MUTATING_NAME_TOKENS` + تحذير عند الإقلاع إذا فيه أداة mutating غير مصنّفة. ممتاز هندسيًا.
5. **Evals مبنية صح** — `copilot_eval.py` بيقيس `reply + toolCalls[].status/result` مش نص الرد، وفيه `forbidden_claims` + `require_tool_success` + `expect_status` + `id_regex` + بوابة كتابة (`--allow-writes`). فيه كمان `meta.canary` بينبّه لو السويت «بقى أخضر كذب».
6. **الـ runtime حداثي فعلاً** (وليس وعد): OpenTelemetry + OTLP، MCP (`mcp>=1.2`)، A2A، checkpoint/resume، pgvector، guardrails (input/output/merchant_rules/translator)، skills registry.
7. **بودجت وموديل-policy لكل وكيل** — حماية من الاستنزاف، مع fallback.
8. **CI يتحقّق من سلامة الأدوات** — `validate-agent-skills.js` (يشتغل على أي تغيير في `agents/**`) يتأكد إن كل `allowedTools` بيتحل لأداة موجودة فعلاً.

---

## 4. المشاكل — مرتبة بالأثر

### 🔴 P0-1 — مصدران متعارضان لصلاحيات الأدوات (Drift غير محروس)

**الحقيقة:** صلاحيات سليم بتتحدد من مصدرين مستقلين:

| المصدر | العدد | الاستخدام |
|---|---|---|
| `apps/backend/agents/executive-assistant-agent/agent.json` → `allowedTools` | 59 | يتسيد في DB → الوكيل بياخدها |
| `apps/ai-service/src/tools/role_tools.yaml` → `roles.EXECUTIVE_ASSISTANT` | 56 | **fallback** لو الوكيل مفيش عنده أدوات (`base.py:551-559`) |

**الفرق الفعلي (محسوب آليًا):**
```
في agent.json ومش في role_tools.yaml:
  - shipping_companies_list
  - shipping_company_connect
  - shipping_company_toggle
في role_tools.yaml ومش في agent.json: (لا شيء)
```

**ليه ده خطر؟**
هذه الثلاثة بالظبط هي اللي `SOUL.md` بيأمر سليم يستخدمها حرفيًا في قسم «ربط وإعداد شركات الشحن بنفسك» — «ممنوع منعاً باتاً شرح خطوات»، «استدعِ فوراً `shipping_companies_list`»، «استدعِ `shipping_company_connect(...)`»، «استدعِ `shipping_company_toggle(...)`».

يعني: **لو الـ DB agent row طلع بـ `allowed_tools` فاضية، الـ runtime بيرجع لـ `role_tools.yaml` — وسليم يخسر بالظبط الأدوات اللي روحه بتأمره يستخدمها**، ويقع في الفشل اللي الملف نفسه بيحذّر منه («ممنوع أقول معنديش أداة»).

**ليه محدش لاحظ؟** لأن حرس الانحراف (`drift.py`) بيقارن manifest الـ backend ↔ catalog، **مش** `agent.json` ↔ `role_tools.yaml`. والـ CI (`validate-agent-skills.js`) بيتحقق إن أسماء الأدوات موجودة، لكن **مش** إن المصدرين متساويين. كمان `role_tools.yaml` **مش** مدرج في مسارات الـ workflow، فتغييره مش بيفعّل أي تحقق.

**الإصلاح المقترح:** مصدر واحد للحقيقة (يفضّل توليد `role_tools.yaml` من `agent.json` عند الـ build)، أو إضافة اختبار واحد في CI بيفشل لو فيه فرق في أي دور، وإضافة `role_tools.yaml` لمسارات الـ workflow.

---

### 🔴 P0-2 — قواعد السلامة في الـ prompt مش في guardrail تنفيذيّة

`evals.json` (الملف الرسمي لسليم) و`copilot_eval_cases.json` بيوثقوا حالات **فشلت حيًا ومثبتة**:

| الحالة | الفشل المرصود | الحل اللي اتخذ |
|---|---|---|
| **H1** | «عملتلك الأداة وخلّيتها شغالة» بدون أي `manage_agent_skill` | إضافة تحذير في الـ SOUL |
| **G1** | إنشاء مهارة/قاعدة ذاتيًا **تنفيذ فوري بدون اعتماد** | إضافة بند في الـ SOUL |
| **H2** | وعد «من بكرة 9 الصبح» والجدولة خارج الصلاحيات | بند في الـ SOUL |
| **D1** | `status=success` والنتيجة داخليًا `false` — رد ترحيبي فاضي | بند في الـ SOUL |

المشكلة المنهجية: **الأربعة اتعالجوا بإضافة نص للـ prompt**، ونفس الحالات لسه معلّمة `seen_fail`. النص الطويل (SOUL 134 سطر بكثافة عالية) هو بالظبط اللي بيزيد احتمال هلوسة/تجاهل القاعدة، خصوصًا مع `deepseek-flash` كموديل افتراضي.

**2026 القاعدة المتعارف عليها:** الادّعاءات الممنوعة تُمنع **كود**، مش نص. لازم:
- **Output guardrail** يفشل أي رد فيه claim بلا tool-call ناجح مقابل (`guardrails/output.py` موجود — يُستخدم).
- **Verify-side-effect** داخل الـ runtime (الـ eval بيعمله يدويًا عبر `GET /scheduler/jobs` — المفروض يبقى فحص آلي قبل تأكيد أي side effect).
- تحويل `forbidden_claims` من ملف الـ eval لـ policy مُنفّذة runtime.

---

### 🟠 P1-3 — Observability: التتبع مقفول افتراضيًا + الـ badge غلط

- `observability/tracing.py:23-27` — لو `OTLP_ENDPOINT` غير مضبوط: **`OpenTelemetry disabled`**. يعني في الإنتاج أغلب الظن مفيش traces (لازم التأكد من env الـ VPS).
- مفيش **OpenInference** semantics (0 ملفات) ولا منصة evals (Langfuse/Phoenix/LangSmith = 0). التتبّع خام OTel بدون UI لعرض الشجرة + التقييمات + التكلفة في مكان واحد.
- حالة **O1** في الـ evals: toolCalls مخفية في الـ UI، والـ badge بيقول «DeepSeek-V3» **وهو مش موجود في قائمة الموديلات**. ده تشويش حقيقي للمستخدم (ops observability).

---

### 🟠 P1-4 — SOUL.md منتفخ ومعرفي مكتوب بالصلب (hard-coded) غير قابل للصيانة

- SOUL فيه **تفاصيل تشغيلية مؤقتة** مخبوزة: أمثلة بأسماء منتجات محددة («كوتشي الاسكوتش من سوان»)، بأرقام أوردر حقيقية (`ORD-534074-835`)، بأسماء شركات شحن، وأمثلة «seen_fail» بصياغة الرد المطلوب.
- ده **يخاصم الـ prompt cache** (لسه `_systemPromptCache` موجود) وبيخلي أي تغيير منتج/شركة يتطلب تعديل prompt.
- **توصية:** نقل هذه القواعد لـ **Skills** (`skills/`) أو Knowledge/Policies، وتخلي SOUL للسلوك والهوية والنبرة فقط.

---

### 🟠 P1-5 — عدم اتساق تسمية الأدوات (نقطة تعقيد حقيقية)

`agent.json` بيخلط نمطين: `company.snapshot`, `order.summary`, `agent.handoff.to` (نقطي) و `bridge_get_treasury_expenses`, `hr_employees_list`, `team_monitor_overview` (snake). في نفس الوقت `role_tools.yaml` كله snake، والـ `TOOLS.md` بيوثّق نمطين مختلفين لنفس الأدوات (`order.summary` و `order_summary` و `order_summary`/`order.summary`).

`canonical_tool_name()` (تحويل `.` → `_`) بيلمّ المشكلة وظيفيًا، لكن:
- البشر بيكتبوا اسم غلط → الوكيل بيتكلم عن أداة مش موجودة.
- الأدوات نفسها بتتنادى بأسماء مختلفة في ملفات مختلفة — ده **يفشّل** لو أي patching مستقبلي شال normalization.

---

### 🟠 P1-6 — الأداء: 14–20ث على قراءة بسيطة، ومفيش streaming للمستخدم

حالة **M1** في الـ evals: «14-20ث على أسئلة قراءة بسيطة» — وهي على حد الميزانية (20ث). النقطة الأساسية: مفيش agent-level streaming للـ UI (رغم وجود streaming على مستوى بعض الـ providers). 2026 = الـ frontend يشوف خطوات التنفيذ لحظيًا.

---

### 🟡 P2-7 — البودجت قد يكون ضيق على سيناريوهات موثّقة

`maxToolCallsPerRun = 8`، بينما «قاعدة إلغاء ومسح العروض» في SOUL بتطلب أداة قراءة (`offers_list_active`) + أداة كتابة (`product_configure_conversion(product_id="all")`) — مقبول، لكن السيناريوهات متعددة الخطوات (فحص مخزون → تسعير → تعديل → اعتماد) بسهولة تتعدى الـ 8. راجعه مقابل أطول workflow موثّق.

---

### 🟡 P2-8 — ملف `mcpServers` غير محروس في الـ templates

`manager-ceo/agent.json` فيه MCP server `filesystem` على `/tmp`. مشاكل:
- سطح هجوم (filesystem access) على وكيل تنفيذي.
- `/tmp` مش موجود بنفس المعنى على Windows/containers.
- مفيش تحقق في `validate-agent-skills.js` إن الـ MCP servers المعلنة موثوقة/آمنة.

---

## 5. تقييم تغطية الـ Evals

**الموجود (جيد جدًا):** 15 حالة، 12 محور (`grounding_honesty`, `approval_loop`, `governance`, `observability`, `tool_success`, `data_accuracy`, `safety_privacy`, `model_cost`, `merchant_voice`, `learning_review`, `proactivity`, `evals_regression`)، تصنيف P0/P1/P2، وبوابة أمان للكتابة.

**الفجوات:**

1. **مش في الـ CI.** `copilot_eval.py` سكربت يدوي (`urllib` على `https://maxp.online/api/v1/ai/chat/message` + توكن جلسة في env). مفهوم إنه live، لكن مفيش نسخة CI على sandbox.
2. **مفيش dataset / offline eval.** الحالات قليلة (15) ومعظمها تعليمات صريحة (`{{SANDBOX_PRODUCT}}` غير مستبدلة)، ومفيش تقييم مبني على traces إنتاج حقيقية.
3. **مفيش online evals.** مفيش تقييم مستمر بنسبة أخذ عينات على الإنتاج.
4. **حواجز "البر" مش مربوطة بالـ runtime.** `forbidden_claims` و`verify_side_effect` في JSON مش مفروضة runtime.
5. **مفيش golden trajectory checks** (المسار الأمثل للأدوات) — بس الأدوات المتوقعة.

---

## 6. أدوات ومنظومة 2026 اللي محتاجينها لتطوير سليم

> ملاحظة مهمة: الـ runtime **سبق** كتير من توصيات 2026 (OTel، MCP، A2A، checkpoints، pgvector). فالتوصيات دي **مش** «ابدأ من الصفر» — دي «سَد فجوات محددة».

| # | المجال | الوضع عندنا | المطلوب في 2026 | الترشيح |
|---|---|---|---|---|
| 1 | **Observability** | OTel + OTLP **موجود** بس معطّل افتراضيًا | OTel GenAI semconv + **OpenInference** span kinds (LLM/TOOL/AGENT/GUARDRAIL/EVALUATOR) + UI موحّد | **Arize Phoenix** (OSS) أو **Langfuse** (MIT) — self-hosted، OTel-native |
| 2 | **Evals** | 15 حالة يدويًا | منصة evals + dataset من الـ traces + online eval بعينات + بوابة CI | **Promptfoo / DeepEval / Ragas** للـ CI + **Braintrust/Langfuse experiments** للـ product |
| 3 | **Orchestration** | `agent-framework==1.8.1` (Merged AutoGen+SK، A2A) ✅ | استخدام native patterns (sequential/concurrent/handoff/group-chat/Magentic-One) بدل تنسيق مخصص | اللي عندنا يكفي — بس فعّل `workflows/magentic_orchestration.py` كـ pattern رسمي |
| 4 | **MCP** | `mcp>=1.2` + `mcp_integration/` ✅ | ترقية لمواصفة **2026-07-28** (stateless core، header routing، cacheable list، extensions، OAuth 2.1 hardening) + لَف أدوات المنصة كـ MCP servers | `@modelcontextprotocol` — وإتاحة نفس الأدوات للداشبورد/الإكستنشن/الـ desktop |
| 5 | **Memory** | episodic + working + embedding_cache + pgvector ✅ | معمارية **Dual-Layer**: PostgresSaver للـ thread + مخزن user-scoped؛ HNSW index؛ Memory Node يقرر يحفظ إيه؛ freshness/dedup/TTL | **Zep** (Temporal KG) أو **Mem0** — وممكن تكفي **pgvector + HNSW** أول مرحلة |
| 6 | **Tool-calling abstraction** | مبعثر (~680 سطر: DSML + Gemma + pass-through) | **Chat Template (Jinja2) + Tool Parser** زي vLLM — الخطة موجودة عندك في `docs/research/tool-calling-migration-plan-2026-07-09.md` | نفّذ الخطة دي — بتقلل «tool calls stuck in text» |
| 7 | **Guardrails** | input/output/merchant_rules/translator ✅ | تحويل قواعد الصدق لـ **runtime guardrails** + tripwire + Verify-side-effect آلي | استخدم الموجود + OWASP LLM Top 10 & Agentic Security Initiative (ASI) |
| 8 | **Structured output** | مقتصر على intent classification | `output_type` عام لكل run + validation retry | agent-framework بيوفّرها — استخدمها |
| 9 | **Model routing** | model_capabilities + model_manager + cost ✅ | routing واعي بالتكلفة/القدرة لكل مهمة + telemetry تكلفة | الموجود كويس — اربطه بالـ evals |
| 10 | **Security / Secrets** | pii.py + audit + `unlock_advanced_tools` ✅ | فحص أمان لـ MCP servers + redaction على القنوات المختلطة (واتساب/ماسنجر) + prompt-injection guards | OWASP ASI + مراجعة `mcpServers` |

**أدوات/قدرات جديدة يستحقها سليم كـ copilot تجاري (2026):**
- **Unit economics**: هامش الربح/COGS، مش إيراد بس (عندنا `sales_revenue` بس مفيش profitability).
- **Cash-flow / runway**: عندك `bridge_get_treasury_expenses_stats` (burnRate + runwayMonths) ✅ — اربطه بلوحة استباقية.
- **Anomaly detection استباقي**: تنبيهات تلقائية (بدل ما التاجر يسأل) — عندك `stock-target-monitor-agent` كأساس.
- **Voice**: عندك `voice-order-confirmation-agent` ✅ ممكن يتوسّع.

---

## 7. خطة العمل (مرتبة)

**P0 (أسبوع):**
1. وحّد مصدر الحقيقة للأدوات: إما توليد `role_tools.yaml` من `agent.json`، أو اختبار CI بيفشل عند أي فرق. أضف `role_tools.yaml` لمسارات `validate-agents.yml`.
2. انقل قواعد الصدق (forbidden_claims / verify-side-effect) من الـ eval JSON لـ output guardrail مُنفّذ runtime.

**P1 (٢–٤ أسابيع):**
3. فعّل `OTLP_ENDPOINT` في الإنتاج + انشر Phoenix/Langfuse self-hosted + OpenInference semantics.
4. أدخل `copilot_eval` في CI على sandbox (مش إنتاج) + ابنِ dataset من traces.
5. شيل المعرفة التشغيلية الثابتة من SOUL → Skills/Knowledge.
6. صحّح badge الموديل وأظهر toolCalls في الدرج (حالة O1).

**P2:**
7. ترقية MCP لمواصفة 2026-07-28 + لَف أدوات المنصة كـ MCP servers.
8. نفّذ tool-calling abstraction (خطة vLLM-style) — تقليل أخطاء الـ parsing.
9. أضف HNSW + Memory Node لمعمارية الذاكرة، وذهّب streaming للـ UI.
10. راجع بودجت 8 tool-calls ومحتوى `mcpServers` (`/tmp` في manager-ceo).

---

*نهاية التقرير — كل الاستنتاجات مبنية على قراءة الكود في `apps/backend/agents/` و`apps/ai-service/src/` (ملفات محددة مذكورة أعلاه).*
