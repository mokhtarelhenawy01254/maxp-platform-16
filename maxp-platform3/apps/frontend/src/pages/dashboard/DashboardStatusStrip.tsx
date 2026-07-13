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
  primary: "bg-primary/10 border-primary/20 dark:bg-primary/15 dark:border-primary/30",
  success: "bg-success/10 border-success/20 dark:bg-success/15 dark:border-success/30",
  warning: "bg-warning/10 border-warning/20 dark:bg-warning/15 dark:border-warning/30",
};

const badgeToneMap: Record<DashboardStatusStripTone, string> = {
  primary: "bg-primary/15 text-primary-foreground border-primary/30 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/40",
  success: "bg-success/15 text-success-foreground border-success/30 dark:bg-success/20 dark:text-success-foreground dark:border-success/40",
  warning: "bg-warning/15 text-warning-foreground border-warning/30 dark:bg-warning/20 dark:text-warning-foreground dark:border-warning/40",
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
            tone === "success" && "[&>div]:bg-success",
            tone === "warning" && "[&>div]:bg-warning",
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
