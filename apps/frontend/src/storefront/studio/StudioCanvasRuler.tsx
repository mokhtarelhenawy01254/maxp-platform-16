import React from "react";
import type { StudioDeviceMode } from "./StudioTypes";

interface StudioCanvasRulerProps {
  deviceMode: StudioDeviceMode;
  zoomLevel?: number;
  scrollLeft?: number;
  selectedSectionWidth?: number;
}

export const StudioCanvasRuler: React.FC<StudioCanvasRulerProps> = ({
  deviceMode,
  zoomLevel = 1,
  scrollLeft = 0,
}) => {
  const getActiveWidth = () => {
    if (deviceMode === "mobile") return 375;
    if (deviceMode === "tablet") return 768;
    return 1200;
  };

  const activeWidth = getActiveWidth();
  const scaledWidth = Math.round(activeWidth * zoomLevel);

  const getRulerTicks = () => {
    if (deviceMode === "mobile") {
      return [0, 50, 100, 150, 200, 250, 300, 350, 375];
    }
    if (deviceMode === "tablet") {
      return [0, 100, 200, 300, 400, 500, 600, 700, 768];
    }
    return [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
  };

  const rulerTicks = getRulerTicks();

  return (
    <div
      role="region"
      aria-label="مسطرة قياس الكانفس"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, #2c2f35 0 1px, transparent 1px 10px)",
      }}
      className="relative hidden sm:flex h-[24px] w-full shrink-0 select-none overflow-hidden border-b border-[#101114] bg-[#1d1f24] text-[9px] text-[#8b939e] font-mono"
    >
      {/* Zoom-scaled active track, centered over canvas */}
      <div
        style={{
          width: `${scaledWidth}px`,
          transform: scrollLeft ? `translateX(${-scrollLeft}px)` : undefined,
        }}
        className="relative mx-auto h-full shrink-0 border-x border-[#2b6cf6] bg-[rgba(43,108,246,0.14)]"
        dir="ltr"
      >
        {/* Dynamic Active Width Badge */}
        <div className="absolute top-0.5 start-1.5 z-10 flex items-center gap-1 rounded bg-[#17181c]/90 px-1.5 py-0.5 text-[8.5px] font-bold text-[#8fa4c8] shadow-xs">
          <span>{activeWidth}px</span>
          {zoomLevel !== 1 && (
            <span className="text-[7.5px] text-[#60a5fa] font-mono">
              ({Math.round(zoomLevel * 100)}%)
            </span>
          )}
        </div>

        {/* Ticks positioned exactly along the scaled active width */}
        {rulerTicks.map((tick) => {
          const percent = (tick / activeWidth) * 100;
          const isFirst = tick === 0;
          const isLast = tick === activeWidth;

          return (
            <div
              key={tick}
              style={{
                left: `${percent}%`,
                transform: isFirst
                  ? "translateX(0)"
                  : isLast
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
              }}
              className="absolute bottom-0 flex flex-col items-center pointer-events-none"
            >
              <span
                className={`font-mono text-[8px] leading-tight select-none ${
                  isFirst || isLast
                    ? "text-[#e8eaee] font-bold"
                    : "text-[#8b939e]"
                }`}
              >
                {tick}
              </span>
              <span
                className={`w-[1px] ${
                  isFirst || isLast
                    ? "h-2 bg-[#2b6cf6]"
                    : tick % 100 === 0
                    ? "h-1.5 bg-[#4c525c]"
                    : "h-1 bg-[#373b43]"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
