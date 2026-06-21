import type { ReactNode } from "react"
import { cn } from "../../../lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet"

export function ResponsiveOverlay({
  mobile,
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  bodyClassName,
}: {
  mobile: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
}) {
  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[94vh] rounded-t-[2rem] border-t bg-card px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 shadow-[0_-30px_80px_-35px_rgba(15,27,45,0.6)]",
            contentClassName,
          )}
          dir="rtl"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
          <SheetHeader className="border-b px-4 pb-4 pt-4 text-right">
            <SheetTitle className="text-right text-lg font-black">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="text-right">{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className={cn("overflow-y-auto px-4 py-4", bodyClassName)}>{children}</div>
          {footer ? (
            <SheetFooter className="mt-0 gap-2 border-t bg-muted/30 px-4 pb-0 pt-4">
              {footer}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl gap-0 overflow-hidden rounded-[28px] border bg-card p-0 shadow-[0_45px_140px_-55px_rgba(15,27,45,0.65)]",
          contentClassName,
        )}
        dir="rtl"
      >
        <DialogHeader className="border-b px-6 pb-4 pt-6 text-right">
          <DialogTitle className="text-right text-xl font-black">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-right">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className={cn("max-h-[75vh] overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <DialogFooter className="border-t bg-muted/30 px-6 py-4 sm:justify-start">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
