import React, { useState } from "react";
import { Barcode, PackageCheck, Calculator } from "lucide-react";

interface ClothingTasteBentoProps {
  onPricingScroll: () => void;
}

export const ClothingTasteBento: React.FC<ClothingTasteBentoProps> = () => {
  // Interactive fabric economics widget
  const [fabricCost, setFabricCost] = useState<number>(120);
  const [tailoringCost, setTailoringCost] = useState<number>(90);
  const [sellingPrice, setSellingPrice] = useState<number>(450);
  const [bostaFee] = useState<number>(55);

  const totalCost = fabricCost + tailoringCost + bostaFee;
  const netProfit = sellingPrice - totalCost;
  const marginPercent = Math.round((netProfit / sellingPrice) * 100);

  return (
    <section className="py-16 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-10 text-right">
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            أربع ركائز تشغيلية تحمي أرباح متجر الملابس
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            تم تصميم كل ركيزة لحل مشكلة يومية تستنزف أموال تجار الأزياء: نزيف المرتجعات، تضارب مخزون الفروع، بطء الشحن، وعدم وضوح هامش الربح.
          </p>
        </div>

        {/* Asymmetric 8:4 Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Tile 1: Size Advisor & Return Reduction Engine (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-800 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  حل مشكلة المرتجعات • توفير 60%
                </span>
                <span className="text-xs text-zinc-500 font-medium">مستشار المقاسات الذكي</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-2">
                وقف نزيف مصاريف الشحن رايح-جاي بسبب المقاس الغلط
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-6 max-w-xl">
                عندما يشتري الزبون، تقترح المنظومة المقاس المريح بناءً على قياسات القطعة بالسنتيمتر، مع تنبيهه بنوع القصة (Oversized أو Regular)، مما يمنع طلب مقاس خاطئ قبل شحن الطلب.
              </p>
            </div>

            {/* Micro visual: Size Matrix Preview */}
            <div className="grid grid-cols-5 gap-2 p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-center text-xs">
              {[
                { size: "S", stock: 14, status: "متوفر" },
                { size: "M", stock: 28, status: "الأكثر طلباً" },
                { size: "L", stock: 42, status: "شبه نافد" },
                { size: "XL", stock: 19, status: "متوفر" },
                { size: "2XL", stock: 8, status: "إعادة إنتاج" },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-black/[0.06] shadow-2xs">
                  <div className="text-base font-black text-[#141416]">{item.size}</div>
                  <div className="text-[11px] text-zinc-600 cst-tabular font-medium">{item.stock} قطعة</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-1">{item.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tile 2: Realtime POS & Barcode Sync (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-800 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  كاشير المحل • Cloud POS
                </span>
                <Barcode className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-lg font-black text-[#141416] mb-2">
                تزامن فوري بين كاشير المحل والمتجر
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4">
                إذا بيعت آخر قطعة مقاس M في فرع المعادي عبر الباركود، تُحذف فورياً من الموقع الإلكتروني في نفس الثانية لمنع بيعها لعميل أونلاين.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-xs space-y-2 text-zinc-700">
              <div className="flex justify-between">
                <span>سرعة مزامنة المخزون:</span>
                <span className="text-emerald-700 font-bold">لحظي في أقل من ثانية</span>
              </div>
              <div className="flex justify-between">
                <span>طباعة الإيصالات:</span>
                <span className="text-zinc-900 font-bold">طابعات حرارية 80mm</span>
              </div>
            </div>
          </div>

          {/* Tile 3: 1-Click Bosta & WhatsApp Automation (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-800 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                  شحن بوسطة • 1-Click
                </span>
                <PackageCheck className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-lg font-black text-[#141416] mb-2">
                طباعة بوالص الشحن وتأكيد الواتساب
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4">
                إنشاء بوالص شحن بوسطة بضغطة زر دون نسخ ولصق، وإرسال رسالة آلية للزبون برقم البوليصة وميعاد التوصيل.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-xs space-y-2 text-zinc-700">
              <div className="flex justify-between">
                <span>تحديث حالات التسليم:</span>
                <span className="text-emerald-700 font-bold">تحديث آلي فوري</span>
              </div>
              <div className="flex justify-between">
                <span>تحصيل فلوس COD:</span>
                <span className="text-zinc-900 font-bold">مطابقة الخزينة والحساب البنكي</span>
              </div>
            </div>
          </div>

          {/* Tile 4: Unit Economics & Margin Calculator (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-purple-800 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
                  حاسبة هوامش وتكاليف الأزياء
                </span>
                <Calculator className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-2">
                حساب التكلفة وصافي ربح القطعة بدقة الجنيه
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-4 max-w-xl">
                أدخل تكاليف القماش والتفصيل وسعر البيع لترى هامش الربح الصافي بعد خصم مصاريف الشحن:
              </p>
            </div>

            {/* Interactive Margin Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-50 border border-black/[0.06] mb-4">
              <div>
                <label className="text-xs text-zinc-600 block mb-1 font-medium">تكلفة القماش (ج.م)</label>
                <input
                  type="number"
                  value={fabricCost}
                  onChange={(e) => setFabricCost(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#141416] font-bold cst-tabular shadow-2xs outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 block mb-1 font-medium">المصنعية والتفصيل (ج.م)</label>
                <input
                  type="number"
                  value={tailoringCost}
                  onChange={(e) => setTailoringCost(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#141416] font-bold cst-tabular shadow-2xs outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 block mb-1 font-medium">سعر بيع القطعة (ج.م)</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#141416] font-bold cst-tabular shadow-2xs outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            {/* Computed Economics Result */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
              <div>
                <span className="text-zinc-600">إجمالي التكلفة مع الشحن: </span>
                <span className="text-[#141416] font-black cst-tabular">{totalCost} ج.م</span>
              </div>
              <div>
                <span className="text-zinc-600">صافي ربح القطعة: </span>
                <span className="text-emerald-800 font-black cst-tabular text-sm">{netProfit} ج.م</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-700 text-white font-bold">
                هامش ربح {marginPercent}%
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
