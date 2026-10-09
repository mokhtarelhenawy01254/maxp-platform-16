import React, { useState } from "react";
import { Check, Boxes, ArrowLeft } from "lucide-react";
import { CLOTHING_TOOLS_DATA, TOTAL_STANDALONE_PRICE } from "../clothingStoreData";
import { BlurFade } from "../../../../components/ui/luxury/BlurFade";

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
    <section id="editorial-tools" className="py-20 border-b border-black/[0.08] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="text-right max-w-2xl">
            <BlurFade delay={0.05}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-zinc-800 text-xs font-mono tracking-widest uppercase mb-3 border border-black/10">
                <Boxes className="w-3.5 h-3.5" />
                <span>STUDIO SUITE • مصفوفة الأدوات الـ 17</span>
              </div>
            </BlurFade>
            <BlurFade delay={0.1}>
              <h2 className="text-2xl sm:text-4xl font-black font-serif text-zinc-950 tracking-tight leading-[1.2] text-balance mb-2">
                17 أداة متخصصة لبراند الأزياء في شاشة واحدة
              </h2>
            </BlurFade>
            <BlurFade delay={0.15}>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                شراء هذه الأدوات منفصلة من شركات متعددة يكلفك{" "}
                <strong className="text-black cse-tabular">
                  {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
                </strong>{" "}
                شهرياً. باقة المتجر الكاملة تجمعها في اشتراك موحد بقيمة{" "}
                <strong className="text-emerald-700 cse-tabular">999 ج.م</strong> فقط.
              </p>
            </BlurFade>
          </div>

          {/* Arbitrage Callout */}
          <BlurFade delay={0.2}>
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-black/10 flex items-center justify-between gap-6 shadow-sm">
              <div className="text-right">
                <div className="text-xs text-zinc-500">سعر الأدوات فرادى</div>
                <div className="text-sm text-zinc-500 line-through cse-tabular">
                  {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م/شهر
                </div>
              </div>
              <div className="h-8 w-px bg-black/10" />
              <div className="text-right">
                <div className="text-xs text-zinc-500">باقة المتجر الكاملة</div>
                <div className="text-2xl font-black text-zinc-950 font-serif cse-tabular">
                  999 ج.م<span className="text-xs font-sans text-zinc-500 font-normal">/شهر</span>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Minimal Category Filter Pills */}
        <BlurFade delay={0.25}>
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 [scrollbar-width:none]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-black text-white shadow-sm"
                    : "bg-white text-zinc-600 hover:text-black border border-black/5 hover:border-black/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </BlurFade>

        {/* Seamless Minimalist Studio Matrix (Zero Ugly Boxes) */}
        <BlurFade delay={0.3}>
          <div className="rounded-2xl bg-white border border-black/10 overflow-hidden shadow-sm">
            <div className="divide-y divide-black/5">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-mono text-xs text-zinc-500 cse-tabular w-8">
                      #{tool.id.toString().padStart(2, "0")}
                    </span>
                    <div>
                      <div className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-2">
                        <span>{tool.name}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                        {tool.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 line-through cse-tabular block">
                        {tool.standalonePrice} ج.م
                      </span>
                      <span className="text-xs text-emerald-700 font-bold">
                        مشمولة بالباقة
                      </span>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <button
            onClick={onPricingScroll}
            type="button"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-800 hover:text-black hover:underline cursor-pointer py-2.5 px-3 min-h-[32px]"
          >
            <span>اشترك في باقة الـ 999 ج.م ووفر تكلفة شراء الأدوات فرادى</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
