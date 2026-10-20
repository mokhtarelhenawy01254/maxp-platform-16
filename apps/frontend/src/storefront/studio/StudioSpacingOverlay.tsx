import React from "react";
import { parseFreeNumber } from "./utils/studioStyleUtils";

interface StudioSpacingOverlayProps {
  settings?: Record<string, any>;
  sectionLabel?: string;
  onUpdateField?: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
}

export const StudioSpacingOverlay: React.FC<StudioSpacingOverlayProps> = ({
  settings = {},
  sectionLabel,
}) => {
  const paddingTop = parseFreeNumber(
    settings.paddingTop ?? settings.padding ?? 24
  );
  const paddingBottom = parseFreeNumber(
    settings.paddingBottom ?? settings.padding ?? 24
  );
  const paddingRight = parseFreeNumber(
    settings.paddingRight ?? settings.padding ?? 32
  );
  const paddingLeft = parseFreeNumber(
    settings.paddingLeft ?? settings.padding ?? 32
  );

  const marginTop = parseFreeNumber(settings.marginTop, 0);
  const marginBottom = parseFreeNumber(settings.marginBottom, 0);
  const borderRadius = settings.borderRadius ?? "0";

  // Visual bar thickness capped for UX (min 16px if > 0, max 72px)
  const visualTopH = paddingTop > 0 ? Math.min(72, Math.max(18, paddingTop)) : 0;
  const visualBottomH = paddingBottom > 0 ? Math.min(72, Math.max(18, paddingBottom)) : 0;
  const visualRightW = paddingRight > 0 ? Math.min(72, Math.max(20, paddingRight)) : 0;
  const visualLeftW = paddingLeft > 0 ? Math.min(72, Math.max(20, paddingLeft)) : 0;

  const visualMarginTopH = marginTop > 0 ? Math.min(48, Math.max(14, marginTop)) : 0;
  const visualMarginBottomH = marginBottom > 0 ? Math.min(48, Math.max(14, marginBottom)) : 0;

  return (
    <div
      data-studio-spacing-overlay="true"
      className="pointer-events-none absolute inset-0 z-25 overflow-visible select-none font-sans"
    >
      {/* 1. Margin Top Bar (Outer Amber / Orange) */}
      {visualMarginTopH > 0 && (
        <div
          data-spacing-bar="margin-top"
          style={{ height: `${visualMarginTopH}px` }}
          className="absolute inset-x-0 -top-[var(--m-top)] border-b border-dashed border-amber-500/80 bg-amber-500/15 flex items-center justify-center transition-all"
        >
          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs font-mono">
            margin-top: {marginTop}px
          </span>
        </div>
      )}

      {/* 2. Margin Bottom Bar */}
      {visualMarginBottomH > 0 && (
        <div
          data-spacing-bar="margin-bottom"
          style={{ height: `${visualMarginBottomH}px` }}
          className="absolute inset-x-0 -bottom-[var(--m-btm)] border-t border-dashed border-amber-500/80 bg-amber-500/15 flex items-center justify-center transition-all"
        >
          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs font-mono">
            margin-bottom: {marginBottom}px
          </span>
        </div>
      )}

      {/* 3. Outer boundary hairline */}
      <div className="absolute inset-0 border border-emerald-500/40 pointer-events-none" />

      {/* 4. Padding Top Bar (Inner Emerald) */}
      <div
        data-spacing-bar="padding-top"
        style={{ height: `${visualTopH}px` }}
        className="absolute inset-x-0 top-0 border-b border-dashed border-emerald-500/70 bg-emerald-500/15 flex items-center justify-center transition-all"
      >
        <span className="rounded bg-emerald-700/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-100 shadow-xs font-mono">
          padding-top: {paddingTop}px
        </span>
      </div>

      {/* 5. Padding Bottom Bar */}
      <div
        data-spacing-bar="padding-bottom"
        style={{ height: `${visualBottomH}px` }}
        className="absolute inset-x-0 bottom-0 border-t border-dashed border-emerald-500/70 bg-emerald-500/15 flex items-center justify-center transition-all"
      >
        <span className="rounded bg-emerald-700/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-100 shadow-xs font-mono">
          padding-bottom: {paddingBottom}px
        </span>
      </div>

      {/* 6. Padding Right Bar */}
      <div
        data-spacing-bar="padding-right"
        style={{
          width: `${visualRightW}px`,
          top: `${visualTopH}px`,
          bottom: `${visualBottomH}px`,
        }}
        className="absolute end-0 border-s border-dashed border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center transition-all"
      >
        <span className="rounded bg-emerald-800/80 px-1 py-0.5 text-[8.5px] font-bold text-emerald-100 shadow-xs font-mono">
          {paddingRight}px
        </span>
      </div>

      {/* 7. Padding Left Bar */}
      <div
        data-spacing-bar="padding-left"
        style={{
          width: `${visualLeftW}px`,
          top: `${visualTopH}px`,
          bottom: `${visualBottomH}px`,
        }}
        className="absolute start-0 border-e border-dashed border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center transition-all"
      >
        <span className="rounded bg-emerald-800/80 px-1 py-0.5 text-[8.5px] font-bold text-emerald-100 shadow-xs font-mono">
          {paddingLeft}px
        </span>
      </div>

      {/* 8. Center Box Dimension Pill */}
      <div
        data-spacing-dimension="center"
        className="absolute start-3 bottom-3 z-30 flex items-center gap-1.5 rounded-md bg-[#17181c]/90 px-2 py-1 text-[9.5px] font-semibold text-emerald-300 border border-emerald-500/30 shadow-lg backdrop-blur-xs font-mono"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          حشوة: {paddingTop}px × {paddingRight}px
        </span>
        {borderRadius && borderRadius !== "0" && borderRadius !== "none" && (
          <span className="border-s border-emerald-500/30 ps-1.5 text-zinc-300">
            استدارة: {borderRadius}
          </span>
        )}
      </div>
    </div>
  );
};
