import React, { useState } from "react";
import {
  PaintBrushIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  SparklesIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel } from "../sections/manifest";
import type { StudioInspectorTab, StudioDeviceMode } from "./StudioTypes";
import { StudioInspectorDesignTab } from "./inspector/StudioInspectorDesignTab";
import { StudioInspectorLayoutTab } from "./inspector/StudioInspectorLayoutTab";
import { StudioInspectorContentTab } from "./inspector/StudioInspectorContentTab";
import { StudioInspectorAiTab } from "./inspector/StudioInspectorAiTab";

interface StudioPropertyInspectorProps {
  selectedSectionKey: string;
  sectionConfig: any;
  deviceMode?: StudioDeviceMode;
  onClose: () => void;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: () => void;
  onSwitchDevice?: (device: StudioDeviceMode) => void;
}

export const StudioPropertyInspector: React.FC<StudioPropertyInspectorProps> = ({
  selectedSectionKey,
  sectionConfig,
  deviceMode = "desktop",
  onClose,
  onUpdateField,
  onOpenImagePicker,
  onSwitchDevice = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<StudioInspectorTab>("design");

  if (!selectedSectionKey || !sectionConfig) {
    return (
      <aside className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center bg-white border-s border-[#0c0d0f] select-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 end-3 rounded-lg p-1.5 text-[#8a8f96] hover:bg-[#f6f7f8] hover:text-[#17181c]"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b6cf6]/10 text-[#2b6cf6] mb-3">
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </div>
        <h3 className="text-xs font-bold text-[#17181c]">الفاحص (Inspector)</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8a8f96] max-w-[220px]">
          اختر أي قسم من الكانفس أو شجرة الطبقات لتعديل التصميم، التخطيط، والمحتوى فوراً.
        </p>
      </aside>
    );
  }

  const sectionType = typeof sectionConfig === "string" ? sectionConfig : sectionConfig.type;
  const label = getStorefrontSectionLabel(sectionType);
  const settings =
    typeof sectionConfig === "object" && sectionConfig !== null
      ? { ...(sectionConfig.settings || {}), ...sectionConfig }
      : {};

  const tabs: Array<{
    id: StudioInspectorTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "design", label: "تصميم", icon: PaintBrushIcon },
    { id: "layout", label: "تخطيط", icon: Squares2X2Icon },
    { id: "content", label: "محتوى", icon: DocumentTextIcon },
    { id: "interactions", label: "تفاعلات", icon: SparklesIcon },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-white border-s border-[#0c0d0f] select-none text-[#17181c]">
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#eeeef0]">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <b className="text-[12px] font-bold text-[#17181c] truncate">{label}</b>
          <span className="rounded bg-[#f4f5f7] px-2 py-0.5 text-[9.5px] font-semibold text-[#8a8f96] shrink-0 font-mono">
            {sectionType}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#f6f7f8] hover:text-[#17181c]"
          title="إغلاق الفاحص"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Top Tabs (Wix Studio 4 tabs) */}
      <div className="flex border-b border-[#eeeef0] bg-[#fafbfc]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === "design" && activeTab === "style") ||
            (tab.id === "interactions" && activeTab === "visibility");

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2 text-center text-[11px] font-medium transition-colors ${
                isActive ? "text-[#17181c] font-bold" : "text-[#7a7f87] hover:text-[#17181c]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 mx-auto mb-1" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2b6cf6]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Body Container */}
      <div className="flex-1 overflow-y-auto p-3.5 [scrollbar-width:thin]">
        {(activeTab === "design" || activeTab === "style") && (
          <StudioInspectorDesignTab
            sectionType={sectionType}
            settings={settings}
            deviceMode={deviceMode}
            onUpdateField={onUpdateField}
          />
        )}

        {activeTab === "layout" && (
          <StudioInspectorLayoutTab
            settings={settings}
            onUpdateField={onUpdateField}
          />
        )}

        {activeTab === "content" && (
          <StudioInspectorContentTab
            sectionType={sectionType}
            settings={settings}
            onUpdateField={onUpdateField}
            onOpenImagePicker={onOpenImagePicker}
          />
        )}

        {(activeTab === "interactions" || activeTab === "visibility") && (
          <StudioInspectorAiTab
            sectionType={sectionType}
            settings={settings}
            onUpdateField={onUpdateField}
            onSwitchDevice={onSwitchDevice}
          />
        )}
      </div>
    </aside>
  );
};
