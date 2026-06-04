import React from "react";
import { cn as cx } from "../../../lib/utils";

interface LowStockBlockProps {
  count: number;
  label: string;
  style?: "alert" | "meter" | "minimal";
  progress?: number;
  className?: string;
}

const LowStockBlock: React.FC<LowStockBlockProps> = ({
  count,
  label,
  style = "alert",
  progress = 0,
  className,
}) => {
  if (count <= 0) return null;

  const isMeter = style === "meter";
  const prefersArabicCopy = /[\u0600-\u06FF]/.test(label);

  return (
    <div
      className={cx(
        "group flex flex-col gap-1.5 transition-all duration-300",
        className
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 rounded-full border border-amber-500/10 bg-amber-500/5 px-3 py-1.5 transition-all duration-300 group-hover:border-amber-500/20 group-hover:bg-amber-500/10",
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600"></span>
        </span>
        <span className="text-[11px] font-medium tracking-tight text-amber-900/90 sm:text-xs">
          {label}: <span className="font-bold">{prefersArabicCopy ? `${count} متبقية` : `${count} left`}</span>
        </span>
      </div>
      
      {isMeter && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-500/10">
          <div
            className="h-full bg-amber-500 transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(10, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default LowStockBlock;
