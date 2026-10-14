import React from "react";
import type { StudioDeviceMode } from "./StudioTypes";

interface StudioCanvasRulerProps {
  deviceMode: StudioDeviceMode;
  selectedSectionWidth?: number;
}

export const StudioCanvasRuler: React.FC<StudioCanvasRulerProps> = ({
  deviceMode,
}) => {
  const rulerTicks = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];

  const getActiveWidth = () => {
    if (deviceMode === "mobile") return 375;
    if (deviceMode === "tablet") return 768;
    return 1200;
  };

  const activeWidth = getActiveWidth();

  return (
    <div
      role="region"
      aria-label="مسطرة قياس الكانفس"
      style={{
        backgroundImage: "repeating-linear-gradient(90deg, #2c2f35 0 1px, transparent 1px 10px)",
      }}
      className="relative hidden sm:flex h-[22px] w-full shrink-0 select-none overflow-hidden border-b border-[#101114] bg-[#1d1f24] text-[9px] text-[#8b939e] font-mono"
    >
      {/* Dynamic selection highlight range */}
      <div
        style={{
          width: `${Math.min(activeWidth, 1200)}px`,
        }}
        className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-x-2 border-[#2b6cf6] bg-[rgba(43,108,246,0.18)]"
      >
        <span className="absolute top-0.5 start-2 text-[8.5px] font-bold text-[#8fa4c8] bg-[#17181c]/80 px-1 rounded">
          {activeWidth}px*
        </span>
      </div>

      {/* Number Markers */}
      <div className="relative mx-auto flex h-full w-full max-w-[1280px] items-end justify-between px-3">
        {rulerTicks.map((tick) => (
          <span
            key={tick}
            className={`font-mono text-[8.5px] transition-colors ${
              tick <= activeWidth ? "text-[#c3c7cd] font-semibold" : "text-[#555a64]"
            }`}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
};
