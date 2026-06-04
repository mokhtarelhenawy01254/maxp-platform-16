import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import type { DashboardStatusStripTone } from "./types";

type Props = {
  actions?: ReactNode;
  badge: string;
  countLabel?: string;
  description: string;
  details?: ReactNode;
  progressPct?: number;
  title: string;
  tone: DashboardStatusStripTone;
};

const toneStyles: Record<DashboardStatusStripTone, string> = {
  primary: "bg-sky-50 border-sky-200",
  success: "bg-green-50 border-green-200",
  warning: "bg-amber-50 border-amber-200",
};

const badgeToneMap: Record<DashboardStatusStripTone, string> = {
  primary: "bg-sky-100 text-sky-700 border-sky-300",
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function DashboardStatusStrip({
  actions,
  badge,
  countLabel,
  description,
  details,
  progressPct,
  title,
  tone,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-5",
        toneStyles[tone],
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("rounded-sm text-xs", badgeToneMap[tone])}
          >
            {badge}
          </Badge>
          {countLabel != null && (
            <span className="text-xs text-muted-foreground">{countLabel}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      {progressPct != null && (
        <Progress
          value={progressPct}
          className={cn(
            "h-1",
            tone === "success" && "[&>div]:bg-green-500",
            tone === "warning" && "[&>div]:bg-amber-500",
          )}
        />
      )}

      {details && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {details}
        </div>
      )}
    </div>
  );
}
