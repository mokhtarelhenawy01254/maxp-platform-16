import React from "react";
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
  const getViewportMaxWidth = () => {
    if (deviceMode === "mobile") return "max-w-[375px]";
    if (deviceMode === "tablet") return "max-w-[768px]";
    return "max-w-[1240px]";
  };

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-[#26282d] overflow-hidden select-none">
      {/* 1. Top Pixel Ruler */}
      <StudioCanvasRuler deviceMode={deviceMode} />

      {/* 2. Scrollable Canvas Desk Workspace */}
      <main className="relative flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 transition-all min-w-0 [scrollbar-width:thin]">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className={`mx-auto w-full ${getViewportMaxWidth()} transition-all duration-200`}
        >
          {deviceMode === "mobile" ? (
            /* Smartphone Viewport */
            <div className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[8px] border-[#101114] bg-white shadow-[0_30px_70px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
              {/* Dynamic Island Pill */}
              <div className="absolute top-2 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="flex h-3.5 w-24 items-center justify-between rounded-full bg-black px-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1c1d22]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0a192f]" />
                </div>
              </div>

              {/* Mobile Viewport Container */}
              <div className="w-full overflow-y-auto overflow-x-hidden bg-background pt-6 [scrollbar-width:none]">
                {children}
              </div>

              {/* Bottom Home Indicator */}
              <div className="absolute bottom-1 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="h-1 w-24 rounded-full bg-slate-400/50" />
              </div>
            </div>
          ) : deviceMode === "tablet" ? (
            /* Tablet Viewport */
            <div className="relative mx-auto overflow-hidden rounded-[1.75rem] border-[8px] border-[#101114] bg-white shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
              <div className="w-full overflow-y-auto overflow-x-hidden bg-background [scrollbar-width:none]">
                {children}
              </div>
            </div>
          ) : (
            /* Desktop Viewport */
            <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-[#32353b]/40 bg-white shadow-[0_26px_60px_rgba(0,0,0,0.5)]">
              {children}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
