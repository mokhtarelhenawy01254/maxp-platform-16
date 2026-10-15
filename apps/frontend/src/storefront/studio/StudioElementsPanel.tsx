import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  Squares2X2Icon,
  PhotoIcon,
  Bars3BottomLeftIcon,
  QueueListIcon,
  SparklesIcon,
  CursorArrowRaysIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

interface StudioElementsPanelProps {
  onAddSection: (sectionType: string) => void;
  onOpenFullCatalog: () => void;
  onClose: () => void;
}

export const StudioElementsPanel: React.FC<StudioElementsPanelProps> = ({
  onAddSection,
  onOpenFullCatalog,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const quickElements = [
    { id: "text", label: "عنوان", type: "richtext", icon: Bars3BottomLeftIcon },
    { id: "hero", label: "بانر رئيسي", type: "hero-banner", icon: QueueListIcon },
    { id: "image", label: "صورة", type: "info-content", icon: PhotoIcon },
    { id: "grid", label: "شبكة", type: "featured-products", icon: Squares2X2Icon },
    { id: "button", label: "شريط عروض", type: "promo-strip", icon: CursorArrowRaysIcon },
    { id: "form", label: "نموذج", type: "newsletter", icon: EnvelopeIcon },
  ];

  const presets = [
    {
      id: "preset-products",
      title: "شبكة منتجات",
      sub: "4 أعمدة مع فلاتر",
      type: "featured-products",
      barColors: ["#b4552d", "#4b505a", "#4b505a"],
      icon: Squares2X2Icon,
    },
    {
      id: "preset-deal",
      title: "شريط عروض ومؤقت",
      sub: "عرض كامل",
      type: "countdown-banner",
      barColors: ["#b4552d", "#b4552d", "#4b505a"],
      icon: TagIcon,
    },
    {
      id: "preset-hero",
      title: "واجهة البطل الرئيسية",
      sub: "نص + زر + صورة",
      type: "hero-banner",
      barColors: ["#2b6cf6", "#4b505a", "#4b505a"],
      icon: SparklesIcon,
    },
    {
      id: "preset-trust",
      title: "شريط الموثوقية والضمان",
      sub: "4 شارات أمان وشحن",
      type: "features-bar",
      barColors: ["#3faa6f", "#4b505a", "#4b505a"],
      icon: ShieldCheckIcon,
    },
    {
      id: "preset-reviews",
      title: "آراء وتجارب العملاء",
      sub: "تقييمات بالنجوم",
      type: "reviews",
      barColors: ["#7c5cff", "#4b505a", "#4b505a"],
      icon: ChatBubbleBottomCenterTextIcon,
    },
  ];

  const filteredElements = quickElements.filter((el) =>
    el.label.includes(searchQuery)
  );
  const filteredPresets = presets.filter(
    (p) => p.title.includes(searchQuery) || p.sub.includes(searchQuery)
  );

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2c2f35]">
        <b className="text-[12.5px] font-bold text-[#f0f2f5]">إضافة عناصر وأقسام</b>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#2a2d33] hover:text-white"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative flex h-[34px] w-full items-center rounded-lg border border-[#32353b] bg-[#17181c] px-2.5 text-[11.5px] text-[#7e848d] focus-within:border-[#2b6cf6]">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#7e848d] ms-0.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن عنصر أو سيكشن…"
            className="w-full bg-transparent px-2 text-[#e6e8ec] placeholder-[#7e848d] outline-none text-[11.5px]"
          />
        </div>
      </div>

      {/* Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3.5 [scrollbar-width:thin]">
        {/* Quick Elements Grid */}
        <div>
          <span className="block text-[10px] font-bold tracking-wider text-[#8b9199] mb-2">
            العناصر الأساسية
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {filteredElements.map((el) => {
              const Icon = el.icon;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => onAddSection(el.type)}
                  className="group flex h-[62px] flex-col items-center justify-center gap-1 rounded-xl border border-[#33363c] bg-[#26292f] p-1 text-[10.5px] text-[#c3c7cd] transition-all hover:border-[#2b6cf6] hover:bg-[#2c313a] hover:text-white"
                >
                  <Icon className="h-4.5 w-4.5 text-[#d6dae0] group-hover:text-[#2b6cf6] transition-colors" />
                  <span className="leading-tight">{el.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ready Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[#8b9199]">
              أقسام جاهزة ✦
            </span>
            <button
              type="button"
              onClick={onOpenFullCatalog}
              className="text-[10px] text-[#2b6cf6] hover:underline"
            >
              الكتالوج الكامل ↗
            </button>
          </div>

          <div className="space-y-1.5">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onAddSection(preset.type)}
                className="group w-full overflow-hidden rounded-xl border border-[#33363c] bg-[#26292f] text-start transition-all hover:border-[#2b6cf6] hover:bg-[#2b3038]"
              >
                {/* Visual miniature banner */}
                <div className="flex h-10 w-full items-center justify-center gap-1.5 bg-gradient-to-r from-[#2d3037] to-[#3a3e46] px-2">
                  {preset.barColors.map((color, i) => (
                    <i
                      key={i}
                      style={{ backgroundColor: color }}
                      className="h-3.5 w-6 rounded-sm opacity-90 group-hover:scale-105 transition-transform"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between p-2">
                  <b className="text-[11px] font-bold text-[#e6e8ec] group-hover:text-white">
                    {preset.title}
                  </b>
                  <span className="text-[9.5px] text-[#98a0ab]">{preset.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="border-t border-dashed border-[#33363c] p-3 text-center">
        <p className="text-[10px] leading-relaxed text-[#7e848d]">
          انقر لإدراج العنصر مباشرة إلى الصفحة أو استعرض الكتالوج الموسّع
        </p>
      </div>
    </div>
  );
};
