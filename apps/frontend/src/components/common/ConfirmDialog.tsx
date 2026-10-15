import React from "react";
import { AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?:
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning";
}

const confirmVariantMap = {
  primary: "default",
  secondary: "secondary",
  error: "destructive",
  info: "default",
  success: "default",
  warning: "default",
} as const;

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  content,
  onConfirm,
  onCancel,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  confirmColor = "primary",
}) => {
  const isDestructive = confirmColor === "error";
  const isWarning = confirmColor === "warning";
  const isSuccess = confirmColor === "success";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 rounded-xl border border-border/70 bg-card text-card-foreground p-0 shadow-2xl overflow-hidden"
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-start bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-rose-500/10 text-rose-500"
                  : isWarning
                    ? "bg-amber-500/10 text-amber-500"
                    : isSuccess
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-primary/10 text-primary"
              }`}
            >
              {isDestructive ? (
                <AlertCircle className="size-4" />
              ) : isWarning ? (
                <AlertTriangle className="size-4" />
              ) : isSuccess ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Info className="size-4" />
              )}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {content}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="border-t border-border/60 bg-muted/30 px-5 py-3 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 text-xs font-medium border-border/70 hover:bg-muted"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={confirmVariantMap[confirmColor]}
            size="sm"
            className="h-8 text-xs font-semibold"
            autoFocus
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
