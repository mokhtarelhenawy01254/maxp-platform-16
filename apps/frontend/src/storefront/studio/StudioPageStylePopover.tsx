import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  PaintBrushIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowPathIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  PAGE_STYLE_PRESETS,
  type PageStyleScope,
  type PageStylePreset,
  type PageStyleDensity,
  STUDIO_PAGES,
  type StudioPageDefinition,
} from "./StudioTypes";

interface StudioPageStylePopoverProps {
  activePageKey: string;
  customPages?: StudioPageDefinition[];
  pageStyle?: PageStyleScope;
  onApplyPreset: (presetId: string) => void;
  onUpdateStyle: (partial: Partial<PageStyleScope>) => void;
  onResetStyle: () => void;
}

const DENSITY_LABELS: Record<PageStyleDensity, { label: string; desc: string }> = {
  compact: { label: "مضغوط", desc: "مسافات صغيرة ومحتوى مكثف" },
  normal: { label: "متوازن", desc: "المسافات القياسية المتناسقة" },
  airy: { label: "هوائي", desc: "مسافات واسعة وشعور بالفخامة" },
};

const RADIUS_OPTIONS = [
  { label: "حاد (0px)", value: 0 },
  { label: "كلاسيك (4px)", value: 4 },
  { label: "ناعم (8px)", value: 8 },
  { label: "حديث (12px)", value: 12 },
  { label: "دائري (16px)", value: 16 },
  { label: "كبسولة (24px)", value: 24 },
];

export const StudioPageStylePopover: React.FC<StudioPageStylePopoverProps> = ({
  activePageKey,
  customPages = [],
  pageStyle,
  onApplyPreset,
  onUpdateStyle,
  onResetStyle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allPages = useMemo(() => {
    return [...STUDIO_PAGES, ...customPages];
  }, [customPages]);

  const activePageLabel = useMemo(() => {
    const page = allPages.find((p) => p.id === activePageKey);
    return page?.label || activePageKey;
  }, [allPages, activePageKey]);

  const activePreset = useMemo(() => {
    if (!pageStyle?.preset) return null;
    return PAGE_STYLE_PRESETS.find((p) => p.id === pageStyle.preset) || null;
  }, [pageStyle?.preset]);

  const hasCustomStyle = Boolean(
    pageStyle &&
      (pageStyle.preset ||
        pageStyle.accent ||
        pageStyle.fontFamily ||
        pageStyle.density ||
        pageStyle.radius !== undefined)
  );

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectPreset = useCallback(
    (preset: PageStylePreset) => {
      onApplyPreset(preset.id);
    },
    [onApplyPreset]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button in TopBar */}
      <button
        type="button"
        data-testid="page-style-scope-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="تعديل الطابع البصري للصفحة النشطة"
        title="تخصيص الهوية البصرية للصفحة النشطة (لون أكسنت، خط، مسافات، زوايا)"
        className={`group flex h-7 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold transition-all shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6cf6] ${
          isOpen
            ? "border-[#2b6cf6] bg-[#2b6cf6]/15 text-white ring-1 ring-[#2b6cf6]/40"
            : hasCustomStyle
            ? "border-[#3b82f6]/40 bg-[#1c2433] text-[#93c5fd] hover:border-[#3b82f6]/70 hover:bg-[#202b3d]"
            : "border-[#2a2d33] bg-[#1d1f24] text-[#9ba0a8] hover:border-[#3a3e47] hover:bg-[#23262d] hover:text-[#e8eaee]"
        }`}
      >
        {/* Swatch / Brush icon */}
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md transition-colors"
          style={{
            backgroundColor: pageStyle?.accent ? `${pageStyle.accent}25` : undefined,
            color: pageStyle?.accent || undefined,
          }}
        >
          <PaintBrushIcon className="h-3.5 w-3.5" />
        </span>

        {/* Button Label */}
        <span className="hidden md:inline">طابع الصفحة</span>

        {/* Active Preset Tag if applied */}
        {activePreset ? (
          <span
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: `${activePreset.accent}22`,
              color: activePreset.accent,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: activePreset.accent }}
            />
            <span>{activePreset.id}</span>
          </span>
        ) : hasCustomStyle ? (
          <span className="h-2 w-2 rounded-full bg-[#3b82f6] animate-pulse" />
        ) : null}

        <ChevronDownIcon
          className={`h-3 w-3 text-[#7e848d] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Chassis */}
      {isOpen && (
        <div
          data-testid="page-style-popover"
          className="absolute top-full start-0 mt-1.5 z-50 w-[340px] sm:w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl border border-[#2e323b] bg-[#17181c] p-3.5 shadow-2xl text-[#e8eaee] select-none"
          dir="rtl"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#252830]">
            <div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-[#3b82f6]" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  طابع الصفحة — {activePageLabel}
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-[#8e94a0]">
                تخصيص الهوية البصرية للصفحة مع بقاء الهيدر والفوتر موحدين
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[#7e848d] hover:bg-[#202226] hover:text-white transition-colors"
              title="إغلاق"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* 6 Art Direction Presets Section */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#c3c7cd]">
                الاتجاهات الفنية الجاهزة (Art Direction Presets)
              </span>
              <span className="text-[10px] text-[#7e848d]">6 اتجاهات</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PAGE_STYLE_PRESETS.map((preset) => {
                const isSelected =
                  pageStyle?.preset === preset.id ||
                  (pageStyle?.accent === preset.accent &&
                    pageStyle?.density === preset.density);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`preset-card-${preset.id}`}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-start transition-all ${
                      isSelected
                        ? "border-[#2b6cf6] bg-[#2b6cf6]/10 shadow-sm"
                        : "border-[#282b33] bg-[#1e2026] hover:border-[#3a3e47] hover:bg-[#23262d]"
                    }`}
                  >
                    {/* Top Row: Color swatch + Name + Check */}
                    <div className="flex w-full items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.accent }}
                        />
                        <span className="text-[11.5px] font-bold text-white truncate">
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="mt-1 text-[10px] text-[#8e94a0] line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Bottom Metadata Badges */}
                    <div className="mt-2 flex items-center gap-1 text-[9.5px]">
                      <span className="rounded bg-[#2a2d36] px-1.5 py-0.5 text-[#a8afba] font-medium">
                        {DENSITY_LABELS[preset.density]?.label || preset.density}
                      </span>
                      <span className="rounded bg-[#2a2d36] px-1.5 py-0.5 text-[#a8afba] font-mono">
                        {preset.radius}px
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Fine-Tuning Section */}
          <div className="mt-4 pt-3 border-t border-[#252830] space-y-3">
            <span className="block text-[11px] font-bold text-[#c3c7cd]">
              الضبط اليدوي المخصص (Manual Fine-Tuning)
            </span>

            {/* Accent Color picker */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-[#a0a6b2]">لون الأكسنت (Accent):</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  data-testid="page-style-color-picker"
                  value={pageStyle?.accent || "#2563eb"}
                  onChange={(e) => onUpdateStyle({ accent: e.target.value, preset: undefined })}
                  className="h-6 w-7 cursor-pointer rounded border border-[#32363f] bg-transparent p-0"
                />
                <input
                  type="text"
                  data-testid="page-style-hex-input"
                  value={pageStyle?.accent || ""}
                  placeholder="#2563EB"
                  onChange={(e) => onUpdateStyle({ accent: e.target.value, preset: undefined })}
                  className="h-6 w-20 rounded border border-[#2e323b] bg-[#1a1c22] px-1.5 text-[10.5px] font-mono text-white text-center focus:outline-none focus:border-[#2b6cf6]"
                />
              </div>
            </div>

            {/* Density Selector */}
            <div>
              <label className="block text-[11px] text-[#a0a6b2] mb-1.5">
                كثافة المسافات (Density):
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#1a1c22] p-0.5 border border-[#2a2d35]">
                {(["compact", "normal", "airy"] as PageStyleDensity[]).map((density) => {
                  const isActive = (pageStyle?.density || "normal") === density;
                  return (
                    <button
                      key={density}
                      type="button"
                      data-testid={`density-btn-${density}`}
                      onClick={() => onUpdateStyle({ density, preset: undefined })}
                      className={`rounded-md py-1 text-[10.5px] font-semibold transition-all ${
                        isActive
                          ? "bg-[#2b6cf6] text-white shadow-xs"
                          : "text-[#8e94a0] hover:text-white"
                      }`}
                    >
                      {DENSITY_LABELS[density].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Radius Selector */}
            <div>
              <label className="block text-[11px] text-[#a0a6b2] mb-1.5">
                انحناء الزوايا (Corner Radius):
              </label>
              <div className="grid grid-cols-3 gap-1">
                {RADIUS_OPTIONS.map((opt) => {
                  const isActive = pageStyle?.radius === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-testid={`radius-btn-${opt.value}`}
                      onClick={() => onUpdateStyle({ radius: opt.value, preset: undefined })}
                      className={`rounded-md py-1 px-1.5 text-[10px] font-medium border transition-all text-center ${
                        isActive
                          ? "border-[#2b6cf6] bg-[#2b6cf6]/15 text-[#60a5fa]"
                          : "border-[#2a2d33] bg-[#1a1c22] text-[#8e94a0] hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer with Reset to Defaults Button */}
          <div className="mt-4 pt-3 border-t border-[#252830] flex items-center justify-between">
            <button
              type="button"
              data-testid="page-style-reset-btn"
              onClick={onResetStyle}
              disabled={!hasCustomStyle}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#f87171] hover:bg-[#ef4444]/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              <span>إعادة ضبط الطابع (الافتراضي)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-[#242730] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#2c303c] transition-colors"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
