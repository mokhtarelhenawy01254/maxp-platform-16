import React from "react";
import { cn as cx } from "../../../lib/utils";

interface PreOrderBlockProps {
  title: string;
  description: string;
  className?: string;
  mode?: "dominant" | "primary";
}

const PreOrderBlock: React.FC<PreOrderBlockProps> = ({
  title,
  description,
  className,
  mode = "primary",
}) => {
  const isDominant = mode === "dominant";

  if (isDominant) {
    return (
      <div
        className={cx(
          "group relative overflow-hidden rounded-[1.35rem] border border-emerald-500/20 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--emerald-500)/0.03))] p-5 transition-all duration-500 hover:border-emerald-500/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--emerald-500)/0.15)]",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
              Pre-Order
            </span>
            <h3 className="mt-3 text-lg font-bold text-foreground leading-tight sm:text-xl">
              {title}
            </h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground/90">
              {description}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/5 text-emerald-600 group-hover:scale-110 transition-transform duration-500">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "group flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/10",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
      </span>
      <span className="text-[11px] font-medium tracking-tight text-emerald-950/90 sm:text-xs">
        {title}
      </span>
    </div>
  );
};

export default PreOrderBlock;
