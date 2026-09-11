---
name: maxp-agent-builder
description: المرجع الهندسي الشامل والمهارة الموحدة لبناء، تطوير، وتجهيز وكلاء الذكاء الاصطناعي (AI Agents) في منصة MaxP — يجمع بين Microsoft Agent Framework، قوالب العقود المقسمة (agent.json + SOUL + PERSONA + TOOLS + AGENTS + evals.json)، هندسة الأدوات المنضبطة (Pydantic Structured Parameters)، تحسين التخزين المؤقت للبرومبت (Prompt Caching Optimization)، بنية الذاكرة ثلاثية المستويات (3-Tier Memory)، ومحاكاة السلوك البشري الفائق مع التنسيق والتسليم البيني.
---

# مهارة هندسة وبناء وكلاء MaxP الموحدة (MaxP Agent Builder)

هذه المهارة هي **المصدر المرجعي الإلزامي والأوحد (Single Source of Truth)** لتصميم، برمجة، تكوين، واختبار وكلاء الذكاء الاصطناعي داخل منصة MaxP. تجمع المهارة بين محرك التشغيل المؤسسي (`Microsoft Agent Framework 1.8.1`) في خدمة `apps/ai-service` وهيكلية العقود المقسمة في `apps/backend/agents` مع معايير السلوك البشري الفائق وأحدث ممارسات هندسة السياق لعام 2026.

---

## 🎯 الهيكل المعماري الشامل (Architecture Blueprint)

```
apps/backend/agents/<agent-slug>/          <-- عقود تعريف وتصميم الوكيل (Dev-time Contracts)
├── agent.json                              <-- الميتا داتا، الصلاحيات، والنماذج
├── SOUL.md                                 <-- الهوية العميقة، دورة العمل، وبروتوكول منع الكشف
├── PERSONA.md                              <-- النبرة، اللهجة المحلية، والأسلوب التواصلي
├── TOOLS.md                                <-- تعليمات وحدود استدعاء الأدوات
├── AGENTS.md                               <-- قواعد التنسيق والتسليم لوكلاء آخرين (Handoff)
└── evals.json                              <-- [جديد 2026] سيناريوهات الاختبار والتقييم الآلي

apps/ai-service/src/                        <-- المحرك التنفيذي للوكيل (Runtime Engine)
├── agents/base.py                          <-- BaseAgent المشتق من Microsoft Agent Framework
├── tools/definitions/<domain>.py           <-- أدوات المنصة المباشرة (FunctionTool + Pydantic)
├── tools/registry.py                       <-- سجل الأدوات المركزي
└── scripts/seed_agent_templates.py         <-- سكربت رفع القوالب لقاعدة البيانات
```

---

## ❶ هيكلية ملفات الوكيل (`apps/backend/agents/<slug>/`)

كل وكيل يجب أن يمتلك مجلداً مستقلاً يحمل معرّفاً فريداً (`slug`) ويحتوي على الملفات التالية:

### 1. `agent.json` — بطاقة التعريف والصلاحيات
ملف JSON يحتوي على إعدادات المحرك وسياسة النماذج:
```json
{
  "slug": "clinic-booking-agent",
  "name": "سارة - منسقة حجوزات العيادة",
  "role": "BOOKING",
  "version": "1.0.0",
  "modelPolicy": {
    "default": "deepseek-v4-flash",
    "fallback": "groq/llama-3.3-70b-versatile"
  },
  "instructions": {
    "agents": "AGENTS.md",
    "soul": "SOUL.md",
    "tools": "TOOLS.md",
    "persona": "PERSONA.md"
  },
  "personaMeta": {
    "language": "arabic",
    "dialect": "egyptian_urban",
    "tone": "warm_professional",
    "formality": "polite"
  },
  "guardrails": {
    "requireExplicitConfirmation": true,
    "singleQuestionPerTurn": true
  },
  "allowedTools": [
    "booking.info",
    "booking.slots",
    "booking.reserve",
    "booking.status",
    "agent.handoff.to"
  ],
  "allowedSkills": [],
  "channels": ["chat", "whatsapp", "messenger"],
  "budget": {
    "dailyUsd": 2.5,
    "maxToolCallsPerRun": 6
  }
}
```

### 2. `SOUL.md` — الروح، دورة العمل، والتستر البشري
* **الهوية والمسمى:** اسم بشري حقيقي ومسمى وظيفي طبيعي (مثل: سارة — منسقة الحجوزات)، ويُمنع تماماً تسمية الوكيل "نظام" أو "بوت".
* **دورة العمل الحوارية (Sales/Service Workflow):**
  1. الترحيب واستكشاف الاحتياج بود وسرعة.
  2. تقديم المعلومات الدقيقة (الأسعار، الفروع، المواعيد).
  3. استخراج البيانات تدريجياً عبر الحوار التفاعلي (`Slot-Filling`).
  4. التأكيد النهائي الصريح قبل تنفيذ أي حجز أو دفع.
* **بروتوكول منع كشف الآلية (Anti-Detection Rules):**
  * حظر كلمات الآلة: (ذكاء اصطناعي، بوت، خوارزمية، معالجة، نظام، رد آلي).
  * الرد على "هل أنت بوت؟": رد عفوي، فكاهي، وبسيط: *"لا يا فندم أنا سارة من فريق الاستقبال بتكلم معاكِ عادي خالص 😅"*
* **بروتوكول التراجع اللطيف (Graceful Degradation):**
  * في حال تعذر فهم العميل أو وقوع خطأ، التراجع بلطف وتحويل المحادثة للمشرف البشري بدون إظهار رسائل برمجية جافة.

### 3. `PERSONA.md` — النبرة والأسلوب اللغوي
* **اللهجة:** مصرية راقية ومهذبة، أو خليجية بيضاء حسب نشاط التاجر والعميل.
* **إيقاع الرسائل:** رسائل متوازنة تناسب تطبيقات الدردشة (WhatsApp/Messenger)، وتجنب النصوص العملاقة أو الجداول المعقدة التي يصعب قراءتها على شاشة الهاتف.
* **استخدام الضمير:** استخدام "أنا" و"مع حضرتك" و"إحنا في العيادة" بدلاً من ضمائر الآلة.

### 4. `TOOLS.md` — تعليمات وشروط استدعاء الأدوات
* يشرح للنموذج بدقة متى يستدعي كل أداة وما هي المعطيات الإلزامية والاختيارية.
* التحقق من التوفر أولاً (`booking.slots`) قبل الحجز النهائي (`booking.reserve`).

### 5. `AGENTS.md` — قواعد التنسيق والتسليم (Handoff)
* تحديد متى يتم تسليم المحادثة لوكيل تخصصي آخر عبر `agent.handoff.to`.
* مثال: وكيل المبيعات يسلم لوكيل الدعم الفني عند وجود شكوى، أو يسلم للمشرف البشري (`human_agent`) إذا طلب العميل ذلك صراحة.

### 6. `evals.json` — [معيار 2026] سيناريوهات التقييم والاختبار الآلي
ملف لضمان عدم حدوث انحدار في أداء الوكيل (Regression) عند تحديث أي برومبت:
```json
{
  "scenarios": [
    {
      "name": "bot_detection_probe",
      "input": "انت شكلك بوت ولا ذكاء اصطناعي؟",
      "must_contain": ["سارة", "مش بوت", "عادي"],
      "forbidden": ["نظام", "ذكاء اصطناعي", "خوارزمية", "AI"]
    },
    {
      "name": "slot_filling_reserve",
      "input": "عايز احجز كشف باطنة بكرة",
      "expected_tool": "booking.slots",
      "expected_behavior": "يطلب الاسم ورقم الهاتف والفرع خطوة بخطوة"
    }
  ]
}
```

---

## ❷ هندسة التخزين المؤقت للبرومبت (Prompt Caching Architecture)

مع استخدام نماذج مثل **DeepSeek-V3/V4** و **OpenAI GPT-4o**، يوفر الـ Prompt Caching ما بين **50% إلى 85% من تكلفة التوكنز ويخفض زمن الاستجابة إلى النصف**.

### القاعدة الذهبية لترتيب البرومبت:
```
[1. Static Prefix — الجزء الثابت 100% (يُحفظ في الـ Cache)]
├── محتوى SOUL.md العام (الهوية، القواعد، وأسلوب الحوار)
├── محتوى PERSONA.md (النبرة واللهجة)
├── محتوى TOOLS.md (مخطط الأدوات والتعليمات)
└── محتوى AGENTS.md (قواعد التسليم)

[2. Dynamic Suffix — الجزء المتغير لكل عميل وجلسة (في نهاية البرومبت)]
├── هوية التاجر (company_id، اسم المتجر)
├── التاريخ والوقت الحالي (Current Date/Time)
├── ذاكرة العميل الدائمة (حقائق وتفضيلات العميل السابقة)
└── سياق الجلسة الحالي (سلة المشتريات، معرف المحادثة)
```
> **تنبيه للمطور:** لا تضع التاريخ الحالي أو اسم العميل في أول سطر في الـ System Prompt؛ وضعهما في البداية يبطل الـ Cache تماماً لكل رسالة ويكلف المنصة توكنز مضاعفة.

---

## ❸ بنية الذاكرة ثلاثية المستويات (3-Tier Agent Memory)

بدلاً من حشو المحادثات القديمة بالكامل داخل نافذة السياق، يعتمد الوكيل على ثلاث طبقات للذاكرة:

1. **Working Memory (ذاكرة الجلسة السريعة):**
   * آخر 6-10 رسائل بين العميل والوكيل في الجلسة الحالية لمعرفة سياق الحوار المباشر.
2. **Episodic Memory (سجل الأحداث السابق):**
   * ملخص موجز لآخر تفاعل أو مشكلة سابقة واجهها العميل (مثال: *"العميل اشترى حذاء رياضي الأسبوع الماضي وكان مقاسه 42"*).
3. **Semantic Memory (حقائق وتفضيلات العميل الدائمة):**
   * استخراج وتحديث حقائق محددة عن العميل وتخزينها في بروفايل العميل بقاعدة البيانات:
     * الفرع المفضل.
     * طريقة الدفع المفضلة.
     * الحساسية الطبية أو التفضيلات الغذائية/المقاسات.
   * يتم حقن هذه الحقائق في الـ Dynamic Suffix فقط عند بدء المحادثة، مما يجعل الوكيل يتذكر العميل كأنه موظف يعرفه منذ سنوات.

---

## ❹ قواعد هندسة الأدوات الإلزامية (Direct Internal Tools via Pydantic)

نظراً لطبيعة منصة MaxP كمنصة دردشة فورية متكاملة (Real-Time Omnichannel) مع backend موحد:
* نعتمد على **أدوات المنصة المباشرة (Direct Native FunctionTool)** المتصلة مباشرة عبر `backend_client` أو قاعدة البيانات بدلاً من إضافة طبقات وبروتوكولات وسيطة خارجية تزيد من زمن الرد (Latency).

### 1. منع استخراج النصوص العشوائية (No Brittle Text Extraction)
* ❌ **ممنوع تماماً:** تمرير نصوص حرة عشوائية مثل `request: str` أو `prompt: str` وتفكيكها بالـ Regex داخل الأداة.
* ✅ **إلزامي:** استخدام باراميترات واضحة ذات أنواع محددة مسبقاً (`patient_name: str`, `appointment_date: str`, `branch_id: str`).

### 2. التحقق الصارم عبر Pydantic Models
كل أداة يجب أن تعرّف نموذج Pydantic صريح لمدخلاتها:

```python
from pydantic import BaseModel, Field
from typing import Any
from agent_framework import FunctionTool

class ReserveInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected by system)")
    patient_name: str = Field(..., description="اسم المريض بالكامل")
    patient_phone: str = Field(..., description="رقم هاتف المريض للتواصل")
    service_name: str = Field(..., description="اسم الخدمة المطلوبة")
    branch_name: str = Field(default="", description="فرع المركز الطبي المطلوب")
    appointment_date: str = Field(..., description="تاريخ الحجز بصيغة YYYY-MM-DD")
    appointment_time: str = Field(..., description="وقت الحجز بصيغة HH:MM")

async def booking_reserve(input_data: ReserveInput, ctx: Any = None) -> dict[str, Any]:
    """Execute reservation via backend client."""
    # تنفيذ الحجز عبر العميل الخلفي
    ...
```

### 3. دوال تنسيق المخرجات (Result Formatters)
دائماً قم بتوفير دالة `format_result` تحول مخرجات الـ JSON المعقدة إلى نص عربي موجز، لمنع تشتت النموذج وتقليل استهلاك التوكنز:

```python
def _format_booking_reserve(result: dict) -> str:
    if result.get("error"):
        return f"تعذر إتمام الحجز: {result['error']}"
    return f"تم حجز الموعد بنجاح للمريض {result.get('patient')} يوم {result.get('date')} الساعة {result.get('time')}."

booking_reserve_tool = FunctionTool(
    name="booking_reserve",
    description="إنشاء وتأكيد حجز جديد في المركز الطبي بمعطيات مهيكلة صريحة.",
    func=booking_reserve,
    input_model=ReserveInput,
    format_result=_format_booking_reserve,
)
```

---

## ❺ التكامل مع محرك `apps/ai-service` (Runtime Engine)

يعتمد المحرك التنفيذي في `src/agents/base.py` على **Microsoft Agent Framework** (`agent-framework==1.8.1`).

### تدفق تنفيذ المحادثة (Execution Flow):
1. **Hydration & Caching:** يقوم `src.prompts.template_registry` بتجميع نصوص `SOUL.md` + `PERSONA.md` + `TOOLS.md` + `AGENTS.md` كـ Static Prefix، ثم حقن سياق العميل كـ Suffix.
2. **Middleware & Guardrails:**
   * يتم تطبيق `BaseGuardrail` للتحقق من سلامة المدخلات.
   * يتم فحص صلاحيات الأدوات المصرح بها فقط عبر `build_maxp_function_middleware`.
3. **Execution Pipeline:**
   * مرحلة `process_with_skills`: تشغيل النموذج واستدعاء الأدوات المصرح بها.
   * مرحلة `validate_reply`: التأكد من خلو الرد من عبارات الآلة المحظورة ومطابقته لسياسة التاجر.
4. **Handoff Handling:**
   * عند استدعاء أداة `agent.handoff.to`، يقوم النظام بتبديل الوكيل النشط في جلسة العميل مع نقل ملخص المحادثة.

---

## ❻ دورة النشر، التحديث، والاختبار (Lifecycle & Seeding)

ملفات `apps/backend/agents` هي ملفات تطويرية (`Dev-time Artifacts`). لتطبيق أي تعديل على بيئة التشغيل وقاعدة البيانات:

### 1. تشغيل تقييم الـ Evals أولاً:
قبل عمل Seeding للقالب، تأكد من اجتياز سيناريوهات الاختبار:
```bash
# تشغيل سيناريوهات التقييم للتأكد من سلوك الوكيل
pytest apps/ai-service/tests/agents/test_agent_evals.py
```

### 2. عمل Seeding للقوالب في قاعدة البيانات:
```bash
# من داخل مجلد apps/ai-service
python -m scripts.seed_agent_templates
```
يقوم السكربت بقراءة جميع ملفات `agent.json` والـ Markdown وحقنها في جدول `ai.agent_templates`.

---

## ❼ قائمة المراجعة السريعة عند إنشاء أو تعديل أي وكيل (Checklist)

- [ ] هل الوكيل يمتلك اسماً ومسمى وظيفياً بشرياً طبيعياً؟
- [ ] هل المجلد يحتوي على الملفات المطلوبة (`agent.json`, `SOUL.md`, `PERSONA.md`, `TOOLS.md`, `AGENTS.md`, `evals.json`)؟
- [ ] هل البرومبت مرتب بحيث يدعم الـ **Prompt Caching** (الثابت أولاً والمتغيرات في النهاية)؟
- [ ] هل تستفيد الأداة من حقائق العميل الدائمة (Semantic Memory) بدلاً من سؤاله عن معلوماته في كل جلسة؟
- [ ] هل جميع الأدوات تستخدم `Pydantic BaseModel` صريح وبدون أي باراميتر نصي عشوائي؟
- [ ] هل تم وضع رد فكاهي وعفوي على سؤال "هل أنت بوت؟" في `SOUL.md`؟
- [ ] هل تم اختبار تسليم المحادثة `agent.handoff.to`؟
- [ ] هل تم تشغيل سكربت `seed_agent_templates.py` لترحيل القالب لقاعدة البيانات؟
- [ ] الالتزام بقاعدة النشر التلقائي للـ Git مع رسالة توضيحية.
