import React, { useState } from "react";
import { GitFork, MessageSquare, Barcode, Layers, Truck, Calculator, CheckCircle2, ArrowLeft } from "lucide-react";

interface ClothingTasteBentoProps {
  onPricingScroll: () => void;
}

export const ClothingTasteBento: React.FC<ClothingTasteBentoProps> = ({ onPricingScroll }) => {
  // Interactive fabric economics widget
  const [sellingPrice, setSellingPrice] = useState<number>(550);
  const [fabricCost, setFabricCost] = useState<number>(140);
  const [tailoringCost, setTailoringCost] = useState<number>(95);
  const [shippingFee, setShippingFee] = useState<number>(55);
  const [adSpendPerOrder, setAdSpendPerOrder] = useState<number>(90);

  const totalCost = fabricCost + tailoringCost + shippingFee + adSpendPerOrder;
  const netProfit = sellingPrice - totalCost;
  const marginPercent = Math.round((netProfit / sellingPrice) * 100);

  return (
    <section className="py-16 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-10 text-right">
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            أربع شاشات تشغيلية تحكم مبيعات وأرباح متجر ملابسك
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            تم بناء كل شاشة لمعالجة الاختناقات اليومية التي تواجه تجار الأزياء في مصر: فوضى حالات الأوردرات، عجز جرد المقاسات، بطء إصدار بوالص الشحن، وغياب صافي الربح الحقيقي.
          </p>
        </div>

        {/* Asymmetric 8:4 Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Tile 1: Order Workflow & WhatsApp Business API (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-800 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  مسار الطلبات + WhatsApp API
                </span>
                <span className="text-xs text-zinc-500 font-medium">Order Workflow</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-2 text-right">
                مسار آلي كامل: تأكيد فوري على واتساب بدون أي مكالمة هاتفية
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-6 max-w-xl text-right">
                بمجرد طلب الزبون من المتجر، يتولى السيستم إرسال رسالة رسمية باسم متجرك لتأكيد المقاس والعنوان، ونقل الأوردر تلقائياً بين الحالات المعتمدة حتى التسليم:
              </p>
            </div>

            {/* Micro visual: 5-Step Order Pipeline Flow */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-center text-xs">
              {[
                { stage: "أوردر جديد", count: "12 طلب", status: "استقبال لحظي" },
                { stage: "تأكيد واتساب", count: "آلي 100%", status: "رابط تأكيد مباشر" },
                { stage: "طلب مؤكد", count: "38 طلب", status: "جاهز للتجهيز" },
                { stage: "بوليصة بوسطة", count: "طباعة دفعة", status: "استلام المندوب" },
                { stage: "تم التسليم", count: "COD محصل", status: "تسوية نقدية" },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-black/[0.06] shadow-2xs">
                  <div className="text-[11px] font-bold text-zinc-500 mb-1">0{idx + 1}</div>
                  <div className="text-sm font-black text-[#141416] mb-1">{item.stage}</div>
                  <div className="text-[11px] text-zinc-700 font-medium font-mono cst-tabular">{item.count}</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-1">{item.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tile 2: Sizing Matrix & Inventory Pro (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-800 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  المخزون والمستودعات
                </span>
                <Barcode className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-lg font-black text-[#141416] mb-2 text-right">
                مصفوفة المقاسات والألوان وتزامن الفروع
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4 text-right">
                جرد تفصيلي لمقاسات S وM وL وXL و2XL عبر المستودعات مع تنبيهات استباقية عند اقتراب نفاد المقاس الأكثر طلباً لمنع ضياع المبيعات.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-xs space-y-2 text-zinc-700">
              <div className="flex justify-between items-center">
                <span>تزامن كاشير المحل مع الأونلاين:</span>
                <span className="text-emerald-700 font-bold font-mono">أقل من ثانية</span>
              </div>
              <div className="flex justify-between items-center">
                <span>دعم قارئ الباركود والطابعات:</span>
                <span className="text-zinc-900 font-bold font-mono">حراري 80mm</span>
              </div>
              <div className="flex justify-between items-center">
                <span>العمل عند انقطاع الإنترنت:</span>
                <span className="text-emerald-700 font-bold">Offline Mode متاح</span>
              </div>
            </div>
          </div>

          {/* Tile 3: Bulk Orders & Smart Shipping (Span 4) */}
          <div className="lg:col-span-4 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-800 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                  الطلبات الجماعية والشحن
                </span>
                <Truck className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-lg font-black text-[#141416] mb-2 text-right">
                طباعة 50 بوليصة بوسطة وتوربو بنقرة زر
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4 text-right">
                فلترة الطلبات حسب المحافظة وحالة الدفع، وتصدير بوالص الشحن دفعة واحدة وتسليمها لشركة الشحن دون الحاجة لإعادة كتابة العناوين يدوياً.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] text-xs space-y-2 text-zinc-700">
              <div className="flex justify-between items-center">
                <span>ربط شركات الشحن:</span>
                <span className="text-zinc-900 font-bold">بوسطة • توربو • QP Express</span>
              </div>
              <div className="flex justify-between items-center">
                <span>تحديث حالات التسليم:</span>
                <span className="text-emerald-700 font-bold">تزامن آلي عبر Webhook</span>
              </div>
              <div className="flex justify-between items-center">
                <span>تسوية أموال التحصيل (COD):</span>
                <span className="text-zinc-900 font-bold font-mono">مطابقة الخزينة</span>
              </div>
            </div>
          </div>

          {/* Tile 4: Unit Economics & Profit Calculator (Span 8) */}
          <div className="lg:col-span-8 cst-panel rounded-2xl p-6 bg-white border border-black/[0.08] shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-purple-800 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
                  تحليلات الأرباح وصافي الهامش
                </span>
                <Calculator className="w-4 h-4 text-zinc-500" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-2 text-right">
                حساب صافي ربح القطعة بالجنيه بعد خصم الشحن والإعلان
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-4 max-w-xl text-right">
                حرّك أرقام التكلفة أدناه لمعرفة الصافي الحقيقي للقطعة في خزينة متجرك بدقة الجنيه:
              </p>
            </div>

            {/* Interactive Margin Controls */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-black/[0.06] space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-right">
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium block mb-1">سعر البيع (ج.م)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full p-2 text-sm font-bold rounded-lg border border-zinc-200 bg-white font-mono cst-tabular text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium block mb-1">تكلفة القماش</label>
                  <input
                    type="number"
                    value={fabricCost}
                    onChange={(e) => setFabricCost(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 text-sm font-bold rounded-lg border border-zinc-200 bg-white font-mono cst-tabular text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium block mb-1">المصنعية والتقفيل</label>
                  <input
                    type="number"
                    value={tailoringCost}
                    onChange={(e) => setTailoringCost(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 text-sm font-bold rounded-lg border border-zinc-200 bg-white font-mono cst-tabular text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium block mb-1">رسوم الشحن</label>
                  <input
                    type="number"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 text-sm font-bold rounded-lg border border-zinc-200 bg-white font-mono cst-tabular text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium block mb-1">تكلفة الإعلان/طلب</label>
                  <input
                    type="number"
                    value={adSpendPerOrder}
                    onChange={(e) => setAdSpendPerOrder(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 text-sm font-bold rounded-lg border border-zinc-200 bg-white font-mono cst-tabular text-right"
                  />
                </div>
              </div>

              {/* Real Result Ledger */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-lg bg-white border border-black/[0.08] shadow-2xs gap-3">
                <div className="flex items-center gap-4 text-xs text-zinc-700">
                  <div>
                    <span className="text-zinc-500">إجمالي التكلفة: </span>
                    <strong className="text-zinc-900 font-mono cst-tabular">{totalCost} ج.م</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500">نسبة الهامش: </span>
                    <strong className={`${marginPercent > 0 ? "text-emerald-700" : "text-red-700"} font-mono cst-tabular`}>
                      {marginPercent}%
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 font-medium">صافي الربح الفعلي للقطعة:</span>
                  <span
                    className={`text-lg font-black font-mono cst-tabular px-3 py-1 rounded-md ${
                      netProfit > 0
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {netProfit} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
