/**
 * OrderModal — unified modal shell for the orders feature.
 *
 * Wraps shadcn/ui Dialog (built on @base-ui/react) so every order modal
 * shares the same backdrop, focus-trap, Esc-to-close, animation, and
 * icon-header / footer pattern. Supports both simple confirmation flows
 * (title + description + primary/cancel actions) and complex forms
 * (children + custom footer).
 *
 * Why this exists: prior to this wrapper, every modal in the orders
 * feature implemented its own backdrop, header, and footer with
 * inconsistent spacing, shadows, RTL handling, and animations.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModalTone =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export type ModalActionVariant =
  | "default"
  | "destructive"
  | "secondary"
  | "outline"
  | "ghost";

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: ModalActionVariant;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  full: "sm:max-w-[min(96vw,1100px)]",
};

const toneRingClasses: Record<ModalTone, string> = {
  primary: "ring-primary/20",
  info: "ring-info/30",
  success: "ring-success/30",
  warning: "ring-warning/30",
  danger: "ring-destructive/30",
  neutral: "ring-border",
};

const toneIconClasses: Record<ModalTone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export interface OrderModalProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the user tries to close the modal (backdrop, Esc, X). */
  onOpenChange: (open: boolean) => void;
  /** Title shown in the header. Pass nothing to hide the header. */
  title?: React.ReactNode;
  /** Description shown below the title. */
  description?: React.ReactNode;
  /** Optional icon — renders in a tinted circle above the title. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Color tone for the icon circle and the default primary action. */
  tone?: ModalTone;
  /** Width of the modal. */
  size?: ModalSize;
  /** Body content. Scrolls internally when it overflows. */
  children?: React.ReactNode;
  /** Override the default footer with a custom node. */
  footer?: React.ReactNode;
  /** Show a Cancel button in the default footer. Defaults to true. */
  showCancel?: boolean;
  /** Label for the Cancel button. */
  cancelLabel?: React.ReactNode;
  /** Primary action button. Omit to render a Cancel-only footer. */
  primaryAction?: ModalAction;
  /** Optional secondary action rendered before the primary. */
  secondaryAction?: ModalAction;
  /** Disable Esc + backdrop close while a long-running op is in flight. */
  busy?: boolean;
  /** Hide the built-in X close button. */
  hideClose?: boolean;
  /** Extra classes for the inner content panel. */
  contentClassName?: string;
  /** Extra classes for the body region. */
  bodyClassName?: string;
  /** Render the body in a single contained region (no inner padding). */
  flushBody?: boolean;
}

const toneToPrimaryVariant = (tone: ModalTone): ModalActionVariant => {
  if (tone === "danger") return "destructive";
  if (tone === "neutral") return "secondary";
  return "default";
};

export const OrderModal: React.FC<OrderModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  tone = "primary",
  size = "md",
  children,
  footer,
  showCancel = true,
  cancelLabel,
  primaryAction,
  secondaryAction,
  busy = false,
  hideClose = false,
  contentClassName,
  bodyClassName,
  flushBody = false,
}) => {
  const showHeader = Boolean(title || description || Icon);

  const handleClose = React.useCallback(() => {
    if (busy) return;
    onOpenChange(false);
  }, [busy, onOpenChange]);

  const renderFooter = () => {
    if (footer !== undefined) return footer;
    if (!showCancel && !primaryAction && !secondaryAction) return null;

    return (
      <DialogFooter className="border-t border-border/60 bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end sm:gap-2">
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={busy}
          >
            {cancelLabel ?? "إلغاء"}
          </Button>
        )}
        {secondaryAction && (
          <Button
            type="button"
            variant={secondaryAction.variant ?? "outline"}
            onClick={secondaryAction.onClick}
            disabled={busy || secondaryAction.disabled || secondaryAction.loading}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            type={primaryAction.autoFocus ? "button" : "button"}
            variant={
              primaryAction.variant ?? toneToPrimaryVariant(tone)
            }
            onClick={primaryAction.onClick}
            disabled={busy || primaryAction.disabled || primaryAction.loading}
          >
            {primaryAction.loading
              ? "..."
              : primaryAction.label}
          </Button>
        )}
      </DialogFooter>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!hideClose}
        className={cn(
          "gap-0 overflow-hidden rounded-2xl p-0",
          sizeClasses[size],
          contentClassName,
        )}
      >
        {showHeader && (
          <DialogHeader
            className={cn(
              "gap-3 border-b border-border/60 px-6 py-5",
              Icon ? "items-center text-center" : "items-start text-start",
            )}
          >
            {Icon && (
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full ring-1",
                  toneIconClasses[tone],
                  toneRingClasses[tone],
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </div>
            )}
            <div className="space-y-1.5">
              {title && (
                <DialogTitle
                  className={cn(
                    "text-base font-semibold leading-tight text-foreground",
                    Icon && "text-center",
                  )}
                >
                  {title}
                </DialogTitle>
              )}
              {description && (
                <DialogDescription
                  className={cn(
                    "text-sm leading-relaxed text-muted-foreground",
                    Icon && "text-center",
                  )}
                >
                  {description}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>
        )}

        {children && (
          <div
            className={cn(
              flushBody ? "" : "px-6 py-5",
              "max-h-[min(70vh,720px)] overflow-y-auto",
              bodyClassName,
            )}
          >
            {children}
          </div>
        )}

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;
