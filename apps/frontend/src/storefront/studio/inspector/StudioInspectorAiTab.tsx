import React from "react";
import {
  SparklesIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { StudioDeviceMode } from "../StudioTypes";
import {
  hasDeviceOverrides,
  getDeviceOverridesCount,
  resolveEffectiveSectionSettings,
} from "../utils/studioStyleUtils";

interface StudioInspectorAiTabProps {
  sectionType: string;
  settings: Record<string, any>;
  deviceMode?: StudioDeviceMode;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onResetDeviceOverrides?: (device: "mobile" | "tablet") => void;
  onSwitchDevice: (device: StudioDeviceMode) => void;
}

export const StudioInspectorAiTab: React.FC<StudioInspectorAiTabProps> = ({
  sectionType,
  settings,
  deviceMode = "desktop",
  onUpdateField,
  onBatchUpdateFields,
  onResetDeviceOverrides,
  onSwitchDevice,
}) => {
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive ||
    {};

  const mobileOverrides = responsive.mobile || {};
  const tabletOverrides = responsive.tablet || {};

  const hasMobile = hasDeviceOverrides(settings, "mobile");
  const hasTablet = hasDeviceOverrides(settings, "tablet");
  const mobileCount = getDeviceOverridesCount(settings, "mobile");
  const tabletCount = getDeviceOverridesCount(settings, "tablet");

  const effectiveMobile = resolveEffectiveSectionSettings(settings, "mobile");

  const handleApplyCompactMobile = () => {
    if (onBatchUpdateFields) {
      onBatchUpdateFields(
        {
          paddingTop: 16,
          paddingBottom: 16,
          paddingRight: 12,
          paddingLeft: 12,
        }
      );
    } else {
      onUpdateField("paddingTop", 16);
      onUpdateField("paddingBottom", 16);
    }
  };

  const handleApplyStandardMobile = () => {
    if (onBatchUpdateFields) {
      onBatchUpdateFields(
        {
          paddingTop: 24,
          paddingBottom: 24,
          paddingRight: 16,
          paddingLeft: 16,
        }
      );
    } else {
      onUpdateField("paddingTop", 24);
      onUpdateField("paddingBottom", 24);
    }
  };

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Device Switcher Card */}
      <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-2 text-start">
        <span className="block text-[10px] font-bold text-[#64748b]">
          الجهاز النشط للتحرير (Active Viewport)
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onSwitchDevice("desktop")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10.5px] font-bold transition-all ${
              deviceMode === "desktop"
                ? "border-[#2b6cf6] bg-white text-[#2b6cf6] shadow-xs"
                : "border-[#e2e8f0] bg-white/60 text-[#64748b] hover:text-[#1e293b]"
            }`}
          >
            <ComputerDesktopIcon className="h-3.5 w-3.5" />
            <span>كمبيوتر</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchDevice("tablet")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10.5px] font-bold transition-all relative ${
              deviceMode === "tablet"
                ? "border-[#2b6cf6] bg-white text-[#2b6cf6] shadow-xs"
                : "border-[#e2e8f0] bg-white/60 text-[#64748b] hover:text-[#1e293b]"
            }`}
          >
            <DeviceTabletIcon className="h-3.5 w-3.5" />
            <span>تابلت</span>
            {hasTablet && (
              <span className="absolute top-1 end-1 h-1.5 w-1.5 rounded-full bg-[#2b6cf6]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSwitchDevice("mobile")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10.5px] font-bold transition-all relative ${
              deviceMode === "mobile"
                ? "border-[#2b6cf6] bg-white text-[#2b6cf6] shadow-xs"
                : "border-[#e2e8f0] bg-white/60 text-[#64748b] hover:text-[#1e293b]"
            }`}
          >
            <DevicePhoneMobileIcon className="h-3.5 w-3.5" />
            <span>جوال</span>
            {hasMobile && (
              <span className="absolute top-1 end-1 h-1.5 w-1.5 rounded-full bg-[#2b6cf6]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Mobile Responsive Status Card */}
      <div className="rounded-xl border border-[#ececee] bg-white p-3 space-y-2 text-start">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] pb-2">
          <div className="flex items-center gap-1.5">
            <DevicePhoneMobileIcon className="h-4 w-4 text-[#2b6cf6]" />
            <b className="text-[11.5px] font-bold text-[#17181c]">شاشة الجوال (&lt; 768px)</b>
          </div>
          {hasMobile ? (
            <span className="rounded bg-[#2b6cf6]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#2b6cf6]">
              {mobileCount} تخصيص نشط
            </span>
          ) : (
            <span className="rounded bg-[#f4f5f7] px-2 py-0.5 text-[9.5px] font-medium text-[#8a8f96]">
              يرث من الديسكتوب
            </span>
          )}
        </div>

        {hasMobile ? (
          <div className="space-y-1.5">
            <div className="rounded-lg bg-[#f8fafc] p-2 space-y-1 text-[10.5px]">
              {Object.entries(mobileOverrides).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between font-mono">
                  <span className="text-[#64748b]">{key}:</span>
                  <span className="font-bold text-[#1e293b]">{String(val)}px</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onResetDeviceOverrides?.("mobile")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 py-1.5 text-[10.5px] font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-3 w-3" />
              <span>تصفير قيم الجوال والعودة للوراثة</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10.5px] text-[#8a8f96] leading-relaxed">
              هذا القسم يرث كافة المسافات والتنسيقات من سطح المكتب تلقائيًا. بدّل إلى وضع الجوال لتخصيص قيم مستقلة.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onSwitchDevice("mobile");
                  handleApplyCompactMobile();
                }}
                className="rounded-lg border border-[#ececee] bg-[#f8fafc] p-2 text-center text-[10px] font-semibold text-[#17181c] hover:border-[#2b6cf6] transition-colors"
              >
                <span>مضغوط (16px)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchDevice("mobile");
                  handleApplyStandardMobile();
                }}
                className="rounded-lg border border-[#ececee] bg-[#f8fafc] p-2 text-center text-[10px] font-semibold text-[#17181c] hover:border-[#2b6cf6] transition-colors"
              >
                <span>قياسي (24px)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Tablet Responsive Status Card */}
      <div className="rounded-xl border border-[#ececee] bg-white p-3 space-y-2 text-start">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] pb-2">
          <div className="flex items-center gap-1.5">
            <DeviceTabletIcon className="h-4 w-4 text-[#64748b]" />
            <b className="text-[11.5px] font-bold text-[#17181c]">شاشة التابلت (768–1023px)</b>
          </div>
          {hasTablet ? (
            <span className="rounded bg-[#2b6cf6]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#2b6cf6]">
              {tabletCount} تخصيص نشط
            </span>
          ) : (
            <span className="rounded bg-[#f4f5f7] px-2 py-0.5 text-[9.5px] font-medium text-[#8a8f96]">
              يرث من الديسكتوب
            </span>
          )}
        </div>

        {hasTablet ? (
          <div className="space-y-1.5">
            <div className="rounded-lg bg-[#f8fafc] p-2 space-y-1 text-[10.5px]">
              {Object.entries(tabletOverrides).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between font-mono">
                  <span className="text-[#64748b]">{key}:</span>
                  <span className="font-bold text-[#1e293b]">{String(val)}px</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onResetDeviceOverrides?.("tablet")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 py-1.5 text-[10.5px] font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-3 w-3" />
              <span>تصفير قيم التابلت والعودة للوراثة</span>
            </button>
          </div>
        ) : (
          <p className="text-[10.5px] text-[#8a8f96] leading-relaxed">
            يرث تلقائيًا من سطح المكتب دون حاجة لتخصيص إلا عند الرغبة في تعديل المسافات للتابلت.
          </p>
        )}
      </div>
    </div>
  );
};
