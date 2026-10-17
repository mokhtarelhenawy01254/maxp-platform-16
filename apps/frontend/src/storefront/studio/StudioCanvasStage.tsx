import React, { useState } from "react";
import type { StudioDeviceMode, StudioZoomLevel } from "./StudioTypes";
import { StudioCanvasRuler } from "./StudioCanvasRuler";

interface StudioCanvasStageProps {
  deviceMode: StudioDeviceMode;
  zoomLevel?: StudioZoomLevel;
  children: React.ReactNode;
}

export const StudioCanvasStage: React.FC<StudioCanvasStageProps> = ({
  deviceMode,
  zoomLevel = 1,
  children,
}) => {
  const [scrollLeft, setScrollLeft] = useState(0);

  const getViewportMaxWidth = () => {
    if (deviceMode === "mobile") return "max-w-[375px]";
    if (deviceMode === "tablet") return "max-w-[768px]";
    return "max-w-[1200px]";
  };

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-[#e9ebf0] overflow-hidden select-none">
      {/* 1. Top Pixel Ruler (Follows Zoom and Device Breakpoint) */}
      <StudioCanvasRuler
        deviceMode={deviceMode}
        zoomLevel={zoomLevel}
        scrollLeft={scrollLeft}
      />

      {/* 2. Scrollable Canvas Desk Workspace - Single Unified Scroller */}
      <main
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        className="relative flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 pb-24 transition-all min-w-0 [scrollbar-width:thin]"
      >
        <div className="flex min-w-full w-max justify-center min-h-full py-2">
          <div
            style={{
              zoom: zoomLevel,
            }}
            className={`mx-auto w-full ${getViewportMaxWidth()} transition-all duration-200 shrink-0`}
          >
            {deviceMode === "mobile" ? (
              /* Smartphone Viewport */
              <div className="relative mx-auto overflow-hidden rounded-2xl sm:rounded-[2.5rem] border-2 sm:border-[8px] border-[#101114] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
                {/* Dynamic Island Pill */}
                <div className="absolute top-2 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
                  <div className="flex h-3.5 w-24 items-center justify-between rounded-full bg-black px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1c1d22]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0a192f]" />
                  </div>
                </div>

                {/* Mobile Viewport Container - Single scroller, no inner overflow-y-auto */}
                <div className="w-full overflow-hidden bg-background pt-6 pb-6 @container">
                  {children}
                </div>

                {/* Bottom Home Indicator */}
                <div className="absolute bottom-1 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
                  <div className="h-1 w-24 rounded-full bg-slate-400/50" />
                </div>
              </div>
            ) : deviceMode === "tablet" ? (
              /* Tablet Viewport - Single scroller, no inner overflow-y-auto */
              <div className="relative mx-auto overflow-hidden rounded-[1.75rem] border-[8px] border-[#101114] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
                <div className="w-full overflow-hidden bg-background">
                  {children}
                </div>
              </div>
            ) : (
              /* Desktop Viewport */
              <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-[#d6dae2] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)]">
                {children}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
