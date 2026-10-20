import React from "react";
import { Cpu, Activity, ShieldCheck, Layers } from "lucide-react";
import { AgentListing } from "../../agentMarketplaceData";

interface AgentTelemetryStripProps {
  telemetry: AgentListing["telemetry"];
}

export const AgentTelemetryStrip: React.FC<AgentTelemetryStripProps> = ({ telemetry }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Cpu className="size-3 opacity-70 stroke-[1.5]" />
          <span>المحرك الأساسي</span>
        </div>
        <div className="text-xs font-semibold text-foreground mt-0.5">
          {telemetry.engine}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Activity className="size-3 opacity-70 stroke-[1.5]" />
          <span>زمن المعالجة (P95)</span>
        </div>
        <div className="text-xs font-semibold tabular-nums font-mono text-foreground mt-0.5">
          {telemetry.p95Latency}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="size-3 opacity-70 stroke-[1.5]" />
          <span>دقة المهام</span>
        </div>
        <div className="text-xs font-semibold tabular-nums font-mono text-foreground mt-0.5">
          {telemetry.taskPrecision}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Layers className="size-3 opacity-70 stroke-[1.5]" />
          <span>سعة الذاكرة</span>
        </div>
        <div className="text-xs font-semibold text-foreground mt-0.5">
          {telemetry.contextWindow}
        </div>
      </div>
    </div>
  );
};
