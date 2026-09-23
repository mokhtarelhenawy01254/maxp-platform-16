import React from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  PaintBrushIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { type StudioDeviceMode } from "./StudioTypes";
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/95 px-3 backdrop-blur-md transition-all sm:px-6">
      {/* Left: Breadcrumbs & Store Info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          title="العودة لإعدادات المتجر"
        >
          <ArrowLeftIcon className="h-4 w-4 rtl:rotate-180" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-black text-foreground text-xs sm:text-sm">{storeName}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-primary tracking-wider">
              {themeName}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">استوديو التصميم البصري 2026</p>
        </div>
      </div>

      {/* Center: Page Switcher & Responsive Device Selector */}
      <div className="flex items-center gap-2">
        {/* Page Switcher Dropdown */}
        <StudioPageSelector
          activePageKey={activePageKey}
          onPageChange={onPageChange}
        />

        {/* Device Switcher (Desktop / Tablet / Mobile) */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onDeviceChange("desktop")}
            className={`rounded-lg p-1.5 transition-all ${
              deviceMode === "desktop"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة شاشة الكمبيوتر (100%)"
          >
            <ComputerDesktopIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeviceChange("tablet")}
            className={`rounded-lg p-1.5 transition-all ${
              deviceMode === "tablet"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة شاشة التابلت (768px)"
          >
            <DeviceTabletIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeviceChange("mobile")}
            className={`rounded-lg p-1.5 transition-all ${
              deviceMode === "mobile"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="معاينة الهاتف المحمول (390px)"
          >
            <DevicePhoneMobileIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right: History, Discard, Preview, and Save Button */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-40"
            title="تراجع (Ctrl+Z)"
          >
            <ArrowUturnLeftIcon className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-40"
            title="إعادة (Ctrl+Y)"
          >
            <ArrowUturnRightIcon className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        </div>

        {/* Discard Changes Button (Visible only when changes are pending) */}
        {hasPendingChanges && onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            className="hidden sm:inline-flex h-9 items-center rounded-xl border border-destructive/30 bg-destructive/5 px-3 text-xs font-bold text-destructive transition-all hover:bg-destructive/15 active:scale-95"
            title="تجاهل كافة التعديلات غير المحفوظة"
          >
            تجاهل التعديلات
          </button>
        )}

        {/* Live Preview Button */}
        {previewUrl ? (
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
            title="معاينة المتجر في تبويب جديد"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span className="hidden lg:inline">معاينة المتجر</span>
          </button>
        ) : null}

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasPendingChanges}
          className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-black transition-all active:scale-95 ${
            hasPendingChanges
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "bg-muted text-muted-foreground opacity-70 hover:opacity-100"
          }`}
        >
          {saving ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          <span>{saving ? "جاري الحفظ..." : hasPendingChanges ? "حفظ التعديلات" : "محفوظ"}</span>
        </button>
      </div>
    </header>
  );
};
