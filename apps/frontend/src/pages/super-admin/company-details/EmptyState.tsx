import type { ElementType } from "react"
import { cn } from "../../../lib/utils"
import { Mail } from 'lucide-react'

export function EmptyState({ message, icon: Icon, className }: {
  message: string;
  icon?: ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/30 bg-muted/10 p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/30">
        {Icon ? <Icon className="size-6 opacity-40" /> : <Inbox className="size-6 opacity-40" />}
      </div>
      <p className="max-w-[240px] leading-relaxed">{message}</p>
    </div>
  )
}
