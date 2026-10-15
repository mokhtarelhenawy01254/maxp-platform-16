import React from "react";
import {
  SparklesIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
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
  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* Honest Responsive Status Card */}
      <div className="rounded-xl border border-[#e4ddff] bg-gradient-to-br from-[#fbfaff] to-[#f4f0ff] p-4 space-y-3 text-start">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7c5cff] text-white shadow-xs">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div>
            <b className="block text-[12px] font-bold text-[#38249c]">قواعد التجاوب الذكية</b>
            <span className="text-[10px] text-[#7c5cff] font-semibold">مرحلة التجهيز والربط</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#e2dafc] bg-white/80 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#5b4cb5] font-bold text-[11px]">
            <ClockIcon className="h-3.5 w-3.5 text-[#7c5cff]" />
            <span>قيد التجهيز</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5b4cb5]">
            قواعد التجاوب الذكية قيد التجهيز — هنوصّل التحكم الكامل لكل نقطة توقف قريبًا.
          </p>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => onSwitchDevice("mobile")}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#d8ceff] bg-white py-2 text-center text-[11.5px] font-bold text-[#5b48c8] hover:bg-[#faf9ff] transition-all shadow-xs"
          >
            <DevicePhoneMobileIcon className="h-4 w-4 text-[#7c5cff]" />
            <span>معاينة شاشة الجوال (375px)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
