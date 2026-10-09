import React, { useState } from "react";
import {
  Boxes,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { CLOTHING_TOOLS_DATA, TOTAL_STANDALONE_PRICE } from "./clothingStoreData";
import { PlatformToolItem } from "./types";

interface ClothingStoreToolsGridProps {
  onSelectBundle: () => void;
}

export const ClothingStoreToolsGrid: React.FC<ClothingStoreToolsGridProps> = ({
  onSelectBundle,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "جميع الأدوات (17)" },
    { id: "store", label: "المتجر والطلب" },
    { id: "inventory", label: "المقاسات والمخزون" },
    { id: "shipping", label: "الشحن وبوسطة" },
    { id: "operations", label: "الفروع والكاشير" },
    { id: "marketing", label: "التسويق والمبيعات" },
  ];

  const filteredTools =
    activeCategory === "all"
      ? CLOTHING_TOOLS_DATA
      : CLOTHING_TOOLS_DATA.filter((tool) => tool.category === activeCategory);

  return (
    <section id="tools" className="py-20 border-b border-white/5 bg-[#050608]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="text-right max-w-2xl">
            <div className="csn-badge mb-3">
              <Boxes className="w-3.5 h-3.5 text-blue-400" />
              <span>مصفوفة الأدوات المتكاملة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight csn-text-balance mb-3">
              17 تطبيقاً متخصصاً في شاشة واحدة بدلاً من الاشتراك في 10 برامج منفصلة
            </h2>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed csn-text-pretty">
              تكلفة شراء هذه الأدوات كل واحدة على حدة تصل إلى{" "}
              <span className="text-white font-bold csn-tabular">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
              </span>{" "}
              شهرياً. باقة المتجر الكاملة تجمعها لك في نظام سحابي موحد مقابل{" "}
              <span className="text-blue-400 font-bold csn-tabular">999 ج.م</span> فقط.
            </p>
          </div>

          {/* Arbitrage Callout Card */}
          <div className="csn-panel p-4 flex items-center justify-between gap-6 bg-white/[0.02]">
            <div className="text-right">
              <div className="text-xs text-gray-400">سعر الأدوات منفصلة</div>
              <div className="text-sm text-gray-500 line-through csn-tabular">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م / شهر
              </div>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div className="text-right">
              <div className="text-xs text-blue-400 font-semibold">سعر الباقة الموحدة</div>
              <div className="text-lg font-bold text-white csn-tabular">
                999 ج.م <span className="text-xs text-gray-400 font-normal">/ شهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 text-xs font-medium no-scrollbar">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`py-2 px-3.5 rounded-lg whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-white text-black border-white font-bold shadow-sm"
                    : "bg-white/[0.03] text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
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
              className="csn-panel p-5 flex flex-col justify-between hover:border-white/20 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500 csn-tabular">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-gray-400 font-medium csn-tabular">
                    {tool.standalonePrice} ج.م <span className="text-[10px] text-gray-500">منفردة</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  {tool.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {tool.keyFeature}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                  شاملة بالباقة
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Trigger */}
        <div className="csn-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-blue-950/20 via-[#090a0f] to-[#090a0f]">
          <div className="text-right">
            <h4 className="text-lg font-bold text-white mb-1">
              جاهز لتشغيل الـ 17 أداة على متجرك دفعة واحدة؟
            </h4>
            <p className="text-xs sm:text-sm text-gray-400">
              تفعيل فوري لكافة الأدوات بضغطة زر دون الحاجة لتهيئة معقدة أو مساعدة فنية خارجية.
            </p>
          </div>

          <button
            onClick={onSelectBundle}
            type="button"
            className="csn-btn-primary whitespace-nowrap text-sm py-3 px-6 w-full sm:w-auto"
          >
            <span>اشترك في الباقة الكاملة (999 ج.م)</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
