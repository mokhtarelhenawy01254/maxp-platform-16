import { cn } from "../../../lib/utils"
import { Separator } from "../../../components/ui/separator"

export function SectionShell({ title, description, actions, children, className }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <Separator />
      <div className="space-y-3">{children}</div>
    </div>
  )
}
