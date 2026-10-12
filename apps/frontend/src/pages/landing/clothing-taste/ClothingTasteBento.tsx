import React, { useState } from "react";
import { ArrowLeft, Check, ShieldCheck, Barcode, Store, PackageCheck, Calculator, RefreshCw } from "lucide-react";
import { TasteMode } from "./types";

interface ClothingTasteBentoProps {
  onPricingScroll: () => void;
  mode: TasteMode;
}

export const ClothingTasteBento: React.FC<ClothingTasteBentoProps> = ({ onPricingScroll, mode }) => {
  // Interactive fabric economics widget
  const [fabricCost, setFabricCost] = useState<number>(120);
  const [tailoringCost, setTailoringCost] = useState<number>(90);
  const [sellingPrice, setSellingPrice] = useState<number>(450);
  const [bostaFee] = useState<number>(55);

  const totalCost = fabricCost + tailoringCost + bostaFee;
  const netProfit = sellingPrice - totalCost;
  const marginPercent = Math.round((netProfit / sellingPrice) * 100);

  if (mode === "slop") {
    // Symmetrical 3-card clones (the textbook AI Slop Flag #3)
    return (
      <section className="py-16 border-b border-purple-500/20 bg-[#0d0722]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-xs text-purple-400 font-bold mb-2">✨ مميزاتنا الخارقة التي لا تُقهر ✨</div>
          <h2 className="text-3xl font-black text-white mb-10">لماذا تختارنا دوناً عن غيرنا؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "⚡", title: "سرعة خارقة خيالية", desc: "نظامنا يعمل بأسرع من رمشة العين ليوفر لك كل ما تحتاجه في ثوانٍ معدودة." },
              { icon: "🤖", title: "ذكاء اصطناعي ثوري", desc: "خوارزمياتنا السحرية تقوم بكل العمل الشاق بدلاً منك وأنت جالس مستريح." },
              { icon: "🚀", title: "انطلاق لا نهائي", desc: "حقق أعلى أرقام المبيعات وتخطى جميع منافسيك بنقرة زر واحدة فقط." },
            ].map((card, i) => (
              <div key={i} className="p-8 rounded-2xl bg-purple-900/20 border border-purple-500/30 flex flex-col items-center text-center">
                <span className="text-4xl mb-4">{card.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-purple-200/70 mb-6">{card.desc}</p>
                <button className="cst-btn-secondary text-xs py-2 px-4 rounded-full">اكتشف المزيد</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 border-b border-white/[0.08] bg-[#090A0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header (Single focused message, NO Split-header filler) */}
        <div className="max-w-2xl mb-10 text-right">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            أربع ركائز تشغيلية تحمي أرباح متجر الملابس
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            تم تصميم كل ركيزة لحل مشكلة يومية تستنزف أموال تجار الأزياء: نزيف المرتجعات، تضارب مخزون الفروع، بطء الشحن، وعدم وضوح هامش الربح.
          </p>
        </div>

        {/* Asymmetric 8:4 Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Tile 1: Size Advisor & Return Reduction Engine (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-gradient-to-br from-[#12141c] to-[#0c0e14] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                  حل مشكلة المرتجعات • توفير 60%
                </span>
                <span className="text-xs text-zinc-400 font-mono">Size Advisor Engine</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                وقف نزيف مصاريف الشحن رايح-جاي بسبب المقاس الغلط
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-xl">
                عندما يشتري الزبون، تقترح المنظومة المقاس المريح بناءً على قياسات القطعة بالسنتيمتر، مع تنبيهه بنوع القصة (Oversized أو Regular)، مما يمنع طلب مقاس خاطئ قبل شحن الطلب.
              </p>
            </div>

            {/* Micro visual: Size Matrix Preview */}
            <div className="grid grid-cols-5 gap-2 p-3 rounded-xl bg-black/40 border border-white/10 text-center font-mono text-xs">
              {[
                { size: "S", stock: 14, status: "متوفر" },
                { size: "M", stock: 28, status: "الأكثر طلباً" },
                { size: "L", stock: 42, status: "شبه نافد" },
                { size: "XL", stock: 19, status: "متوفر" },
                { size: "2XL", stock: 8, status: "إعادة إنتاج" },
              ].map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-white/5 border border-white/5">
                  <div className="text-base font-bold text-white">{item.size}</div>
                  <div className="text-[11px] text-zinc-400 cst-tabular">{item.stock} قطعة</div>
                  <div className="text-[9px] text-emerald-400 mt-1">{item.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tile 2: Realtime POS & Barcode Sync (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-[#111318] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-blue-400 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                  كاشير المحل • Cloud POS
                </span>
                <Barcode className="w-4 h-4 text-zinc-400" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">
                تزامن فوري بين كاشير المحل والمتجر
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
                إذا بيعت آخر قطعة مقاس M في فرع المعادي عبر الباركود، تُحذف فورياً من الموقع الإلكتروني في نفس الثانية لمنع بيعها لعميل أونلاين.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span>سرعة مزامنة المخزون:</span>
                <span className="text-emerald-400 font-bold">&lt; 150ms لحظي</span>
              </div>
              <div className="flex justify-between">
                <span>طباعة الإيصالات:</span>
                <span className="text-white">طابعات حرارية 80mm</span>
              </div>
            </div>
          </div>

          {/* Tile 3: 1-Click Bosta & WhatsApp Automation (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-[#111318] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  شحن بوسطة • 1-Click
                </span>
                <PackageCheck className="w-4 h-4 text-zinc-400" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">
                طباعة بوالص الشحن وتأكيد الواتساب
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
                إنشاء بوالص شحن بوسطة بضغطة زر دون نسخ ولصق، وإرسال رسالة آلية للزبون برقم البوليصة وميعاد التوصيل.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span>تحديث حالات التسليم:</span>
                <span className="text-emerald-400">Webhook تلقائي</span>
              </div>
              <div className="flex justify-between">
                <span>تحصيل فلوس COD:</span>
                <span className="text-white">مطابقة الخزينة</span>
              </div>
            </div>
          </div>

          {/* Tile 4: Unit Economics & Margin Calculator (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-gradient-to-bl from-[#12141c] to-[#0c0e14] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-purple-400 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20">
                  حاسبة هوامش وتكاليف الأزياء
                </span>
                <Calculator className="w-4 h-4 text-zinc-400" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                حساب التكلفة وصافي ربح القطعة بدقة الجنيه
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4 max-w-xl">
                أدخل تكاليف القماش والتفصيل وسعر البيع لترى هامش الربح الصافي بعد خصم مصاريف الشحن:
              </p>
            </div>

            {/* Interactive Margin Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/40 border border-white/10 mb-4">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">تكلفة القماش (ج.م)</label>
                <input
                  type="number"
                  value={fabricCost}
                  onChange={(e) => setFabricCost(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono cst-tabular"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">المصنعية والتفصيل (ج.م)</label>
                <input
                  type="number"
                  value={tailoringCost}
                  onChange={(e) => setTailoringCost(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono cst-tabular"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">سعر بيع القطعة (ج.م)</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono cst-tabular"
                />
              </div>
            </div>

            {/* Computed Economics Result */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div>
                <span className="text-zinc-400">إجمالي التكلفة مع الشحن: </span>
                <span className="text-white font-bold cst-tabular">{totalCost} ج.م</span>
              </div>
              <div>
                <span className="text-zinc-400">صافي ربح القطعة: </span>
                <span className="text-emerald-400 font-bold cst-tabular text-sm">{netProfit} ج.م</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                هامش ربح {marginPercent}%
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
