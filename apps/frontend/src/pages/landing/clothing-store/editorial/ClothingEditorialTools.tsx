import React, { useState } from "react";
import { Check, Boxes, ArrowLeft } from "lucide-react";
import { CLOTHING_TOOLS_DATA, TOTAL_STANDALONE_PRICE } from "../clothingStoreData";

interface ClothingEditorialToolsProps {
  onPricingScroll: () => void;
}

export const ClothingEditorialTools: React.FC<ClothingEditorialToolsProps> = ({
  onPricingScroll,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "جميع الأدوات (17)" },
    { id: "store", label: "المتجر والكتالوج" },
    { id: "inventory", label: "المقاسات والمخزون" },
    { id: "shipping", label: "بوسطة والتوصيل" },
    { id: "operations", label: "الفروع والكاشير" },
    { id: "marketing", label: "المبيعات والأطقم" },
  ];

  const filteredTools =
    activeCategory === "all"
      ? CLOTHING_TOOLS_DATA
      : CLOTHING_TOOLS_DATA.filter((tool) => tool.category === activeCategory);

  return (
    <section id="editorial-tools" className="py-20 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="text-right max-w-2xl">
            <div className="cse-badge mb-3">
              <Boxes className="w-3.5 h-3.5 text-zinc-700" />
              <span>مصفوفة الأدوات الشاملة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight mb-3">
              17 أداة متخصصة تحتاجها لإدارة براند الملابس في شاشة واحدة
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
              شراء هذه الأدوات منفصلة من شركات مختلفة يكلفك{" "}
              <strong className="text-black cse-tabular">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
              </strong>{" "}
              شهرياً. باقة المتجر الكاملة تجمعها في اشتراك سحابي موحد بقيمة{" "}
              <strong className="text-emerald-700 cse-tabular">999 ج.م</strong> فقط.
            </p>
          </div>

          {/* Arbitrage Callout */}
          <div className="cse-panel p-5 flex items-center justify-between gap-6 bg-white">
            <div className="text-right">
              <div className="text-xs text-zinc-500">سعر الأدوات فرادى</div>
              <div className="text-sm text-zinc-400 line-through cse-tabular">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م / شهر
              </div>
            </div>
            <div className="h-8 w-px bg-black/[0.08]"></div>
            <div className="text-right">
              <div className="text-xs text-emerald-700 font-bold">باقة المتجر الكاملة</div>
              <div className="text-xl font-black text-black cse-tabular">
                999 ج.م <span className="text-xs text-zinc-500 font-normal">/ شهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 text-xs font-semibold no-scrollbar">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`py-2 px-4 rounded-xl whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-zinc-950 text-white border-zinc-950 font-bold shadow-sm"
                    : "bg-white text-zinc-600 border-black/[0.08] hover:border-black/20"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 17 Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredTools.map((tool, idx) => (
            <div
              key={tool.id}
              className="cse-panel p-5 flex flex-col justify-between hover:border-black/30 transition-all bg-white"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-400 cse-tabular">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 cse-tabular">
                    {tool.standalonePrice} ج.م <span className="text-[10px] text-zinc-400">منفردة</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-950 mb-1.5">
                  {tool.name}
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                  {tool.description}
                </p>
              </div>

              <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {tool.keyFeature}
                </span>
                <span className="text-zinc-500 bg-black/[0.04] px-2 py-0.5 rounded text-[10px] font-semibold">
                  مشمولة بالباقة
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade Banner */}
        <div className="cse-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-zinc-950 text-white">
          <div className="text-right">
            <h4 className="text-lg font-bold mb-1">
              تريد تشغيل الـ 17 أداة على متجرك فوراً؟
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400">
              تفعيل فوري لكافة الأدوات بضغطة زر واحدة دون الحاجة لمساعدة تقنية أو إعدادات برمجية معقدة.
            </p>
          </div>

          <button
            onClick={onPricingScroll}
            type="button"
            className="cse-btn-secondary whitespace-nowrap text-sm py-3 px-6 w-full sm:w-auto font-bold"
          >
            <span>اشترك في الباقة الكاملة (999 ج.م)</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
