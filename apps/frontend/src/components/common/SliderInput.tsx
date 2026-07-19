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

export default function SliderInput({ label, value, min, max, step = 1, onChange, currencySymbol = "", isPercent, suffix, icon }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          {icon}{label}
        </span>
        <span className="flex items-center gap-1">
          <input type="number" value={value} onChange={onChange} min={min} max={max} step={step}
            className="w-20 sm:w-24 text-right font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{isPercent ? "%" : suffix || currencySymbol}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{Math.round(min).toLocaleString()}{isPercent ? "%" : currencySymbol ? ` ${currencySymbol}` : ""}</span>
        <span>{Math.round(max).toLocaleString()}{isPercent ? "%" : currencySymbol ? ` ${currencySymbol}` : ""}</span>
      </div>
    </div>
  );
}
