import React from "react";

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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5 text-start">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="leading-7">
            {content}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={confirmVariantMap[confirmColor]}
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
