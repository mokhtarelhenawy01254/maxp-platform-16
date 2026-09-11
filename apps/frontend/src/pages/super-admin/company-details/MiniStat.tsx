import type { ReactNode } from "react"
import { cn } from "../../../lib/utils"

export function MiniStat({ label, value, helper, valueClassName, variant = "default" }: {
  label: string;
  value: ReactNode;
  helper?: string;
  valueClassName?: string;
  variant?: "default" | "elevated" | "subtle";
}) {
  const variants: Record<string, string> = {
    default: "bg-muted/20",
    elevated: "bg-card shadow-sm border-border/40",
    subtle: "bg-background",
  }

  return (
    <div className={cn("rounded-lg p-4", variants[variant] || variants.default)}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold text-foreground", valueClassName)}>
        {value}
      </p>
      {helper ? <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
