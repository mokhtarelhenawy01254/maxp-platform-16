import React from "react";

interface StudioStatusBarProps {
  pageLabel: string;
  selectedSectionLabel?: string;
  selectedSectionType?: string;
  deviceMode: string;
}

export const StudioStatusBar: React.FC<StudioStatusBarProps> = ({
  pageLabel,
  selectedSectionLabel,
  selectedSectionType,
  deviceMode,
}) => {
  return (
    <footer
      role="status"
      aria-label="شريط معلومات الاستوديو"
      className="flex h-[30px] w-full shrink-0 items-center justify-between border-t border-[#0c0d0f] bg-[#17181c] px-3.5 text-[11px] text-[#9ba0a8] select-none z-30"
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 overflow-hidden truncate">
        <span>الهيكل</span>
        <span>←</span>
        <span>{pageLabel}</span>
        {selectedSectionLabel && (
          <>
            <span>←</span>
            <span className="text-[#c3c7cd]">{selectedSectionLabel}</span>
            {selectedSectionType && (
              <>
                <span>←</span>
                <b className="text-white font-semibold">{selectedSectionType}</b>
              </>
            )}
          </>
        )}
      </div>

      {/* Breakpoint status */}
      <div className="hidden sm:flex items-center gap-3">
        <span className="text-[10.5px]">
          قواعد المتجاوب: <b className="text-[#e6e8ec] font-semibold">3 نقاط توقف</b> ({deviceMode === "desktop" ? "1280px" : deviceMode === "tablet" ? "768px" : "375px"})
        </span>
      </div>

      {/* Keyboard Shortcuts helper */}
      <div className="hidden md:flex items-center gap-2 text-[10.5px]">
        <span>اختصارات ⌨:</span>
        <span className="rounded bg-[#2a2d33] px-1 py-0.5 text-[9.5px] text-[#808791]">Ctrl+S حفظ</span>
        <span className="rounded bg-[#2a2d33] px-1 py-0.5 text-[9.5px] text-[#808791]">Ctrl+Z تراجع</span>
        <span className="rounded bg-[#2a2d33] px-1 py-0.5 text-[9.5px] text-[#808791]">Ctrl+Y إعادة</span>
      </div>
    </footer>
  );
};
