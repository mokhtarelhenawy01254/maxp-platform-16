import { Label } from "../../../components/ui/label"

export function FormField({ label, error, required, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
