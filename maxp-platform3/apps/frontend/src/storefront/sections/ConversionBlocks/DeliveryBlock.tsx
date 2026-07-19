import React from "react";
import { cn as cx } from "../../../lib/utils";
import { useStorefrontTheme } from "../../engine/ThemeProvider";

interface DeliveryBlockProps {
  style?: "card" | "timeline" | "pill";
  label: string;
  range: string;
  className?: string;
  headerLabel?: string;
}

const DeliveryBlock: React.FC<DeliveryBlockProps> = ({
  style = "card",
  label,
  range,
  className,
  headerLabel,
}) => {
  const { theme } = useStorefrontTheme();
  const isRTL = theme.direction === 'rtl';
  const isPill = style === "pill";

  return (
    <div
      className={cx(
        "group relative overflow-hidden transition-all duration-500",
        isPill
          ? "flex flex-wrap items-center justify-between gap-3 rounded-full border border-[#ead9d8] bg-[#fff8f5] px-4 py-3 hover:border-[#d7b3aa]"
          : "flex flex-col gap-2 rounded-[1.8rem] border border-border/40 bg-background/40 p-5 backdrop-blur-2xl hover:border-primary/30 hover:bg-background/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className={cx("flex items-center gap-2", isPill ? "min-w-0" : "justify-between")}>
        <div className="flex items-center gap-2">
          <div className={cx(
            "flex items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110",
            isPill ? "h-8 w-8" : "h-7 w-7",
          )}>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <span className={cx(
            "font-black uppercase tracking-[0.1em] text-foreground/80",
            isPill ? "text-[10px]" : "text-[11px]",
          )}>
            {headerLabel || (isRTL ? "توصيل فائق السرعة" : "Express Delivery")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-600/90 uppercase tracking-tight">
            {isRTL ? "مباشر" : "Live"}
          </span>
        </div>
      </div>

      <div className={cx("space-y-0.5", isPill && "min-w-0 flex-1 text-end")}>
        <h3 className={cx(
          "font-black leading-tight text-foreground transition-colors group-hover:text-primary",
          isPill ? "text-[13px] sm:text-sm" : "text-sm sm:text-base",
        )}>
          {label}
        </h3>
        <p className={cx(
          isPill ? "text-[11px] font-bold" : "text-[12px] font-bold",
          isRTL ? "text-primary/90" : "text-muted-foreground/90"
        )}>
          {isRTL ? `خلال ${range}` : `Within ${range}`}
        </p>
      </div>

      {isPill ? null : (
        <>
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
          <div className="absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-secondary/10 blur-2xl opacity-30 transition-opacity group-hover:opacity-100" />
        </>
      )}
    </div>
  );
};

export default DeliveryBlock;
