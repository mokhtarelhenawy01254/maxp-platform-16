import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { BookingService, MODAL_INPUT_CLS } from "./shared";
import PatientDetailModal from "./PatientDetailModal";

interface BookingConfirmModalsProps {
  confirmDialog: { message: string; onConfirm: () => void } | null;
  onConfirmDialogClose: () => void;
  cloneTarget: BookingService | null;
  cloneNameInput: string;
  onCloneNameInputChange: (val: string) => void;
  onCloneCancel: () => void;
  onCloneConfirm: () => void;
  patientDetailId: string | null;
  onPatientDetailClose: () => void;
}

export const BookingConfirmModals: React.FC<BookingConfirmModalsProps> = ({
  confirmDialog,
  onConfirmDialogClose,
  cloneTarget,
  cloneNameInput,
  onCloneNameInputChange,
  onCloneCancel,
  onCloneConfirm,
  patientDetailId,
  onPatientDetailClose,
}) => {
  return (
    <>
      <AlertDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open) onConfirmDialogClose();
        }}
      >
        <AlertDialogContent className="bg-card border border-border/80 text-foreground shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">تأكيد الإجراء</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {confirmDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border border-border/70 hover:bg-muted/60 text-muted-foreground text-xs sm:text-sm">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
              onClick={() => {
                confirmDialog?.onConfirm();
                onConfirmDialogClose();
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cloneTarget}
        onOpenChange={(open) => {
          if (!open) onCloneCancel();
        }}
      >
        <AlertDialogContent className="bg-card border border-border/80 text-foreground shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">استنساخ خدمة</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              أدخل اسم الخدمة الجديدة المراد استنساخها:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-4 py-2">
            <input
              className={MODAL_INPUT_CLS + " w-full"}
              autoFocus
              value={cloneNameInput}
              onChange={(e) => onCloneNameInputChange(e.target.value)}
              placeholder="اسم الخدمة الجديدة..."
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border border-border/70 hover:bg-muted/60 text-muted-foreground text-xs sm:text-sm">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
              onClick={onCloneConfirm}
            >
              تأكيد الاستنساخ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {patientDetailId && (
        <PatientDetailModal
          patientId={patientDetailId}
          onClose={onPatientDetailClose}
        />
      )}
    </>
  );
};

export default BookingConfirmModals;
