import React from "react";
import { cn as cx } from "../../../lib/utils";

interface FakeVisitorBlockProps {
  count: number;
  message: string;
  className?: string;
}

const FakeVisitorBlock: React.FC<FakeVisitorBlockProps> = ({
  count,
  message,
  className,
}) => {
  if (count <= 0) return null;

  return (
    <div
      className={cx(
        "group flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 transition-all duration-300 hover:border-primary/20 hover:bg-primary/10",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
      </span>
      <span className="text-[11px] font-medium tracking-tight text-primary/90 sm:text-xs">
        {message}
      </span>
    </div>
  );
};

export default FakeVisitorBlock;
