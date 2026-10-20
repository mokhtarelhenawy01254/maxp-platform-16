import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Trash2, Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { InstalledApp } from "@/types/marketplace";

interface MyAppsUninstallModalsProps {
  confirmUninstall: InstalledApp | null;
  onCancelUninstall: () => void;
  onConfirmUninstall: () => void;
  selectedIds: Set<string>;
  onExportSelected: () => void;
  onClearSelection: () => void;
  confirmBulkUninstall: boolean;
  onSetConfirmBulkUninstall: (open: boolean) => void;
  isBulkDeleting: boolean;
  onConfirmBulkUninstall: () => void;
  apps: InstalledApp[];
}

export const MyAppsUninstallModals: React.FC<MyAppsUninstallModalsProps> = ({
  confirmUninstall,
  onCancelUninstall,
  onConfirmUninstall,
  selectedIds,
  onExportSelected,
  onClearSelection,
  confirmBulkUninstall,
  onSetConfirmBulkUninstall,
  isBulkDeleting,
  onConfirmBulkUninstall,
  apps,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* 1. Single App Uninstall Confirmation Dialog */}
      <AlertDialog open={!!confirmUninstall} onOpenChange={() => onCancelUninstall()}>
        <AlertDialogContent className="rounded-2xl text-right" dir="rtl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black">
              {t("marketplace.deactivateTitle", {
                name: confirmUninstall?.app.name || "",
                defaultValue: `إلغاء تفعيل ${confirmUninstall?.app.name || ""}`,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("marketplace.deactivateConfirm", "هل أنت متأكد من رغبتك في إلغاء تفعيل هذه الأداة؟")}<br />
              {t("marketplace.deactivateWarning", "قد تتوقف الميزات والربط المرتبط بها حتى تعيد تفعيلها مرة أخرى.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3 flex-row justify-center">
            <AlertDialogCancel className="rounded-xl font-semibold text-xs flex-1">
              {t("marketplace.cancel", "إلغاء")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmUninstall}
              className="rounded-xl bg-destructive hover:bg-destructive/90 font-bold text-xs flex-1"
            >
              {t("marketplace.confirmDeactivation", "تأكيد إلغاء التفعيل")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          data-testid="bulk-actions-bar"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-3 px-4 sm:px-5 flex items-center gap-2.5 sm:gap-4 max-w-[95vw] sm:max-w-2xl animate-in fade-in slide-in-from-bottom-5"
          dir="rtl"
        >
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-primary text-primary-foreground font-black px-2.5 py-1 text-xs rounded-lg tabular-nums font-mono">
              {selectedIds.size}
            </Badge>
            <span className="text-xs font-bold text-foreground hidden sm:inline">أدوات محددة</span>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs font-bold gap-1.5 px-3"
              onClick={onExportSelected}
              data-testid="bulk-export-btn"
            >
              <Download size={13} />
              <span>تصدير CSV</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              className="h-8 rounded-xl text-xs font-bold gap-1.5 px-3 bg-destructive hover:bg-destructive/90"
              onClick={() => onSetConfirmBulkUninstall(true)}
              data-testid="bulk-uninstall-btn"
            >
              <Trash2 size={13} />
              <span>إلغاء التفعيل للمحددة</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={onClearSelection}
              data-testid="bulk-clear-btn"
            >
              <X size={13} />
              <span className="hidden sm:inline">إلغاء التحديد</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Confirmation Dialog for Bulk Uninstall */}
      <AlertDialog open={confirmBulkUninstall} onOpenChange={onSetConfirmBulkUninstall}>
        <AlertDialogContent className="rounded-2xl text-right max-w-md" dir="rtl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 size={28} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black text-base sm:text-lg">
              إلغاء تفعيل {selectedIds.size} أداة دفعة واحدة؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
              سيتم إيقاف التطبيقات المحددة وإلغاء تفعيلها من متجرك. يمكنك دائماً إعادة تفعيلها من المتجر في أي وقت.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-44 overflow-y-auto rounded-xl bg-muted/40 p-2.5 space-y-1.5 text-xs">
            {apps
              .filter((a) => selectedIds.has(a.id))
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-muted-foreground font-semibold px-2.5 py-1.5 bg-card rounded-lg border border-border/30"
                >
                  <span className="text-foreground font-bold">{a.app.name}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {a.app.category || "عام"}
                  </Badge>
                </div>
              ))}
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-3 flex-row justify-center pt-2">
            <AlertDialogCancel className="rounded-xl font-semibold text-xs flex-1" disabled={isBulkDeleting}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmBulkUninstall}
              disabled={isBulkDeleting}
              className="rounded-xl bg-destructive hover:bg-destructive/90 font-bold text-xs flex-1 gap-1.5"
            >
              {isBulkDeleting && <Loader2 size={13} className="animate-spin" />}
              <span>تأكيد الإلغاء الجماعي</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
