import React from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerList } from "./types";

interface CustomerListDeleteDialogProps {
  target: CustomerList | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CustomerListDeleteDialog: React.FC<CustomerListDeleteDialogProps> = ({
  target,
  deleting,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف قائمة العملاء</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف قائمة "{target?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">إلغاء</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
