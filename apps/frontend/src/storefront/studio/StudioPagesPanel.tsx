import React from "react";
import {
  XMarkIcon,
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { STUDIO_PAGES } from "./StudioTypes";

interface StudioPagesPanelProps {
  activePageKey: string;
  onSelectPage: (pageKey: string) => void;
  onClose: () => void;
  pageSectionCounts?: Record<string, number>;
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  shop: ShoppingBagIcon,
  pdp: CubeIcon,
  cart: ShoppingCartIcon,
  checkout: CreditCardIcon,
};

export const StudioPagesPanel: React.FC<StudioPagesPanelProps> = ({
  activePageKey,
  onSelectPage,
  onClose,
  pageSectionCounts = {},
}) => {
  return (
    <div className="flex h-full w-[280px] max-w-[85vw] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2c2f35]">
        <div>
          <b className="text-[12.5px] font-bold text-[#f0f2f5]">صفحات المتجر</b>
          <p className="text-[10px] text-[#8b9199] mt-0.5">تبديل وتحرير صفحات المتجر</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#2a2d33] hover:text-white"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 [scrollbar-width:thin]">
        {STUDIO_PAGES.map((page) => {
          const Icon = PAGE_ICONS[page.id] || HomeIcon;
          const isActive = activePageKey === page.id;
          const sectionCount = pageSectionCounts[page.id];

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(page.id)}
              className={`w-full text-start flex items-start gap-3 rounded-xl border p-2.5 transition-all ${
                isActive
                  ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-white shadow-xs ring-1 ring-[#2b6cf6]/30"
                  : "border-[#33363c] bg-[#26292f] text-[#c3c7cd] hover:border-[#424752] hover:bg-[#2a2e36] hover:text-white"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? "bg-[#2b6cf6] text-white" : "bg-[#1d1f24] text-[#8fa4c8]"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11.5px] font-bold truncate">{page.label}</span>
                  {isActive && (
                    <span className="flex items-center gap-0.5 text-[9.5px] text-[#60a5fa] font-bold">
                      <CheckCircleIcon className="h-3 w-3" />
                      <span>الحالية</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#8a8f96] line-clamp-1 mt-0.5">
                  {page.description}
                </p>
                {typeof sectionCount === "number" && (
                  <span className="inline-block mt-1 text-[9.5px] font-mono text-[#717782]">
                    {sectionCount} {sectionCount === 1 ? "قسم" : "أقسام"}
                  </span>
                )}
              </div>

              <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[#676c76] self-center rtl:rotate-180" />
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-[#2c2f35] p-3 text-[10px] text-[#8a8f96] leading-relaxed">
        <span>💡 يتم حفظ أي تعديلات على الصفحة المحددة تلقائيًا ضمن هوية متجرك.</span>
      </div>
    </div>
  );
};
