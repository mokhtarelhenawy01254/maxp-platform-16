import React from "react";
import {
  Layers,
  RotateCcw,
  Truck,
  Store,
  CheckCircle2,
  TrendingDown,
  QrCode,
  Smartphone,
  Cpu,
} from "lucide-react";

export const ClothingStoreBento: React.FC = () => {
  return (
    <section id="features" className="py-20 border-b border-white/5 bg-[#050608]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-right max-w-2xl mb-12">
          <div className="csn-badge mb-3">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>بنية تحتية مخصصة للأزياء والملابس</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight csn-text-balance mb-3">
            مصممة لإنهاء أكبر 4 مشاكل تلتهم أرباح براندات الملابس في مصر
          </h2>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed csn-text-pretty">
            تكامل هندسي موحد يربط المحل الفعلي، شحن بوسطة، وجداول المقاسات دون شيتات متفرقة أو فوضى مبيعات.
          </p>
        </div>

        {/* 8:4 Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Bento Card 1 (8 cols) - Omnichannel Inventory Sync */}
          <div className="lg:col-span-8 csn-panel p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white/5 text-gray-300 border border-white/10">
                  تزامن الفروع والموقع 100%
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                ربط سيستم المحل الفعلي مع المتجر الإلكتروني لحظياً
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xl mb-6">
                انتهى عصر بيع نفس القطعة مرتين بسبب تأخر تحديث الإكسيل. عندما يشتري عميل تيشيرت مقاس XL من الفرع، يتم خصمه فورياً من المتجر أونلاين خلال أجزاء من الثانية.
              </p>
            </div>

            {/* Architecture Preview Box */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border-b sm:border-b-0 sm:border-l border-white/10 pb-3 sm:pb-0 sm:pl-3">
                <div className="text-xs text-gray-400 mb-1">المخزون بالمحل الفعلي</div>
                <div className="text-base font-bold text-white csn-tabular">24 قطعة</div>
                <div className="text-[11px] text-emerald-400">كاشير الفرع متصل</div>
              </div>
              <div className="border-b sm:border-b-0 sm:border-l border-white/10 pb-3 sm:pb-0 sm:pl-3">
                <div className="text-xs text-gray-400 mb-1">المعروض أونلاين</div>
                <div className="text-base font-bold text-white csn-tabular">24 قطعة</div>
                <div className="text-[11px] text-blue-400">تحديث فوري للسلة</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">نسبة التضارب في القطع</div>
                <div className="text-base font-bold text-emerald-400 csn-tabular">0.0%</div>
                <div className="text-[11px] text-gray-400">حماية من النفاد المفاجئ</div>
              </div>
            </div>
          </div>

          {/* Bento Card 2 (4 cols) - Return Diagnostics */}
          <div className="lg:col-span-4 csn-panel p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>تقليل المرتجع</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                مستشار المقاسات الذكي
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                تأكيد تلقائي لاختيار المقاس عبر الوزن والطول قبل خروج الشحنة مع المندوب لحل أزمة مقاسات الميري والأوفر سايز.
              </p>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-3.5">
              <div className="text-xs text-gray-400 mb-1.5">أكثر سبب لمرتجع الملابس:</div>
              <div className="text-xs text-white font-semibold mb-2">
                «المقاس غير مضبوط»
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[88%]"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2">
                <span>تم الحل آلياً</span>
                <span className="text-emerald-400 font-bold csn-tabular">88% انخفاض</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3 (4 cols) - Bosta API Shipping */}
          <div className="lg:col-span-4 csn-panel p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-gray-400">BOSTA API</span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                ربط شحن بوسطة بنقرة واحدة
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                إصدار بوالص الشحن وطباعة استيكر الباركود وتحديث حالات التحصيل النقدي (COD) تلقائياً من داخل صفحة الأوردر.
              </p>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-gray-300">سرعة إصدار البوليصة</span>
              </div>
              <span className="text-white font-bold csn-tabular">&lt; 2 ثانية</span>
            </div>
          </div>

          {/* Bento Card 4 (8 cols) - Cloud POS & Cashier */}
          <div className="lg:col-span-8 csn-panel p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white/5 text-gray-300 border border-white/10">
                  كاشير سحابي متصل
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                كاشير سريع للفروع والمحلات يدعم الباركود والطباعة الفورية
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xl mb-6">
                واجهة كاشير خفيفة تعمل على أي جهاز تابلت أو كمبيوتر أو هاتف. تدعم قارئ الباركود، طباعة إيصالات الاستبدال، وسحب تقارير الوردية وإجمالي الكاش في نهاية اليوم.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-black/50 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                  <QrCode className="w-4 h-4 text-purple-400" />
                  <span>دعم قارئ الباركود</span>
                </div>
                <p className="text-[11px] text-gray-400">سكان للقطعة وإتمام البيع بثوانٍ</p>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>يعمل على أي جهاز</span>
                </div>
                <p className="text-[11px] text-gray-400">بدون الحاجة لشراء أجهزة مكلفة</p>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>سجل الاستبدال والتقفيل</span>
                </div>
                <p className="text-[11px] text-gray-400">تقفيل وردية الكاشير بدقة تامة</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
