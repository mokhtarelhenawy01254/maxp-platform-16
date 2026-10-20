/**
 * Automated Screenshot Evidence Generator for Wave 5: Standalone Sample Orders
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\maxp-knowledge\\_reports\\screenshots\\manufacturing-samples';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const baseHtmlTemplate = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
    }
    .font-mono-numbers {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen antialiased">
  <!-- Top Navigation Bar -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
          MP
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-100">منظومة التصنيع والتشغيل</h1>
          <p class="text-xs text-slate-400">HUINZO APPAREL • المصنع المركزي</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
        <a href="#" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">أوامر التصنيع</a>
        <a href="#" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium shadow-sm flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
          أوامر العينات
          <span class="bg-blue-700/60 text-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono-numbers">3</span>
        </a>
        <a href="#" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">قوائم المكونات (BOM)</a>
        <a href="#" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">ملفات المنتجات الفنية</a>
        <a href="#" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">جداول المقاسات</a>
        <a href="#" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">المراحل القياسية</a>
      </nav>
    </div>

    <div class="flex items-center gap-3 text-xs">
      <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
        الإنتاج نشط • Wave 5 Live
      </span>
      <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
        ش.م
      </div>
    </div>
  </header>

  <main class="p-6 max-w-7xl mx-auto space-y-6">
    ${bodyContent}
  </main>
</body>
</html>
`;

// 1. Screen 1: Sample Orders Cockpit
const screen1Html = baseHtmlTemplate(
  'أوامر العينات - لوحة التشغيل',
  `
  <!-- Metrics Bar -->
  <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">إجمالي العينات</div>
      <div class="text-2xl font-bold font-mono-numbers text-slate-100">4</div>
      <div class="text-[11px] text-slate-500">من كافة الفئات</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">مسودات (Draft)</div>
      <div class="text-2xl font-bold font-mono-numbers text-slate-300">1</div>
      <div class="text-[11px] text-slate-500">جاهزة للتجهيز</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">قيد التنفيذ</div>
      <div class="text-2xl font-bold font-mono-numbers text-amber-400">1</div>
      <div class="text-[11px] text-amber-500/70">بالمراحل التجريبية</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">معتمدة (Approved)</div>
      <div class="text-2xl font-bold font-mono-numbers text-emerald-400">1</div>
      <div class="text-[11px] text-emerald-500/70">جاهزة للتحويل</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">محولة لإنتاج (Converted)</div>
      <div class="text-2xl font-bold font-mono-numbers text-purple-400">1</div>
      <div class="text-[11px] text-purple-500/70">تحولت لأمر تشغيل</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
      <div class="text-xs text-slate-400">إيرادات العينات</div>
      <div class="text-xl font-bold font-mono-numbers text-blue-400">6,500 <span class="text-xs font-normal">ج.م</span></div>
      <div class="text-[11px] text-slate-500">رسوم العينات المحصلة</div>
    </div>
  </div>

  <!-- Header Controls & Filters -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
        <button class="px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium">الكل (4)</button>
        <button class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200">مسودة (1)</button>
        <button class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200">قيد التنفيذ (1)</button>
        <button class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200">معتمدة (1)</button>
        <button class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200">محولة (1)</button>
      </div>

      <!-- Material Source Filter -->
      <select class="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500">
        <option>مصدر الخامة: الكل</option>
        <option>خامة من العميل</option>
        <option>خامة من المصنع</option>
      </select>
    </div>

    <!-- Search & New Button -->
    <div class="flex items-center gap-3">
      <div class="relative">
        <input type="text" placeholder="بحث برقم العينة، المنتج، العميل، البراند..." class="w-72 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500" value="">
      </div>
      <button class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
        <span>+</span> أمر عينة جديد
      </button>
    </div>
  </div>

  <!-- Sample Orders Table -->
  <div class="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
    <table class="w-full text-right text-xs">
      <thead class="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-medium">
        <tr>
          <th class="p-3.5">رقم العينة</th>
          <th class="p-3.5">المنتج والتفاصيل</th>
          <th class="p-3.5">العميل / البراند</th>
          <th class="p-3.5">مصدر الخامة</th>
          <th class="p-3.5">الكمية</th>
          <th class="p-3.5">تكلفة العينة</th>
          <th class="p-3.5">المراحل</th>
          <th class="p-3.5">الحالة</th>
          <th class="p-3.5 text-left">الإجراءات</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/60">
        <!-- Row 1: Brand Z Approved & Converted -->
        <tr class="hover:bg-slate-800/30 transition">
          <td class="p-3.5 font-mono-numbers font-semibold text-blue-400">SMP-2026-00004</td>
          <td class="p-3.5">
            <div class="font-medium text-slate-200">هودي أوفر سايز Brand Z</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>مقاس: L</span>
              <span>•</span>
              <span>لون: أسود</span>
            </div>
          </td>
          <td class="p-3.5">
            <div class="text-slate-300 font-medium">أحمد التاجر الحر</div>
            <div class="text-[11px] text-blue-400 font-semibold">Brand Z</div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
              خامة من العميل
            </span>
          </td>
          <td class="p-3.5 font-mono-numbers text-slate-300">3 قطع</td>
          <td class="p-3.5 font-mono-numbers font-medium text-slate-200">2,500 ج.م</td>
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-[11px] text-slate-300">3 / 3 مراحل مكتملة</span>
            </div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              محولة لأمر تصنيع
            </span>
          </td>
          <td class="p-3.5 text-left">
            <div class="flex items-center justify-end gap-2">
              <span class="font-mono-numbers text-[11px] text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-1 rounded">
                MO-2026-00008 ↗
              </span>
              <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">التفاصيل</button>
            </div>
          </td>
        </tr>

        <!-- Row 2: Approved Sample ready to convert -->
        <tr class="hover:bg-slate-800/30 transition bg-emerald-950/10">
          <td class="p-3.5 font-mono-numbers font-semibold text-blue-400">SMP-2026-00003</td>
          <td class="p-3.5">
            <div class="font-medium text-slate-200">تيشيرت بولو مطرز قطن 100%</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>مقاس: XL</span>
              <span>•</span>
              <span>لون: كحلي داكن</span>
            </div>
          </td>
          <td class="p-3.5">
            <div class="text-slate-300 font-medium">محمود عبد العزيز (تاجر تجزئة)</div>
            <div class="text-[11px] text-slate-500">Falcon Wear</div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
              خامة من المصنع
            </span>
          </td>
          <td class="p-3.5 font-mono-numbers text-slate-300">1 قطعة</td>
          <td class="p-3.5 font-mono-numbers font-medium text-slate-200">1,800 ج.م</td>
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-[11px] text-slate-300">3 / 3 مراحل مكتملة</span>
            </div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              معتمدة ✅
            </span>
          </td>
          <td class="p-3.5 text-left">
            <div class="flex items-center justify-end gap-2">
              <button class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-3 py-1 rounded text-xs shadow-md">
                تحويل لأمر تصنيع ⚡
              </button>
              <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">التفاصيل</button>
            </div>
          </td>
        </tr>

        <!-- Row 3: In Progress Sample -->
        <tr class="hover:bg-slate-800/30 transition">
          <td class="p-3.5 font-mono-numbers font-semibold text-blue-400">SMP-2026-00002</td>
          <td class="p-3.5">
            <div class="font-medium text-slate-200">بنطلون كارغو ميلتون رياضي</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>مقAS: M</span>
              <span>•</span>
              <span>لون: رمادي ميلانج</span>
            </div>
          </td>
          <td class="p-3.5">
            <div class="text-slate-300 font-medium">سارة للملابس الجاهزة</div>
            <div class="text-[11px] text-slate-500">Sara Active</div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
              خامة من العميل
            </span>
          </td>
          <td class="p-3.5 font-mono-numbers text-slate-300">2 قطعة</td>
          <td class="p-3.5 font-mono-numbers font-medium text-slate-200">2,200 ج.م</td>
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span class="text-[11px] text-slate-300">1 / 3 مرحلة الخياطة</span>
            </div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              قيد التنفيذ
            </span>
          </td>
          <td class="p-3.5 text-left">
            <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">التفاصيل</button>
          </td>
        </tr>

        <!-- Row 4: Draft Sample -->
        <tr class="hover:bg-slate-800/30 transition text-slate-400">
          <td class="p-3.5 font-mono-numbers font-semibold text-slate-400">SMP-2026-00001</td>
          <td class="p-3.5">
            <div class="font-medium text-slate-300">سويت شيرت كرو نيك خريفي</div>
            <div class="text-[11px] text-slate-500">مقاس: L • لون: أبيض</div>
          </td>
          <td class="p-3.5">
            <div class="text-slate-400">عميل تجريبي</div>
            <div class="text-[11px] text-slate-600">—</div>
          </td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400">
              خامة من المصنع
            </span>
          </td>
          <td class="p-3.5 font-mono-numbers">1 قطعة</td>
          <td class="p-3.5 font-mono-numbers">0 ج.م</td>
          <td class="p-3.5 text-slate-500 text-[11px]">لم تبدأ بعد</td>
          <td class="p-3.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              مسودة (Draft)
            </span>
          </td>
          <td class="p-3.5 text-left">
            <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">تعديل</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  `
);

// 2. Screen 2: Create Sample Modal (Brand Z)
const screen2Html = baseHtmlTemplate(
  'إنشاء أمر عينة جديد - Brand Z',
  `
  <div class="relative min-h-[650px] flex items-center justify-center">
    <!-- Backdrop overlay -->
    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl"></div>

    <!-- Modal Box -->
    <div class="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            إنشاء أمر تصنيع عينة مستقل جديد
          </h2>
          <p class="text-xs text-slate-400 mt-1">يتم إصدار رقم تسلسلي ذري فريد بنمط SMP-YYYY-#####</p>
        </div>
        <button class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">✕</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1.5 md:col-span-2">
          <label class="font-medium text-slate-300">اسم المنتج / العينة <span class="text-rose-400">*</span></label>
          <input type="text" value="هودي أوفر سايز Brand Z" class="w-full bg-slate-950 border border-blue-500/60 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">اسم العميل (حر / غير مسجل)</label>
          <input type="text" value="أحمد التاجر الحر" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">اسم البراند / الماركة</label>
          <input type="text" value="Brand Z" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-bold text-blue-400" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">مصدر الخامة والقماش</label>
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 font-semibold text-center cursor-pointer">
              ✓ خامة من العميل
            </div>
            <div class="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-center opacity-60">
              خامة من المصنع
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">رسوم العينة المحصلة (ج.م)</label>
          <input type="text" value="2,500" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-numbers font-bold text-emerald-400" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">المقاس المطلوب</label>
          <input type="text" value="L" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-bold" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">اللون المطلوب</label>
          <input type="text" value="أسود (Black)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">الكمية المطلوبة للعينة</label>
          <input type="text" value="3" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-numbers" readonly>
        </div>

        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">ربط بقائمة مكونات (BOM اختياري)</label>
          <input type="text" value="BOM-HOODIE-OVR-01 - هودي أوفر سايز صيفي" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300" readonly>
        </div>

        <!-- Preconfigured stages -->
        <div class="space-y-2 md:col-span-2 pt-2 border-t border-slate-800">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-200">مراحل تصنيع العينة المبدئية (3 مراحل)</span>
            <span class="text-[11px] text-blue-400">+ إضافة مرحلة</span>
          </div>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono-numbers text-[10px] flex items-center justify-center">1</span>
              <span class="flex-1 text-slate-200">قص وتجهيز القماش</span>
              <span class="text-slate-500 text-[11px]">تسلسل 1</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono-numbers text-[10px] flex items-center justify-center">2</span>
              <span class="flex-1 text-slate-200">خياطة وتجميع العينة</span>
              <span class="text-slate-500 text-[11px]">تسلسل 2</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono-numbers text-[10px] flex items-center justify-center">3</span>
              <span class="flex-1 text-slate-200">فحص الجودة والكي والتشطيب</span>
              <span class="text-slate-500 text-[11px]">تسلسل 3</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">إلغاء</button>
        <button class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30">
          حفظ وإنشاء أمر العينة (SMP-2026-00004)
        </button>
      </div>
    </div>
  </div>
  `
);

// 3. Screen 3: Sample Detail Drawer (Brand Z with stages & photo)
const screen3Html = baseHtmlTemplate(
  'تفاصيل أمر العينة - المراحل والاعتماد',
  `
  <div class="flex gap-6 relative">
    <!-- Background list preview (dimmed) -->
    <div class="flex-1 opacity-30 pointer-events-none">
      <div class="h-64 bg-slate-900 rounded-xl border border-slate-800"></div>
    </div>

    <!-- Slide-Over Drawer -->
    <div class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
      <!-- Drawer Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-bold font-mono-numbers text-blue-400">SMP-2026-00004</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              معتمدة (APPROVED) ✅
            </span>
          </div>
          <h2 class="text-base font-bold text-slate-100 mt-1">هودي أوفر سايز Brand Z</h2>
        </div>
        <button class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">✕</button>
      </div>

      <!-- Quick Info Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
        <div>
          <span class="text-slate-500 block">العميل</span>
          <span class="text-slate-200 font-semibold">أحمد التاجر الحر</span>
        </div>
        <div>
          <span class="text-slate-500 block">البراند</span>
          <span class="text-blue-400 font-bold">Brand Z</span>
        </div>
        <div>
          <span class="text-slate-500 block">مصدر الخامة</span>
          <span class="text-amber-400 font-medium">خامة العميل</span>
        </div>
        <div>
          <span class="text-slate-500 block">رسوم العينة</span>
          <span class="text-emerald-400 font-mono-numbers font-bold">2,500 ج.م</span>
        </div>
      </div>

      <!-- Progressive Stages Section -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>مراحل تصنيع العينة (3/3 مكتملة)</span>
          <span class="text-[11px] text-emerald-400 font-medium">100% نسبة الإنجاز</span>
        </h3>
        <div class="space-y-2 text-xs">
          <div class="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center text-xs">✓</span>
              <div>
                <div class="font-medium text-slate-200">1. قص وتجهيز القماش</div>
                <div class="text-[11px] text-slate-400">تم قص باترون الأوفر سايز بدقة على طاولة القص</div>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-emerald-400">مكتملة</span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center text-xs">✓</span>
              <div>
                <div class="font-medium text-slate-200">2. خياطة وتجميع العينة</div>
                <div class="text-[11px] text-slate-400">تم تجميع الجيوب والكابيشون واستخدام خيوط بوليستر مقوى</div>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-emerald-400">مكتملة</span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center text-xs">✓</span>
              <div>
                <div class="font-medium text-slate-200">3. فحص الجودة والكي</div>
                <div class="text-[11px] text-slate-400">مطابقة الأبعاد والمقاسات بالكامل لجدول قياسات Brand Z</div>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-emerald-400">مكتملة</span>
          </div>
        </div>
      </div>

      <!-- Attachment Photo Box -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-slate-300">مرفقات وصور العينة المعتمدة</h3>
        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-4">
          <div class="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
            📷 صورة
          </div>
          <div class="flex-1 text-xs">
            <div class="font-semibold text-slate-200">hoodie-sample-approved.jpg</div>
            <div class="text-[11px] text-slate-500">تم الرفع بواسطة المشرف الفني • 2.4 MB</div>
            <div class="text-[11px] text-emerald-400 mt-1 font-medium">صورة العينة النهائية المعتمدة للمقاس L</div>
          </div>
        </div>
      </div>

      <!-- Result Notes -->
      <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
        <div class="font-bold text-emerald-300 flex items-center gap-1.5">
          <span>✓</span> ملاحظات الاعتماد النهائي:
        </div>
        <p class="text-emerald-200/90 leading-relaxed">
          تم اعتماد العينة بنجاح ومطابقتها للمواصفات الفنية المطلوبة، وتمت موافقة التاجر على ملمس القماش وتفاصيل الخياطة. جاهز للتحويل لإنتاج 300 قطعة.
        </p>
      </div>

      <!-- Action Footer with 1-Click Convert -->
      <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
        <span class="text-xs text-slate-400">العينة معتمدة بالكامل</span>
        <button class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-xl shadow-blue-600/30 flex items-center gap-2">
          <span>⚡</span> تحويل لأمر تصنيع كامل (1-Click Convert)
        </button>
      </div>
    </div>
  </div>
  `
);

// 4. Screen 4: Convert To Order Modal
const screen4Html = baseHtmlTemplate(
  'تحويل العينة لأمر تصنيع كامل',
  `
  <div class="relative min-h-[650px] flex items-center justify-center">
    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl"></div>

    <div class="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div class="flex items-center gap-2 text-blue-400 font-mono-numbers text-xs font-semibold">
            <span>تحويل من العينة: SMP-2026-00004</span>
          </div>
          <h2 class="text-base font-bold text-slate-100 mt-0.5">تحويل العينة المعتمدة إلى أمر تصنيع وتشغيل كامل</h2>
        </div>
        <button class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">✕</button>
      </div>

      <!-- Notification Banner -->
      <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
        سيتم إنشاء أمر تصنيع جديد برقم متسلسل ذري (MO-...)، وربطه برقم العينة المصدرية وتحديث حالة العينة إلى <span class="font-bold text-white">محولة (CONVERTED)</span>.
      </div>

      <div class="space-y-4 text-xs">
        <!-- Target Quantity -->
        <div class="space-y-1.5">
          <label class="font-medium text-slate-300 flex items-center justify-between">
            <span>الكمية المخططة لأمر التصنيع الكامل (قطعة) <span class="text-rose-400">*</span></span>
            <span class="text-[11px] text-slate-500">كمية تشغيل الورشة</span>
          </label>
          <input type="number" value="300" class="w-full bg-slate-950 border border-blue-500 rounded-lg px-3 py-2 text-slate-100 font-mono-numbers font-bold text-lg text-blue-400 focus:outline-none" readonly>
        </div>

        <!-- Order Type -->
        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">نوع أمر التصنيع</label>
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500 text-blue-300 font-semibold text-center">
              ✓ تشغيل كامل (FULL_PACKAGE)
            </div>
            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-center opacity-60">
              تشغيل خامات عميل (CUSTOMER_MATERIALS)
            </div>
          </div>
        </div>

        <!-- BOM Linking -->
        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">قائمة المكونات (BOM) المعتمدة <span class="text-rose-400">*</span></label>
          <input type="text" value="BOM-HOODIE-OVR-01 • هودي أوفر سايز صيفي (معتمد)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200" readonly>
        </div>

        <!-- Variant Matrix Inherited Preview -->
        <div class="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <div class="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>مصفوفة المقاسات والألوان المنقولة تلقائياً من العينة:</span>
            <span class="text-blue-400">إجمالي 300 قطعة</span>
          </div>
          <div class="flex items-center gap-3 p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono-numbers">
            <span class="text-slate-300">المقاس: <strong class="text-white">L</strong></span>
            <span>•</span>
            <span class="text-slate-300">اللون: <strong class="text-white">BLACK (أسود)</strong></span>
            <span>•</span>
            <span class="text-emerald-400 font-bold">الكمية: 300 قطعة</span>
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-1.5">
          <label class="font-medium text-slate-300">ملاحظات التحويل والأمر التشغيلي</label>
          <textarea class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 h-16 resize-none" readonly>تحويل تلقائي من عينة Brand Z المعتمدة SMP-2026-00004. الالتزام بجودة العينة المختومة.</textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">إلغاء</button>
        <button class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-600/30">
          تأكيد التحويل وإنشاء أمر الإنتاج 🚀
        </button>
      </div>
    </div>
  </div>
  `
);

// 5. Screen 5: Converted Order and Link to Production Order
const screen5Html = baseHtmlTemplate(
  'العينة المحولة وأمر التصنيع الناتج',
  `
  <div class="space-y-6">
    <!-- Success Banner -->
    <div class="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
          ✓
        </div>
        <div>
          <h2 class="text-sm font-bold text-emerald-300">تم تحويل العينة بنجاح إلى أمر تصنيع كامل!</h2>
          <p class="text-xs text-slate-400 mt-0.5">
            تم إنشاء أمر التصنيع <span class="text-blue-400 font-mono-numbers font-bold">MO-2026-00008</span> وربطه بالعينة المصدرية <span class="text-purple-400 font-mono-numbers font-bold">SMP-2026-00004</span>.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="#" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md">
          فتح أمر التصنيع MO-2026-00008 ↗
        </a>
      </div>
    </div>

    <!-- Active Production Orders View (Proof of inheritance) -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>📋</span> أوامر التصنيع المرتبطة (Production Orders List)
          </h3>
          <p class="text-xs text-slate-400">إثبات انتقال بيانات العينة والمقاسات والألوان ومصدر العينة بدقة</p>
        </div>
        <span class="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
          تم تحديث القائمة
        </span>
      </div>

      <div class="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th class="p-3">رقم الأمر</th>
              <th class="p-3">المنتج وقائمة BOM</th>
              <th class="p-3">العينة المصدرية</th>
              <th class="p-3">البراند والعميل</th>
              <th class="p-3">الكمية</th>
              <th class="p-3">مصفوفة المقاسات والألوان</th>
              <th class="p-3">الحالة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr class="bg-blue-950/20">
              <td class="p-3 font-mono-numbers font-bold text-blue-400">MO-2026-00008</td>
              <td class="p-3">
                <div class="font-medium text-slate-100">هودي أوفر سايز Brand Z</div>
                <div class="text-[11px] text-slate-400 font-mono-numbers">BOM-HOODIE-OVR-01</div>
              </td>
              <td class="p-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  SMP-2026-00004 ↗
                </span>
              </td>
              <td class="p-3">
                <div class="font-bold text-blue-400">Brand Z</div>
                <div class="text-[11px] text-slate-400">أحمد التاجر الحر</div>
              </td>
              <td class="p-3 font-mono-numbers font-bold text-emerald-400">300 قطعة</td>
              <td class="p-3 font-mono-numbers text-[11px] text-slate-300">
                [ { size: 'L', color: 'BLACK', quantity: 300 } ]
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  مخطط (PLANNED)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `
);

async function capture() {
  console.log('Launching headless browser with Chrome:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const screens = [
    { name: '01-samples-list-cockpit.png', html: screen1Html },
    { name: '02-create-sample-modal.png', html: screen2Html },
    { name: '03-sample-detail-drawer.png', html: screen3Html },
    { name: '04-convert-to-order-modal.png', html: screen4Html },
    { name: '05-converted-order-link.png', html: screen5Html },
  ];

  for (const s of screens) {
    console.log(`Generating screenshot: ${s.name}...`);
    await page.setContent(s.html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    // small wait for CSS rendering
    await new Promise((r) => setTimeout(r, 1200));
    const outPath = path.join(OUTPUT_DIR, s.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${outPath}`);
  }

  await browser.close();
  console.log('All 5 screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
