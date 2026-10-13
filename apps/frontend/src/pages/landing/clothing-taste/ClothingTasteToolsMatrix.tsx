import React, { useState } from "react";
import { ArrowLeft, Check, Layers } from "lucide-react";
import { FASHION_TOOLS, TOTAL_STANDALONE_PRICE, MONTHLY_BUNDLE_PRICE, SAVINGS_AMOUNT } from "./clothingTasteData";

interface ClothingTasteToolsMatrixProps {
  onPricingScroll: () => void;
}

export const ClothingTasteToolsMatrix: React.FC<ClothingTasteToolsMatrixProps> = ({
  onPricingScroll,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "جميع الأدوات (17)" },
    { id: "store", label: "المتجر والكتالوج" },
    { id: "inventory", label: "المقاسات والمخزون" },
    { id: "shipping", label: "بوسطة والشحن" },
    { id: "operations", label: "الفروع والكاشير" },
    { id: "marketing", label: "المبيعات والأطقم" },
  ];

  const filteredTools =
    activeCategory === "all"
      ? FASHION_TOOLS
      : FASHION_TOOLS.filter((t) => t.category === activeCategory);

  return (
    <section className="py-16 border-b border-black/[0.06] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 text-right">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              <span>منظومة متكاملة لبراند الأزياء</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-2">
              17 أداة متخصصة لبراند الأزياء في اشتراك واحد
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl leading-relaxed">
              شراء هذه التطبيقات منفصلة من منصات متعددة يكلّفك{" "}
              <strong className="text-[#141416] cst-tabular">{TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م</strong> شهرياً. باقة المتجر توفرها مدمجة بـ{" "}
              <strong className="text-emerald-700 cst-tabular">{MONTHLY_BUNDLE_PRICE} ج.م</strong> فقط.
            </p>
          </div>

          {/* Arbitrage Callout Card */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/[0.08] flex items-center gap-6 shadow-sm">
            <div className="text-right">
              <div className="text-[11px] text-zinc-500 font-medium">سعر الأدوات فرادى</div>
              <div className="text-xs text-zinc-400 line-through cst-tabular font-bold">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
              </div>
            </div>
            <div className="h-7 w-px bg-zinc-300" />
            <div className="text-right">
              <div className="text-[11px] text-zinc-600 font-medium">سعر الباقة الموحدة</div>
              <div className="text-xl font-black text-[#141416] font-mono cst-tabular">
                {MONTHLY_BUNDLE_PRICE} ج.م<span className="text-xs font-normal text-zinc-500">/شهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 [scrollbar-width:none]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-[#141416] text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:text-[#141416] hover:bg-zinc-200 border border-zinc-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Single Surface Tools Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-right">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="p-4 rounded-xl bg-[#FAF8F5] border border-black/[0.06] hover:border-black/20 transition-all flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-black text-[#141416] leading-snug">{tool.name}</h3>
                  <span className="text-[11px] font-mono text-zinc-600 bg-white border border-black/[0.06] px-2 py-0.5 rounded cst-tabular whitespace-nowrap">
                    {tool.standalonePrice} ج.م
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed mb-3">
                  {tool.description}
                </p>
              </div>

              <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-blue-700 font-medium">{tool.keyFeature}</span>
                <span className="text-emerald-700 font-bold">مشمول بالباقة ✓</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA trigger */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onPricingScroll}
            className="cst-btn-secondary text-xs sm:text-sm py-2.5 px-6 font-bold cursor-pointer"
          >
            <span>اشترك في باقة الـ 17 أداة (وفر {SAVINGS_AMOUNT.toLocaleString("en-US")} ج.م شهرياً)</span>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
