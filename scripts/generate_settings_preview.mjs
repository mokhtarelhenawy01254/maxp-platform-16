import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSettingsHtml(isChecked) {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إعدادات الفاتورة والطباعة</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Cairo', sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body class="p-8">
  <div class="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
    <!-- Header -->
    <div class="border-b border-slate-100 pb-4">
      <div class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1 text-xs font-bold text-sky-700 mb-2">
        <span>⚙️ إعدادات الطباعة والعناصر المرئية</span>
      </div>
      <h2 class="text-xl font-black text-slate-900">خيارات عرض محتوى الفاتورة وبوليصة الشحن</h2>
      <p class="text-sm text-slate-500 mt-1">تحكم في الحقول والعناصر التي تظهر للعميل ومندوب الشحن عند طباعة الفاتورة أو البوليصة.</p>
    </div>

    <!-- Toggle Cards List -->
    <div class="space-y-3">
      <!-- Standard Flags -->
      <div class="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <p class="text-sm font-bold text-slate-950">شعار المتجر / الشركة</p>
            <p class="text-xs leading-6 text-slate-500">إظهار لوجو الشركة أعلى يمين الفاتورة والبوليصة.</p>
          </div>
          <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-slate-900">
            <span class="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
          </div>
        </div>
      </div>

      <!-- NEW TOGGLE: Show Custom Fields -->
      <div class="rounded-[20px] border ${isChecked ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200' : 'border-slate-200 bg-slate-50/70'} p-4 transition-all">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-base">🚗</span>
              <p class="text-sm font-black ${isChecked ? 'text-sky-950' : 'text-slate-950'}">إظهار الحقول المخصصة ومواصفات الطلب (نوع وموديل وسنة صنع السيارة)</p>
              ${isChecked ? '<span class="text-[10px] font-extrabold bg-sky-600 text-white px-2 py-0.5 rounded-full">مفعل لشركة red-line</span>' : '<span class="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">معطل افتراضياً</span>'}
            </div>
            <p class="text-xs leading-6 text-slate-600">إظهار بيانات الحقول المخصصة ومواصفات السيارة/الطلب داخل بوليصة الشحن والفاتورة.</p>
          </div>
          <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isChecked ? 'bg-sky-600' : 'bg-slate-300'}">
            <span class="${isChecked ? '-translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
          </div>
        </div>
      </div>

      <!-- More Flags -->
      <div class="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <p class="text-sm font-bold text-slate-950">تفاصيل المنتجات والـ SKU</p>
            <p class="text-xs leading-6 text-slate-500">إظهار جدول المنتجات والكميات والأسعار.</p>
          </div>
          <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-slate-900">
            <span class="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

const beforeHtml = generateSettingsHtml(false);
const afterHtml = generateSettingsHtml(true);

const beforeFile = path.join(__dirname, 'settings_toggle_before.html');
const afterFile = path.join(__dirname, 'settings_toggle_after.html');

fs.writeFileSync(beforeFile, beforeHtml, 'utf-8');
fs.writeFileSync(afterFile, afterHtml, 'utf-8');

console.log('✅ Generated Settings Preview HTML:');
console.log('  Before:', beforeFile);
console.log('  After:', afterFile);
