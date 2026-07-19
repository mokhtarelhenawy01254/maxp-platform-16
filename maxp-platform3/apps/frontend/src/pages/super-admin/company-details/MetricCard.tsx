import type { ReactNode, ElementType } from "react"
import { cn } from "../../../lib/utils"

export function MetricCard({ icon: Icon, label, value, hint, tone }: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[170px] rounded-xl border px-4 py-3 shadow-[0_20px_50px_-35px_rgba(15,27,45,0.55)]",
        tone || "border bg-card text-card-foreground",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-primary shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
