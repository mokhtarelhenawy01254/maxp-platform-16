# تقييم القدرات + تدقيق نظام التصميم — MaxP
**التاريخ:** 2026-10-03 · **المُنفِّذ:** نور (بروفايل design) · **نوع العمل:** قراءة فقط (zero production writes)

---

## 1. Capability Audit — ما أنفّذه فعليًا

### 1.0 خلاصة في سطر
✅ **قرأت الريبو، فتحت المتجر لايف على 390px، حسبت التباين من توكنز المشروع نفسها، وبحثت في 10 مصادر رسمية بتاريخ 2026-10-03، وكتبت 4 ملفات تسليم.**
❌ **ما أقدرش** أفحص شاشة الطلبات لايف (مفيش جلسة) · ما أقدرش أدّعي CWV حقيقية · ما أقدرش أوصّل ملفات `.agents/design/` لحد (مُتجاهَل في Git).

### 1.1 الوصول للمستودع
✅ **لدي وصول كامل للريبو `H:\maxp-platform`** (main، مربوط بـ `origin/main`).
كل الأرقام في هذا التقرير **`file:line` أو مقياس حي** — لا وصف.

### 1.2 الأدوات — مثبتة بالتشغيل في هذه الجلسة

| القدرة | الأداة | إثبات التشغيل |
|---|---|---|
| قراءة/كتابة ملفات | `read_file` / `write_file` / `patch` | قريأت `index.css` (6959 سطر)، `Orders.tsx` (3350)، `findings-log.md` (597) |
| البحث في الكود | `search_files` | Radix: **0 نتيجة** · Base UI: **32 ملف** · stories: **0** |
| أوامر النظام | `terminal` (bash/Git Bash) | 20+ أمر: `git`, `grep`, `ls`, `wc`, `netstat` |
| **متصفح لايف مخصص** | Chrome على CDP 9335 | فتحت `maxp.online` + `swan.maxp.online` على 390×844، قِست `scrollWidth`، التقطت لقطة |
| قياس DOM حي | `Emulation.setDeviceMetricsOverride` + `js()` | `innerW:390, scrollW:390, overflowPx:0` (لاندنج) و `scrollW:390` (swan) |
| بحث ويب | `web_extract` + `web_search` | 10 مصادر رسمية Polaris/Atlassian/Primer/Fluent/M3/shadcn/Base-UI/Radix/W3C |
| حساب تباين WCAG | Python (OKLCH→sRGB→contrast) | 15 زوج ألوان محسوب من توكنز المشروع نفسها |
| **بحث دوري مجدول** | `cronjob_manage` | ✅ job `44fc8658204d` — كل إثنين 9:00 (موقوف دلوقتي، ينتظر موافقتك) |
| لقطات | `capture_screenshot` → `.agents/design/shots/` | `landing-390x844-anonymous-20261003.png` |

### 1.3 أين أحفظ الملفات الدائمة
| النوع | المسار | متتبَّع في Git؟ |
|---|---|---|
| سجل العيوب الرسمي | `.agents/skills/maxp-mobile-design-review/references/findings-log.md` | ✅ **نعم** |
| سكوركارد | `.agents/design/scorecard.md` | ⚠️ `.gitignore:193` `.agents/*` — **يحتاج force-add** |
| سبكات | `.agents/design/specs/` | ⚠️ نفس المشكلة |
| قرارات | `.agents/design/DESIGN_DECISIONS.md` | ⚠️ نفس المشكلة |
| هذا التقرير | `.agents/design/reports/2026-10-03-...md` | ⚠️ نفس المشكلة |

**إثبات:** `git check-ignore -v .agents/design/shots/...png` → `.gitignore:193:.agents/*`
و `git ls-files .agents/skills/maxp-mobile-design-review/references/` → ملفّات متتبَّعة فعلاً.
**يعني:** `findings-log.md` المحفوظ ✅ · أي ملف جديد في `.agents/design/` **مش هيتوصل لحد** غيري.

### 1.4 القيود الحقيقية (بدون تجميل)
1. **مفيش جلسة مسجّلة** في متصفح التصميم: `hasAccessToken:false, hasToken:false, user:null` → كل `/orders` محمية. **بطلب منك تسجيل دخول من الـ vault** (مش أنا بيكتب باسورد).
2. **`user-scalable=no`** في `index.html:9` → منع التكبير = مخالفة WCAG 1.4.4 (Resize Text).
3. **`.agents/design/` كان فاضي** (`scorecard.md` و `DESIGN_DECISIONS.md` مش موجودين) → بدأ ده أول تقييم، مش جولة مراجعة.
4. **فرق طفيف بين `DESIGN.md` والكود**: المستند يقول «Geist Variable (العربي يسقط لخط النظام)» — الكود فعلياً فيه IBM Plex Sans Arabic مُحمَّل من Google Fonts.
5. **`cronjob`.schedule شغال فعلاً** لكن `deliver='local'` = الناتج يُحفظ ولا يصل لبروفايل تاني.

---

## 2. Research Report — مصادر رسمية، 2026-10-03

### الفئة ① مبادئ مستقرة ومدعومة
| القاعدة | المصدر | التاريخ | تطبيق MaxP |
|---|---|---|---|
| WCAG 2.2 = آخر معيار مستقر؛ **لا يلغي** 2.1؛ 9 success criteria جديدة | [w3.org/WAI/…/wcag](https://www.w3.org/WAI/standards-guidelines/wcag/) | نُشر 2023-10-05، تحديث 2024-12-12 | الأساس الحالي صحيح — نعمليه |
| تصميم التوكنز كـ **مصدر حقيقة واحد**؛ ترحيل old values → tokens | [atlassian.design/foundations/tokens](https://atlassian.design/foundations/tokens) + `/tokens/migrate-to-tokens` | حي 2026-10-03 | **ينطبق على MOB-055** (انقسام التوكنز) |
| Base UI يتبع **ARIA APG + WCAG 2.2** level AA all success criteria | [base-ui.com](https://base-ui.com/) (تحققت من نص الصفحة) | حي 2026-10-03 | الأساس صح — نضيف gate |
| Polaris مبني على web components، والـ APIs بتختلف حسب السطح (App Home / POS / Checkout) | [polaris.shopify.com](https://polaris.shopify.com/) | حي 2026-10-03 | مرجع كثافة معلومات الأسطح التشغيلية |
| Primer: accessibility = foundation مش طبقة إضافية | [primer.style](https://primer.style/) | حي 2026-10-03 | نضيف gate a11y |
| M3 Expressive: motion/shape tokens، شفافية، adaptive | [m3.material.io](https://m3.material.io/) | I/O 2026-05-19 | **تجريبي** — مش للمتجر المصري |

### الفئة ② ممارسات تقنية حديثة متحقَّق منها
| الممارسة | المصدر | الأثر على MaxP |
|---|---|---|
| shadcn عندها blocks رسمية لـ **Radix و Base UI** معاً | [ui.shadcn.com/docs/changelog](https://ui.shadcn.com/docs/changelog/2026-02-blocks) — 2026-02 | نأخذ blocks جديدة على Base UI (المستخدم فعلاً) بدل Radix |
| **RTL support** رسمي + `inline start/end` utilities | [changelog 2026-01-rtl](https://ui.shadcn.com/docs/changelog/2026-01-inline-side-styles) — 2026-01 | **يحلّ جزئياً MOB-055** (logical props) |
| shadcn كل component يimport `cn` من package `cn` | changelog 2026-09 (أول بند) | اختياري — ترحيل `clsx+tailwind-merge` اختياري |
| Radix UI: مكتبات موحّدة، لكن Base UI offers composability وa11y handling أعمق (مبني من مطوّري Radix نفسه) | [radix-ui.com](https://www.radix-ui.com/) | نكمل Base UI — **نرفض** الرجوع لـ Radix |

### الفئة ③ اتجاهات تجريبية (مش قاعدة)
Soft spatial / glassmorphism / AI-personalized / "glass glow" Fluent / Bento حسب رتبة معمارية — **مرفوضة** context التاجر المصري الصامت.

### الفئة ④ أفكار بلا دليل كافٍ
"Hero-metric gradient"، "Progressive disclosure كل التفاصيل"، tone shadcn الأول. كلهم يخالفون `PRODUCT.md` anti-refs و`AGENTS.md` slop-flags 4/5/9.

---

## 3. Current Design Assessment — مفحوص vs متعذّر

### 3.1 مفحوص ✅
| المجال | النتيجة |
|---|---|
| **Stack** | React 18.2 · Tailwind v4.2 (`@theme inline`) · shadcn (base-nova) · **Base UI `^1.3.0` — مش Radix** (0 hits لـ `@radix-ui`) · lucide-react `^0.312.0` |
| **مصدر الحقيقة** | `apps/frontend/src/styles/index.css` — `:root` (lines 149-347) فاتح، `.dark` (532) غامق. semantic = **23 semantic utilities (16,260 hit)**. literal palette = **108,602 hit** (`text-gray-400` ×6361 لوحده) |
| **الخطوط** | `IBM Plex Sans Arabic` فعلي مُحمَّل (`index.html:56`) · `Cairo` **مُستخدَم** في `@theme` (447) + `index.html:81` مُحمَّل لكن **مفيش `@font-face` لـ Cairo** في repo — هبوط لخط النظام |
| **RTL** | `dir="rtl"` من `index.html:2` · `components.json: rtl:false` ← **تناقض** · logical props: **206** مقابل physical **2,648** (92.7% physical) |
| **الألوان** | OKLCH أصلاً · 64 storefront theme · 2 `data-theme` (`business-os-enterprise` ×606، `fakhama-elite` ×5) · 5 dark-styles (`midnight/aurora/amethyst/royal/oled`) + 163 `.dark` selector |
| **الوصولية** | 45 ملف ui · **0 stories** · `focus-visible` في **15/45** ui · `tabular-nums` **861** hit (قاعدة AGENTS مطبَّقة) · `prefers-reduced-motion` في 7 ملفات |
| **الجداول** | `OrdersTable.tsx` = **9 أعمدة** (رقم/عميل/مبلغ/حالة/دفع/تاريخ/إجراءات +2) — مفيش layout موبايل، مفيش scroll-x wrapper |
| **الطلبات** | `Orders.tsx` **3350 سطر** monoli؛ `PreparationQueue` 2493، `OrderDetails` 1910، `OrderConfirmationQueue` 1527 — **4 files >1500 سطر** |

### 3.2 متعذّر الفحص (بصراحة)
- **شاشة الطلبات لايف** — محمية بجلسة. **محتاج تسجيل دخول من الـ vault** منك.
- **Core Web Vitals الحقيقية** — مفيش RUM/field data؛ أي رقم LCP/INP/CLS هيدّعي كـ «هدف» مش «قياس».
- **Production bundle مقابل repo** — بدون جلسة، الـ HTML bootstrap shell لا يحوي feature strings، و`git branch -r --contains` وحده ما بيثبتش deploy سلوكي. حكم «منشور» يبقى **«مثبت من الكود»** فقط.

---

## 4. Design System Proposal — مبني على الموجود، مش بديل

> **مبدأ:** مفيش لون/قيمة جديدة تُقترح كـ final قبل مراجعة الهوية. كل توكنز perpetuate من `index.css` القائمة.

### 4.1 Semantic Color Tokens (اعتماد لا اختراع)
**الأسماء تُحفظ، القِيم تُصلح:**

**P0 — إصلاح تباين ⚠️ (محسوب من OKLCH tokens نفسها):**

| الزوج | التباين الآن | AA 4.5 | AA-large/UI 3.0 | الحكم |
|---|---|---|---|---|
| `--color-warning` (0.769 0.165 70.1) + نص أبيض | **2.14:1** | ❌ | ❌ | 🔴 **white-on-warning متعطّلة** → `--color-warning-foreground` داكن (`oklch(0.22 0.06 60)`) |
| `--color-success` (0.692 0.153 159.9) + أبيض | **2.57:1** | ❌ | ❌ | 🔴 نفس العيب |
| `--color-destructive` (0.632 0.208 25.3) + أبيض | **3.76:1** | ❌ | ⚠️ borderline | 🟡 `--color-destructive-foreground` داكن أو `--destructive` أغمق (`oklch(0.55 0.21 25)`) |
| `--color-muted-foreground` على `background` | **4.20:1** | ❌ | ⚠️ | 🟡 درجة واحدة لـ `0.545` |
| `--color-primary` + نص أبيض | **4.49:1** | ⚠️ 0.01 | ⚠️ | 🟡 درجة واحدة لـ `0.60` أو foreground داكن |
| `border` vs `background` | **1.38:1** | ❌ | ❌ | ⚪ borders decorative — لكن **input borders** لازم ≥3:1 |

**النتيجة:** التوكنز الحالية **لا تتفق مع AA في ألوان الحالة**. متوسط ألوان الحالة (success/warning) غير كافٍ لصف نص فوقه. أما الوضع الغامق فممتاز (fg 17.09، muted-fg 8.02، card 15.77).

### 4.2 Status Palette — مصدر واحد للحقيقة
`statusRegistry.ts` موجود فعلاً ويُستشهد به في 34 موضع — لكن كل موضع بيحط `className` بألوان حرفية (`bg-blue-50/80 ring-blue-500/30` في `OrdersMobileList.tsx:158`).

**المشكلة:** 3 مصادر حقيقة متعارضة: التوكنز (`--color-success`) · `statusRegistry` · الـ classNames المكتوبة يدوي في كل كارت.

**الحل:** نضيف `--color-status-{pending,confirmed,preparing,shipped,delivered,cancelled,returned}` في `:root` و`.dark`، ويبقى `statusRegistry` المصدر الوحيد اللي بيقرأهم ويصدر `statusClass(status)`. النتيجة: تغيّر حالة واحدة في التوكنز = كل اللوحة تتحدّث.

### 4.3 Typography
- **فصل الخطوط**: `IBM Plex Sans Arabic` للنص العربي · `Cairo` للعناوين. لكن Cairo معرَّف في `--font-heading` بلا `@font-face` في الريبو → يسقط لخط النظام. **قرار مطلوب**: يُحمَّل self-hosted أو يُشال.
- **`.tabular-nums`**: `index.css:78-83` يفعّله على `.tabular-nums` و`.font-mono-numeric` فقط. `OrdersMobileList` بيطبّقه صح على المبلغ والتاريخ (سطر 287 و324).
- `letter-spacing: normal !important` على RTL (`index.css:72-75`) — قاعدة تحمي الحروف العربية من التشوّه، **تُحافظ**.

### 4.4 Spacing / Layout / Single-Depth
- **MOB-015 حي**: input فsearch الطلبات: `OrdersToolbar.tsx:263` → `text-xs sm:text-sm` = **12px على الموبايل** → **iOS auto-zoom**. مُتعارض مع `standards-2026.md §4` (=16px min).
- Keep: `p-3 sm:p-6`, `px-2.5 sm:p-6`, single-depth on `<768px`, ≥85% util.
- Workspace surfaces: `<Layout fullWidth>` + `shouldRemovePadding` (`Layout.tsx:843,930,943`) — **مطبَّقة فعلاً** ✅ (الدليل من findings-log MOB-042).

### 4.5 Component Governance
45 ملف `ui/` · **0 stories** · `focus-visible` في 15/45 → لازم:
1. **Storybook stories** لـ 45 مكوّن → بوابة visual-diff وواجهة مراجعة بصرية. الـ addon (`@storybook/addon-a11y`) مثبَّت بالفعل في devDependencies.
2. **focus-visible gate**: كل `ui/*` لكل-state (`focus-visible:ring-2`)، لا بديل.
3. **حظر الألوان الحرفية** → قاعدة `oxlint` بـ `no-restricted-syntax` على `bg-gray-800` وأخواتها داخل `pages/`، مع استثناء `storefront/` (ثيمات التاجر لها لغتها الخاصة).
- `combobox`/`MultiSelect`/`SearchableSelect` **0–2 usages** → **3 select-like components لشيء واحد** → merge إلى `combobox` واحد.

### 4.6 Navigation / Responsive / RTL
- **الأسطح التشغيلية**: تُطبَّق قاعدة «One Unified Chassis» من AGENTS — شريط علوي واحد، فواصل `border-r`/`border-l` فقط، وممنوع جزر المعلّقة.
- **RTL أولاً**: **مقياس** — 2,648 خاصية فيزيائية مقابل 206 منطقية = 92.7% فيزيائية. ده **P0**: لازم logical-first lint يمنع الكود الجديد، مع استثناءات موثّقة (أيقونات الاتجاه، `dir="ltr"` للأرقام).
- **بوابة الحوكمة**: `npm run lint:components` موجودة بالفعل وتعمل في `lint:fast`. تُضاف لها 3 قواعد: مكوّن select-like واحد · `statusRegistry` واحد · شكل زر واحد لكل فعل.

---

## 5. Prioritized Roadmap

### P0 — نظام (يخدم كل الشاشات)
1. **إصلاح تباين status tokens** — `#MOB-055`. current 2.14–3.76:1.
2. **RTL logical-first** — 2,648 physical → lint يمنع جديد. `components.json` `rtl:false` → `true`.
3. **`text-xs` على input الموبايل** → `text-base` (iOS zoom). سطر `OrdersToolbar.tsx:263` + 30+ موضع.
4. **`user-scalable=no`** → `user-scalable=yes` (WCAG 1.4.4).

### P1 — اتساق
5. Merge 3 select-likes → `combobox`.
6. `focus-visible` في 30 ui component ناقص.
7. Storybook: 45 stories + a11y addon (الـ addon **موجود** في devDeps ✅).
8. Literal-palette lint (`no-restricted-syntax`).

### P2 — قياس/حكم
9. **جلسة تسجيل دخول** → مراجعة لايف `/orders` على 390/360/1366 + light/dark.
10. Deploy verification via behavioral probe (endpoints).
11. `.agents/design/` — force-add للـ git (المسار ignored today).

### P3 — تجريبي
12. M3 Expressive motion tokens — eval only, لا تُقترح旗帜.

---

## 6. Missing Tools / Access
| ناقص |_blocks_ | الحل |
|---|---|---|
| جلسة مصدَّقة maxp.online | مراجعة `/orders` لايف | تسجّل دخول من الـ vault (masked prompt) |
| Playwright مع سكربتات مثبَّتة | تكرار القياسات | `playwright-cli` متاح في الريبو — ينقص سكربت موحَّد أكتبه في `.agents/design/scripts/` |
| RUM / field data | أرقام CWV حقيقية | لازم `web-vitals` يتبعت لـ endpoint؛ **بدون** session = **بدون** أي ادّعاء |
| `git add -f` أو `.gitignore` patch | توثيق التسليمات | قرار للـ dev |

## 7. Validation Checklist
```
[ ]  git ls-files .agents/design/ → شوف التسليمات في الـ remote
[ ]  contrast.py → warning/success ≥4.5:1، primary/destructive ≥4.5
[ ]  node -e "…" → components.json rtl:true
[ ]  lint: literal-palette gate fails على إضافة slop
[ ]  390px: scrollWidth==innerWidth، input font-size≥16px، target≥44px
[ ]  360px + 1366×768: 3 مقاسات على كل 부분
[ ]  light/dark: text≥4.5، border≥3
[ ]  storybook build → 45 stories، a11y violations=0
[ ]  <768px: input font-size = 16px (iOS zoom guard)
[ ]  RTL: focus order + dropdown arrows + modal buttons في RTL
[ ]  live /orders على 390px: **مقياس** لا انطباع
```
