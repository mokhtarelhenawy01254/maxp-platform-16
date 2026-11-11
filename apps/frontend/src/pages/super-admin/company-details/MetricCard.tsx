import type { ReactNode, ElementType } from "react"
import { cn } from "../../../lib/utils"

export function MetricCard({ icon: Icon, label, value, hint, tone, trend }: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
  trend?: string | null;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-3.5 py-2.5 shadow-[0_20px_50px_-35px_rgba(15,27,45,0.55)]",
        tone || "border bg-card text-card-foreground",
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground leading-snug">{label}</p>
          <p className="text-xl sm:text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary shadow-xs">
          <Icon className="size-4" />
        </div>
      </div>
      {trend ? <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">{trend}</p> : null}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
