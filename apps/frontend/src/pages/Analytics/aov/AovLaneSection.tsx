import React from "react";
import { AovLifecycleLaneId, AovToolDefinition, formatToolsCountLabel } from "./aovToolsCatalog";
import { AovEngineCard } from "./AovEngineCard";
import { ToolTelemetryState } from "./useAovCockpitData";

interface AovLaneSectionProps {
  lane: {
    id: AovLifecycleLaneId;
    title: string;
    description: string;
  };
  tools: AovToolDefinition[];
  toolsTelemetry: Record<string, ToolTelemetryState>;
  onToggleTool?: (tool: AovToolDefinition) => void;
}

export const AovLaneSection: React.FC<AovLaneSectionProps> = ({
  lane,
  tools,
  toolsTelemetry,
  onToggleTool,
}) => {
  const activeCount = tools.filter((t) => toolsTelemetry[t.id]?.isActive).length;

  return (
    <section className="p-3 sm:p-4 bg-white/40 dark:bg-zinc-950/40">
      {/* Lane Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              {lane.title}
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/[0.08]">
              {formatToolsCountLabel(tools.length)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {activeCount} نشط
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {lane.description}
          </p>
        </div>
      </div>

      {/* Grid of Engine Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {tools.map((tool) => (
          <AovEngineCard
            key={tool.id}
            tool={tool}
            telemetry={
              toolsTelemetry[tool.id] || {
                isActive: false,
                isCollecting: true,
                isToggling: false,
                toggleSupported: false,
                metrics: [],
              }
            }
            onToggle={onToggleTool}
          />
        ))}
      </div>
    </section>
  );
};
