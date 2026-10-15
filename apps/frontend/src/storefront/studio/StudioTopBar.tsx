import React from "react";
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { StudioDeviceMode, StudioZoomLevel } from "./StudioTypes";
import { StudioPageSelector } from "./StudioPageSelector";

interface StudioTopBarProps {
  storeName?: string;
  themeName: string;
  activePageKey: string;
  deviceMode: StudioDeviceMode;
  hasPendingChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  previewUrl?: string;
  zoomLevel?: StudioZoomLevel;
  onZoomChange?: (zoom: StudioZoomLevel) => void;
  showSpacingOverlay?: boolean;
  onToggleSpacingOverlay?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  isLeftDrawerOpen?: boolean;
  onToggleLeftDrawer?: () => void;
  onBack: () => void;
  onPageChange: (pageKey: string) => void;
  onDeviceChange: (mode: StudioDeviceMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard?: () => void;
  onSave: () => void;
  onOpenPreview: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  storeName = "متجري",
  themeName,
  activePageKey,
  deviceMode,
  hasPendingChanges,
  canUndo,
  canRedo,
  saving,
  previewUrl,
  zoomLevel = 1,
  onZoomChange,
  showSpacingOverlay = true,
  onToggleSpacingOverlay,
  isInspectorOpen = true,
  onToggleInspector,
  isLeftDrawerOpen = false,
  onToggleLeftDrawer,
  onBack,
  onPageChange,
  onDeviceChange,
  onUndo,
  onRedo,
  onDiscard,
  onSave,
  onOpenPreview,
}) => {
  return (
    <header className="sticky top-0 z-50 flex h-[50px] sm:h-[52px] w-full items-center justify-between border-b border-[#0c0d0f] bg-[#17181c] px-2 sm:px-3 text-[#e8eaee] select-none gap-1 sm:gap-2">
      {/* 1. Left Section (RTL Start): Back, Mark, Site, Autosave */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-[#9ba0a8] hover:bg-[#202226] hover:text-white transition-colors"
          title="العودة لإعدادات المتجر"
        >
          <ArrowLeftIcon className="h-4 w-4 rtl:rotate-180" />
        </button>

        {/* Brand Mark (hidden on tiny screens) */}
        <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-[13px] font-black text-white shadow-sm font-sans">
          م
        </div>

        {/* Site / Page Selector */}
        <div className="flex items-center gap-1">
          <StudioPageSelector
            activePageKey={activePageKey}
            onPageChange={onPageChange}
          />
        </div>

        {/* Mobile Elements Button */}
        {onToggleLeftDrawer && (
          <button
            type="button"
            onClick={onToggleLeftDrawer}
            className={`flex md:hidden h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-all ${
              isLeftDrawerOpen
                ? "bg-[#2b6cf6] text-white"
                : "bg-[#202226] text-[#9ba0a8] hover:text-white"
            }`}
            title="إضافة عناصر وأقسام"
          >
            <span>+ عناصر</span>
          </button>
        )}

        {/* Autosave badge (Responsive - compact on mobile, full on desktop) */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-[#1e2430] px-1.5 sm:px-2.5 py-1 text-[11px] font-medium text-[#8fa4c8]"
          title={
            saving
              ? "جاري الحفظ…"
              : hasPendingChanges
              ? "تعديلات غير منشورة"
              : "تم الحفظ ✓"
          }
        >
          {saving ? (
            <>
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
              <span className="hidden sm:inline">جاري الحفظ…</span>
            </>
          ) : hasPendingChanges ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="hidden sm:inline text-amber-300">تعديلات غير منشورة</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-emerald-300">تم الحفظ ✓</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Center: Responsive Breakpoints with Pixel Badges */}
      <div className="flex items-center rounded-xl bg-[#1d1f24] p-0.5 sm:p-1 gap-0.5 sm:gap-1 border border-[#2a2d33] shrink-0">
        {/* Desktop 1280 */}
        <button
          type="button"
          onClick={() => onDeviceChange("desktop")}
          className={`flex h-6 sm:h-7 items-center gap-1 rounded-lg px-1.5 sm:px-2.5 text-xs font-semibold transition-all ${
            deviceMode === "desktop"
              ? "bg-[#34383f] text-white shadow-xs"
              : "text-[#9ba0a8] hover:text-[#e8eaee]"
          }`}
          title="سطح المكتب (1280px)"
        >
          <ComputerDesktopIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">سطح المكتب</span>
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[9.5px] font-mono ${
            deviceMode === "desktop" ? "bg-[#464b54] text-[#d5d9df]" : "bg-[#2a2d33] text-[#808791]"
          }`}>
            1280
          </span>
        </button>

        {/* Tablet 768 */}
        <button
          type="button"
          onClick={() => onDeviceChange("tablet")}
          className={`flex h-6 sm:h-7 items-center gap-1 rounded-lg px-1.5 sm:px-2 text-xs font-semibold transition-all ${
            deviceMode === "tablet"
              ? "bg-[#34383f] text-white shadow-xs"
              : "text-[#9ba0a8] hover:text-[#e8eaee]"
          }`}
          title="شاشة تابلت (768px)"
        >
          <DeviceTabletIcon className="h-3.5 w-3.5" />
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[9.5px] font-mono ${
            deviceMode === "tablet" ? "bg-[#464b54] text-[#d5d9df]" : "bg-[#2a2d33] text-[#808791]"
          }`}>
            768
          </span>
        </button>

        {/* Mobile 375 */}
        <button
          type="button"
          onClick={() => onDeviceChange("mobile")}
          className={`flex h-6 sm:h-7 items-center gap-1 rounded-lg px-1.5 sm:px-2 text-xs font-semibold transition-all ${
            deviceMode === "mobile"
              ? "bg-[#34383f] text-white shadow-xs"
              : "text-[#9ba0a8] hover:text-[#e8eaee]"
          }`}
          title="هاتف جوال (375px)"
        >
          <DevicePhoneMobileIcon className="h-3.5 w-3.5" />
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[9.5px] font-mono ${
            deviceMode === "mobile" ? "bg-[#464b54] text-[#d5d9df]" : "bg-[#2a2d33] text-[#808791]"
          }`}>
            375
          </span>
        </button>
      </div>

      {/* 3. Right: Zoom, Spacing Guides, Undo/Redo, Preview, Save */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Zoom Selector */}
        {onZoomChange && (
          <div className="hidden xl:flex items-center gap-1 text-[11px] text-[#9ba0a8] px-1">
            <button
              type="button"
              onClick={() => onZoomChange(zoomLevel === 1 ? 0.75 : zoomLevel === 0.75 ? 0.5 : 1)}
              className="rounded-md bg-[#202226] px-2 py-1 text-[10.5px] hover:text-white"
            >
              {Math.round(zoomLevel * 100)}% ▾
            </button>
          </div>
        )}

        {/* Spacing Overlay Toggle */}
        {onToggleSpacingOverlay && (
          <button
            type="button"
            onClick={onToggleSpacingOverlay}
            className={`hidden sm:flex h-7 sm:h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors ${
              showSpacingOverlay
                ? "bg-[#26312a] text-[#3faa6f] border border-[#3faa6f]/30"
                : "text-[#9ba0a8] hover:bg-[#202226] hover:text-white"
            }`}
            title={showSpacingOverlay ? "إخفاء محدد المسافات الملوّن" : "إظهار محدد المسافات الملوّن"}
          >
            <span className="h-2 w-2 rounded-full bg-[#3faa6f]" />
            <span className="hidden md:inline">المسافات</span>
          </button>
        )}

        {/* Undo / Redo (hidden on mobile to ensure Publish and Inspector fit) */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="hidden sm:flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-lg text-[#c3c7cd] hover:bg-[#202226] disabled:opacity-30"
          title="تراجع (Ctrl+Z)"
        >
          <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="hidden sm:flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-lg text-[#c3c7cd] hover:bg-[#202226] disabled:opacity-30"
          title="إعادة (Ctrl+Y)"
        >
          <ArrowUturnRightIcon className="h-3.5 w-3.5" />
        </button>

        {/* Inspector Toggle (Responsive - available on all viewports) */}
        {onToggleInspector && (
          <button
            type="button"
            onClick={onToggleInspector}
            className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg px-1.5 sm:px-2 text-[11px] font-medium transition-colors ${
              isInspectorOpen
                ? "bg-[#2b6cf6]/20 text-[#60a5fa] border border-[#2b6cf6]/40"
                : "text-[#9ba0a8] hover:bg-[#202226] hover:text-white"
            }`}
            title={isInspectorOpen ? "إخفاء لوحة الفاحص" : "إظهار لوحة الفاحص"}
          >
            <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الفاحص</span>
          </button>
        )}

        {/* Live Preview Button */}
        <button
          type="button"
          onClick={onOpenPreview}
          className="flex h-7 sm:h-8 items-center gap-1 rounded-lg border border-[#32353b] bg-[#202226] px-2 sm:px-3 text-xs font-semibold text-[#e8eaee] hover:bg-[#282b30] hover:text-white transition-colors"
          title="معاينة المتجر في تبويب مستقل"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">معاينة</span>
        </button>

        {/* Publish / Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-7 sm:h-8 items-center gap-1 rounded-lg bg-[#2b6cf6] px-2.5 sm:px-4 text-xs font-bold text-white shadow-md hover:bg-[#1d5ce6] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">جاري النشر…</span>
            </>
          ) : (
            <span>نشر</span>
          )}
        </button>
      </div>
    </header>
  );
};
