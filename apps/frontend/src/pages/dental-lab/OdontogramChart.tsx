import React, { useMemo } from "react";
import { Check, RotateCcw, Sparkles } from "lucide-react";

interface OdontogramChartProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
  readOnly?: boolean;
}

// FDI Notation Quadrants
const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const ANTERIOR_TEETH = ["13", "12", "11", "21", "22", "23", "33", "32", "31", "41", "42", "43"];

export default function OdontogramChart({
  selectedTeeth,
  onChange,
  readOnly = false,
}: OdontogramChartProps) {
  const selectedSet = useMemo(() => new Set(selectedTeeth.map(t => t.trim()).filter(Boolean)), [selectedTeeth]);

  const toggleTooth = (tooth: string) => {
    if (readOnly) return;
    const next = new Set(selectedSet);
    if (next.has(tooth)) {
      next.delete(tooth);
    } else {
      next.add(tooth);
    }
    const sorted = Array.from(next).sort((a, b) => {
      const numA = parseInt(a, 10) || 0;
      const numB = parseInt(b, 10) || 0;
      return numA - numB;
    });
    onChange(sorted);
  };

  const selectGroup = (group: string[]) => {
    if (readOnly) return;
    const next = new Set(selectedSet);
    const allSelected = group.every(t => next.has(t));
    if (allSelected) {
      group.forEach(t => next.delete(t));
    } else {
      group.forEach(t => next.add(t));
    }
    const sorted = Array.from(next).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    onChange(sorted);
  };

  const clearAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  const renderTooth = (tooth: string, isUpper: boolean) => {
    const isSelected = selectedSet.has(tooth);
    return (
      <button
        key={tooth}
        type="button"
        disabled={readOnly}
        onClick={() => toggleTooth(tooth)}
        title={`سن #${tooth}`}
        className={[
          "relative flex flex-col items-center justify-center transition-all duration-150 rounded-lg select-none",
          "w-8 h-10 sm:w-9 sm:h-11 p-0.5",
          isSelected
            ? "bg-blue-600 text-white shadow ring-2 ring-blue-400 font-bold scale-105 z-10"
            : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
          readOnly ? "cursor-default" : "cursor-pointer",
        ].join(" ")}
      >
        <span className="text-[11px] font-mono font-semibold">{tooth}</span>
        <div
          className={[
            "w-3.5 h-3.5 mt-0.5 rounded-sm flex items-center justify-center text-[9px]",
            isSelected
              ? "bg-white/25 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400",
            isUpper ? "rounded-t-md" : "rounded-b-md",
          ].join(" ")}
        >
          {isSelected ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : "•"}
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4 space-y-3">
      {/* Header & Quick selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b dark:border-gray-700 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            خريطة الأسنان التفاعلية (نظام FDI)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {selectedSet.size} سن / وحدة
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => selectGroup([...UPPER_RIGHT, ...UPPER_LEFT])}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              العلوي
            </button>
            <button
              type="button"
              onClick={() => selectGroup([...LOWER_RIGHT, ...LOWER_LEFT])}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              السفلي
            </button>
            <button
              type="button"
              onClick={() => selectGroup(ANTERIOR_TEETH)}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              الأمامية
            </button>
            {selectedSet.size > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="px-2 py-0.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" /> مسح
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="overflow-x-auto py-1">
        <div className="min-w-[540px] space-y-2">
          {/* Upper Arch Label */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500 px-2">
            <span>يمين المريض (Q1)</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">الفك العلوي (Upper Arch)</span>
            <span>يسار المريض (Q2)</span>
          </div>

          {/* Upper Arch Teeth */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 p-2 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {UPPER_RIGHT.map(t => renderTooth(t, true))}
            </div>
            <div className="w-0.5 h-10 bg-blue-300 dark:bg-blue-700 mx-1" />
            <div className="flex items-center gap-1 sm:gap-1.5">
              {UPPER_LEFT.map(t => renderTooth(t, true))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-2 py-0.5">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
            <span className="text-[10px] text-gray-400 tracking-wider font-mono">خط الإطباق</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
          </div>

          {/* Lower Arch Teeth */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 p-2 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100/60 dark:border-purple-900/30">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {LOWER_RIGHT.map(t => renderTooth(t, false))}
            </div>
            <div className="w-0.5 h-10 bg-purple-300 dark:bg-purple-700 mx-1" />
            <div className="flex items-center gap-1 sm:gap-1.5">
              {LOWER_LEFT.map(t => renderTooth(t, false))}
            </div>
          </div>

          {/* Lower Arch Label */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500 px-2">
            <span>يمين المريض (Q4)</span>
            <span className="text-purple-600 dark:text-purple-400 font-medium">الفك السفلي (Lower Arch)</span>
            <span>يسار المريض (Q3)</span>
          </div>
        </div>
      </div>

      {/* Selected Chips */}
      {selectedSet.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t dark:border-gray-700">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">الأسنان المحددة:</span>
          {Array.from(selectedSet).map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold"
            >
              #{t}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className="hover:text-red-500 text-gray-400"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
