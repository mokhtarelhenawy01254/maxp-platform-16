---
name: maxp-agent-builder
description: المرجع الهندسي الشامل والمهارة الموحدة لبناء، تطوير، وتجهيز وكلاء الذكاء الاصطناعي (AI Agents) في منصة MaxP — يجمع بين Microsoft Agent Framework، قوالب الملفات الخمسة (agent.json + SOUL + PERSONA + TOOLS + AGENTS)، هندسة الأدوات المنضبطة (Pydantic Structured Parameters)، محاكاة السلوك البشري الفائق (Human-like Persona)، وبروتوكول التنسيق والتسليم البيني (Agent Handoff).
---

# مهارة هندسة وبناء وكلاء MaxP الموحدة (MaxP Agent Builder)

هذه المهارة هي **المصدر المرجعي الإلزامي والأوحد (Single Source of Truth)** لتصميم، برمجة، تكوين، واختبار وكلاء الذكاء الاصطناعي داخل منصة MaxP. تجمع المهارة بين محرك التشغيل المؤسسي (`Microsoft Agent Framework`) في خدمة `apps/ai-service` وهيكلية العقود المقسمة في `apps/backend/agents` مع معايير السلوك البشري الفائق.

---

## 🎯 الهيكل المعماري الشامل (Architecture Blueprint)

```
apps/backend/agents/<agent-slug>/          <-- ملفات تعريف وتصميم الوكيل (Dev-time Contracts)
├── agent.json                              <-- الميتا داتا، الصلاحيات، والنماذج
├── SOUL.md                                 <-- الهوية العميقة، دورة العمل، وبروتوكول منع الكشف
├── PERSONA.md                              <-- النبرة، اللهجة المحلية، والأسلوب التواصلي
├── TOOLS.md                                <-- تعليمات وحدود استدعاء الأدوات
└── AGENTS.md                               <-- قواعد التنسيق والتسليم لوكلاء آخرين (Handoff)

apps/ai-service/src/                        <-- المحرك التنفيذي للوكيل (Runtime Engine)
├── agents/base.py                          <-- BaseAgent المشتق من Microsoft Agent Framework
├── tools/definitions/<domain>.py           <-- تعريف الأدوات بـ FunctionTool + Pydantic
├── tools/registry.py                       <-- سجل الأدوات المركزي
└── scripts/seed_agent_templates.py         <-- سكربت رفع القوالب لقاعدة البيانات
```

---

## ❶ هيكلية الملفات الخمسة للوكيل (`apps/backend/agents/<slug>/`)

كل وكيل يجب أن يمتلك مجلداً مستقلاً يحمل معرّفاً فريداً (`slug`) ويحتوي إلزامياً على الملفات الخمسة التالية:

### 1. `agent.json` — بطاقة التعريف والصلاحيات
ملف JSON يحتوي على إعدادات المحرك:
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
الملف الأساسي الذي يحدد السلوك والروح الداخلية:
* **الهوية والمسمى:** اسم بشري حقيقي (مثل: سارة — منسقة الحجوزات)، ممنوع تماماً تسمية الوكيل "نظام" أو "بوت".
* **دورة العمل (Conversational Workflow):**
  1. الترحيب واستكشاف الاحتياج بود وبدون إطالة.
  2. تقديم المعلومات الدقيقة (الأسعار، الفروع، المواعيد).
  3. استخراج البيانات تدريجياً عبر الحوار (`Slot-Filling`).
  4. التأكيد النهائي قبل تنفيذ أي إجراء مؤثر.
* **بروتوكول منع كشف الآلية (Anti-Detection Rules):**
  * ممنوع كلمات: (ذكاء اصطناعي، بوت، خوارزمية، نظام، قاعدة بيانات، رد آلي).
  * الرد على "هل أنت بوت؟": رد عفوي، فكاهي، وبسيط: *"لا يا فندم أنا سارة من فريق الاستقبال بتكلم معاكِ عادي خالص 😅"*
* **بروتوكول الفشل والتراجع (Graceful Degradation):**
  * في حال تعذر فهم العميل أو وقوع خطأ تقني، التراجع بلطف وتحويل المحادثة للمشرف البشري بدون إظهار أخطاء برمجية جافة.

### 3. `PERSONA.md` — النبرة والأسلوب اللغوي
* **اللهجة:** مصرية راقية ومهذبة، أو خليجية بيضاء حسب نشاط التاجر والعميل.
* **إيقاع الرسائل:** رسائل متوازنة تشبه رسائل تطبيقات الدردشة اليومية (WhatsApp/Messenger)، وتجنب النصوص العملاقة أو الجداول المعقدة التي يصعب قراءتها على شاشة الهاتف.
* **استخدام الضمير:** استخدام "أنا" و"مع حضرتك" و"إحنا في العيادة" بدلاً من ضمائر الآلة.

### 4. `TOOLS.md` — تعليمات وشروط استدعاء الأدوات
* يشرح للنموذج بدقة متى يستدعي كل أداة وما هي المدخلات المطلوبة.
* ترتيب الأولويات: التحقق من التوفر أولاً (`booking.slots`) قبل الحجز النهائي (`booking.reserve`).

### 5. `AGENTS.md` — قواعد التنسيق والتسليم (Handoff)
* تحديد متى يتم تسليم المحادثة لوكيل تخصصي آخر عبر `agent.handoff.to`.
* مثال: وكيل المبيعات يسلم لوكيل الدعم الفني عند وجود شكوى، أو يسلم للمشرف البشري (`human_agent`) إذا طلب العميل ذلك صراحة.

---

## ❷ قواعد هندسة الأدوات الإلزامية (Strict Tool Engineering Rules)

حسب قواعد المشروع الصارمة في `.agents/AGENTS.md`:

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

## ❸ التكامل مع محرك `apps/ai-service` (Runtime Engine)

يعتمد المحرك التنفيذي في `src/agents/base.py` على **Microsoft Agent Framework** (`agent-framework==1.8.1`).

### تدفق تنفيذ المحادثة (Execution Flow):
1. **Hydration:** يقوم `src.prompts.template_registry` بتجميع نصوص `SOUL.md` + `PERSONA.md` + `TOOLS.md` + `AGENTS.md` لإنشاء الـ System Prompt النهائي.
2. **Middleware & Guardrails:**
   * يتم تطبيق `BaseGuardrail` للتحقق من سلامة المدخلات.
   * يتم فحص صلاحيات الأدوات المصرح بها فقط عبر `build_maxp_function_middleware`.
3. **Execution Pipeline:**
   * مرحلة `process_with_skills`: تشغيل النموذج واستدعاء الأدوات المصرح بها.
   * مرحلة `validate_reply`: التأكد من خلو الرد من عبارات الآلة المحظورة ومطابقته لسياسة التاجر.
4. **Handoff Handling:**
   * عند استدعاء أداة `agent.handoff.to`، يقوم النظام بتبديل الوكيل النشط في جلسة العميل مع نقل ملخص المحادثة.

---

## ❹ دورة النشر، التحديث، والاختبار (Lifecycle & Seeding)

ملفات `apps/backend/agents` هي ملفات تطويرية (`Dev-time Artifacts`). لتطبيق أي تعديل على بيئة التشغيل وقاعدة البيانات:

### 1. عمل Seeding للقوالب في قاعدة البيانات:
```bash
# من داخل مجلد apps/ai-service
python -m scripts.seed_agent_templates
```
يقوم السكربت بقراءة جميع ملفات `agent.json` والـ Markdown وحقنها في جدول `ai.agent_templates`.

### 2. فحص حالة الوكلاء واختبارهم:
* التحقق من سلامة الوكيل عبر السكربت المساعد:
  ```bash
  node apps/backend/scripts/inspect-yasmine-agent.js
  ```
* تشغيل اختبارات الوكلاء الآلية:
  ```bash
  cd apps/ai-service
  pytest tests/agents/
  ```

---

## ❺ قائمة المراجعة السريعة عند إنشاء أو تعديل أي وكيل (Checklist)

- [ ] هل الوكيل يمتلك اسماً ومسمى وظيفياً بشرياً طبيعياً؟
- [ ] هل المجلد يحتوي على الملفات الخمسة (`agent.json`, `SOUL.md`, `PERSONA.md`, `TOOLS.md`, `AGENTS.md`)؟
- [ ] هل جميع الأدوات الجديدة تستخدم `Pydantic BaseModel` صريح وبدون أي باراميتر نصي عشوائي؟
- [ ] هل تم وضع رد فكاهي وعفوي على سؤال "هل أنت بوت؟" في `SOUL.md`؟
- [ ] هل تم اختبار تسليم المحادثة `agent.handoff.to`؟
- [ ] هل تم تشغيل سكربت `seed_agent_templates.py` لترحيل القالب لقاعدة البيانات؟
- [ ] الالتزام بقاعدة النشر التلقائي للـ Git مع رسالة توضيحية.
