import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import type { BusinessSpecialty } from "../types";

interface SpecialtyDeleteDialogProps {
  specialty: BusinessSpecialty | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const SpecialtyDeleteDialog: React.FC<SpecialtyDeleteDialogProps> = ({
  specialty,
  open,
  onClose,
  onConfirm,
  loading,
}) => {
  if (!specialty) return null;

  const isLinked = (specialty.companyCount || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !loading && onClose()}>
      <DialogContent className="max-w-md text-right rounded-xl p-5 border border-border/70 shadow-xl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">
                حذف النشاط التجاري؟
              </DialogTitle>
              <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                {specialty.slug}
              </span>
            </div>
          </div>

          <DialogDescription className="mt-3 text-xs text-muted-foreground leading-relaxed text-right">
            {isLinked ? (
              <span>
                النشاط <strong className="text-foreground">{specialty.nameAr}</strong> مرتبط
                حالياً بـ{" "}
                <strong className="text-foreground font-mono tabular-nums">
                  {specialty.companyCount.toLocaleString("ar-EG")}
                </strong>{" "}
                شركة نشطة في النظام. لذلك، سيتم{" "}
                <span className="text-destructive font-semibold">إيقاف تنشيطه</span> بدلاً من الحذف
                النهائي لحماية بيانات وحسابات الشركات التابعة.
              </span>
            ) : (
              <span>
                سيتم حذف النشاط التجاري{" "}
                <strong className="text-foreground">{specialty.nameAr}</strong> نهائياً من قاعدة
                البيانات نظراً لعدم ارتباط أي شركة به.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onClose}
            className="h-8 px-3 text-xs rounded-lg"
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className="h-8 px-4 text-xs font-semibold rounded-lg"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
            ) : null}
            {isLinked ? "تأكيد الإيقاف" : "تأكيد الحذف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
