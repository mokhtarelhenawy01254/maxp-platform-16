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
      setZoomLevel((prev) => (prev === 0.5 ? 0.75 : prev === 0.75 ? 1 : 1.25));
    }
    if (direction === "out" && zoomLevel > 0.5) {
      setZoomLevel((prev) => (prev === 1.25 ? 1 : prev === 1 ? 0.75 : 0.5));
    }
  };

  const getViewportMaxWidth = () => {
    if (deviceMode === "mobile") return "max-w-[420px]";
    if (deviceMode === "tablet") return "max-w-[768px]";
    return "w-full";
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-start overflow-y-auto overflow-x-hidden bg-muted/30 p-4 transition-all sm:p-8">
      {/* Zoom Widget Overlay */}
      <div className="sticky top-4 z-30 mb-4 flex items-center gap-1 rounded-2xl border border-border/80 bg-card/90 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom("out")}
          disabled={zoomLevel <= 0.5}
          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          title="تصغير"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 text-[11px] font-bold text-foreground">
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
          title="إعادة ضبط الحجم"
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
        className={`w-full transition-all duration-300 ${getViewportMaxWidth()}`}
      >
        {deviceMode === "mobile" ? (
          /* Smartphone Frame */
          <div className="relative overflow-hidden rounded-[3rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] ring-1 ring-slate-800/60 dark:border-slate-800 dark:ring-slate-700/50">
            {/* Dynamic Island */}
            <div className="absolute top-2.5 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="flex h-5 w-28 items-center justify-between rounded-full bg-black px-2 shadow-inner">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900/80 ring-1 ring-slate-700/50" />
                <span className="h-2 w-2 rounded-full bg-[#0a192f] ring-1 ring-blue-500/30" />
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="w-full overflow-y-auto overflow-x-hidden rounded-[2.25rem] bg-background pt-8 text-foreground [scrollbar-width:none]">
              {children}
            </div>

            {/* Bottom Home Indicator */}
            <div className="absolute bottom-1.5 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="h-1 w-32 rounded-full bg-slate-400/40 backdrop-blur-sm" />
            </div>
          </div>
        ) : deviceMode === "tablet" ? (
          /* Tablet Frame */
          <div className="relative overflow-hidden rounded-[2rem] border-[8px] border-slate-900 bg-slate-900 shadow-2xl">
            <div className="w-full overflow-y-auto overflow-x-hidden rounded-[1.5rem] bg-background text-foreground [scrollbar-width:none]">
              {children}
            </div>
          </div>
        ) : (
          /* Desktop Fluid Frame */
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl">
            {children}
          </div>
        )}
      </div>
    </main>
  );
};
