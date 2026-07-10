# MaxP Agent Self-Improvement — 2026 Analysis & Recommendations

> بناءً على تحليل كامل لكود MaxP (apps/ai-service/src/) + أحدث أبحاث 2026
> تاريخ: يوليو 2026

---

## 1. الوضع الحالي — ما موجود اليوم في MaxP

### موجود فعلاً (لكن غير مكتمل)

| المكون | الملف | ما يفعله | هل يعمل؟ |
|--------|-------|----------|----------|
| **AgentFeedbackTracker** | `services/agent_feedback.py` | يسجل فشل الوكلاء (Provider Error, PAUSED, FAILED) إلى `.learnings/ERRORS.md` ويحاول حفظها في الذاكرة العرضية | ⚠️ يسجل في الملف فقط — حفظ الذاكرة يفشل صامتاً |
| **CEO Lessons** | `services/memory_router.py` | يسترجع إشارات `__system__` السابقة ويحقنها ككتلة `[Feedback History]` في سياق CEO | ⚠️ سلبي فقط — LLM قد يتجاهلها |
| **معالج التصحيح** | `pipeline/stages/validate_reply.py` | يحاول تصحيح الرد حتى مرتين عند فشل guardrails أو JSON schema | ⚠️ داخل الجلسة فقط — لا يُخزّن التصحيح |
| **استرجاع JSON** | `pipeline/stages/skills_pipeline.py` | يعيد محاولة استدعاء LLM عند خطأ JSON في وسائط الأدوات | ⚠️ محاولة واحدة، بدون تخزين |
| **النموذج البديل** | `agents/base.py` (ensure_client) | عند فشل مزود LLM رئيسي، يجرب النماذج البديلة من `model_policy.fallback` | ✅ يعمل |
| **إعادة تخطيط DAG** | `planning/dag_planner.py` (replan) | عند فشل مهمة في DAG، يزيل المهام الفاشلة ويعيد جدولة الباقي | ✅ لكن لا يتعلم سبب الفشل |
| **الذاكرة العرضية** | `memory/episodic_memory.py` | يخزن تاريخ تفاعلات العميل كمتجهات pgvector + Gemini embeddings | ✅ يعمل |
| **ذاكرة العمل** | `memory/working_memory.py` | يحفظ حالة الجلسة (عربة التسوق، الفلاتر، آخر الرسائل) في الذاكرة | ✅ لكن مؤقت (يفقد عند إعادة التشغيل) |
| **Context Assembler** | `context/assembler.py` | يجمّع الـ system prompt مع 8 أقسام: الوقت، الملف الشخصي، حالة الجلسة، معرفة الشركة، الذكريات، المهارات | ✅ يعمل |
| **التخزين المؤقت** | `pipeline/checkpointer.py` | checkpoint لكل مرحلة للتعافي من الأعطال | ✅ للتسامح مع الأعطال فقط |

### 🐛 خطأ حرج: `store_fact()` غير موجود

```
AgentFeedbackTracker._store_learning()           # services/agent_feedback.py:141
  → memory.store_fact(...)                        # ❌ EpisodicMemoryService لا يملك هذه الدالة
  → EpisodicMemoryService.store_episode() exists  # ✅ لكن لا يتم استدعاؤها
```

النتيجة: **حلقة التغذية الراجعة للذاكرة معطولة**. كل محاولات تخزين الدروس في `__system__` تفشل صامتاً (يُلتقط الاستثناء في `except`). لذلك:

- `get_ceo_lessons()` لا يعيد أي شيء لأن الذاكرة `__system__` فارغة أصلاً
- كتلة `[Feedback History]` لا تظهر أبداً في سياق CEO

### الفجوات الرئيسية

| الفجوة | التأثير |
|--------|---------|
| ❌ **لا توجد حلقة Reflexion/self-reflection بعد المهمة** | الوكيل لا يراجع أفعاله ولا يستخلص دروساً |
| ❌ **لا يوجد تحويل تصحيح → تعليمات دائمة** | تصحيحات الجلسة الواحدة تتبخر |
| ❌ **لا يوجد LLM-as-judge في الإنتاج** | لا تقييم موضوعي لجودة الردود |
| ❌ **لا يوجد تسجيل للأنماط الناجحة** | فقط الإخفاقات تُسجّل |
| ❌ **لا يوجد ضبط تلقائي للـ prompts** | على الرغم من وجود نظام قوالب |
| ❌ **لا توجد ذاكرة إجرائية (Procedural Memory)** | الوكيل لا يتذكر استراتيجيات التصحيح |
| ❌ **لا يوجد Dreamer Worker** | لا دمج ليلي للذكريات ولا استخلاص للحقائق |
| ❌ **لا يوجد Truth Arbitration Engine** | لا حل لتعارض الحقائق (كلام العميل vs سلوكه الشرائي) |

---

## 2. تقنيات 2026 — ما هو مناسب لـ MaxP

### Reflexion / Verbal Reinforcement Learning

**الفكرة**: الوكيل ينفذ → يلاحظ النتيجة → يفكر في الخطأ → يخزّن الدرس → يطبقه في المرة القادمة.

**مدى ملاءمة MaxP**: **عالي جداً**. MaxP لديه البنية التحتية (AgentFeedbackTracker + EpisodicMemory) لكن الحلقة مقطوعة. إضافة خطوة Reflection بعد `validate_reply` هي أقوى تحسين بتكلفة قليلة.

### التعلّم القائم على الذاكرة (Letta/MemGPT pattern)

**الفكرة**: الوكيل يبني معرفة تراكمية عبر الجلسات عبر الذاكرة الطويلة المدى.

**مدى ملاءمة MaxP**: **متوسط-عالي**. MaxP لديه pgvector للذاكرة العرضية لكن يفتقر إلى:
- الذاكرة الدلالية (قاعدة معرفة مهيكلة)
- الذاكرة الإجرائية (استراتيجيات التصحيح)
- عامل الدمج الليلي (Dreamer Worker)

### حلقات Meta-Agent (HyperAgents, SIA)

**الفكرة**: وكيل أعلى المستوى يعيد كتابة كود/برومبت الوكيل الأساسي بناءً على نتائج التقييم.

**مدى ملاءمة MaxP**: **منخفض-متوسط**. قوي لكن مكلف وقد يكون غير مستقر للإنتاج المباشر. يمكن التطبيق لاحقاً لضبط برومبتات المهارات.

### LLM-as-Judge

**الفكرة**: LLM منفصل (رخيص) يقيم جودة ردود وكيل الإنتاج ويغذي النتائج للتحسين.

**مدى ملاءمة MaxP**: **عالي**. MaxP لديه Gemini-2.5-flash (رخيص وسريع) لاستخدامه كـ judge. لا حاجة لإضافة LLM جديد.

### التعلّم باللعب الذاتي (SPIN — Self-Play Fine-Tuning)

**الفكرة**: الموديل يولد بيانات → يميزها عن البيانات البشرية → يُحسّن نفسه.

**مدى ملاءمة MaxP**: **منخفض حالياً**. يتطلب fine-tuning فعلي للموديلات. غير مناسب لساحة متعددة المستأجرين حيث كل شركة قد تريد ضبطاً مختلفاً.

---

## 3. التوصيات — أولويات التنفيذ

### 🚨 Priority 0 — Fix Broken Feedback Loop (نصف يوم)

**الهدف**: إصلاح الخلل الذي يجعل `store_fact()` تفشل صامتاً.

```
EpisodicMemoryService.store_fact() = async def store_fact(...):
    return await self.store_episode(session, company_id, customer_id, text, metadata)
```

بعد هذا الإصلاح، سيبدأ `[Feedback History]` بالظهور فعلياً في سياق CEO.

**الملفات المتأثرة**: `memory/episodic_memory.py`

---

### 🔴 Priority 1 — Reflexion Loop After Pipeline (أسبوع)

**الفكرة**: بعد كل تنفيذ pipeline (في `orchestration_flow.py` بعد `validate_reply`)، إذا كان هناك فشل:

1. جمع:  (`executed_tools`, `status`, `error`, `context`)
2. إرسال لـ LLM رخيص: "What went wrong? What should the agent do differently next time?"
3. تخزين الدرس في `__system__` episodic memory مع metadata `lesson_type: "correction"`
4. ربط الدرس بالـ tool/skill المحدد

**مثال تخزين**: 
```json
{
  "text": "When product_search returns no results, do NOT tell the customer the product doesn't exist. Instead, call category_list with the category of the product to show alternatives.",
  "type": "__system__",
  "metadata": { "lesson_type": "correction", "trigger_tool": "product_search", "confidence": 0.85 }
}
```

**الملفات المتأثرة**: `services/agent_feedback.py`, `workflows/orchestration_flow.py`

---

### 🟠 Priority 2 — Enforce CEO Lessons as Structured Instructions (3 أيام)

**الفكرة**: بدلاً من كتلة `[Feedback History]` النصية التي يمكن للـ LLM تجاهلها:

1. تحويل الدروس إلى `<feedback_lessons>` مع تعليمات صريحة
2. إضافة: "You MUST apply the following lessons when encountering similar situations"
3. إضافة مقياس ثقة (confidence) بحيث الدروس عالية الثقة تكون إلزامية

**الملفات المتأثرة**: `services/memory_router.py`, `context/assembler.py`

---

### 🟡 Priority 3 — Success Pattern Recording (يومان)

**الفكرة**: تسجيل الأنماط الناجحة أيضاً (وليس فقط الفشل):

- عند نجاح جميع الأدوات + انتهاء بدون تصعيد + إرسال الرد → سجل كـ "نمط ناجح"
- خزّن كـ `__system__` مع `lesson_type: "success_pattern"`
- استخدمها كمرجع في مواقف مشابهة

**الملفات المتأثرة**: `services/agent_feedback.py`

---

### 🟢 Priority 4 — Dreamer Worker (الخطة 9 من الـ roadmap) (أسبوعان)

**الهدف**: تشغيل عامل خلفي ليلي لدمج الذاكرة واستخلاص الحقائق:

1. **جمع**: محادثات اليوم غير المعالجة من episodic memory + feedback signals
2. **استخلاص**: إرسال المحادثات لـ LLM لاستخراج:
   - حقائق العميل (تفضيلات، مقاسات، عناوين)
   - أنماط التصحيح المتكررة (لترقية إلى تعليمات دائمة)
3. **دمج**: تحديث `customer_profile` بالحقائق الجديدة
4. **ترقية**: إذا تكرر نفس التصحيح 3+ مرات → ترقيته إلى قاعدة في system prompt

**متطلبات مسبقة**: Priority 0 + 1 must be in place so there's data to consolidate.

**الملفات المتأثرة**: جديدة — `workers/dreamer_worker.py`

---

### 🔵 Priority 5 — LLM-as-Judge Eval Hook (أسبوع)

**الهدف**: إضافة خطوة تقييم بعد `validate_reply`:

1. إرسال (الرد + السياق + الأدوات المنفذة) لـ gemini-2.5-flash
2. تقييم: دقة الأدوات، ملاءمة الرد، الامتثال لل guardrails
3. تخزين النتيجة في episodic memory آخر (حتى يمكن تحليل الاتجاهات)
4. إذا انخفضت الجودة تحت عتبة → تشغيل Reflexion loop

**الملفات المتأثرة**: جديدة — `services/eval_judge.py`, `workflows/orchestration_flow.py`

---

### 🟣 Priority 6 — Procedural Memory (أسبوعان)

**الفكرة**: المستوى الرابع من الذاكرة الذي خططته `02_agentic_memory.md`:

- **جمع**: استراتيجيات التصحيح الناجحة من Reflexion loop
- **فهرسة**: بواسطة الأداة (tool) والسياق
- **حقن**: عند استدعاء نفس الأداة، حقن استراتيجيات التصحيح ذات الصلة في context

**الملفات المتأثرة**: جديدة — `memory/procedural_memory.py`, تعديل `context/assembler.py`

---

### ⚪ Priority 7 — Curriculum Learning عبر ضبط Prompt تلقائي (متوسط)

**الهدف**: عندما يتكرر نفس الخطأ (مثلاً "product_search عاد بدون نتائج") 3+ مرات:

1. استخراج التصحيح الذي نجح من Reflexion loop
2. إضافته كقاعدة في `get_ceo_lessons()` أو في system prompt
3. تعيين `confidence` بناءً على عدد مرات النجاح

**الملفات المتأثرة**: `services/memory_router.py`, `context/assembler.py`

---

## 4. خريطة طريق مختصرة

| الأولوية | المدة | ما سيُبنى | التأثير |
|----------|-------|-----------|---------|
| **P0** 🚨 | ½ يوم | إصلاح `store_fact()` | يشغّل حلقة التغذية الراجعة الكاملة |
| **P1** 🔴 | أسبوع | Reflexion Loop | الوكيل يتعلم من أخطائه عبر الجلسات |
| **P2** 🟠 | 3 أيام | CEO Lessons مقيدة | الوكيل يُجبر على تطبيق الدروس |
| **P3** 🟡 | يومان | تسجيل النجاحات | الوكيل يعرف ما ينجح أيضاً |
| **P4** 🟢 | أسبوعان | Dreamer Worker | دمج ذاكرة ليلي + استخلاص حقائق |
| **P5** 🔵 | أسبوع | LLM-as-Judge | تقييم موضوعي لجودة الردود |
| **P6** 🟣 | أسبوعان | Procedural Memory | الوكيل يخزّن استراتيجيات التصحيح |
| **P7** ⚪ | متوسط | ضبط Prompt تلقائي | تحسين سلوكي تلقائي مستمر |

---

## 5. ملخص — 2026 Techniques vs MaxP

| التقنية | مناسبة لـ MaxP؟ | لماذا؟ |
|---------|-----------------|--------|
| **Reflexion/Verbal RL** | ✅ نعم (P1) | البنية موجودة، فقط الحلقة مقطوعة |
| **Memory-Driven Learning** | ✅ نعم (P4+P6) | pgvector موجود، يحتاج Dreamer + Procedural Memory |
| **LLM-as-Judge** | ✅ نعم (P5) | Gemini-2.5-flash رخيص ومتوفر |
| **Curriculum Learning** | ✅ نعم (P7) | يمكن البناء فوق Reflexion loop |
| **Meta-Agent Loops** | ⚠️ لاحقاً | قوي لكن مكلف — بعد استقرار الأساسيات |
| **Self-Play (SPIN)** | ❌ حالياً | يتطلب fine-tuning، غير مناسب لـ SaaS multi-tenant |

---

## 6. Files Referenced

- `apps/ai-service/src/services/agent_feedback.py` — Feedback tracker
- `apps/ai-service/src/memory/episodic_memory.py` — Episodic memory (missing `store_fact`)
- `apps/ai-service/src/services/memory_router.py` — CEO lessons (passive injection)
- `apps/ai-service/src/pipeline/stages/skills_pipeline.py` — Core LLM loop + retries
- `apps/ai-service/src/pipeline/stages/validate_reply.py` — Output correction loop
- `apps/ai-service/src/agents/base.py` — Model fallback
- `apps/ai-service/src/context/assembler.py` — Context assembly + memory injection
- `apps/ai-service/src/workflows/orchestration_flow.py` — CEO lessons injection point
- `docs/agentic_ai_planning/02_agentic_memory.md` — Planned 4-tier memory architecture
- `docs/agentic_ai_planning/04_observability_metacognition.md` — Planned metacognition
- `docs/agentic_ai_planning/roadmap_20_phases.md` — 20-phase roadmap
