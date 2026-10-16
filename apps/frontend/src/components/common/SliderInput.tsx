import React from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  currencySymbol?: string;
  isPercent?: boolean;
  suffix?: string;
  icon?: React.ReactNode;
}

export default function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  currencySymbol = "",
  isPercent,
  suffix,
  icon,
}: Props) {
  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-foreground font-medium flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </span>
        <span className="flex items-center gap-1.5 font-mono tabular-nums">
          <input
            type="number"
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            className="w-20 sm:w-24 text-right font-semibold text-foreground bg-muted/30 border border-border/70 rounded-lg px-2 py-0.5 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none transition-colors"
          />
          <span className="font-semibold text-muted-foreground text-xs">
            {isPercent ? "%" : suffix || currencySymbol}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-all"
      />
      <div className="flex justify-between text-[11px] font-mono tabular-nums text-muted-foreground/70">
        <span>
          {Math.round(min).toLocaleString()}
          {isPercent ? "%" : currencySymbol ? ` ${currencySymbol}` : ""}
        </span>
        <span>
          {Math.round(max).toLocaleString()}
          {isPercent ? "%" : currencySymbol ? ` ${currencySymbol}` : ""}
        </span>
      </div>
    </div>
  );
}
