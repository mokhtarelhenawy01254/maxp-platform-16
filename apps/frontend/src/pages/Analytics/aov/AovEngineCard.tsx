import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import { AovToolDefinition } from "./aovToolsCatalog";
import { ToolTelemetryState } from "./useAovCockpitData";

interface AovEngineCardProps {
  tool: AovToolDefinition;
  telemetry: ToolTelemetryState;
  onToggle?: (tool: AovToolDefinition) => void;
}

export const AovEngineCard: React.FC<AovEngineCardProps> = ({
  tool,
  telemetry,
  onToggle,
}) => {
  const { isActive, isCollecting, isToggling, toggleSupported, metrics } = telemetry;

  const formatValue = (val: string | number, isCurrency?: boolean) => {
    if (typeof val === "number") {
      return isCurrency ? `${Math.round(val).toLocaleString()} ج.م` : val.toLocaleString();
    }
    return val;
  };

  return (
    <div className="flex flex-col justify-between p-3 rounded-lg bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-2xs">
      {/* 1. Header: Name & Status */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
            {tool.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {isToggling ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse motion-reduce:animate-none" />
                جارٍ الحفظ…
              </span>
            ) : isActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                نشط
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/[0.06]">
                <MinusCircleIcon className="h-3 w-3" />
                معطل
              </span>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
          {tool.subtitle}
        </p>
      </div>

      {/* 2. Telemetry Section */}
      <div>
        <div className="pt-2 pb-2.5 border-t border-zinc-100 dark:border-white/[0.04]">
          {isCollecting || metrics.length === 0 ? (
            <div className="flex items-center justify-between py-1 px-2 rounded bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200/60 dark:border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <ClockIcon className="h-3 w-3 text-zinc-400" />
                حالة القياس
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                قيد التجميع
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {metrics.map((m, idx) => (
                <div
                  key={`${m.label}-${idx}`}
                  className="p-1.5 rounded bg-zinc-50/80 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/[0.04]"
                >
                  <span className="text-[9px] text-zinc-400 block truncate">{m.label}</span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums truncate block">
                    {formatValue(m.value, m.isCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Footer Action */}
        <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.04] flex items-center justify-between gap-2">
          {tool.canToggle && toggleSupported && onToggle && (
            <button
              type="button"
              onClick={() => onToggle(tool)}
              disabled={isToggling}
              aria-pressed={isActive}
              className="text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              {isToggling ? "جارٍ الحفظ…" : isActive ? "تعطيل الأداة" : "تشغيل الأداة"}
            </button>
          )}

          <Link
            to={tool.settingsPath}
            className="inline-flex items-center gap-1 mr-auto text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <span>الإعدادات</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
