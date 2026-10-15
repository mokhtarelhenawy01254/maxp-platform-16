import { useState, useEffect } from "react";

interface DynamicVideoWatermarkProps {
  name?: string;
  phone?: string;
}

export function DynamicVideoWatermark({ name, phone }: DynamicVideoWatermarkProps) {
  const [posIdx, setPosIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setPosIdx((prev) => (prev + 1) % 6);
      setCurrentTime(
        new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      );
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const positions = [
    "top-6 right-6 text-right",
    "bottom-12 left-6 text-left",
    "top-1/3 left-1/4 text-center",
    "bottom-16 right-8 text-right",
    "top-10 left-10 text-left",
    "bottom-1/3 right-1/4 text-center",
  ];

  const pos = positions[posIdx] || positions[0];

  return (
    <>
      {/* Floating dynamic drifting badge */}
      <div
        className={`absolute ${pos} pointer-events-none z-30 transition-all duration-1000 ease-in-out select-none`}
      >
        <div className="bg-black/60 backdrop-blur-[4px] border border-white/20 px-3 py-1.5 rounded-xl text-white/80 font-mono text-[11px] leading-tight shadow-lg space-y-0.5">
          <div className="font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
            <span className="text-white/90">{name || "متدرب المنصة"}</span>
          </div>
          {phone && <div className="text-[10px] text-white/60 font-mono">{phone}</div>}
          <div className="text-[9px] text-white/40 font-mono">MaxP Academy • {currentTime}</div>
        </div>
      </div>

      {/* Subtle faint diagonal watermark in the center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none overflow-hidden opacity-10">
        <div className="transform -rotate-12 text-center text-white font-mono text-sm tracking-widest uppercase">
          <div>{name || "MaxP Student"}</div>
          {phone && <div>{phone}</div>}
        </div>
      </div>
    </>
  );
}
