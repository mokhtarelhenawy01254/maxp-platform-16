import React, { useState } from "react";
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
  MinusIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckIcon,
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
  onFitWidth?: () => void;
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
  onFitWidth,
  showSpacingOverlay = true,
  onToggleSpacingOverlay,
  isInspectorOpen = false,
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
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);

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
        {/* Desktop 1200 */}
        <button
          type="button"
          onClick={() => onDeviceChange("desktop")}
          className={`flex h-6 sm:h-7 items-center gap-1 rounded-lg px-1.5 sm:px-2.5 text-xs font-semibold transition-all ${
            deviceMode === "desktop"
              ? "bg-[#34383f] text-white shadow-xs"
              : "text-[#9ba0a8] hover:text-[#e8eaee]"
          }`}
          title="سطح المكتب (1200px)"
        >
          <ComputerDesktopIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">سطح المكتب</span>
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[9.5px] font-mono ${
            deviceMode === "desktop" ? "bg-[#464b54] text-[#d5d9df]" : "bg-[#2a2d33] text-[#808791]"
          }`}>
            1200
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
        {/* Zoom Controls (25% - 200%) */}
        {onZoomChange && (
          <div className="relative hidden lg:flex items-center gap-0.5 rounded-lg bg-[#202226] p-0.5 border border-[#2c2f35]">
            {/* Minus 10% */}
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.25, Math.round((zoomLevel - 0.1) * 10) / 10))}
              disabled={zoomLevel <= 0.25}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9ba0a8] hover:bg-[#2a2d33] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="تصغير الزوم (Ctrl+-)"
            >
              <MinusIcon className="h-3 w-3" />
            </button>

            {/* Percentage Display & Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsZoomMenuOpen((prev) => !prev)}
                onDoubleClick={() => onZoomChange(1)}
                className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-mono text-[#c3c7cd] hover:bg-[#2a2d33] hover:text-white transition-colors"
                title="خيارات الزوم (اضغط لعرض القائمة، أو انقر مزدوجاً لإعادة 100%)"
              >
                <span>{Math.round(zoomLevel * 100)}%</span>
                <ChevronDownIcon className="h-2.5 w-2.5 text-[#7e848d]" />
              </button>

              {/* Presets Popover Menu */}
              {isZoomMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    onClick={() => setIsZoomMenuOpen(false)}
                  />
                  <div
                    className="absolute top-full start-0 mt-1 z-50 w-36 rounded-lg border border-[#32353b] bg-[#1d1f24] p-1 shadow-xl text-[11px]"
                    dir="rtl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onZoomChange(1);
                        setIsZoomMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-start text-[#e8eaee] hover:bg-[#2b6cf6] hover:text-white transition-colors font-medium"
                    >
                      <span>إعادة 100%</span>
                      <span className="text-[9.5px] text-[#7e848d] font-mono">Ctrl+0</span>
                    </button>
                    {onFitWidth && (
                      <button
                        type="button"
                        onClick={() => {
                          onFitWidth();
                          setIsZoomMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-start text-[#e8eaee] hover:bg-[#2b6cf6] hover:text-white transition-colors"
                      >
                        <span>ملاءمة العرض</span>
                        <span className="text-[9.5px] text-[#7e848d]">Fit</span>
                      </button>
                    )}
                    <div className="my-1 border-t border-[#2a2d33]" />
                    {[2, 1.5, 1.25, 1, 0.75, 0.5, 0.25].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          onZoomChange(preset);
                          setIsZoomMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-start transition-colors ${
                          Math.round(zoomLevel * 100) === Math.round(preset * 100)
                            ? "bg-[#2b6cf6]/20 text-[#60a5fa] font-bold"
                            : "text-[#c3c7cd] hover:bg-[#2a2d33] hover:text-white"
                        }`}
                      >
                        <span className="font-mono">{Math.round(preset * 100)}%</span>
                        {Math.round(zoomLevel * 100) === Math.round(preset * 100) && (
                          <CheckIcon className="h-3 w-3 text-[#60a5fa]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Plus 10% */}
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(2.0, Math.round((zoomLevel + 0.1) * 10) / 10))}
              disabled={zoomLevel >= 2.0}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9ba0a8] hover:bg-[#2a2d33] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="تكبير الزوم (Ctrl+=)"
            >
              <PlusIcon className="h-3 w-3" />
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
