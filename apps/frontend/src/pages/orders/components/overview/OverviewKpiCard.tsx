import React from "react";
import { Sparkline } from "../../../../components/common/Sparkline";
import { DeltaPill } from "./DeltaPill";

export interface OverviewKpiItem {
  key: string;
  label: string;
  value: string;
  delta: number | null;
  deltaIsPoints?: boolean;
  icon: React.ReactNode;
  spark?: number[];
  tone: "primary" | "success" | "muted" | "info";
  aria: string;
}

export interface OverviewKpiCardProps {
  kpi: OverviewKpiItem;
  vsPrevTitle: string;
  periodLabel: string;
}

export const OverviewKpiCard: React.FC<OverviewKpiCardProps> = ({
  kpi,
  vsPrevTitle,
  periodLabel,
}) => {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/30 text-muted-foreground">
          {kpi.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kpi.label}
          </p>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold font-mono tabular-nums leading-tight text-foreground">
              {kpi.value}
            </p>
            <DeltaPill
              delta={kpi.delta}
              title={kpi.deltaIsPoints ? vsPrevTitle : `${vsPrevTitle} (${periodLabel})`}
            />
          </div>
        </div>
      </div>
      {kpi.spark && kpi.spark.length > 1 && (
        <div className="hidden shrink-0 xl:block">
          <Sparkline
            data={kpi.spark}
            width={48}
            height={20}
            tone={kpi.tone}
            filled
            ariaLabel={kpi.aria}
          />
        </div>
      )}
    </div>
  );
};

export default OverviewKpiCard;
