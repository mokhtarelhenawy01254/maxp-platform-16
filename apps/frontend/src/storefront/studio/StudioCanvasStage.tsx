import React, { useState } from "react";
import {
  ArrowsPointingOutIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { StudioDeviceMode, StudioZoomLevel } from "./StudioTypes";

interface StudioCanvasStageProps {
  deviceMode: StudioDeviceMode;
  children: React.ReactNode;
}

export const StudioCanvasStage: React.FC<StudioCanvasStageProps> = ({
  deviceMode,
  children,
}) => {
  const [zoomLevel, setZoomLevel] = useState<StudioZoomLevel>(1);

  const handleZoom = (direction: "in" | "out" | "reset") => {
    if (direction === "reset") {
      setZoomLevel(1);
      return;
    }
    if (direction === "in" && zoomLevel < 1.25) {
      setZoomLevel((prev) => (prev <= 0.5 ? 0.75 : prev <= 0.75 ? 0.85 : prev <= 0.85 ? 1 : 1.25));
    }
    if (direction === "out" && zoomLevel > 0.5) {
      setZoomLevel((prev) => (prev >= 1.25 ? 1 : prev >= 1 ? 0.85 : prev >= 0.85 ? 0.75 : 0.5));
    }
  };

  const getViewportMaxWidth = () => {
    if (deviceMode === "mobile") return "w-full max-w-[390px]";
    if (deviceMode === "tablet") return "w-full max-w-[768px]";
    return "w-full max-w-[1240px]";
  };

  return (
    <main className="relative flex flex-1 flex-col justify-start overflow-y-auto overflow-x-auto bg-muted/20 p-2 sm:p-4 lg:p-6 transition-all min-w-0 [scrollbar-width:thin]">
      {/* Zoom Widget Overlay */}
      <div className="sticky top-2 z-30 mb-3 mx-auto flex items-center gap-1 rounded-2xl border border-border/80 bg-card/95 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom("out")}
          disabled={zoomLevel <= 0.5}
          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          title="تصغير"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 text-[11px] font-bold text-foreground tabular-nums">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          type="button"
          onClick={() => handleZoom("in")}
          disabled={zoomLevel >= 1.25}
          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          title="تكبير"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom("reset")}
          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="إعادة ضبط الحجم (100%)"
        >
          <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas Viewport Frame */}
      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: "top center",
          transition: "transform 0.2s ease-in-out",
        }}
        className={`mx-auto transition-all duration-300 ${getViewportMaxWidth()} min-w-0`}
      >
        {deviceMode === "mobile" ? (
          /* Smartphone Frame */
          <div className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[8px] border-slate-900 bg-slate-900 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] ring-1 ring-slate-800/60 dark:border-slate-800 dark:ring-slate-700/50">
            {/* Dynamic Island */}
            <div className="absolute top-2 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="flex h-4 w-24 items-center justify-between rounded-full bg-black px-2 shadow-inner">
                <span className="h-2 w-2 rounded-full bg-slate-900/80 ring-1 ring-slate-700/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#0a192f] ring-1 ring-blue-500/30" />
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="w-full overflow-y-auto overflow-x-hidden rounded-[2rem] bg-background pt-7 text-foreground [scrollbar-width:none]">
              {children}
            </div>

            {/* Bottom Home Indicator */}
            <div className="absolute bottom-1 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="h-1 w-28 rounded-full bg-slate-400/40 backdrop-blur-sm" />
            </div>
          </div>
        ) : deviceMode === "tablet" ? (
          /* Tablet Frame */
          <div className="relative mx-auto overflow-hidden rounded-[2rem] border-[8px] border-slate-900 bg-slate-900 shadow-2xl">
            <div className="w-full overflow-y-auto overflow-x-hidden rounded-[1.5rem] bg-background text-foreground [scrollbar-width:none]">
              {children}
            </div>
          </div>
        ) : (
          /* Desktop Fluid Frame */
          <div className="mx-auto w-full overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl">
            {children}
          </div>
        )}
      </div>
    </main>
  );
};
