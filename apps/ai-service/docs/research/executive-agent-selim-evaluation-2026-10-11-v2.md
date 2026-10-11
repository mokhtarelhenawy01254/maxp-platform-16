# تقييم الإيجنت التنفيذي «سليم» — إصدار 2 (بعد إعادة فحص عميق)

**التاريخ:** 2026-10-11 · **الحالة المرصودة (pinned):** `HEAD = abc56dad4` · **المُقيِّم:** Hermes

> ⚠️ **تنبيه منهجي:** الريبو كان **بيتغيّر أثناء الفحص** (HEAD اتقدّم مرتين: `7cc297429` → `739dcb64b` → `abc56dad4`)، وفيه تعديلات uncommitted في نفس الملفات. كل الأرقام تحت **مرصودة عند الحالة أعلاه**، ولازم يُعاد التحقق لو الريبو اتغيّر.

---

## 0. تصحيح أخطاء التقرير الأول (v1)

| ما قيل في v1 | الحقيقة الآن | الحكم |
|---|---|---|
| «`agent.json` = 59 أداة و`role_tools.yaml` = 56، وسليم بيفقد 3 أدوات شحن» | **76 = 76 بالظبط**، صفر فرق في الاتجاهين | ❌ **v1 كان غلط** — المشكلة اتحلّت في commit `85466e06f` |
| «مفيش أي اختبار بيتحقق من التزامن بين المصدرين» | موجود: jest test + `validate-agent-skills.js` + `role_registry.validate_all()` | ❌ **v1 كان غلط** |
| «`SOUL.md` = 134 سطر، `agent.json` = 106» | SOUL **161**، agent.json **127**، TOOLS **71**، evals.json **173**، allowedSkills **8** (كانت 4) | ⚠️ أرقام v1 قديمة |

السبب: الالتزام الكبير `85466e06f` (12:55) دخل بين القراءتين. **اعتذر عن الـ P0-1** — كان مبنياً على حالة قديمة.

---

## 1. اللي v1 مفوّته بالكامل (معمارية جديدة)

### 1.1 `roles.manifest.yaml` — مصدر حقيقة واحد حقيقي للأدوار ✅
`apps/ai-service/src/agents/roles.manifest.yaml` (527 سطر، 29 دور) بيوصّف لكل دور: `domain`, `playbook_id`, `judge_profile`, `capabilities` (episodic_memory / knowledge_retrieval / learning / approvals)، و**`approval_policy`** فيه `allowed_scopes` + `forbidden_prefixes`.

**ومربوط بالكود فعلاً (مش ملف ميت):**
- `role_registry.py:13` بتحمّله، و`:201 validate_all()` بتتحقق من التزامنه مع `role_tools.yaml` + الحقول الإلزامية.
- `main.py:76-77` بينده `validate_all()` **عند إقلاع الخدمة**.
- `_unlock.py:48-52` بيستخدم `forbidden_prefixes` فعلياً لإخفاء الأدوات المحرّمة (مثلاً `hr_`, `payroll_`, `internal_`).
- `scripts/validate-agent-skills.js` (CI) بيتحقق من نفس التزامن.

ده بالظبط نوع الحل اللي v1 كان بيطالب بيه. **تحسّن معماري حقيقي.**

### 1.2 `store_suite.py` — 6 أدوات جديدة
`orders_bulk_status_update`, `order_set_preparation_hold`, `bot_automation_manage`, `returns_settings_manage`, `unified_inbox_manage`, `facebook_pages_connected_list` — كلها بـ Pydantic models موثّقة ورسائل عربية.

### 1.3 طبقتان اختبار جديدتان
| الطبقة | الحجم | النتيجة |
|---|---|---|
| `executiveAssistantAgent.tools17.test.js` | 198 سطر | ✅ PASS |
| `executiveAssistantBundleSimulation.test.js` | 199 سطر | ✅ PASS |
| `scripts/test-executive-store-suite.js` | 1188 سطر | ✅ 204/204 |
| إجمالي jest (شغّلته فعليًا) | — | **11/11 passed** |

---

## 2. المشاكل الحقيقية (v2)

### 🔴 P0-A — أدوات بتكتب فعلًا لكنها مصنّفة «قراءة» → تنفيذ فوري بدون اعتماد

**الدليل:**
| الأداة | بتعمل إيه فعليًا | التصنيف | النتيجة |
|---|---|---|---|
| `bot_automation_manage` | `action="UPDATE"` → **`PUT /api/v1/bot-automation/settings`** (رسائل ترحيب، رد آلي، قنوات) | `ADVANCED_TOOL_NAMES` (`registry.py:114`) | `approval_mode` = الافتراضي **`never_require`** |
| `returns_settings_manage` | `action="UPDATE_SETTINGS"` → **`PUT /api/v1/returns/settings`** (سياسة الإرجاع + نافذة الأيام) | `ADVANCED_TOOL_NAMES` (`registry.py:115`) | **`never_require`** |

**ليه الـ fail-closed guard مش لاقطها؟**
`MUTATING_NAME_TOKENS` (`registry.py:217`) = {create, update, delete, remove, cancel, refund, adjust, configure, toggle, send, broadcast, publish, spawn, reserve, enroll, schedule, record, **set**, reply}. الاسم `bot_automation_manage` و`returns_settings_manage` مفيهمش أي token من دول — والمطابقة segment-based، فـ `settings` مش بتطابق `set`. يعني **الحارس المصمم يمنع بالظبط ده… بيفوّته.**

**والأهم: الاختبارات الجديدة بتقنّن الثغرة (codify) مش بتكشفها:**
- `executiveAssistantBundleSimulation.test.js:47-52` → `bot-automation` بـ `requiresApproval: false`.
- نفس الملف `:87-92` → `returns-settings` بـ `requiresApproval: false`.
- `scripts/test-executive-store-suite.js:45` بتصنّف ضمن «READ_TOOL_NAMES (never_require): all read & analytics tools».
- وفي نفس الوقت `store-suite-operations/skill.json` بتقول `"requiresHumanApproval": true` لنفس الأدوات → **تعارض صريح بين طبقة الـ skill وطبقة الأداة.**

**الأثر:** التاجر يطلب «خلي رسالة الترحيب كذا» أو «خلي نافذة الإرجاع 30 يوم» → **تتنفّذ فورًا بدون كارت اعتماد**، وسليم يقدر يعدّل إعدادات متجر حقيقية بلا بوابة.

**الإصلاح:** نقل الأداتين (أو استخدام conditional approval حسب `action`) لـ `WRITE_TOOL_NAMES`، وإضافة `manage` للـ forbidden tokens أو قاعدة «أداة باسم فيها `manage` + endpoint فيه PUT/POST = write». وأضف assertion في `test-executive-store-suite.js` إن كل أداة بتعمل PUT/POST تكون في `WRITE_TOOL_NAMES`.

---

### 🟠 P1-B — حذف صامت لبروتوكول «الذاكرة عبر الجلسات» من SOUL

commit `85466e06f` **شال** قسم `## مراجعة المحادثات والجلسات السابقة (Cross-Session Historical Memory)` بالكامل واستبدله بقسم باقة المتجر الـ17.

**النتيجة الآن:**
- `session_search` **لسه ممنوحة** — `role_tools.yaml:45`، `TOOLS.md:21` بيثوّقها بالتفصيل.
- لكن **`SOUL.md` مش بذكرها ولا مرة** (grep: صفر نتيجة لأي من `session_search` / `جلسات` / `Cross-Session`).
- والقاعدة الصريحة **«ممنوع نهائياً الادعاء بأنك لا تستطيع رؤية الجلسات الماضية أو أن السجل فارغ»** اتشالت.

يعني: الأداة موجودة، والتعليمات اللي بتقول تستخدمها **راحت**. ده انحدار سلوكي صامت — بالظبط اللي محور `learning_review` في الـ evals المفروض يلمّه.

---

### 🟠 P1-C — الأرقام «100%» بتثبت العقد (contract) مش التكامل

شغّلت `scripts/test-executive-store-suite.js` بنفسي: **204/204 = 100%**.

لكن الفحص العميق بيقول:
- **صفر نداء شبكة:** مفيش `fetch` / `axios` / `http` / `localhost` / `maxp.online` في الملف كله.
- التنفيذ بـ `mockOutput` fixtures (`:711+`).
- اللي **فعلاً** حقيقي فيه: بيقرأ `registry.py` الفعلي بـ regex ويستخرج `WRITE_TOOL_NAMES` / `DIRECT_WRITE_TOOL_NAMES` ويتحقق من البوابة — **ده تحقق حقيقي وممتاز** (`:399-433`).

فالتصنيف الصحيح: **204 checks = Schema + enums + contract + تصنيف الاعتماد**. **مش** تنفيذ حقيقي للأدوات على الباك-إند. في المقابل السويت الوحيد الحيّ (`copilot_eval.py` على `maxp.online`) **مش في الـ CI**.

---

### 🟠 P1-D — `evals.json` (17 سيناريو) وصفية بس — مفيش runner بيقراها

- `apps/backend/agents/executive-assistant-agent/evals.json` → 17 سيناريو بصيغة `evalScenarios` — **مفيش أي كود بيشغّلها**؛ المستهلكون الوحيدون هم jest tests بتتحقق من وجودها نصيًا.
- السويت التنفيذي الحقيقي هو `apps/ai-service/src/evals/copilot_eval_cases.json` (15 حالة، صيغة مختلفة تمامًا).
- **صيغتان للتقييم، ولا واحدة في الـ CI.**

---

### 🟡 P2-E — ضعف assertion بوابة الاعتماد في jest

`executiveAssistantBundleSimulation.test.js:180-188` — الاختبار اسمه «write/mutation tools correctly trigger approval requirements» لكنه بيفحص بس إن فيه ≥3 سيناريوهات معلّمة `requiresApproval` في **قائمة مكتوبة جوه الملف نفسه**. مش بيسأل الـ registry الحقيقي. **عشان كده بيعدّي وهو مش كاشف المشكلة P0-A.**

---

### 🟡 P2-F — البودجت والتحميل

`maxToolCallsPerRun` لسه **8**، و`dailyUsd` **3.0** — بينما `allowedTools` كبرت 59→76 وSOUL بقى بيفرض تدفقات متعددة الخطوات (تقرير الحملات → قرار الإعلان؛ قائمة العروض → configure → اعتماد). يحتاج مراجعة مقابل أطول workflow.

---

### 🟡 P2-G — حالة العمل وقت الفحص (uncommitted)

| الملف | التغيير | ملاحظة |
|---|---|---|
| `store_suite.py` | fallback endpoint لـ `facebook_pages_connected_list` (`/api/v1/integrations/facebook/connected`) + parsing أقوى | تحسين |
| `facebook_ads.py` | **نقل عدّ العدادات بعد فلتر `campaign_name`** في `orders_campaign_attribution_report` | ✅ **إصلاح صحيح**: قبل كده `total_cnt`/`total_rev` كانوا بيتحسبوا لكل الطلبات قبل الفلتر → التقارير المفلوترة كانت بتعرض إجماليات غلط |

---

## 3. سكوركارد محدّث

| المحور | v1 | v2 | السبب |
|---|---|---|---|
| هوية وتعريف الوكيل | 🟢 | 🟢 | 6 ملفات عقد + 76 أداة + 8 skills |
| اتساق صلاحيات الأدوات | 🔴 | 🟢 **مصحّح** | 76=76 + 3 مدققات (startup + CI + jest) |
| **تصنيف أدوات الكتابة** | 🟢 | 🔴 **منخفض** | P0-A (bot/returns بيكتبوا بدون بوابة) |
| حوكمة الأدوار | ➖ | 🟢 **جديد** | `roles.manifest.yaml` + `forbidden_prefixes` مفعّلة |
| جودة الـ prompt | 🟠 | 🟠 | + **حذف صامت** لقسم الذاكرة (P1-B) |
| Evals (تنفيذ حقيقي) | 🟠 | 🟠 | 100% contract، صفر E2E حي، ولا حاجة في CI |
| Observability | 🟠 | 🟠 | لسه: OTLP مقفول افتراضيًا، badge غلط |
| الـ runtime | 🟢 | 🟢 | OTel + MCP + A2A + checkpoints + pgvector |

---

## 4. خطة العمل المحدّثة

**P0 (فورًا):**
1. **انقل `bot_automation_manage` و`returns_settings_manage` لـ `WRITE_TOOL_NAMES`** (أو approval مشروط بـ `action`)، وأصلح `MUTATING_NAME_TOKENS` تغطي `manage`/`settings` مع قاعدة endpoint-based للأمان.
2. صحّح الـ assertions اللي بتقنّن الثغرة (`BundleSimulation` :47، :87، و`test-executive-store-suite.js:45`) وأضف assertion: «كل أداة بتعمل PUT/POST لازم تكون في WRITE_TOOL_NAMES».
3. رجّع قسم Cross-Session Memory لـ SOUL (أو وثّق إلغاءه عمدًا).

**P1:**
4. أدخل `copilot_eval` في CI على sandbox، وحوّل `evals.json` لصيغة قابلة للتنفيذ أو وحّد الصيغتين.
5. اختبار E2E حي واحد على sandbox بدل mockOutput (لو صفر نداءات شبكة = verified contract).
6. فعّل OTLP + self-hosted Phoenix/Langfuse (OpenInference semantics).

**P2:**
7. راجع بودجت 8 tool calls، وثبّت صيغة تسمية واحدة للأدوات (نمط dotted/snake المختلط لسه موجود).
8. التغييرات الـ uncommitted (`store_suite.py`, `facebook_ads.py`) — راجعها وادفعها، إصلاح الـ attribution صح ومحتاج يطلع.

---

*ملاحظة: الملف ده v2 ويُلغي v1 (`executive-agent-selim-evaluation-2026-10-11.md`) في النقاط اللي اتغيّرت.*
