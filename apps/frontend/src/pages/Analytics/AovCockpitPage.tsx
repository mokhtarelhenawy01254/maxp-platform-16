import React from "react";
import { useAovCockpitData } from "./aov/useAovCockpitData";
import { AovTelemetryHeader } from "./aov/AovTelemetryHeader";
import { AovLaneSection } from "./aov/AovLaneSection";
import {
  AOV_LIFECYCLE_LANES,
  AOV_TOOLS_CATALOG,
} from "./aov/aovToolsCatalog";

export const AovCockpitPage: React.FC = () => {
  const {
    period,
    setPeriod,
    loading,
    lastRefreshedAt,
    loadData,
    overallKpis,
    toolsTelemetry,
    toggleTool,
  } = useAovCockpitData();

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. TOP UNIFIED COMMAND BAR & KPI TELEMETRY STRIP */}
      <AovTelemetryHeader
        period={period}
        setPeriod={setPeriod}
        loading={loading}
        onRefresh={loadData}
        lastRefreshedAt={lastRefreshedAt}
        overallKpis={overallKpis}
      />

      {/* 2. SINGLE CONTINUOUS SURFACE: 4 Lifecycle Lanes */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-zinc-200/80 dark:divide-white/[0.08]">
        {AOV_LIFECYCLE_LANES.map((lane) => {
          const laneTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === lane.id);
          return (
            <AovLaneSection
              key={lane.id}
              lane={lane}
              tools={laneTools}
              toolsTelemetry={toolsTelemetry}
              onToggleTool={toggleTool}
            />
          );
        })}
      </main>
    </div>
  );
};

export default AovCockpitPage;
