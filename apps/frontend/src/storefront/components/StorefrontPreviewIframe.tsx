import React, { useRef, useEffect, useState } from "react";

interface StorefrontPreviewIframeProps {
  deviceMode: "desktop" | "mobile";
  children: React.ReactNode;
  className?: string;
}

export const StorefrontPreviewIframe: React.FC<StorefrontPreviewIframeProps> = ({
  deviceMode,
  children,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = deviceMode === "mobile";

  if (!isMobile) {
    return (
      <div ref={containerRef} className={`w-full transition-all duration-300 ${className}`}>
        {mounted ? children : null}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full max-w-[420px] transition-all duration-300 ease-in-out ${className}`}
    >
      {/* Smartphone Outer Chassis */}
      <div className="relative overflow-hidden rounded-[3rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] ring-1 ring-slate-800/60 dark:border-slate-800 dark:ring-slate-700/50">
        {/* Dynamic Island / Top Speaker Notch */}
        <div className="absolute top-2.5 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="flex h-5 w-28 items-center justify-between rounded-full bg-black px-2 shadow-inner">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900/80 ring-1 ring-slate-700/50" />
            <span className="h-2 w-2 rounded-full bg-[#0a192f] ring-1 ring-blue-500/30" />
          </div>
        </div>

        {/* Screen Viewport */}
        <div className="w-full overflow-y-auto overflow-x-hidden rounded-[2.25rem] bg-background pt-8 text-foreground [scrollbar-width:none]">
          {mounted ? children : null}
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="absolute bottom-1.5 inset-x-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="h-1 w-32 rounded-full bg-slate-400/40 backdrop-blur-sm" />
        </div>
      </div>
    </div>
  );
};
