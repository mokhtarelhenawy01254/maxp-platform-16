import React from "react";
import { SparklesIcon, ComputerDesktopIcon, DeviceTabletIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { generateResponsiveSectionRules } from "../StudioResponsiveAIGenerator";
import type { StudioDeviceMode } from "../StudioTypes";

interface StudioInspectorAiTabProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onSwitchDevice: (device: StudioDeviceMode) => void;
}

export const StudioInspectorAiTab: React.FC<StudioInspectorAiTabProps> = ({
  sectionType,
  settings,
  onUpdateField,
  onBatchUpdateFields,
  onSwitchDevice,
}) => {
  const hideOnMobile = Boolean(settings.hideOnMobile);
  const hideOnTablet = Boolean(settings.hideOnTablet);
  const hideOnDesktop = Boolean(settings.hideOnDesktop);

  const handleGenerateResponsiveAI = () => {
    const rules = generateResponsiveSectionRules(sectionType, settings);
    if (onBatchUpdateFields) {
      onBatchUpdateFields(rules);
    } else {
      Object.entries(rules).forEach(([key, val]) => {
        onUpdateField(key, val);
      });
    }
    toast.success("تم تطبيق القواعد المتجاوبة للجوال والتابلت بنجاح ✨");
  };

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Pro Smart Responsive Rules Card */}
      <div className="rounded-xl border border-[#e4ddff] bg-gradient-to-br from-[#fbfaff] to-[#f4f0ff] p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c5cff] text-white shadow-xs">
            <SparklesIcon className="h-3.5 w-3.5" />
          </div>
          <b className="text-[12px] font-bold text-[#38249c]">قواعد التجاوب الذكية</b>
        </div>

        <p className="text-[10.5px] leading-relaxed text-[#5b4cb5]">
          ضبط تلقائي للمسافات، عدد الأعمدة، وترتيب العناصر على شاشات الجوال والتابلت بدون تشويه التنسيق.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerateResponsiveAI}
            className="flex-1 rounded-lg bg-[#7c5cff] py-1.5 text-center text-[11px] font-bold text-white shadow-sm hover:bg-[#6c48f5] active:scale-95 transition-all"
          >
            تطبيق القواعد ✦
          </button>
          <button
            type="button"
            onClick={() => onSwitchDevice("mobile")}
            className="flex-1 rounded-lg border border-[#d8ceff] bg-white py-1.5 text-center text-[11px] font-bold text-[#5b48c8] hover:bg-[#faf9ff] transition-all"
          >
            معاينة الجوال
          </button>
        </div>
      </div>

      {/* 2. Breakpoint Visibility Rules */}
      <div className="overflow-hidden rounded-lg border border-[#ececee] p-3 bg-white space-y-2">
        <span className="block text-[10.5px] font-bold text-[#3f434a]">
          إظهار أو إخفاء القسم حسب نوع الشاشة
        </span>

        <div className="space-y-1.5 pt-1">
          <label className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2 cursor-pointer hover:bg-[#f2f4f7] transition-colors">
            <div className="flex items-center gap-2 text-[11px] text-[#3f434a]">
              <ComputerDesktopIcon className="h-4 w-4 text-[#8a8f96]" />
              <span>شاشة الكمبيوتر (Desktop)</span>
            </div>
            <input
              type="checkbox"
              checked={!hideOnDesktop}
              onChange={(e) => onUpdateField("hideOnDesktop", !e.target.checked)}
              className="accent-[#2b6cf6] h-4 w-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2 cursor-pointer hover:bg-[#f2f4f7] transition-colors">
            <div className="flex items-center gap-2 text-[11px] text-[#3f434a]">
              <DeviceTabletIcon className="h-4 w-4 text-[#8a8f96]" />
              <span>شاشة التابلت (Tablet)</span>
            </div>
            <input
              type="checkbox"
              checked={!hideOnTablet}
              onChange={(e) => onUpdateField("hideOnTablet", !e.target.checked)}
              className="accent-[#2b6cf6] h-4 w-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2 cursor-pointer hover:bg-[#f2f4f7] transition-colors">
            <div className="flex items-center gap-2 text-[11px] text-[#3f434a]">
              <DevicePhoneMobileIcon className="h-4 w-4 text-[#8a8f96]" />
              <span>شاشة الجوال (Mobile)</span>
            </div>
            <input
              type="checkbox"
              checked={!hideOnMobile}
              onChange={(e) => onUpdateField("hideOnMobile", !e.target.checked)}
              className="accent-[#2b6cf6] h-4 w-4 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
