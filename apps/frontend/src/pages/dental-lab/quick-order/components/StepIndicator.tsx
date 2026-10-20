import { Check, ChevronRight } from "lucide-react";
import type { Step, StepIndicatorProps } from "../types/quickOrderTypes";
import { stepLabel } from "../types/quickOrderTypes";

export function StepIndicator({ current }: StepIndicatorProps) {
  const steps: Step[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {steps.map((s, idx) => {
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors font-mono tabular-nums",
                done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : active
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "border-gray-300 dark:border-gray-600 text-gray-400",
              ].join(" ")}
            >
              {done ? <Check className="w-4 h-4 stroke-[3]" /> : s}
            </div>
            <span
              className={[
                "text-xs sm:text-sm font-medium",
                active ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400",
              ].join(" ")}
            >
              {stepLabel(s)}
            </span>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
