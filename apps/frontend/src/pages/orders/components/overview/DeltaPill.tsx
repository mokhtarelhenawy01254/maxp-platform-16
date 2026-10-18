import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface DeltaPillProps {
  delta: number | null;
  title: string;
}

export const DeltaPill: React.FC<DeltaPillProps> = ({ delta, title }) => {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums leading-none ${
        up
          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  );
};

export default DeltaPill;
