# MaxP Agent Self-Improvement — تقرير التدقيق الكامل (يوليو 2025)

> بني على: فحص كامل لـ `apps/ai-service/src/` + أحدث أبحاث 2025 + مقارنة بأطر الإنتاج
> ملاحظة: التقارير السابقة كانت تحتوي على أخطاء — هذا التقرير هو النسخة المصححة بعد إعادة التحقق

---

## ⚡ الخلاصة التنفيذية

**حالة MaxP الحالية:** أقرب ما تكون إلى الصفر من التعلّم الذاتي. ليس مبالغة.

- **كل pipeline تعلم CEO Lessons ميت تماماً** — `store_fact()` غير موجودة، `__system__` جرداء، `get_ceo_lessons()` دايمًا ترجع `""`
- **AgentFeedbackTracker يُستدعى في مسار إنتاجي واحد فقط** — `BaseAgent.process_task()` و `_run_with_sdk_agent()` ما يستدعوه أبداً
- **كل الخطط العشرين في الـ roadmap غير منفذة** — Dreamer, Truth Arbitration, Corrective RAG, DAG Planner, Audit Trail, كلها صفر كود

**تقنيات 2025:** الساحة تتحرك بسرعة. الـ Reflexion الأساسي صار baseline فقط. الإنتاج يستخدم:
1. **Inner Tool Loop + Error Recovery** — استرجاع فشل الأدوات مع سياق الخطأ
2. **Structured Critic/Reflector Agent مع selective triggering** — نقد فقط عند انخفاض الثقة
3. **Cross-session persistent memory** (Letta MemFS / Anthropic memory tool)
4. **Sleep-time compute** — معالجة خلفية ليلية للمراجعة والدمج (Letta arXiv:2504.13171)
5. **LLM-as-Judge evaluation pipelines** — تقييم موضوعي خارجي

**التوصية:** الإصلاحات الفورية (P0-P2) ممكنة في أقل من أسبوعين وتعطي 80% من القيمة. المشاريع الكبيرة (P4-P7) تبني على هيكل roadmap الموجود.

---

## 1. نتائج فحص الكود — بالتفصيل

### 1.1 🐛 الخلل القاتل: `store_fact()` غير موجودة

```
AgentFeedbackTracker._store_learning()                  # services/agent_feedback.py:95
  → memory = EpisodicMemoryService()                     # line 133 — ينشئ كائن جديد بدون session
  → await memory.store_fact(...)                         # line 141 — ❌ دالة غير موجودة!
  → except Exception as exc:                             # line 147 — يلتقط الخطأ صامتاً
    logger.warning("failed to store episodic memory")     # يسجل تحذير فقط
  # ⚠️ لا بيانات تُخزّن. لا استثناء يُرمى. لا عواقب مرئية.
```

**سبب الخلل:**
- `EpisodicMemoryService` (في `memory/episodic_memory.py`) لديه `store_episode(session, company_id, customer_id, content, metadata)` — لكن `agent_feedback.py` يستدعي `store_fact()` غير الموجودة
- حتى لو كانت موجودة، `AgentFeedbackTracker` لا يملك `session` لتمريره — `store_episode` يتطلب `AsyncSession`

**التأثير:**
- **كل محاولات تخزين إشارات التعلّم تفشل صامتاً** — برمجياً، linguistically، فعلياً
- **CEO Lessons لاغية تماماً** — `get_ceo_lessons()` يبحث في `__system__` الفارغ → يرجع `""` → لا يوجد `[Feedback History]`
- **الـ 20k+ محادثة التي مرت على MaxP لم تعلّم الوكيل أي شيء على الإطلاق**

### 1.2 المكان الوحيد الذي يُستدعى فيه AgentFeedbackTracker

```
الاستدعاء الوحيد: workflows/orchestration_flow.py:409-419
  → في run_orchestration() — مسار الـ CEO Orchestrator فقط

المسارات التي لا تستدعيه أبداً:
  → BaseAgent.process_task() (agents/base.py:885)         ❌
  → BaseAgent.process_task_streamed() (agents/base.py:1090) ❌
  → BaseAgent._run_with_sdk_agent() (agents/base.py:1010)   ❌
  → skills_pipeline.py — كل أخطاء LLM الفردية             ❌
  → validate_reply.py — كل أخطاء الـ guardrail            ❌
```

**التأثير:** حتى لو أصلحنا `store_fact()`، 80% من مسارات التنفيذ في MaxP لا تسجل أي ملاحظات أساساً.

### 1.3 كل ما هو موجود حالياً

| الآلية | الحالة | ملاحظة |
|--------|--------|--------|
| OpenTelemetry spans | ✅ يعمل | أسم الوكيل، الحالة، الأدوات — تُرسل لأي OTLP backend |
| إعادة المحاولة على رد فارغ (skills_pipeline:85) | ✅ يعمل | محاولة واحدة، حل لمشكلة DeepSeek cold-start |
| إعادة محاولة JSON parse (skills_pipeline:132) | ✅ يعمل | محاولة واحدة ضمن الجلسة |
| إعادة محاولة follow-up فارغ (skills_pipeline:165) | ✅ يعمل | محاولة واحدة مع tool_choice='auto' |
| حلقة تصحيح validate_reply (MAX_OUTPUT_RETRIES=2) | ✅ يعمل | تصحيح ضمن الجلسة فقط |
| التصعيد الصامت (silent escalation) | ✅ يعمل | بعد استنفاذ المحاولات |
| التحويل للبديل عند فشل المزود (model_policy.fallback) | ✅ يعمل | يجرب النماذج البديلة |
| الذاكرة العرضية pgvector + Gemini | ✅ يعمل | تخزين واسترجاع تاريخ العميل |
| ذاكرة العمل (working memory) | ✅ يعمل | حالة الجلسة (لكن مؤقتة) |
| Context Assembler (8 أقسام) | ✅ يعمل | بناء system prompt ديناميكي |
| **تخزين تعلّم في __system__** | **❌ لا يعمل** | `store_fact()` غير موجودة |
| **استرجاع CEO Lessons** | **❌ لا يعمل** | الصندوق فارغ — `get_ceo_lessons()` يرجع `""` |
| **تسجيل ملاحظات من BaseAgent** | **❌ لا يعمل** | لا يُستدعى AgentFeedbackTracker |
| **Evaluation Worker** | **❌ لا يعمل** | يسرد أسماء الوكلاء فقط بدون تقييم |
| **التخزين المؤقت (checkpointer)** | **❌ لا يعمل** | يُمرر لكن pipeline لا يستدعيه |
| **إعادة محاولة Provider Error (rate limit)** | **❌ لا يعمل** | يُرجع خطأ فوراً بدون retry |

---

## 2. تقنيات 2025 — ما يناسب MaxP

### 2.1 الأوراق البحثية الأهم (2025)

| الورقة | التاريخ | الفكرة الرئيسية |
|--------|---------|-----------------|
| **VIGIL** (arXiv:2512.07094) | Dec 2025 | Runtime مشرف يراقب agent آخر — يشخص الأخطاء من logs ويصحح prompt/code تلقائياً. EmoBank مع decay. |
| **SPIRAL** (arXiv:2512.23167) | Dec 2025 | Planner-Simulator-Critic في حلقة MCTS. Critic يقيّم عبر reflection. 83.6% على DailyLifeAPIs (+16pp). |
| **WebCoach** (arXiv:2511.12997) | Nov 2025 | ذاكرة cross-session دائمة — تحسن بدون retraining. 38B model من 47% إلى 61% على WebVoyager. |
| **Sleep-Time Compute** (arXiv:2504.13171) | Apr 2025 | Letta — وكيلان: أساسي (سريع) + نوم (قوي). النوم يراجع الذاكرة ويُحسّنها. 5x تقليل compute للتطبيق. |
| **MURPHY** (arXiv:2511.07833) | Nov 2025 | GRPO متعدد الخطوات مع feedback-conditioned rollout trees. حتى +6% pass@1. |
| **ToolRM** (arXiv:2510.26167) | Oct 2025 | Lightweight reward models لاختيار Best-of-N في tool use. 66% تقليل output tokens. |
| **Reflection-Driven Control** (arXiv:2512.21354) | Dec 2025 | AAAI 2026 — وحدة reflection قابلة للتوصيل. مستمرة، مع ذاكرة متطورة. |

### 2.2 ما هو منشور فعلاً في الإنتاج (2025) — وليس بحث فقط

| النمط | أين يُستخدم | الجاهزية |
|-------|-------------|----------|
| **Inner Tool Loop + Error Recovery** | AutoGen (max_tool_iterations), LangGraph, CrewAI | ✅ إنتاجي ناضج |
| **LLM-as-Judge eval pipelines** | LangSmith, Arize, كل المنصات | ✅ إنتاجي ناضج |
| **Structured Critic Agent (selective)** | SPIRAL-style, أنظمة multi-agent | ✅ إنتاجي ناضج |
| **Cross-session persistent memory** | Letta 23.7k⭐, Anthropic memory tool, LangGraph persistence | ✅ إنتاجي ناضج |
| **Sleep-time memory consolidation** | Letta (arXiv:2504.13171), Intercom Fin (ليلي) | ✅ إنتاجي |
| **Memory editing tools (agent-managed)** | Letta MemFS, Anthropic memory tool (Sep 2025) | ⚠️ حديث (2025) |
| **Runtime log analysis + prompt patching** | VIGIL (بحثي) | ❌ بحثي |
| **Self-play co-evolution** | Search Self-Play (ICLR 2026) | ❌ بحثي |
| **Fine-tuning على RLVR** | MURPHY, LANPO | ❌ بحثي (مكلف) |

### 2.3 Reflexion في 2025

الـ Reflexion الأصلي (NeurIPS 2023) = **baseline**. الإنتاج في 2025 يضيف عليه:
1. **ذاكرة دائمة عبر الجلسات** — الـ reflexion لا يتبخر
2. **Structured critic agents** — ليس مجرد "راجع نفسك"
3. **Selective triggering** — فقط عند انخفاض الثقة أو خطأ فعلي
4. **Sleep-time processing** — المراجعة تحدث خارج المحادثة

**Reflexion وحده = غير كافٍ للمهام المعقدة.** الإنتاج يتجاوزه.

---

## 3. توصيات الأولويات — مصنفة وفقاً لتقنيات 2025

### 🚨 P0: إصلاح `store_fact()` — نصف يوم

**التقنية:** إصلاح الخلل، ليس تقنية جديدة.

```python
# في EpisodicMemoryService — دالة جديدة تغلف store_episode
async def store_fact(
    self,
    company_id: str,
    customer_id: str,
    text: str,
    metadata: dict | None = None,
) -> dict | None:
    # يحتاج session — نستخدم async_session من src.db.session
    from src.db.session import async_session
    async with async_session() as session:
        return await self.store_episode(
            session=session,
            company_id=company_id,
            customer_id=customer_id,
            content=text,
            metadata=metadata,
        )
```

التأثير: يشغّل كل pipeline CEO Lessons الذي كان ميتاً.

---

### 🔴 P1: Reflexion Loop بعد Pipeline — أسبوع

**التقنية 2025:** Reflexion + Selective Triggering + Inner Tool Loop

بعد `validate_reply`، إذا كان هناك فشل:
1. اجمع `executed_tools`, `status`, `error`, `context`
2. أرسل لـ Gemini-2.5-flash (رخيص) — "What went wrong? What should the agent do differently?"
3. خزّن الدرس في `__system__` episodic memory مع metadata
4. اربط الدرس بالأداة المحددة

**إضافة مهمة:** وسّع تغطية `AgentFeedbackTracker` لكل مسارات التنفيذ:
- `BaseAgent.process_task()` → يضيف استدعاء `record_outcome()`
- `BaseAgent._run_with_sdk_agent()` → يضيف استدعاء
- `validate_reply.py` → يسجل كل فشل guardrail

**الملفات:** `services/agent_feedback.py`, `agents/base.py`, `workflows/orchestration_flow.py`

---

### 🟠 P2: CEO Lessons مقيدة — 3 أيام

**التقنية 2025:** Structured Critic Agent + LLM-as-Judge

بدلاً من كتلة `[Feedback History]` النصية:
1. قدّم الدروس كـ `<feedback_lessons>` مع تعليمات صريحة
2. أضف: "You MUST apply these lessons when encountering similar situations"
3. أضف مقياس ثقة — الدروس عالية الثقة تكون إلزامية

**أيضاً:** أضف LLM-as-Judge بسيط — Gemini-2.5-flash يقيّم كل رد بعد الإرسال. إذا الجودة تحت العتبة → يشغّل Reflexion.

**الملفات:** `services/memory_router.py`, `context/assembler.py`, جديدة `services/eval_judge.py`

---

### 🟡 P3: تسجيل الأنماط الناجحة — يومان

**التقنية 2025:** Cross-session memory (Letta pattern)

حالياً يُسجل فقط الفشل. أضف تسجيل النجاح أيضاً:
- أدوات نجحت + انتهى بدون تصعيد → سجل كـ "نمط ناجح"
- استخدمه كمرجع لمشاكل مشابهة مستقبلاً
- هذا يبني ذاكرة "ما ينجح" وليس فقط "ما يفشل"

**الملفات:** `services/agent_feedback.py`

---

### 🟢 P4: Dreamer Worker (الخطة 9) + Sleep-Time Consolidation — 3 أسابيع

**التقنية 2025:** Sleep-time compute (Letta arXiv:2504.13171) + Memory Consolidation

عامل خلفي ليلي:
1. **جمع**: محادثات اليوم غير المعالجة + feedback signals
2. **استخلاص**: إرسال لـ LLM قوي (Gemini-2.5-pro) لاستخراج:
   - حقائق العميل (تفضيلات، عناوين، أحجام)
   - أنماط التصحيح المتكررة
3. **دمج**: تحديث قاعدة البيانات بالحقائق الجديدة
4. **ترقية**: إذا تكرر التصحيح 3+ مرات → أضفه كقاعدة في system prompt
5. **مقاييس**: حساب تحسن معدل الخطأ قبل/بعد

**الملفات:** جديدة — `workers/dreamer_worker.py`, `workers/memory_consolidator.py`

---

### 🔵 P5: LLM-as-Judge Eval Pipeline — أسبوع

**التقنية 2025:** LLM-as-Judge (LangSmith, Arize pattern)

خطوة تقييم بعد `validate_reply`:
1. Gemini-2.5-flash يقيّم (الرد + السياق + الأدوات)
2. أبعاد: دقة الأدوات، ملاءمة الرد، الامتثال، النبرة
3. خزّن النتيجة في episodic memory — يحلل الاتجاهات
4. إذا الجودة تحت العتبة → Reflexion + تسجيل خطأ

---

### 🟣 P6: Procedural Memory (Letta-style Memory Blocks) — أسبوعان

**التقنية 2025:** Letta Core Memory Blocks + MemFS

المستوى الرابع من الذاكرة الذي خططته `02_agentic_memory.md`:
- **استراتيجيات التصحيح الناجحة** من Reflexion loop مخزنة كـ memory blocks
- **مفهرسة** حسب الأداة والسياق
- **محقونة** عند استدعاء نفس الأداة مستقبلاً

**هذا هو الفرق بين "يتذكر الخطأ" و"يطبق التصحيح تلقائياً".**

**الملفات:** جديدة — `memory/procedural_memory.py`, `memory/memory_blocks.py`, تعديل `context/assembler.py`

---

### ⚪ P7: إصلاح Provider Error Retry + Circuit Breaker — 3 أيام

**التقنية 2025:** Inner Tool Loop + Exponential Backoff

حالياً Rate Limit يقتل الطلب فوراً. أضف:
- **Exponential backoff** عند 429/503
- **Circuit breaker** — إذا فشل مزود 5 مرات متتالية، تجاوزه لمدة دقيقة
- **Fallback مزود فوري** — انتقل للمزود البديل بدون إعلام العميل

**الملفات:** `pipeline/stages/skills_pipeline.py`, جديدة `pipeline/circuit_breaker.py`

---

## 4. خريطة طريق 2025

| الأولوية | المدة | التقنية 2025 | التأثير |
|----------|-------|--------------|---------|
| **P0** 🚨 | ½ يوم | إصلاح عطل | يشغّل CEO Lessons — فوراً |
| **P1** 🔴 | أسبوع | Reflexion + Inner Tool Loop | الوكيل يتعلّم من أخطائه عبر الجلسات |
| **P2** 🟠 | 3 أيام | Structured Critic + LLM-as-Judge | الدروس تُطبّق فعلياً |
| **P3** 🟡 | يومان | Cross-session memory | تسجيل ما ينجح أيضاً |
| **P4** 🟢 | 3 أسابيع | Sleep-time compute (Letta) | دمج ذاكرة + استخلاص ليلي |
| **P5** 🔵 | أسبوع | LLM-as-Judge eval pipeline | تقييم موضوعي مستمر |
| **P6** 🟣 | أسبوعان | Letta Memory Blocks | استراتيجيات التصحيح الدائمة |
| **P7** ⚪ | 3 أيام | Inner Tool Loop + Circuit Breaker | استقرار المزود |

---

## 5. المقارنة: تقنيات 2025 مقابل MaxP

| التقنية | حالة MaxP الحالية | الجهد المطلوب | الأولوية |
|---------|-------------------|---------------|----------|
| **Inner Tool Loop + Error Recovery** | موجود جزئياً (JSON retry, empty retry) لكن بدون persistent memory | تعديل pipeline | P1 |
| **Cross-session persistent memory** | موجودة (pgvector episodic) لكن broken feedback loop | إصلاح P0 + إضافة | P0+P3 |
| **LLM-as-Judge eval pipeline** | غير موجود | بناء جديد | P5 |
| **Structured Critic/Reflector Agent** | غير موجود | بناء جديد على P1 | P2 |
| **Sleep-time compute** | مخطط (Dreamer Worker — خطة 9) | بناء جديد | P4 |
| **Agent-managed memory** | غير موجود | بناء جديد | P6 |
| **Memory editing tools** | غير موجود | بناء جديد | P6 |
| **Circuit breaker** | غير موجود | بناء جديد | P7 |
| **Truth Arbitration** | مخطط (خطة 7) | بناء جديد | لاحقاً |
| **Corrective RAG** | مخطط (خطة 19) | بناء جديد | لاحقاً |
| **DAG Dynamic Replanning** | مخطط (خطة 20) | بناء جديد | لاحقاً |
| **Self-play / RLVR fine-tuning** | غير مناسب لـ SaaS | — | ❌ |

---

## 6. المراجع — جميع الملفات

### كود MaxP الحالي
- `apps/ai-service/src/services/agent_feedback.py` — AgentFeedbackTracker (broken)
- `apps/ai-service/src/memory/episodic_memory.py` — EpisodicMemoryService (لا يوجد `store_fact`)
- `apps/ai-service/src/services/memory_router.py` — get_ceo_lessons (دايماً يرجع "")
- `apps/ai-service/src/workflows/orchestration_flow.py` — المكان الوحيد لاستدعاء tracker
- `apps/ai-service/src/agents/base.py:885` — process_task() (لا يستدعي tracker)
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — LLM loop + JSON retry
- `apps/ai-service/src/pipeline/stages/validate_reply.py` — output correction loop
- `apps/ai-service/src/context/assembler.py` — context assembly
- `apps/ai-service/src/pipeline/checkpointer.py` — checkpointing (غير مستخدم في pipeline الرئيسي)

### وثائق التخطيط
- `docs/agentic_ai_planning/02_agentic_memory.md` — معمارية الذاكرة الرباعية
- `docs/agentic_ai_planning/03_rag_and_dag.md` — Corrective RAG + DAG Planner
- `docs/agentic_ai_planning/04_observability_metacognition.md` — Observability + Self-Critique
- `docs/agentic_ai_planning/roadmap_20_phases.md` — 20 خطة (كلها غير منفذة)
