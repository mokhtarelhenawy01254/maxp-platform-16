import React from "react";
import {
  PlusIcon,
  Squares2X2Icon,
  DocumentDuplicateIcon,
  PhotoIcon,
  PaintBrushIcon,
  CodeBracketIcon,
  SparklesIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import type { StudioLeftRailTab } from "./StudioTypes";

interface StudioLeftRailProps {
  activeTab: StudioLeftRailTab;
  onSelectTab: (tab: StudioLeftRailTab) => void;
  onToggleTab: (tab: StudioLeftRailTab) => void;
  isPanelOpen: boolean;
  isAiActive?: boolean;
}

export const StudioLeftRail: React.FC<StudioLeftRailProps> = ({
  activeTab,
  onSelectTab,
  onToggleTab,
  isPanelOpen,
  isAiActive = false,
}) => {
  const items: Array<{
    id: StudioLeftRailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAi?: boolean;
  }> = [
    { id: "elements", label: "إضافة", icon: PlusIcon },
    { id: "layers", label: "الهيكل", icon: Squares2X2Icon },
    { id: "pages", label: "صفحات", icon: DocumentDuplicateIcon },
    { id: "media", label: "وسائط", icon: PhotoIcon },
    { id: "styles", label: "أنماط", icon: PaintBrushIcon },
  ];

  const handleClick = (id: StudioLeftRailTab) => {
    if (id === "media" || id === "ai") {
      onSelectTab(id);
      return;
    }
    if (activeTab === id && isPanelOpen) {
      onToggleTab(id);
    } else {
      onSelectTab(id);
    }
  };

  return (
    <aside
      role="toolbar"
      aria-label="شريط أدوات الاستوديو"
      className="hidden md:flex h-full w-[54px] shrink-0 flex-col items-center border-e border-[#0c0d0f] bg-[#17181c] py-2.5 gap-1.5 select-none z-20"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id && isPanelOpen;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            title={item.label}
            aria-pressed={isActive}
            className={`group relative flex h-10 w-10 flex-col items-center justify-center rounded-xl transition-all ${
              isActive
                ? "bg-[#2b6cf6] text-white shadow-[0_4px_14px_rgba(43,108,246,0.35)]"
                : "text-[#9ba0a8] hover:bg-[#202226] hover:text-[#e8eaee]"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            <span className="text-[8.5px] font-medium leading-none mt-1">{item.label}</span>
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Smart Responsive Tab Button */}
      <button
        type="button"
        onClick={() => handleClick("ai")}
        title="قواعد التجاوب الذكية"
        aria-pressed={isAiActive}
        className={`group relative flex h-10 w-10 flex-col items-center justify-center rounded-xl transition-all ${
          isAiActive
            ? "bg-[#7c5cff] text-white shadow-[0_4px_14px_rgba(124,92,255,0.4)]"
            : "text-[#b7a5ff] hover:bg-[#202226] hover:text-[#d3c7ff]"
        }`}
      >
        <SparklesIcon className="h-4.5 w-4.5" />
        <span className="text-[8.5px] font-bold leading-none mt-1">تجاوب</span>
      </button>

      {/* Settings Button */}
      <button
        type="button"
        onClick={() => handleClick("settings")}
        title="إعدادات المتجر"
        aria-pressed={activeTab === "settings" && isPanelOpen}
        className={`group relative flex h-10 w-10 flex-col items-center justify-center rounded-xl transition-all ${
          activeTab === "settings" && isPanelOpen
            ? "bg-[#2b6cf6] text-white"
            : "text-[#9ba0a8] hover:bg-[#202226] hover:text-[#e8eaee]"
        }`}
      >
        <Cog6ToothIcon className="h-4.5 w-4.5" />
        <span className="text-[8px] font-medium leading-none mt-1">إعدادات</span>
      </button>
    </aside>
  );
};
