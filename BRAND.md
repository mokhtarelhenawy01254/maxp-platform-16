# MaxP — الهوية البصرية المستخرجة من الموقع الحي
**استخراج 11 نوفمبر 2026 من `maxp.online` والكود الفعلي — مش اختيار ذوقي.**
> المصدر: `operix-luxury/` (اللاندنج الافتراضية) + `index.css` (اللوحة) + `platformLandingRegistry.ts`.
> أي لون في المستند ده له سطر في الكود. مفيش تدرّج مُختَرع.

---

## 0. الخلاصة: كام هوية في الموقع؟

**الزائر اللي بيدخل maxp.online النهاردة بيمر على 3 هويات مختلفة في نفس الرحلة:**

| # | السطح | الهوية | أين |
|---|---|---|---|
| 1 | اللاندنج العامة | **Operix Caliber** (نهاري فاخر: بترول + نعناع) | `operix-luxury/` — `DEFAULT_PLATFORM_LANDING_VARIANT_ID` |
| 2 | تسجيل الدخول + اللوحة | **Business OS Enterprise** (كحلي داكن + أزرق `#2F6BFF` + تيل) | `business-os-enterprise` theme |
| 3 | متجر التاجر | **ثيم التاجر** (عشرات الثيمات: فاشون، مطاعم، صيدلية…) | `storefront/themes/` |

**وفي الكود 9 لاندنجات بديلة + أصول قديمة متضاربة** (عدّ كامل تحت في §8).

**الهوية الرسمية المفروض نتوحد عليها = Operix Caliber.**
هي اللي الزائر بيشوفها أول ما يفتح الموقع، وهي الأكمل تصميميًا (grid منظوري، cockpit، underlines، أنظمة حركة).

---

## 1. Operix Caliber — الهوية المعتمدة

**الاسم على الهواء:** MaxP Business OS 3.0
**عنوان اللاندنج:** النسخة النهارية الفاخرة (Operix Caliber)
**الوعد:** نظامك الشامل للتحكم في عمليات تجارتك ومبيعاتك
**شخصية:** فخامة نهارية مصرية — ورق فاتح، حبر بترول، نعناع نضر. مش لاندنج تقنية سودا.

### 1.1 الشعار (من `OlNav.tsx` — مش صورة، مكوّن)

```
مربع 40×40  rounded-xl  خلفية #013735
حرف M    font-bold text-xl   لون #3fffba
بجانبه:  MaxP  (bold, #013735)
      +  حبة OS  (خلفية #3fffba، نص #002624، rounded-full)
تحتيه:  نظام تشغيل التجارة والمتاجر  (#4e6362, 11px)
```

**ممنوع** استخدام `public/logo.png` (بنفسجي قديم).
**ممنوع** استخدام تدرّج الفافيكون القديم (Teal→Sky→Indigo) كشعار أساسي — ده أصل قديم في `favicon.svg` و `og-cover.svg` لسه مش متحدّث لـ Operix.

### 1.2 الألوان (من `operixLuxury.css` `:root`)

| التوكن | HEX | الدور في الكود |
|---|---|---|
| `--op-green` | `#013735` | الحبر الأساسي: عناوين، أزرار primary، خلفية اللوجو، selection |
| `--op-green-dark` | `#002624` | الفوتر، نص حبة OS، أغمق درجة |
| `--op-green-light` | `#025956` | hover الأزرار الداكنة |
| `--op-mint` | `#3fffba` | الأكسنت: حبة OS، underline، checkmarks، حدود الكروت الطايرة، comet |
| `--op-mint-dark` | `#22c790` | checkmarks، نقطة الـ ping |
| `--op-mint-alpha` | `rgba(63,255,186,0.16)` | توهج خفيف |
| `--op-yellow` | `#ffdb43` | أكسنت ثانوي (موجود في التوكنز — استخدام محدود) |
| `--op-bg` | `#f0f5f3` | خلفية الصفحة والناف |
| `--op-neutral-100` | `#FFFFFF` | كروت، شاشات الـ cockpit |
| `--op-neutral-700` | `#5F5F5F` | نص التابات غير النشطة |
| نص ثانوي | `#4E6362` | leads، أوصاف، الفوتر الصغير |
| hover روابط | `#02817D` | روابط الناف |
| حدود | `rgba(1,55,53,0.08)` | strokes |
| selection | خلفية `#013735` نص `#3fffba` | إلزامي |

**زوج الـ CTA الأساسي:** زر داكن `#013735` نص أبيض (`ol-btn-hero`) + زر شبح أبيض شفاف (`ol-btn-ghost-hero`).
**حبة الواتساب:** خلفية `#013735`، حدود `#3fffba/30`، نقطة `#3fffba` بتتعمل ping.

### 1.3 الخطوط

```
font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
```
- يُحمَّل من Google Fonts في أول سطر في `operixLuxury.css`.
- **خط الإسكندرية** المذكور في وصف الريجستري **غير محمّل** — الوصف تسويقي، الكود IBM Plex.
- العناوين: 700، `tracking-tight`، `leading-[1.22]`.
- **ممنوع** letter-spacing على العربي.
- الخط الإنجليزي القديم في `platformLanding.css` هو `Space Grotesk` — **مش** خط Operix.

### 1.4 الشكل والحركة (من نفس الملف)

| العنصر | القيمة |
|---|---|
| نصف قطر الأزرار | `14px` (`ol-btn-hero`) |
| نصف قطر الكروت الطايرة | `16–18px` |
| الشاشة الرئيسية cockpit | `22px` + `rotateX(6deg)` + حدود نعناع `rgba(63,255,186,0.28)` |
| الظل | `0 40px 100px -20px rgba(1,55,53,0.25)` + توهج نعناع |
| حركة الأزرار | `0.2s cubic-bezier(0.2, 0.8, 0.2, 1)` + `translateY(-2px)` |
| الكلمة المتقلبة في العنوان | `rotateX(-90deg → 0)` 600ms + underline بتتقص 420ms |
| الكومِت حول العناصر النشطة | `conic-gradient` بيلف 5.5s |
| الخلفية | streaks + perspective grid + horizon glow (`/operix-assets/`) |

### 1.5 الأصول الرسمية

كلها في `apps/frontend/public/operix-assets/`:
`hero-bg.webp` · `perspective-grid.svg` · `horizon-fill.webp` · `horizon-mask.webp` · `headline-underline.svg` · `hero-arrow.svg` · لقطات الشاشات في `maxp-screens/`

---

## 2. هوية اللوحة (Admin) — مختلفة اليوم

عند تسجيل الدخول بيتفعّل `data-theme="business-os-enterprise"`:

- خلفية كحلي متدرج `--app-bg-gradient` (من `#071120` تقريبًا)
- primary أزرق `#2F6BFF` / `oklch(0.581 0.229 263.9)`
- secondary تيل `#23C7C9`
- شعار اللوجين: حبة متدرجة أزرق→تيل + اسم MaxP أبيض
- **مش Operix.** اللوجو هنا مش مربع M النعناعي.

**القرار المطلوب منك:** نوحّد اللوحة على Operix (بترول/نعناع) ولا نسيب اللوحة أزرق كـ«سطح منتج» منفصل؟
لحد ما تقرر: **أي شاشة عميل/تاجر جديدة تتبع Operix.** اللوحة تفضل على توكنزها الحالية.

---

## 3. المتجر (Storefront)

عالم التاجر. MaxP لا يفرض Operix ولا الأزرق على المتجر.
العقد: `shared/theme-system/storefrontThemeContract.json`.
الخطوط والألوان من ثيم التاجر (`store-font-family`, `--font-heading` الخاص بالثيم).

---

## 4. قواعد الاستخدام (مستخرجة من الكود)

**افعل**
- لوجو = مربع `#013735` + M نعناع + كلمة MaxP + حبة OS
- خلفية `#f0f5f3`، حبر `#013735`، أكسنت `#3fffba`
- IBM Plex Sans Arabic
- أصول `operix-assets/` للخلفيات
- زر primary داكن بنص أبيض، زر ثانوي شبح
- أرقام حقيقية (45% مرتجع، 0% عمولة، بوسطة)

**لا تفعل**
- تدرّج بنفسجي/سكاي/إنديجو (فافيكون قديم)
- لوجو `logo.png` البنفسجي
- خلفية سودا OLED للاندنج
- خط Cairo في اللاندنج (مش محمّل)
- إيموجي زينة في الواجهة
- Space Grotesk كخط عربي

---

## 5. عدّ الهويات الكامل (جرد)

### لاندنجات مسجّلة في `platformLandingRegistry.ts` (10)

| id | الاسم | accent | surface | الحالة |
|---|---|---|---|---|
| `operix-luxury` | النسخة النهارية الفاخرة | `#3fffba` | `#f0f5f3` | **افتراضية — الهوية الرسمية** |
| `enterprise-os` | Enterprise OS | `#2F6BFF` | `#071120` | بديل (LandingPage القديمة) |
| `sales-flow` | Sales Flow | `#f97316` | `#fff7ed` | بديل تحويلي |
| `executive-atlas` | Executive Atlas | `#14b8a6` | `#0f172a` | بديل مجلس إدارة |
| `business-os` | نظام تشغيل الأعمال | `#2f6bff` | `#091423` | بديل قيادة |
| `merchant-daylight` | التاجر نهارية | `#2f6bff` | `#ffffff` | بديل |
| `merchant-dossier` | الملف — حس فني | `#f6e016` | `#f7f7f7` | بديل |
| `merchant-performs` | الشاشة الشغّالة | `#0d7480` | `#f7f9fa` | بديل |
| `merchant-annual` | تقرير مطبوع | `#1f2de6` | `#eef0f3` | بديل |
| `merchant-poster` | بوستر الشارع | `#de194b` | `#ff8126` | بديل صاخب |

كمان فيه `platformLanding.css` بلوحة **أحمر `#b81a1a` + ذهبي `#d4901a`** على أسود — نظام قديم موازي (`--lp-accent`).

### أصول شعار متضاربة

| الملف | الشكل | الحكم |
|---|---|---|
| مكوّن `OlNav` (M مربع بترول) | **الرسمي** | استخدمه |
| `public/logo.png` | max-p بنفسجي على أسود | **Legacy — لا يُستخدم** |
| `public/favicon.svg` | M بتدرّج Teal→Sky→Indigo | **قديم — يُحدَّث لـ Operix** |
| `public/og-cover.svg` | MAXP بتدرّج نفس القديم | **قديم — يُحدَّث** |
| `public/brands/maxp_network.svg` | مربع `#4F46E5` nodes | تمييز شحن فقط |
| `CompanyLogo` | لوجو التاجر | white-label — مش هوية المنصة |

---

## 6. خريطة الملفات الحقيقية

| الملف | الدور |
|---|---|
| `BRAND.md` | هذه الوثيقة — المستخرَج |
| `shared/theme-system/maxp.tokens.json` | توكنز Operix للآلة |
| `apps/frontend/src/pages/landing/operix-luxury/operixLuxury.css` | **مصدر الألوان الحي** |
| `apps/frontend/src/pages/landing/operix-luxury/components/OlNav.tsx` | **مصدر اللوجو الحي** |
| `docs/designs/MaxP-Brand-Identity.pdf` | البراند بوك من الهوية الحقيقية |
| `docs/designs/brand-identity.html` | مصدر الـ PDF |

---

## 7. القرار اللي محتاج منك

1. **توحيد اللوحة على Operix؟** (دلوقتي اللاندنج نعناع واللوحة أزرق — الاختيار الأول للزائر بعد التسجيل بيتبدل تمامًا)
2. **تحديث الفافيكون والـ OG** لشعار M البترول/النعناع بدل التدرّج القديم؟
3. **إيقاف الـ 9 لاندنجات البديلة** عن الإنتاج وإبقاء Operix بس؟

لحد ما تقرر: **أي تصميم جديد للعميل = Operix.** متكتبش أزرق `#2F6BFF` ولا تدرّج سكاي/إنديجو في شاشة جديدة.
