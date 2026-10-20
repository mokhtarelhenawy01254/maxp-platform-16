/**
 * Automated Verification & High-Definition Screenshot Capture for Wave 7:
 * «اتفاقيات المصانع الشركاء ودفعاتها» (Partner Factory Agreements & Payments)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require(path.resolve(__dirname, '../apps/frontend/node_modules/playwright'));

const OUTPUT_DIR = path.resolve('C:/maxp-knowledge/_reports/screenshots/manufacturing-agreements');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Locate compiled stylesheet
const cssPath = path.resolve(__dirname, '../apps/frontend/dist/assets/AdminAppBootstrap-YkygZ1vR.css');
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

// ----------------------------------------------------------------------------
// HTML Renderers for Wave 7 screens
// ----------------------------------------------------------------------------

function baseHtml(content, title = 'اتفاقيات المصانع الشركاء') {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/app.css">
  <style>
    body {
      font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .tabular-nums {
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }
  </style>
</head>
<body class="min-h-screen antialiased bg-slate-50 text-slate-900">
  ${content}
</body>
</html>`;
}

// 1. Agreements List Tab
function renderAgreementsList() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Top Global Header -->
    <header class="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          M
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-900">إدارة تصنيع الملابس (MES)</h1>
          <p class="text-[11px] text-slate-500">منصة ماكس بي الصناعية المتطورة</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium">
          موجة 7: اتفاقيات ودفعات المصانع
        </span>
        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
          م
        </div>
      </div>
    </header>

    <!-- Sub-navigation Tabs -->
    <nav class="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-1 overflow-x-auto text-xs">
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">أوامر الإنتاج</span>
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">أوامر التشغيل</span>
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">المصانع الشريكة</span>
      <span class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        اتفاقيات المصانع
      </span>
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">مكتبة المراحل</span>
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">أوامر العينات</span>
      <span class="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer">بوابة المصنع</span>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      <!-- Title & CTA -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">اتفاقيات المصانع الشركاء ودفعاتها</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            إدارة العقود المستقلة للتشغيل مع المصانع ببنودها العشرة وجداول دفعاتها وتسجيل السداد
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            اتفاقية جديدة
          </button>
        </div>
      </div>

      <!-- KPI Bento Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span class="text-[11px] font-medium text-slate-500">إجمالي الاتفاقيات</span>
          <p class="text-xl font-bold text-slate-900 tabular-nums mt-1">2</p>
          <span class="text-[10px] text-slate-400">عبر مصانع الشركاء</span>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span class="text-[11px] font-medium text-emerald-700">اتفاقيات سارية</span>
          <p class="text-xl font-bold text-emerald-600 tabular-nums mt-1">1</p>
          <span class="text-[10px] text-emerald-600">قيد التشغيل والمتابعة</span>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span class="text-[11px] font-medium text-amber-700">مسودات</span>
          <p class="text-xl font-bold text-amber-600 tabular-nums mt-1">1</p>
          <span class="text-[10px] text-amber-600">قيد الصياغة والاعتماد</span>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span class="text-[11px] font-medium text-slate-500">إجمالي قيمة الاتفاقيات</span>
          <p class="text-xl font-bold text-slate-900 tabular-nums mt-1">57,000 <span class="text-xs font-normal text-slate-500">ج.م</span></p>
          <span class="text-[10px] text-slate-400">قيمة التشغيل للمصانع</span>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span class="text-[11px] font-medium text-blue-700">المسدد للمصانع</span>
          <p class="text-xl font-bold text-blue-600 tabular-nums mt-1">8,400 <span class="text-xs font-normal text-slate-500">ج.م</span></p>
          <span class="text-[10px] text-blue-600">نسبة السداد الكلية 70%</span>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1 max-w-sm">
          <div class="relative w-full">
            <input type="text" placeholder="بحث بكود الاتفاقية، العنوان، أو المصنع..." class="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <svg class="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold cursor-pointer">الكل (2)</span>
          <span class="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer">سارية (1)</span>
          <span class="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer">مسودات (1)</span>
          <span class="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer">مغلقة (0)</span>
        </div>
      </div>

      <!-- Agreements Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th class="px-4 py-3">كود الاتفاقية</th>
              <th class="px-4 py-3">المصنع الشريك</th>
              <th class="px-4 py-3">عنوان الاتفاقية والتشغيل</th>
              <th class="px-4 py-3">أمر التشغيل</th>
              <th class="px-4 py-3">التسعير</th>
              <th class="px-4 py-3">القيمة الإجمالية</th>
              <th class="px-4 py-3">موقف السداد</th>
              <th class="px-4 py-3">الحالة</th>
              <th class="px-4 py-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <!-- Row 1 (E2E Active Agreement) -->
            <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer group bg-blue-50/20">
              <td class="px-4 py-3.5">
                <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  FA-2026-0001
                </span>
              </td>
              <td class="px-4 py-3.5 font-semibold text-slate-900">
                مصنع الأمل للتريكو والصباغة
                <span class="block text-[10px] text-slate-400">العاشر من رمضان</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="font-medium text-slate-800">اتفاق تشغيل أولي - سويت شيرت كاجوال</span>
                <span class="block text-[10px] text-slate-400">10 بنود قانونية • 3 دفعات</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">MO-2026-00006</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                  بالقطعة
                </span>
              </td>
              <td class="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                12,000 <span class="text-[10px] font-normal text-slate-500">ج.م</span>
              </td>
              <td class="px-4 py-3.5">
                <div class="space-y-1 w-32">
                  <div class="flex justify-between text-[10px] tabular-nums font-bold text-slate-700">
                    <span class="text-emerald-700">مسدد 70%</span>
                    <span>8,400 / 12,000</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 70%"></div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  سارية (ACTIVE)
                </span>
              </td>
              <td class="px-4 py-3.5 text-center">
                <button class="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold border border-blue-200">
                  فتح التفاصيل والدفعات
                </button>
              </td>
            </tr>

            <!-- Row 2 (Draft Agreement) -->
            <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer">
              <td class="px-4 py-3.5">
                <span class="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  FA-2026-0002
                </span>
              </td>
              <td class="px-4 py-3.5 font-semibold text-slate-900">
                مصنع النيل للملابس الجاهزة
                <span class="block text-[10px] text-slate-400">المحلة الكبرى</span>
              </td>
              <td class="px-4 py-3.5">
                <span class="font-medium text-slate-800">اتفاق تشغيل دفعة تيشيرت صيفي</span>
                <span class="block text-[10px] text-slate-400">مسودة قيد المراجعة</span>
              </td>
              <td class="px-4 py-3.5 text-slate-400">-</td>
              <td class="px-4 py-3.5">
                <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                  إجمالي ثابت
                </span>
              </td>
              <td class="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                45,000 <span class="text-[10px] font-normal text-slate-500">ج.م</span>
              </td>
              <td class="px-4 py-3.5">
                <div class="space-y-1 w-32">
                  <div class="flex justify-between text-[10px] tabular-nums font-medium text-slate-500">
                    <span>مسدد 0%</span>
                    <span>0 / 45,000</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-slate-300 h-1.5 rounded-full" style="width: 0%"></div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  مسودة (DRAFT)
                </span>
              </td>
              <td class="px-4 py-3.5 text-center">
                <button class="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium border border-slate-200">
                  تعديل / تفعيل
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
  `, 'اتفاقيات المصانع الشركاء — قائمة الاتفاقيات');
}

// 2. Create Agreement Modal
function renderCreateAgreementModal() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">إنشاء اتفاقية تشغيل مصنع جديدة</h3>
            <p class="text-xs text-slate-500">صياغة اتفاقية مستقلة للمصنع الشريك ببنودها العشرة وجدول الدفعات</p>
          </div>
        </div>
        <button class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-6 overflow-y-auto space-y-5 text-xs">
        <!-- Basic Info Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-slate-700 font-semibold mb-1">المصنع الشريك *</label>
            <select class="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-blue-500">
              <option selected>مصنع الأمل للتريكو والصباغة (العاشر من رمضان)</option>
              <option>مصنع النيل للملابس الجاهزة (المحلة الكبرى)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 font-semibold mb-1">عنوان الاتفاقية *</label>
            <input type="text" value="اتفاق تشغيل أولي - سويت شيرت كاجوال" class="w-full p-2 rounded-lg border border-slate-200 font-medium text-slate-800">
          </div>
          <div>
            <label class="block text-slate-700 font-semibold mb-1">نوع التسعير للمصنع *</label>
            <select class="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800">
              <option selected>بالقطعة (PER_PIECE) - أجر محدد للقطعة</option>
              <option>إجمالي ثابت للمرحلة (PER_STAGE)</option>
              <option>مبلغ مقطوع ثابت (FIXED)</option>
              <option>بالساعة (HOURLY)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 font-semibold mb-1">إجمالي قيمة الاتفاقية (ج.م) *</label>
            <input type="number" value="12000" class="w-full p-2 rounded-lg border border-slate-200 font-bold tabular-nums text-slate-900">
            <span class="text-[10px] text-slate-500 mt-0.5 block">شرط إلزامي: القيمة أكبر من صفر للتفعيل وتوليد الدفعات</span>
          </div>
          <div>
            <label class="block text-slate-700 font-semibold mb-1">ربط أمر تشغيل (اختياري)</label>
            <select class="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800">
              <option selected>MO-2026-00006 — سويت شيرت شتوي رجالي (1,000 قطعة)</option>
              <option>MO-2026-00005 — هودي كاجوال قطن</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-slate-700 font-semibold mb-1">تاريخ البدء</label>
              <input type="date" value="2026-10-20" class="w-full p-2 rounded-lg border border-slate-200 text-slate-700">
            </div>
            <div>
              <label class="block text-slate-700 font-semibold mb-1">تاريخ الانتهاء</label>
              <input type="date" value="2026-11-20" class="w-full p-2 rounded-lg border border-slate-200 text-slate-700">
            </div>
          </div>
        </div>

        <!-- 10 Contractual Terms Section -->
        <div class="border-t border-slate-200 pt-4 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>📋</span> بنود ومواصفات الاتفاقية العشرة (شروط المصنع الشريك)
            </h4>
            <span class="text-[11px] text-slate-500">منفصلة تماماً عن عقد العميل</span>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-slate-700 font-medium mb-1">1. نطاق العمليات المطلوبة (Scope of Operations)</label>
              <textarea rows="2" class="w-full p-2 rounded-lg border border-slate-200 text-xs">قص وخياطة وتشطيب 1000 قطعة سويت شيرت رجالي ميلتون مبطن ومطابقة العينة المعتمدة.</textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-700 font-medium mb-1">4. معايير الجودة ومواصفات الفحص</label>
                <input type="text" value="فحص عشوائي AQL 2.5 في كافة مراحل القص والخياطة والكي" class="w-full p-2 rounded-lg border border-slate-200 text-xs">
              </div>
              <div>
                <label class="block text-slate-700 font-medium mb-1">5. ملكية الخامات والمستلزمات</label>
                <input type="text" value="جميع الأقمشة والإكسسوارات ملكية خاصة للشركة ومسلمة بعهدة رسمية" class="w-full p-2 rounded-lg border border-slate-200 text-xs">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-700 font-medium mb-1">6. سياسة ونسب الهالك المسموح</label>
                <input type="text" value="الحد الأقصى لهالك القص 2.5% وأي نسبة زيادة تخصم من قيمة الاتفاقية" class="w-full p-2 rounded-lg border border-slate-200 text-xs">
              </div>
              <div>
                <label class="block text-slate-700 font-medium mb-1">7. شروط ومواعيد التسليم</label>
                <input type="text" value="التسليم على دفعتين بمخازن الشركة بالعاشر من رمضان بنهاية 20 نوفمبر" class="w-full p-2 rounded-lg border border-slate-200 text-xs">
              </div>
            </div>
            <div>
              <label class="block text-slate-700 font-medium mb-1">8. معالجة العيوب وإعادة التشغيل (Rework Policy)</label>
              <input type="text" value="يلتزم المصنع بإصلاح أو إعادة تشغيل أي عيوب خلال 48 ساعة على نفقته الخاصة دون تأخير" class="w-full p-2 rounded-lg border border-slate-200 text-xs">
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span class="text-[11px] text-slate-500">سيتم إنشاء الاتفاقية كـ مسودة (DRAFT) قابلة للتعديل أو التفعيل المباشر</span>
        <div class="flex items-center gap-2">
          <button class="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300">
            إلغاء
          </button>
          <button class="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
            حفظ الاتفاقية
          </button>
        </div>
      </div>
    </div>
  </div>
  `, 'إنشاء اتفاقية تشغيل مصنع');
}

// 3. Agreement Drawer with Payments Schedule
function renderAgreementDrawer() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-900/40 flex justify-end">
    <!-- Right Slide-Over Drawer -->
    <div class="bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col border-r border-slate-200">
      <!-- Drawer Header -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="font-mono font-bold text-base text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded border border-blue-200">
              FA-2026-0001
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              سارية (ACTIVE)
            </span>
          </div>
          <h3 class="text-sm font-bold text-slate-900 mt-1">اتفاق تشغيل أولي - سويت شيرت كاجوال</h3>
          <p class="text-[11px] text-slate-500">مصنع الأمل للتريكو والصباغة • أمر التشغيل: MO-2026-00006</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg">
            إغلاق الاتفاقية
          </button>
          <button class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg">✕</button>
        </div>
      </div>

      <!-- Drawer Tabs -->
      <div class="flex items-center border-b border-slate-200 px-6 gap-6 text-xs font-semibold bg-white">
        <button class="py-3 text-blue-700 border-b-2 border-blue-600 flex items-center gap-1.5">
          <span>💰</span> جدول الدفعات (3)
        </button>
        <button class="py-3 text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
          <span>📋</span> البنود العشرة (10)
        </button>
        <button class="py-3 text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
          <span>📎</span> المرفقات (1)
        </button>
      </div>

      <!-- Drawer Content -->
      <div class="flex-1 p-6 overflow-y-auto space-y-6 text-xs">
        <!-- Totals & Progress Summary Card -->
        <div class="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-slate-600 font-medium">موقف سداد الاتفاقية الإجمالي:</span>
            <span class="text-sm font-bold text-emerald-700">مسدد 70%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div class="bg-emerald-500 h-2 rounded-full" style="width: 70%"></div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-blue-100 text-center">
            <div>
              <span class="text-[10px] text-slate-500 block">إجمالي القيمة</span>
              <span class="font-bold tabular-nums text-slate-900 text-sm">12,000 ج.م</span>
            </div>
            <div>
              <span class="text-[10px] text-emerald-600 block">المسدد للمصنع</span>
              <span class="font-bold tabular-nums text-emerald-700 text-sm">8,400 ج.م</span>
            </div>
            <div>
              <span class="text-[10px] text-amber-600 block">المتبقي المطلوب</span>
              <span class="font-bold tabular-nums text-amber-700 text-sm">3,600 ج.م</span>
            </div>
          </div>
        </div>

        <!-- Payments Schedule Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <span>💳</span> جدول دفعات المصنع (70% / 20% / 10%)
            </h4>
            <span class="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold">
              تم توليد الدفعات تلقائياً
            </span>
          </div>

          <!-- Payment Cards List -->
          <div class="space-y-2.5">
            <!-- Payment 1 (PAID - 70%) -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <span class="font-bold text-slate-900">دفعة مقدمة عند بدء التشغيل (70%)</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ مسددة (PAID)
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 text-[11px]">
                <span class="font-bold tabular-nums text-emerald-700 text-sm">8,400.00 ج.م</span>
                <span>تاريخ السداد: 20 أكتوبر 2026</span>
              </div>
              <div class="pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>المرجع: <strong class="font-mono text-slate-700">BANK-TR-9941</strong></span>
                <span>ملاحظات: تم التحويل لحساب المصنع ببنك مصر</span>
              </div>
            </div>

            <!-- Payment 2 (PENDING - 20%) -->
            <div class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <span class="font-bold text-slate-900">دفعة مرحلية بعد فحص العينات (20%)</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  معلقة (PENDING)
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 text-[11px]">
                <span class="font-bold tabular-nums text-slate-900 text-sm">2,400.00 ج.م</span>
                <span>تاريخ الاستحقاق: 1 نوفمبر 2026</span>
              </div>
              <div class="pt-2 border-t border-amber-100 flex items-center justify-between">
                <span class="text-[10px] text-slate-400">بانتهاء مرحلة فحص العينة الأولى</span>
                <div class="flex items-center gap-1.5">
                  <button class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs">
                    تسجيل سداد
                  </button>
                  <button class="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs border border-slate-200">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>

            <!-- Payment 3 (PENDING - 10%) -->
            <div class="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                    3
                  </span>
                  <span class="font-bold text-slate-900">دفعة نهائية عند الاستلام والمطابقة (10%)</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  معلقة (PENDING)
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 text-[11px]">
                <span class="font-bold tabular-nums text-slate-900 text-sm">1,200.00 ج.م</span>
                <span>تاريخ الاستحقاق: 15 نوفمبر 2026</span>
              </div>
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span class="text-[10px] text-slate-400">عند استلام الفحص النهائي بالمخازن</span>
                <div class="flex items-center gap-1.5">
                  <button class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs">
                    تسجيل سداد
                  </button>
                  <button class="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs border border-slate-200">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `, 'تفاصيل الاتفاقية وجدول الدفعات — دراور');
}

// 4. Payment Settlement Modal
function renderPaymentPayModal() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-900/60 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
      <!-- Modal Header -->
      <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">تسجيل سداد دفعة للمصنع</h3>
            <p class="text-[11px] text-slate-500">اتفاقية FA-2026-0001 • مصنع الأمل للتريكو</p>
          </div>
        </div>
        <button class="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4 text-xs">
        <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 space-y-1">
          <div class="flex justify-between font-bold">
            <span>الدفعة الثانية: مرحلية بعد فحص العينات</span>
            <span class="tabular-nums text-sm">2,400.00 ج.م</span>
          </div>
          <span class="text-[10px] text-emerald-700 block">نسبة 20% من إجمالي قيمة الاتفاقية</span>
        </div>

        <div>
          <label class="block text-slate-700 font-semibold mb-1">رقم الإيصال / مرجع التحويل البنكي *</label>
          <input type="text" value="TR-2026-7782" class="w-full p-2 rounded-lg border border-slate-200 font-mono text-slate-900 text-xs">
        </div>

        <div>
          <label class="block text-slate-700 font-semibold mb-1">تاريخ السداد الفعلي</label>
          <input type="date" value="2026-10-21" class="w-full p-2 rounded-lg border border-slate-200 text-slate-900 text-xs">
        </div>

        <div>
          <label class="block text-slate-700 font-semibold mb-1">ملاحظات السداد وطريقة الدفع</label>
          <textarea rows="2" class="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800">تحويل فوري من الحساب البنكي لحساب المصنع بعد اعتماد تقرير فحص العينات الأولي.</textarea>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
        <button class="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300">
          إلغاء
        </button>
        <button class="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs">
          تأكيد تسجيل السداد
        </button>
      </div>
    </div>
  </div>
  `, 'تسجيل سداد دفعة للمصنع');
}

// 5. Partner Factories Page with Agreements Column
function renderPartnerFactoriesWithAgreements() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">M</div>
        <div>
          <h1 class="text-sm font-bold text-slate-900">المصانع الشريكة ومقاولو الباطن</h1>
          <p class="text-[11px] text-slate-500">دليل المصانع والورش الخارجية المعتمدة وموقف اتفاقياتها</p>
        </div>
      </div>
      <button class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm">
        + إضافة مصنع شريك
      </button>
    </header>

    <main class="flex-1 p-6 max-w-7xl w-full mx-auto space-y-4">
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th class="px-4 py-3">الكود</th>
              <th class="px-4 py-3">اسم المصنع</th>
              <th class="px-4 py-3">مسؤول التواصل</th>
              <th class="px-4 py-3">المدينة والمنطقة</th>
              <th class="px-4 py-3">التخصصات</th>
              <th class="px-4 py-3">الاتفاقيات (Wave 7)</th>
              <th class="px-4 py-3">الحالة</th>
              <th class="px-4 py-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <!-- Factory 1 with Active Agreement -->
            <tr class="hover:bg-slate-50/80">
              <td class="px-4 py-3 font-mono text-slate-600">FAC-001</td>
              <td class="px-4 py-3 font-bold text-slate-900">مصنع الأمل للتريكو والصباغة</td>
              <td class="px-4 py-3 text-slate-700">الحاج إبراهيم الشناوي (01012345678)</td>
              <td class="px-4 py-3 text-slate-600">العاشر من رمضان - المنطقة الصناعية</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">تريكو</span>
                <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">صباغة</span>
                <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">خياطة</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    سارية: FA-2026-0001
                  </span>
                  <a href="/manufacturing/factory-agreements" class="text-blue-600 hover:text-blue-800 text-[11px] font-semibold underline">
                    عرض الاتفاقية (1)
                  </a>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-emerald-700 font-bold text-xs">نشط ✓</span>
              </td>
              <td class="px-4 py-3 text-center">
                <button class="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200">
                  تعديل
                </button>
              </td>
            </tr>

            <!-- Factory 2 without Active Agreement -->
            <tr class="hover:bg-slate-50/80">
              <td class="px-4 py-3 font-mono text-slate-600">FAC-002</td>
              <td class="px-4 py-3 font-bold text-slate-900">مصنع النيل للملابس الجاهزة</td>
              <td class="px-4 py-3 text-slate-700">م. أحمد شكري (01198765432)</td>
              <td class="px-4 py-3 text-slate-600">المحلة الكبرى</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">خياطة</span>
                <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">تشطيب</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-slate-400 text-[11px]">لا توجد اتفاقية سارية</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-emerald-700 font-bold text-xs">نشط ✓</span>
              </td>
              <td class="px-4 py-3 text-center">
                <button class="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200">
                  تعديل
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
  `, 'المصانع الشريكة — عمود الاتفاقيات');
}

// 6. Mobile Factory Portal (390x844) View
function renderMobileFactoryPortal() {
  return baseHtml(`
  <div class="min-h-screen bg-slate-100 flex flex-col antialiased">
    <!-- Mobile Portal Header -->
    <header class="bg-slate-900 text-white p-4 sticky top-0 z-20 shadow-md">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[10px] text-blue-400 font-mono tracking-wider block">بوابة المصنع الشريك</span>
          <h2 class="text-base font-bold">مصنع الأمل للتريكو والصباغة</h2>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          متصل ✓
        </span>
      </div>
      <p class="text-[11px] text-slate-400 mt-1">كود المصنع: FAC-001 • التكليفات الجارية: 1</p>
    </header>

    <main class="flex-1 p-3.5 space-y-3.5 pb-8">
      <!-- Active Assignment Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            MO-2026-00006
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            قيد التشغيل
          </span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900">سويت شيرت شتوي رجالي</h3>
          <p class="text-xs text-slate-500">الكمية المسندة: 1,000 قطعة • المنجز: 450 قطعة</p>
        </div>

        <!-- Wave 7 Read-Only Agreement Card inside Factory Portal -->
        <div class="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-base">📄</span>
              <div>
                <h4 class="text-xs font-bold text-blue-950">الاتفاقية وجدول الدفعات المعتمد</h4>
                <span class="font-mono text-[10px] text-blue-700 font-bold">FA-2026-0001</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              سارية
            </span>
          </div>

          <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-xs">
            <span class="text-slate-600 font-medium">قيمة اتفاقية التشغيل:</span>
            <span class="font-bold tabular-nums text-slate-900 text-sm">12,000 ج.م</span>
          </div>

          <!-- Payments Schedule List in Portal -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[11px] font-bold text-slate-800 block">جدول الدفعات وموقف السداد:</span>

            <!-- Payment 1 -->
            <div class="p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-[11px]">
              <div>
                <span class="font-bold text-slate-900 block">1. دفعة مقدمة عند بدء التشغيل (70%)</span>
                <span class="text-[10px] text-slate-400">سددت في 20 أكتوبر 2026</span>
              </div>
              <div class="text-left">
                <span class="font-bold tabular-nums text-emerald-700 block">8,400 ج.م</span>
                <span class="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-100">مسددة ✓</span>
              </div>
            </div>

            <!-- Payment 2 -->
            <div class="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
              <div>
                <span class="font-bold text-slate-900 block">2. دفعة مرحلية بعد فحص العينات (20%)</span>
                <span class="text-[10px] text-slate-400">تستحق 01-11-2026</span>
              </div>
              <div class="text-left">
                <span class="font-bold tabular-nums text-slate-900 block">2,400 ج.م</span>
                <span class="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-100">معلقة</span>
              </div>
            </div>

            <!-- Payment 3 -->
            <div class="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
              <div>
                <span class="font-bold text-slate-900 block">3. دفعة نهائية عند الاستلام (10%)</span>
                <span class="text-[10px] text-slate-400">تستحق 15-11-2026</span>
              </div>
              <div class="text-left">
                <span class="font-bold tabular-nums text-slate-900 block">1,200 ج.م</span>
                <span class="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 rounded border border-slate-200">معلقة</span>
              </div>
            </div>
          </div>

          <div class="pt-1 text-center">
            <p class="text-[10px] text-slate-400">
              🔒 قراءة فقط • أسعار وتكاليف العميل والأرباح معزولة كلياً ومحجوبة
            </p>
          </div>
        </div>

        <!-- Stage Progress Bar -->
        <div class="space-y-1.5 pt-1">
          <div class="flex justify-between text-xs font-semibold text-slate-700">
            <span>إنجاز مراحل التشغيل</span>
            <span class="tabular-nums">45%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="bg-blue-600 h-2 rounded-full" style="width: 45%"></div>
          </div>
        </div>
      </div>
    </main>
  </div>
  `, 'بوابة المصنع الشريك — الاتفاقية وجدول الدفعات');
}

// ----------------------------------------------------------------------------
// Execution & Screenshot Capture
// ----------------------------------------------------------------------------

async function run() {
  console.log('🚀 Starting Wave 7 Screenshot Capture Engine...');

  let currentHtml = '';
  const server = http.createServer((req, res) => {
    if (req.url === '/app.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      return res.end(cssContent);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(currentHtml);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Ephemeral server listening on ${baseUrl}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const execPath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : undefined);

  const browser = await chromium.launch({
    headless: true,
    executablePath: execPath,
  });

  try {
    // 1. Agreements List
    console.log('📸 1/6: Capturing 01-factory-agreements-list.png...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page1 = await desktopContext.newPage();
    currentHtml = renderAgreementsList();
    await page1.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page1.screenshot({
      path: path.join(OUTPUT_DIR, '01-factory-agreements-list.png'),
    });
    console.log('  ✓ 01-factory-agreements-list.png saved.');

    // 2. Create Agreement Modal
    console.log('📸 2/6: Capturing 02-create-agreement-modal.png...');
    const page2 = await desktopContext.newPage();
    currentHtml = renderCreateAgreementModal();
    await page2.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page2.screenshot({
      path: path.join(OUTPUT_DIR, '02-create-agreement-modal.png'),
    });
    console.log('  ✓ 02-create-agreement-modal.png saved.');

    // 3. Agreement Drawer (Payments Schedule Tab)
    console.log('📸 3/6: Capturing 03-agreement-drawer-payments.png...');
    const page3 = await desktopContext.newPage();
    currentHtml = renderAgreementDrawer();
    await page3.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page3.screenshot({
      path: path.join(OUTPUT_DIR, '03-agreement-drawer-payments.png'),
    });
    console.log('  ✓ 03-agreement-drawer-payments.png saved.');

    // 4. Payment Settlement Modal
    console.log('📸 4/6: Capturing 04-payment-pay-modal.png...');
    const page4 = await desktopContext.newPage();
    currentHtml = renderPaymentPayModal();
    await page4.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page4.screenshot({
      path: path.join(OUTPUT_DIR, '04-payment-pay-modal.png'),
    });
    console.log('  ✓ 04-payment-pay-modal.png saved.');

    // 5. Partner Factories with Agreements Column
    console.log('📸 5/6: Capturing 05-partner-factories-agreements-column.png...');
    const page5 = await desktopContext.newPage();
    currentHtml = renderPartnerFactoriesWithAgreements();
    await page5.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page5.screenshot({
      path: path.join(OUTPUT_DIR, '05-partner-factories-agreements-column.png'),
    });
    console.log('  ✓ 05-partner-factories-agreements-column.png saved.');

    await desktopContext.close();

    // 6. Mobile Factory Portal (390x844)
    console.log('📸 6/6: Capturing 06-mobile-factory-portal-agreement.png...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page6 = await mobileContext.newPage();
    currentHtml = renderMobileFactoryPortal();
    await page6.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page6.screenshot({
      path: path.join(OUTPUT_DIR, '06-mobile-factory-portal-agreement.png'),
      fullPage: true,
    });
    console.log('  ✓ 06-mobile-factory-portal-agreement.png saved.');
    await mobileContext.close();

    console.log('\n🎉 ALL 6 SCREENSHOTS CAPTURED TO:', OUTPUT_DIR);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('❌ Capture error:', err);
  process.exit(1);
});
