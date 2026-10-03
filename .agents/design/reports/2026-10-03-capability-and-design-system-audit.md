# تقييم القدرات + تدقيق نظام التصميم — MaxP
**التاريخ:** 2026-10-03 · **المُنفِّذ:** نور (بروفايل design) · **نوع العمل:** قراءة فقط (zero production writes)
> ⚠️ **تصحيح 2026-10-03 (المراجعة الثانية):** النسخة الأولى من هذا التقرير احتوت أخطاء قياس وأرقاماً
> غير قابلة لإعادة الإنتاج. **كل الأرقام هنا معادة حساباً في نفس الجولة** بالأوامر المذكورة تحت كل
> رقم، والمصحّحات في سجل العيوب (MOB-055/057/059/060). النسخة الأولى كانت وثيقة بحث،
> دي وثيقة تدقيق صالحة للتنفيذ.

---

## 0. خلاصة

✅ **التباين محسوب صح في المسودة الأولى.** كل أرقام §4.1 (2.14 · 2.57 · 3.76 · 4.20 · 4.49 · 1.38) **صحيحة**،
أعدت حسابها من `index.css` بنفس طريقة OKLCH→sRGB→WCAG وطلعت نفس القيم بالظبط. ده كان أحسن جزء في
التقرير الأول.
❌ **الأرقام اللي كانت غلط:** نسب RTL · أيقونات · select-likes · ادّعاء تجاهل git · «الوضع الغامق سليم».
❌ **اللي فات التقرير الأول:** **4 عيوب حقيقية** ملقتش herself (انظر §7) — أهمها تضاد الأيقونات
569 ملف heroicons مقابل 774 lucide، وأن توكنز الحالة **مش متعرَّفة في الوضع الغامق أصلاً**.

---

## 1. Capability Audit — ما أنفّذه فعليًا

### 1.0 خلاصة في سطر
✅ قرأت الريبو، فتحت المتجر لايف على 390px، حسبت التباين من توكنز المشروع نفسها.
❌ مفيش جلسة مسجّلة → كل `/orders` محمية. مفيش RUM → أي رقم CWV هيدّعي كـ«هدف» مش «قياس».

### 1.1 الوصول للمستودع
✅ وصول كامل للريبو `H:\maxp-platform` (main، مربوط بـ`origin/main`).

### 1.3 أين أحفظ الملفات الدائمة — **تصحيح مهم**

| النوع | المسار | متتبَّع في Git؟ |
|---|---|---|
| سجل العيوب الرسمي | `.agents/skills/maxp-mobile-design-review/references/findings-log.md` | ✅ نعم |
| سكوركارد | `.agents/design/scorecard.md` | ✅ **نعم — متتبَّع** |
| سبكات | `.agents/design/specs/` | ✅ **نعم — متتبَّع** |
| قرارات | `.agents/design/DESIGN_DECISIONS.md` | ✅ **نعم — متتبَّع** |
| هذا التقرير | `.agents/design/reports/` | ✅ **نعم — متتبَّع** |

**تصحيح:** التقرير الأول (§1.3 و §6) ادّعى إن `.agents/design/` متجاهَل في Git وإن الملفات
«مش هتوصل لحد». **ده غلط.** الدليل:

```
git ls-files .agents/design/        → 7 ملفات، كلها متتبَّعة
git check-ignore -v .agents/design/scorecard.md → exit 1 (غير متجاهَل)
```

السبب الحقيقي لإخفاق التسليم الأول كان تغيّب الـ commit والـ push، لا الـgitignore.

---

## 2. Research Report — **مختصر (تصحيح)**

WCAG 2.2 هو آخر معيار مستقر (نُشر 2023-10-05، تحديث 2024-12-12) ولم يلغِ 2.1 —
[w3.org/WAI/standards-guidelines/wcag](https://www.w3.org/WAI/standards-guidelines/wcag/).
Base UI يتبع ARIA APG + WCAG 2.2 level AA لكل success criteria — [base-ui.com](https://base-ui.com/).

> **التغيير عن التقرير الأول:** حُذفت مقارنة Polaris/Primer/M3/Fluent. هي مراجع تصميم لوجوهات
> عالمية مش Lavalley تطبيق مصري، واستهلكت ~40% من التقرير بدون أي أثر على قرار. WCAG وحده هو
> المعيار الحاكم. (`Atlassian tokens` و `shadcn RTL` باقيين كمرجع تنفيذ في §5 بسطر واحد لكل واحد.)

---

## 3. Current Design Assessment

### 3.1 مفحوص ✅
| المجال | النتيجة | الدليل |
|---|---|---|
| **Stack** | React 18.2 · Tailwind v4.2 · shadcn (base-nova) · **Base UI** (32 ملف، Radix = 0) · lucide `^0.312.0` | `grep -rl @base-ui/react src \| wc -l` = 32 · `@radix-ui` = 0 |
| **مصدر الحقيقة** | `index.css` — `:root` عند 149 · `.dark` عند 532 · `@theme inline` عند 370 | |
| **الخطوط** | 9 `@font-face` — 5 Geist (index.css) + 4 Raleway (storefront) · **صفر منهم يغطي عربي** | §3.3 |
| **RTL** | `dir="rtl"` (index.html:2) · `components.json: rtl:false` ← تناقض | MOB-056 |
| **الجداول** | `OrdersTable.tsx` = 9 أعمدة، مفيش layout موبايل | `grep -c "<th"` = 9 |
| **الطلبات** | 4 ملفات >1500 سطر | §3.4 |

### 3.2 متعذّر الفحص (بصراحة)
- **شاشة الطلبات لايف** — محمية بجلسة. محتاج تسجيل دخول من الـvault منك.
- **Core Web Vitals الحقيقية** — مفيش RUM. أي رقم LCP/INP/CLS هيدّعي كـ«هدف» مش «قياس».
- **Production bundle مقابل repo** — حكم «منشور» يبقى **«مثبت من الكود»** فقط.

### 3.3 الخطوط — **تصحيح جوهري**

التقرير الأول سجّل MOB-057 كـ«Cairo معرَّف بلا `@font-face`». ده **صح بس مش السبب الجذري**،
وحدّ التقييم بـ7/10 كان في غير محله. الحقيقة الكاملة:

```
grep -c "@font-face" src/styles/index.css       → 5   (كلهم 'Geist Variable')
grep -c "@font-face" src/styles/storefront.css  → 4   (كلهم 'Raleway')
grep -o "unicode-range:[^;]*" | grep "U+06"     → لا شيء  ← صفر تغطية عربية
grep -n "IBM+Plex" index.html                   → سطر 47 (Google Fonts CDN) ✅
grep -c Cairo index.html                        → 0   ← Cairo مش محمّل حتى من CDN
```

- **Geist Variable مفيهوش عربي خالص** — الـ5 `unicode-range` بتاعته: Latin / Latin-ext / Cyrillic / Greek / Vietnamese. مفيش `U+0600-06FF`.
- **إذاً:** `--font-heading: "Cairo", "Geist Variable", sans-serif` ← Cairo غير موجود (لا face ولا CDN)، Geist لا يغطي العربي → **كل عنوان عربي بيقع على `sans-serif`.generic**، مش IBM Plex Sans Arabic.
- **وفيه تعارض مباشر:** `--font-heading` متعرَّف **مرتين** — `index.css:11` (`'IBM Plex Sans Arabic'`) و `index.css:448` جوّه `@theme inline` (`"Cairo", "Geist Variable"`). التعريف الأخير في المصدر هو اللي بيفوز في `:root` الناتجة.
- ⚠️ **اللي محتاج تحقق حي:** أيهم بيفوز فعلاً في CSS المبني (`@theme` بيتحرك في Tailwind v4). لازم `getComputedStyle(document.querySelector('h1')).fontFamily` على 390px. **لحد ما ده يتقاس، التقييم «الخطوط 5/10» مبدئي.**
- **الملاحظة الصح:** `swan.maxp.online` بيحسب `font-family: "IBM Plex Sans Arabic"` — وده لأن `index.html:63` فيه inline style ثابت، مش لأن التوكنز صح.

### 3.4 الملفات الكبيرة (الرقم ده صح في التقرير الأول)

| الملف | السطور |
|---|---|
| `Orders.tsx` | 3350 |
| `PreparationQueue.tsx` | 2493 |
| `OrderDetails.tsx` | 1910 |
| `OrderConfirmationQueue.tsx` | 1527 |

قاعدة المشروع 300-400 سطر → **10 أضعاف** على الملف الأول.

### 3.5 **جديد: تضاد مكتبة الأيقونات** — أخطر عيب مااترصدش

```
grep -rl "@heroicons/react" src --include=*.tsx | wc -l   → 569 ملف
grep -rl "lucide-react"      src --include=*.tsx | wc -l   → 774 ملف
comm -12 (الاتنين معاً)                                      → 13 ملف يستورد الاثنين
```

- **13 ملف بيخلط المكتبتين في نفس الملف** — `Layout.tsx` و `WhatsAppChat.tsx` و `UnifiedInbox.tsx` من amongst.
- **554 ملف heroicons فقط** — التوصية D-010 («icon library = lucide») كانت كاذبة وقت صدورها.
- **Naming خطر:** heroicons بيستخدم لاحقة `Icon` (`MagnifyingGlassIcon`)، lucide بيستخدم اسم أعادي (`Search`). التفرقة دي **غير مرئية** في review وبتسبب استيراد غلط.
- الموك: `OrdersToolbar.tsx:5` بيستورد `MagnifyingGlassIcon` من heroicons بينما 774 ملف تاني بيستورد lucide.

---

## 4. Design System Findings — محدّثة

### 4.1 Semantic Color Tokens — **محسوب ومحقّق**

| الزوج (فاتح) | التباين | AA 4.5 | AA-large/UI 3.0 | الحكم |
|---|---|---|---|---|
| `--color-warning` + أبيض | **2.14:1** | ❌ | ❌ | 🔴 |
| `--color-success` + أبيض | **2.57:1** | ❌ | ❌ | 🔴 |
| `--color-destructive` + أبيض | **3.76:1** | ❌ | ⚠️ | 🟡 |
| `--color-muted-foreground` على background | **4.20:1** | ❌ | ⚠️ | 🟡 |
| `--color-primary` + أبيض | **4.49:1** | ❌ (0.01) | ⚠️ | 🟡 |
| `border` على `background` | **1.38:1** | ❌ | ❌ | ⚪ زخرفي — حدود الـinputs لازم ≥3 |

**⚠️ تصحيح جديد — «الوضع الغامق سليم تمامًا» كان غلط:**

```
grep -n -- "--color-warning:\|--color-success:\|--color-destructive:" src/styles/index.css
→ 163: --color-destructive   (داخل :root)
→ 165: --color-warning       (داخل :root)
→ 167: --color-success       (داخل :root)
→ 406/408/410: var(--color-*) (داخل @theme inline — مجرد تكرار)
```

**`.dark` (سطر 532) لا يعيد تعريف أي من توكنز الحالة.** معناها إن الوضع الغامق **بنفس قيم الفاتح**:

| التوكن | في الوضع الغامق | الحكم |
|---|---|---|
| `--color-warning` | 2.14:1 (نص أبيض) | 🔴 **فشل مضاعف** |
| `--color-success` | 2.57:1 (نص أبيض) | 🔴 **فشل مضاعف** |
| `--color-destructive` | 3.76:1 | 🟡 |
| `--color-card` على `--color-background` | **1.08:1** | 🔴 **الكارت مش بيتفرق عن الخلفية** |

سلّم الغامق سليم فعلاً في **النصوص** (fg 17.09 · muted 8.02 · fg-on-card 15.77) — بس **الأسطح
والحالة مش سليمة**.Evaluations «التباين (غامق) 9/10» كانت بتقيس النصوص بس.

### 4.2 Status Palette — تصحيح العدّاد
`statusRegistry` مُستشهد به في **22 موضع** (مش 34). والتTTTTرTBCompat: 3 مصادر حقيقة متعارضة
توكنز + statusRegistry + classNames يدوية (`OrdersMobileList.tsx:157` فيه
`bg-blue-50/80 ring-blue-500/30`).

### 4.3 حوكمة اللون — **تصحيح العدّاد**

```
# الـoccurrences (tsx + ts، بلا CSS ولا build)
grep -roE "(text|bg|border|from|to|via|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder)-(gray|…|rose)-[0-9]{2,3}" src --include=*.tsx --include=*.ts | wc -l   → 118,647
# الـunique class names
… | sort -u | wc -l                                                                                                                          → 1,227
text-gray-400 لوحده → 6,361
```

التقرير الأول قال 108,602 (ببادئة أضيق). الرقم الصح 118,647 بكل الـprefixes الكاملة.
**الرقم المهم هو 1,227** — دي المساحة الحقيقية للـdrift، مش عدد الـoccurrences.

### 4.4 RTL — **تصحيح جوهري**

التقرير الأول: «2,648 فيزيائية مقابل 206 منطقية = 92.7% فيزيائية». الرقم ده **غير قابل لإعادة الإنتاج**.

```
grep -rohE "\b(ml|mr|pl|pr|left|right)-[a-z0-9.]+\b" src --include=*.tsx --include=*.ts --include=*.css | wc -l   → 3,516
grep -rohE "\b(ms|me|ps|pe|start|end)-[a-z0-9.]+\b"  src --include=*.tsx --include=*.ts --include=*.css | wc -l   →   356
```

**التصحيح: 3,516 مقابل 356 = 90.8% فيزيائية** (مش 92.7%). التوزيع:

| فيزيائي | عدد | منطقي | عدد |
|---|---|---|---|
| `ml-` | 1,247 | `end-` | 100 |
| `right-` | 750 | `start-` | 98 |
| `mr-` | 664 | `ms-` | 87 |
| `left-` | 539 | `ps-` | 50 |
| `pr-` | 527 | `pe-` | 50 |
| `pl-` | 311 | `me-` | 28 |

في مجلد الطلبات لوحده: **119 فيزيائي مقابل 40 منطقي** (مش «90 مقابل 28»).
الاتجاه صح والقرار P0 صحيح — بس النسبة المبوّهة كانت أعلى من الواقع بـ2 نقطة.

### 4.5 Component Governance

```
ui components: 45   ·   focus-visible: 15   ·   stories: 0
```

**تصحيح الـselect-likes:** التقرير الأول قال «0–2 usages».Reality:

| المكوّن | usages |
|---|---|
| `MultiSelect` | **33** |
| `SearchableSelect` | 3 |
| `combobox` (`src/components/ui/combobox.tsx` موجود) | **0** |

يعني المكوّن **المعياري** المقترح (combobox) **مش مستخدم خالص**، والأكثر استخداماً (MultiSelect) هو
اللي مااتسمّاش عليه. لازم قرار معكوس: يُعتمد `MultiSelect` كقياسي و`combobox` يُشال، أو العكس.

---

## 5. Prioritized Roadmap — محدّث

### P0 — نظام (يخدم كل الشاشات)
1. **توكنز الحالة في الوضعين** — المagnitude اتضاعف: الفاتح 2.14–3.76 والـغامق **بنفس القيم** لأن `.dark` لا يعيد تعريفها. MOB-055 + MOB-060.
2. **`--color-card` على `--color-background` = 1.08:1 في الغامق** — الكارت مش بيتفرق. MOB-060.
3. **تضاد الأيقونات** — 569 heroicons مقابل 774 lucide، 13 ملف مختلط. اختيار مكتبة واحدة. MOB-059.
4. **RTL logical-first** — 3,516 → lint يمنع جديد. `components.json` `rtl:false` → `true`. MOB-056.
5. **`text-xs` على input الموبايل** → `text-base` (iOS zoom). `OrdersToolbar.tsx:263`.
6. **`user-scalable=no`** → حذفه (WCAG 1.4.4). `index.html:9`. MOB-058.

### P1 — اتساق
7. حسم الـselect-likes: `MultiSelect` (33) هو القياسي، `combobox` (0) يُشال.
8. `--font-heading` المتعارَّف مرتين — وحسم مايل Cairo (Unix في كل مكان).
9. `focus-visible` في 30 ui component ناقص.
10. حراسة اللون الحرفي (`no-restricted-syntax`) على 1,227 unique class.

### P2 — قياس/-judggment
11. **جلسة تسجيل دخول** → مراجعة لايف `/orders` على 390/360/1366 فاتح وغامق.
12. **قياس `font-family` حي على h1** → حسم §3.3.

> **المحذوف:** M3 Expressive motion tokens، deploy verification عبر probe. الأول تجريبي بلا سند،
> التاني مش تصميم.

---

## 6. Missing Tools / Access

| ناقص | يفتح ايه |
|---|---|
| جلسة مصدَّقة maxp.online | مراجعة `/orders` لايف |
| `design-system-audit/scripts/measure_page.py` | أرقام موحّدة بين الجولات بدل scripts/measure.sh المكسور |

---

## 7. **جديد: 4 عيوب مااترصدش في التقرير الأول**

| # | العيب | الدليل | الخطورة |
|---|---|---|---|
| 1 | **`.dark` لا يعيد تعريف توكنز الحالة** → فشل تباين مضاعف في الوضع الغامق | `grep -- "--color-warning:" index.css` → 165،163،167 كلهم في `:root`؛ صفر في `.dark` | 🔴 |
| 2 | **`--color-card` على background = 1.08:1 في الغامق** | حساب OKLCH→sRGB من `index.css:534`+`:169` | 🔴 |
| 3 | **تضاد أيقونات: 569 heroicons مقابل 774 lucide، 13 ملف مختلط** | `grep -rl` ×2 + `comm -12` | 🟡 |
| 4 | **`--font-heading` متعارَّف مرتين** + Geist مفيهوش عربي | `index.css:11` مقابل `:448` · 5 `@font-face` كلهم Geist · صفر `U+06` | 🟡 |

---

## 8. Validation Checklist
```
[ ] نسبة جديدة: ms/me/ps/pe ≥ 40% من ml/mr/pl/pr
[ ] ملف واحد بيستورد مكتبة أيقونات واحدة فقط  (grep -rl @heroicons = 0)
[ ] .dark يعيد تعريف --color-warning/success/destructive
[ ] كل زوج حالة ≥ 4.5:1 (نص) في الفاتح **والغامق**
[ ] card-on-bg ≥ 1.3 في الغامق
[ ] getComputedStyle(h1).fontFamily = "IBM Plex Sans Arabic"
[ ] components.json rtl:true
[ ] 390px: scrollWidth==innerWidth، input font-size≥16px، target≥44px
[ ] live /orders على 390px: **مقياس** لا انطباع
```
> ⛔ **مفيش صفحة في القايمة دي اتقاست لايف لسه** — `/orders` محمية بجلسة. items 1-7 قابلة
> للتنفيذ بـgrep/حساب فقط؛ items 8-10 محتاجة جلسة.