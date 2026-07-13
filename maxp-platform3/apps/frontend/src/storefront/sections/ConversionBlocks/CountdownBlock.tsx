import React from "react";
import { cn as cx } from "../../../lib/utils";

interface CountdownBlockProps {
  label: string;
  summary: string;
  className?: string;
}

const CountdownBlock: React.FC<CountdownBlockProps> = ({
  label,
  summary,
  className,
}) => {
  if (!summary) return null;

  const prefersArabicCopy = /[\u0600-\u06FF]/.test(`${label} ${summary}`);

  return (
    <div
      className={cx(
        "group flex w-full items-center justify-between gap-4 rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-2.5 transition-all duration-300 hover:border-primary/25 hover:bg-primary/[0.05]",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80 sm:text-xs">
          {label}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold tracking-tight text-foreground sm:text-base">
          {summary}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
          {prefersArabicCopy ? "متبقي" : "left"}
        </span>
      </div>
    </div>
  );
};

export default CountdownBlock;
