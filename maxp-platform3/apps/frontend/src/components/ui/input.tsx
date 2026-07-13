import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { Label } from "./label"

interface InputProps extends React.ComponentPropsWithoutRef<typeof InputPrimitive> {
  label?: string
  helperText?: string
  error?: string
  id?: string
}

const Input = React.forwardRef<
  React.ElementRef<typeof InputPrimitive>,
  InputProps
>(({ className, type, id, label, helperText, error, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <InputPrimitive
        ref={ref}
        id={inputId}
        type={type}
        data-slot="input"
        aria-invalid={!!error}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      {error && <p className="text-[0.75rem] text-destructive">{error}</p>}
      {helperText && !error && <p className="text-[0.7rem] text-muted-foreground">{helperText}</p>}
    </div>
  )
})

Input.displayName = "Input"

export { Input }
