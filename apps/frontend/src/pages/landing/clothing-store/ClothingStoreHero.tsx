import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Layers,
  Truck,
  RotateCcw,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

interface ClothingStoreHeroProps {
  onFreeRegister: () => void;
  onPricingScroll: () => void;
}

export const ClothingStoreHero: React.FC<ClothingStoreHeroProps> = ({
  onFreeRegister,
  onPricingScroll,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("L");

  const inventoryStock: Record<string, { store: number; warehouse: number; status: string }> = {
    S: { store: 8, warehouse: 14, status: "متاح" },
    M: { store: 2, warehouse: 5, status: "طلب متزايد" },
    L: { store: 12, warehouse: 26, status: "الأكثر مبيعاً" },
    XL: { store: 4, warehouse: 9, status: "متاح" },
    "2XL": { store: 1, warehouse: 2, status: "مخزون حرج" },
  };

  return (
    <section className="relative pt-12 pb-20 overflow-hidden border-b border-white/5 csn-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copy (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-start text-right">
            {/* Architectural Status Chip */}
            <div className="csn-badge csn-badge-accent mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs">منظومة تجارة الأزياء 2026 • ربط الفروع والمستودعات وبوسطة</span>
            </div>

            {/* Main Balanced Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.25] csn-text-balance mb-5">
              حوّل براند الملابس بتاعك لمنظومة أوتوماتيكية: متجر أونلاين، سيستم فروع، وربط شحن فوري
            </h1>

            {/* Pragmatic Subtitle */}
            <p className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed csn-text-pretty mb-8 max-w-2xl">
              أدر مصفوفة المقاسات والألوان بدقة، ارفع نسبة تسليم الشحنات، وخفّض المرتجعات مع ربط بوسطة وكاشير الفروع في شاشة تحكم واحدة دون فوضى الشيتات وضياع الأوردرات.
            </p>

            {/* High-Intent CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10">
              <button
                onClick={onFreeRegister}
                type="button"
                className="csn-btn-primary text-base py-3.5 px-6 font-bold shadow-lg"
              >
                <span>افتح متجرك مجاناً (0 ج.م)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={onPricingScroll}
                type="button"
                className="csn-btn-secondary text-base py-3.5 px-6 font-semibold"
              >
                <span>باقة المتجر الكاملة (999 ج.م)</span>
              </button>
            </div>

            {/* Hard Operational Telemetry Bar (Tabular Nums) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-6 border-t border-white/10">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white csn-tabular">
                  0 <span className="text-xs text-gray-400 font-normal">ج.م</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">تكلفة فتح المتجر</div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold text-white csn-tabular">
                  1 <span className="text-xs text-gray-400 font-normal">ج.م/أوردر</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">بدون اشتراك شهري ثابت</div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold text-white csn-tabular">
                  17 <span className="text-xs text-gray-400 font-normal">تطبيقاً</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">باقة متكاملة بـ 999 ج.م</div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-400 csn-tabular">
                  &lt; 0.8s
                </div>
                <div className="text-xs text-gray-400 mt-0.5">سرعة تصفح المتجر P95</div>
              </div>
            </div>

          </div>

          {/* Interactive Live Retail Cockpit (5 cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="csn-panel p-5 sm:p-6 shadow-2xl relative">
              
              {/* Cockpit Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-semibold text-gray-300">
                    رادار عمليات المتجر المباشر
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-500 csn-tabular">
                  BOSTA-SYNC-v21
                </span>
              </div>

              {/* Live Order Simulation */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      أوردر جديد #4829
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                    تم إصدار بوليصة بوسطة
                  </span>
                </div>

                <div className="text-xs text-gray-300 mb-1">
                  سويت شيرت أوفر سايز (أسود - مقاس {selectedSize})
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-gray-500" />
                    الشحن: القاهرة الجديدة
                  </span>
                  <span className="text-white font-semibold csn-tabular">
                    الدفع عند الاستلام (COD)
                  </span>
                </div>
              </div>

              {/* Interactive Size Matrix Widget */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                    مصفوفة مخزون المقاسات (تزامن الفروع والمستودع):
                  </span>
                  <span className="text-[11px] text-blue-400">انقر لتحديد المقاس</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {(["S", "M", "L", "XL", "2XL"] as const).map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-400 shadow-md scale-105"
                            : "bg-white/[0.04] text-gray-300 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                {/* Stock distribution for selected size */}
                <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400">في المحل: </span>
                    <span className="text-white font-bold csn-tabular">
                      {inventoryStock[selectedSize]?.store} قطع
                    </span>
                  </div>
                  <div className="border-r border-white/10 pr-3">
                    <span className="text-gray-400">في المخزن: </span>
                    <span className="text-white font-bold csn-tabular">
                      {inventoryStock[selectedSize]?.warehouse} قطعة
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {inventoryStock[selectedSize]?.status}
                  </div>
                </div>
              </div>

              {/* Return Prevention Telemetry */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      تشخيص وتخفيض المرتجعات
                    </div>
                    <div className="text-[11px] text-gray-400">
                      تأكيد الطول والوزن آلياً قبل الشحن
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 csn-tabular">
                    98.4%
                  </div>
                  <div className="text-[10px] text-gray-500">دقة المقاس</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
