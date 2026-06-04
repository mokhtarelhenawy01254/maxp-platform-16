import React from "react";
import { cn as cx } from "../../../lib/utils";

interface SoldCounterBlockProps {
  count: number;
  message: string;
  className?: string;
}

const SoldCounterBlock: React.FC<SoldCounterBlockProps> = ({
  count,
  message,
  className,
}) => {
  if (count <= 0) return null;

  return (
    <div
      className={cx(
        "group flex items-center gap-2 rounded-full border border-violet-500/10 bg-violet-500/5 px-3 py-1.5 transition-all duration-300 hover:border-violet-500/20 hover:bg-violet-500/10",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600"></span>
      </span>
      <span className="text-[11px] font-medium tracking-tight text-violet-900/90 sm:text-xs">
        {message}
      </span>
    </div>
  );
};

export default SoldCounterBlock;
