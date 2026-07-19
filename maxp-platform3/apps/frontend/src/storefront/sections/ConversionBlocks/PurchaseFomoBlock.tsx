import React from "react";
import { cn as cx } from "../../../lib/utils";

interface PurchaseFomoBlockProps {
  count: number;
  message: string;
  className?: string;
}

const PurchaseFomoBlock: React.FC<PurchaseFomoBlockProps> = ({
  count,
  message,
  className,
}) => {
  if (count <= 0) return null;

  return (
    <div
      className={cx(
        "group flex items-center gap-2 rounded-full border border-rose-500/10 bg-rose-500/5 px-3 py-1.5 transition-all duration-300 hover:border-rose-500/20 hover:bg-rose-500/10",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600"></span>
      </span>
      <span className="text-[11px] font-medium tracking-tight text-rose-900/90 sm:text-xs">
        {message}
      </span>
    </div>
  );
};

export default PurchaseFomoBlock;
